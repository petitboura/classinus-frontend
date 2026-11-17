"use client";

// Page bambara : demande écrite au clavier. Le texte part à l'IA par le même chemin que la parole
// transcrite (lib/pageBambara.ts), la réponse s'affiche en texte au fur et à mesure, puis elle est
// lue à voix haute par la voix bambara, comme avec le micro. Si la voix n'est pas branchée côté
// serveur ou si elle échoue, le texte reste affiché.
//
// Le son n'est autorisé par le navigateur qu'à la suite d'un geste : le contexte audio est donc créé
// au moment de l'envoi, pas plus tard.

import { useCallback, useEffect, useRef, useState } from "react";
import { messageErreurVoix } from "./erreurs";
import { demanderPageBambara, type RappelsPageBambara } from "./pageBambara";
import { lireEtatVoixBambara, synthetiserVoixBambara } from "./voixBambaraApi";
import { creerLecteurBambara, type LecteurBambara } from "./voixBambaraLecture";
import { decouperEnMorceaux, nettoyerPourVoix } from "./voixBambaraTexte";

export type EtatEcritureBambara = "inactif" | "travail" | "reponse";

type Options = {
  conversationId: () => string;
  /** Appelé au début d'une demande écrite : l'écran repart de zéro et une écoute du micro est fermée. */
  avantEnvoi: () => void;
  surOutilsEnCours: RappelsPageBambara["surOutilsEnCours"];
  surVisuels: RappelsPageBambara["surVisuels"];
  /** Texte de la réponse, nettoyé de ce qui ne se lit pas, à chaque morceau reçu. */
  surTexte: (texte: string) => void;
  surErreur: (message: string) => void;
};

export function useEcritureBambara(options: Options) {
  const [etat, setEtat] = useState<EtatEcritureBambara>("inactif");
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Chaque demande a son numéro : arrêter ou renvoyer rend les rappels de l'ancienne demande sans effet.
  const numeroRef = useRef(0);
  const actifRef = useRef(false);
  const lecteurRef = useRef<LecteurBambara | null>(null);
  const contexteRef = useRef<AudioContext | null>(null);

  const liberer = useCallback(() => {
    lecteurRef.current?.interrompre();
    lecteurRef.current = null;
    const contexte = contexteRef.current;
    contexteRef.current = null;
    if (contexte) void contexte.close().catch(() => {});
  }, []);

  const envoyer = useCallback(async (texte: string) => {
    const question = texte.trim();
    if (!question || actifRef.current) return;
    actifRef.current = true;
    numeroRef.current += 1;
    const numero = numeroRef.current;
    const courante = () => numero === numeroRef.current;
    const o = optionsRef.current;
    o.avantEnvoi();

    const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const contexte = new Contexte();
    contexteRef.current = contexte;
    const lecteur = creerLecteurBambara(contexte, (t) => synthetiserVoixBambara(t));
    lecteurRef.current = lecteur;
    setEtat("travail");

    try {
      const voix = await lireEtatVoixBambara();
      const reponse = await demanderPageBambara(question, o.conversationId(), {
        surOutilsEnCours: (noms) => { if (courante()) o.surOutilsEnCours(noms); },
        surVisuels: (visuels) => { if (courante()) o.surVisuels(visuels); },
        surTexte: (cumule) => { if (courante()) o.surTexte(nettoyerPourVoix(cumule)); },
      });
      if (!courante()) return;
      o.surTexte(nettoyerPourVoix(reponse));
      if (!voix.disponible) return;
      const morceaux = decouperEnMorceaux(nettoyerPourVoix(reponse), voix.texte_max);
      if (morceaux.length === 0) return;
      setEtat("reponse");
      await lecteur.lire(morceaux);
    } catch (e) {
      if (courante()) o.surErreur(messageErreurVoix(e));
    } finally {
      if (courante()) {
        liberer();
        actifRef.current = false;
        setEtat("inactif");
      }
    }
  }, [liberer]);

  /** Coupe la lecture tout de suite et ignore ce qui arrive encore de la demande en cours. */
  const arreter = useCallback(() => {
    numeroRef.current += 1;
    actifRef.current = false;
    liberer();
    setEtat("inactif");
  }, [liberer]);

  const niveau = useCallback(() => lecteurRef.current?.niveau() ?? 0, []);

  useEffect(() => () => {
    numeroRef.current += 1;
    liberer();
  }, [liberer]);

  return { etat, actif: etat !== "inactif", envoyer, arreter, niveau };
}
