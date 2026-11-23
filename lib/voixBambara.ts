"use client";

// Mode vocal bambara : l'utilisateur parle, Soloni transcrit seulement, le texte part à l'IA de
// Classinus (par le chat, comme la voix actuelle), et sa réponse est lue à voix haute par la voix
// Gemini. Même forme de session que la voix Gemini Live (lib/geminiLive.ts) pour que l'onde, le
// bouton Arrêter et le reste de l'interface la pilotent sans rien changer.
//
// Pendant que Classinus travaille ou parle, le micro est en pause : la voix ne se coupe pas et ne
// s'écoute pas elle même. Les messages tapés dans le chat et les bulles du canal ne sont pas lus :
// seules les réponses aux paroles de l'utilisateur le sont.

import { messageDepuisEnregistrement, messageDepuisTampons, type MessageAudioBambara } from "./audioMessageBambara";
import { messageErreurVoix } from "./erreurs";
import type { SessionGeminiLive } from "./geminiLive";
import { lireEtatVoixBambara, synthetiserVoixBambara, transcrireVoixBambara } from "./voixBambaraApi";
import { creerLectureEnFlux, type LectureEnFlux } from "./voixBambaraFlux";
import { creerLecteurBambara } from "./voixBambaraLecture";
import { ouvrirMicro, type ReperesParole } from "./voixBambaraMicro";

/** Valeur envoyée avec chaque message du mode bambara : le serveur y répond en bambara oral. */
export const CLIENT_VOIX_BAMBARA = "voix_bambara";

type EtatVoix = "connexion" | "connecte" | "ecoute" | "reponse" | "travail" | "silence" | "erreur" | "ferme";

type OptionsVoixBambara = {
  surEtat: (etat: EtatVoix) => void;
  surErreur: (message: string) => void;
  /**
   * Dépose la parole transcrite dans le chat et rend la réponse écrite de Classinus. `alimenter` (23/11/2026, demande
   * de Bourama) est à appeler avec le texte brut cumulé à mesure qu'il arrive : la voix commence alors dès la première
   * phrase terminée. Sans l'appeler, la réponse est lue en entier à la fin, comme avant.
   */
  surDemande: (question: string, alimenter: (brutCumule: string) => void) => Promise<string>;
  /** La personne vient de finir de parler : sa parole est prête comme message audio, avant même la transcription. */
  surParole?: (message: MessageAudioBambara) => void;
  /** Rien de compris dans cette parole (bruit) : le message audio annoncé juste avant est à retirer. */
  surParoleVide?: () => void;
  /** Ce que la voix de Classinus a lu (en entier, ou jusqu'à son arrêt) devient un message audio réécoutable. */
  surReponseAudio?: (message: MessageAudioBambara) => void;
  /**
   * La demande est finie (réponse lue, coupée ou en échec), après `surReponseAudio`. La page y envoie au serveur les sons
   * à garder (23/11/2026, demande de Bourama) : plus en même temps que la réponse, qu'ils ralentissaient.
   */
  surFinTour?: () => void;
  /**
   * Appuyer pour parler (page bambara, 22/11/2026, demande de Bourama, comme WhatsApp) : le micro n'écoute plus tout
   * seul. La personne lance l'enregistrement (commencerParole) puis l'arrête (terminerParole) quand elle a fini.
   */
  pousserPourParler?: boolean;
};

/**
 * La session du mode bambara : celle de la voix Gemini, plus de quoi mettre l'écoute du micro en attente
 * pendant qu'un message audio est réécouté (sinon le micro entendrait le haut parleur et prendrait ce
 * son pour une nouvelle demande).
 */
export type SessionVoixBambara = SessionGeminiLive & {
  suspendreEcoute: () => void;
  reprendreEcoute: () => void;
  /** Appuyer pour parler : lance l'enregistrement (état « ecoute »). Sans effet dans l'écoute automatique. */
  commencerParole: () => void;
  /** Appuyer pour parler : arrête l'enregistrement et envoie la parole. Rien d'audible : retour au repos. */
  terminerParole: () => void;
};

export async function ouvrirVoixBambara(options: OptionsVoixBambara): Promise<SessionVoixBambara> {
  // Créé avant toute attente : le navigateur n'autorise le son qu'à la suite d'un geste de l'utilisateur.
  const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const contexte = new Contexte();
  options.surEtat("connexion");
  try {
    const etat = await lireEtatVoixBambara();
    if (!etat.disponible) throw new Error("La voix bambara n'est pas branchée pour le moment.");
    const lecteur = creerLecteurBambara(contexte, (texte) => synthetiserVoixBambara(texte));
    let ferme = false;
    // Une demande est en cours de traitement ou de lecture.
    let occupe = false;
    // Un message audio est réécouté : le micro reste en pause jusqu'à la fin.
    let ecouteSuspendue = false;
    // La réponse attend la fin de la réécoute pour être lue, afin que les deux sons ne se mélangent pas.
    let reveil: (() => void) | null = null;
    const liberer = () => {
      const r = reveil;
      reveil = null;
      r?.();
    };

    const reprendre = () => {
      if (ferme || occupe || ecouteSuspendue) return;
      if (options.pousserPourParler) {
        options.surEtat("connecte");
        return;
      }
      options.surEtat("ecoute");
      micro.ecouter();
    };

    const terminerParole = () => {
      if (ferme || !options.pousserPourParler) return;
      if (micro.terminerManuel()) {
        occupe = true;
        options.surEtat("travail");
      } else {
        options.surEtat("connecte");
      }
    };

    const traiter = async (audio: Blob, mime: string, reperes: ReperesParole) => {
      if (ferme) return;
      occupe = true;
      options.surEtat("travail");
      const tampons: AudioBuffer[] = [];
      let lecture: LectureEnFlux | null = null;
      try {
        // La transcription part tout de suite ; pendant ce temps le message audio est préparé pour l'écran.
        const transcription = transcrireVoixBambara(audio, mime);
        transcription.catch(() => {});
        const message = await messageDepuisEnregistrement(contexte, audio, reperes.debutMs, reperes.finMs);
        if (ferme) return;
        options.surParole?.(message);
        const texte = await transcription;
        if (ferme) return;
        if (!texte) {
          options.surParoleVide?.();
          return;
        }
        // La voix lit chaque phrase dès qu'elle est terminée, pendant que l'IA écrit la suite (23/11/2026, demande de
        // Bourama). La première phrase attend la fin d'une réécoute en cours : les deux sons ne se mélangent pas.
        lecture = creerLectureEnFlux({
          lecteur,
          texteMax: etat.texte_max,
          surTampon: (tampon) => tampons.push(tampon),
          avantJouer: async () => {
            while (ecouteSuspendue && !ferme) await new Promise<void>((resoudre) => { reveil = resoudre; });
          },
        });
        const reponse = await options.surDemande(texte, lecture.alimenter);
        if (ferme) return;
        // Le travail est fini : il ne reste qu'à finir de lire (l'état « travail » dure tant que la demande tourne).
        options.surEtat("reponse");
        await lecture.terminer(reponse);
      } catch (e) {
        lecture?.annuler();
        if (!ferme) options.surErreur(messageErreurVoix(e));
      } finally {
        // Même coupée par le bouton Arrêter, la partie déjà lue reste réécoutable.
        const lu = messageDepuisTampons(tampons);
        if (lu) options.surReponseAudio?.(lu);
        options.surFinTour?.();
        occupe = false;
        reprendre();
      }
    };

    const micro = await ouvrirMicro({
      contexte,
      surEnregistrement: (audio, mime, reperes) => void traiter(audio, mime, reperes),
      surLimiteManuelle: terminerParole,
    });
    options.surEtat("connecte");
    reprendre();

    return {
      niveaux: () => ({ entree: micro.niveau(), sortie: lecteur.niveau() }),
      fermer() {
        if (ferme) return;
        ferme = true;
        liberer();
        lecteur.arreter();
        micro.fermer();
        void contexte.close().catch(() => {});
        options.surEtat("ferme");
      },
      // Bouton Arrêter : la parole en cours est coupée, l'écoute reprend ensuite.
      interrompre: () => lecteur.interrompre(),
      annoncerReponse: () => {},
      direMessageBulle: () => {},
      suspendreEcoute() {
        if (ferme) return;
        ecouteSuspendue = true;
        micro.pause();
        if (!occupe) options.surEtat("connecte");
      },
      reprendreEcoute() {
        ecouteSuspendue = false;
        liberer();
        reprendre();
      },
      commencerParole() {
        if (ferme || occupe || ecouteSuspendue || !options.pousserPourParler) return;
        micro.commencerManuel();
        options.surEtat("ecoute");
      },
      terminerParole,
    };
  } catch (e) {
    void contexte.close().catch(() => {});
    throw e;
  }
}
