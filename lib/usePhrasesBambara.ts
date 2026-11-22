"use client";

// Page bambara : phrases proactives (22/11/2026, demande de Bourama). Voir lib/phrasesBambaraLogique.ts pour les règles.
//
// Ce hook est le branchement avec le navigateur : il crée le son de la page, demande la liste des phrases au serveur
// (api/bambara_phrases.py), télécharge à l'avance UNE variante par moment (le serveur ne l'a fabriquée qu'une fois, le
// navigateur la garde ensuite), joue l'accueil à l'arrivée, puis une phrase quand un outil commence à chercher ou à créer,
// et une phrase pour patienter quand un outil prend du temps (les délais viennent du serveur, de Supabase).
//
// Le son de ces phrases est le sien : il ne se mélange pas à celui de la voix qui répond. La page attend la fin de la
// phrase qui parle avant de lire la réponse (attendreFin), elle ne la coupe jamais d'elle même.
// Le navigateur n'autorise le son qu'après un geste de la personne. Si l'accueil ne peut pas encore jouer, il est sauté :
// il ne repart jamais tout seul plus tard. Si la personne touche l'écran avant qu'il commence, il est sauté aussi.
// Aucune erreur n'est jamais montrée : une phrase qui échoue est simplement passée sous silence.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { effetPrincipal } from "./pageBambaraVisuels";
import { lirePhrasesBambara, telechargerAudioPhrase } from "./phrasesBambaraApi";
import {
  choisirVariante,
  creerMemoireDeTaches,
  creerOrdonnanceur,
  momentPourEffet,
  MOMENTS_PHRASES,
  REGLAGES_PAR_DEFAUT,
  type ListePhrases,
  type MomentPhrase,
  type Ordonnanceur,
  type PhraseDispo,
} from "./phrasesBambaraLogique";
import { creerLecteurBambara, type LecteurBambara } from "./voixBambaraLecture";

/** Au delà, une phrase pas encore téléchargée est sautée : une phrase pour patienter qui arrive trop tard ne sert plus. */
const DELAI_MAX_CHARGEMENT_MS = 4000;
/** Safari peut laisser `resume()` en attente sans fin hors d'un geste : on n'attend pas plus longtemps. */
const DELAI_MAX_REPRISE_SON_MS = 300;
/** Des phrases sont encore en cours de fabrication côté serveur : on redemande la liste quelques fois. */
const NOUVEAUX_ESSAIS_LISTE = 3;
const PAUSE_ENTRE_ESSAIS_MS = 10_000;

type Options = {
  /** La page est prête (compte connecté) : le son se prépare et l'accueil peut jouer. */
  actif: boolean;
  /** Une phrase commence : la page met l'écoute du micro en attente (il entendrait le haut parleur). */
  surDebut?: () => void;
  /** La phrase est finie : la page rend l'écoute au micro. */
  surFin?: () => void;
};

function attendre<T>(ms: number, valeur: T): Promise<T> {
  return new Promise((resoudre) => {
    window.setTimeout(() => resoudre(valeur), ms);
  });
}

export function usePhrasesBambara({ actif, surDebut, surFin }: Options) {
  const [phraseEnCours, setPhraseEnCours] = useState(false);
  const optionsRef = useRef({ surDebut, surFin });
  optionsRef.current = { surDebut, surFin };

  const ordonnanceurRef = useRef<Ordonnanceur | null>(null);
  const lecteurRef = useRef<LecteurBambara | null>(null);
  const listeRef = useRef<ListePhrases | null>(null);
  const outilsRef = useRef<string[]>([]);
  // Les moments déjà annoncés pendant ce tour : une recherche web qui en suit une autre ne se redit pas.
  const annoncesRef = useRef<Set<MomentPhrase>>(new Set());
  const minuteurRef = useRef<number | null>(null);

  const arreterMinuteur = useCallback(() => {
    if (minuteurRef.current !== null) window.clearTimeout(minuteurRef.current);
    minuteurRef.current = null;
  }, []);

  useEffect(() => {
    if (!actif) return;
    const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexte) return;
    let contexte: AudioContext;
    try {
      contexte = new Contexte();
    } catch {
      return;
    }

    let termine = false;
    let gesteRecu = false;
    let accueilJoue = false;
    let nouvelEssai: number | null = null;
    const octets = new Map<string, ArrayBuffer>();
    const dernierJoue = new Map<MomentPhrase, string>();
    // La variante déjà choisie et téléchargée pour chaque moment, prête pour la prochaine fois.
    const prochaine = new Map<MomentPhrase, PhraseDispo>();
    const taches = creerMemoireDeTaches<ArrayBuffer>();
    const lecteur = creerLecteurBambara(contexte, async (cle) => {
      const recu = octets.get(cle);
      if (!recu) throw new Error("phrase absente");
      // La lecture « consomme » ce qu'elle décode : elle reçoit toujours une copie.
      return recu.slice(0);
    });
    lecteurRef.current = lecteur;

    const prochaineDe = (moment: MomentPhrase): PhraseDispo | null => {
      const liste = listeRef.current;
      if (!liste) return null;
      const gardee = prochaine.get(moment);
      // Gardée seulement si le serveur la propose toujours avec la même version (la voix ou le texte a pu changer).
      if (gardee && liste.phrases.some((p) => p.id === gardee.id && p.version === gardee.version)) return gardee;
      const choisie = choisirVariante(liste.phrases, moment, dernierJoue.get(moment) ?? null);
      if (choisie) prochaine.set(moment, choisie);
      else prochaine.delete(moment);
      return choisie;
    };

    const telecharger = (phrase: PhraseDispo): Promise<ArrayBuffer> => {
      const deja = octets.get(phrase.id);
      if (deja) return Promise.resolve(deja);
      return taches.obtenir(phrase.id + ":" + phrase.version, async () => {
        const recu = await telechargerAudioPhrase(phrase);
        octets.set(phrase.id, recu);
        return recu;
      });
    };

    /** Prépare la prochaine variante d'un moment en arrière plan, sans rien attendre ni montrer. */
    const prevoir = async (moment: MomentPhrase) => {
      const phrase = prochaineDe(moment);
      if (!phrase) return;
      try {
        await telecharger(phrase);
      } catch {
        // Silence : la phrase sera retentée à la demande.
      }
    };

    const ordonnanceur = creerOrdonnanceur({
      charger: async (moment) => {
        const phrase = prochaineDe(moment);
        if (!phrase) return null;
        try {
          const recu = await Promise.race([telecharger(phrase), attendre<null>(DELAI_MAX_CHARGEMENT_MS, null)]);
          if (!recu) return null;
        } catch {
          return null;
        }
        dernierJoue.set(moment, phrase.id);
        return phrase.id;
      },
      peutJouer: async () => {
        if (contexte.state === "closed") return false;
        if (contexte.state === "suspended") {
          await Promise.race([contexte.resume().catch(() => {}), attendre<void>(DELAI_MAX_REPRISE_SON_MS, undefined)]);
        }
        return contexte.state === "running";
      },
      jouer: (cle) => lecteur.lire([cle]),
      arreter: () => lecteur.interrompre(),
      surDebut: (moment) => {
        if (moment === "accueil") accueilJoue = true;
        setPhraseEnCours(true);
        optionsRef.current.surDebut?.();
      },
      surFin: (moment) => {
        setPhraseEnCours(false);
        optionsRef.current.surFin?.();
        // La prochaine fois, une autre variante (quand il y en a) est déjà téléchargée.
        prochaine.delete(moment);
        if (!termine) void prevoir(moment);
      },
    });
    ordonnanceurRef.current = ordonnanceur;

    // Un geste de la personne : le navigateur autorise alors le son (les phrases suivantes pourront jouer), et
    // l'accueil, s'il n'a pas commencé, est sauté : la personne a déjà pris la main.
    const surGeste = () => {
      gesteRecu = true;
      if (contexte.state === "suspended") void contexte.resume().catch(() => {});
    };
    const evenements = ["pointerdown", "touchstart", "keydown"] as const;
    evenements.forEach((nom) => window.addEventListener(nom, surGeste, { capture: true, passive: true }));

    const lireListe = async (essai: number) => {
      try {
        const liste = await lirePhrasesBambara();
        if (termine) return;
        listeRef.current = liste;
        if (!accueilJoue && !gesteRecu) ordonnanceur.demander("accueil", () => !gesteRecu && !termine);
        // Une variante de chaque moment est téléchargée à l'avance, l'accueil d'abord. Un seul à la fois : sur une
        // connexion lente, les phrases ne doivent pas ralentir la page.
        for (const moment of MOMENTS_PHRASES) {
          if (termine) return;
          await prevoir(moment);
        }
        if (!termine && liste.enPreparation > 0 && essai < NOUVEAUX_ESSAIS_LISTE) {
          nouvelEssai = window.setTimeout(() => void lireListe(essai + 1), PAUSE_ENTRE_ESSAIS_MS);
        }
      } catch {
        // Le serveur ne répond pas : la page reste muette comme avant, sans rien montrer.
      }
    };
    void lireListe(0);

    return () => {
      termine = true;
      if (nouvelEssai !== null) window.clearTimeout(nouvelEssai);
      evenements.forEach((nom) => window.removeEventListener(nom, surGeste, { capture: true }));
      ordonnanceur.interrompre();
      ordonnanceurRef.current = null;
      lecteurRef.current = null;
      listeRef.current = null;
      void contexte.close().catch(() => {});
      setPhraseEnCours(false);
    };
  }, [actif]);

  // Les minuteurs de la phrase « outil lent » ne survivent pas à la page.
  useEffect(() => arreterMinuteur, [arreterMinuteur]);

  /**
   * À appeler à chaque changement de la liste des outils en cours. Quand un outil commence une recherche ou une
   * création, sa phrase est demandée (une seule fois par tour). Tant qu'un outil travaille, une phrase pour patienter
   * est demandée après le délai du serveur, puis à chaque intervalle. Quand plus aucun outil ne travaille, les phrases
   * qui attendaient sont retirées : celle qui parle déjà finit.
   */
  const suivreOutils = useCallback(
    (noms: string[]) => {
      outilsRef.current = noms;
      const ordonnanceur = ordonnanceurRef.current;
      if (noms.length === 0) {
        arreterMinuteur();
        ordonnanceur?.annulerEnAttente();
        return;
      }
      if (!ordonnanceur) return;
      const valable = () => outilsRef.current.length > 0;
      const effet = effetPrincipal(noms);
      if (effet) {
        const moment = momentPourEffet(effet);
        if (!annoncesRef.current.has(moment)) {
          annoncesRef.current.add(moment);
          ordonnanceur.demander(moment, valable);
        }
      }
      if (minuteurRef.current === null) {
        const armer = (secondes: number) => {
          minuteurRef.current = window.setTimeout(() => {
            if (outilsRef.current.length === 0) {
              minuteurRef.current = null;
              return;
            }
            ordonnanceurRef.current?.demander("outil_lent", valable);
            armer((listeRef.current?.reglages ?? REGLAGES_PAR_DEFAUT).intervalleOutilLentS);
          }, secondes * 1000);
        };
        armer((listeRef.current?.reglages ?? REGLAGES_PAR_DEFAUT).delaiOutilLentS);
      }
    },
    [arreterMinuteur]
  );

  /** Une nouvelle demande commence : ses outils pourront de nouveau annoncer leurs phrases. */
  const nouveauTour = useCallback(() => {
    annoncesRef.current = new Set();
    arreterMinuteur();
    ordonnanceurRef.current?.annulerEnAttente();
  }, [arreterMinuteur]);

  /** Geste explicite de la personne (arrêter, nouvelle conversation, réécouter, lancer une vidéo) : la phrase s'arrête. */
  const interrompre = useCallback(() => {
    arreterMinuteur();
    ordonnanceurRef.current?.interrompre();
  }, [arreterMinuteur]);

  /** Se termine quand plus aucune phrase ne parle : la réponse attend cela avant d'être lue, elle ne coupe jamais une phrase. */
  const attendreFin = useCallback(async () => {
    const ordonnanceur = ordonnanceurRef.current;
    if (!ordonnanceur) return;
    ordonnanceur.annulerEnAttente();
    await ordonnanceur.attendreFin();
  }, []);

  const niveau = useCallback(() => lecteurRef.current?.niveau() ?? 0, []);
  const enCours = useCallback(() => ordonnanceurRef.current?.enCours() != null, []);

  return useMemo(
    () => ({ phraseEnCours, suivreOutils, nouveauTour, interrompre, attendreFin, niveau, enCours }),
    [phraseEnCours, suivreOutils, nouveauTour, interrompre, attendreFin, niveau, enCours]
  );
}
