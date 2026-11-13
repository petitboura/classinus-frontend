"use client";

// Mode vocal bambara : l'utilisateur parle, Soloni transcrit seulement, le texte part à l'IA de
// Classinus (par le chat, comme la voix actuelle), et sa réponse est lue à voix haute par la voix
// Gemini. Même forme de session que la voix Gemini Live (lib/geminiLive.ts) pour que l'onde, le
// bouton Arrêter et le reste de l'interface la pilotent sans rien changer.
//
// Pendant que Classinus travaille ou parle, le micro est en pause : la voix ne se coupe pas et ne
// s'écoute pas elle même. Les messages tapés dans le chat et les bulles du canal ne sont pas lus :
// seules les réponses aux paroles de l'utilisateur le sont.

import { messageErreurVoix } from "./erreurs";
import type { SessionGeminiLive } from "./geminiLive";
import { lireEtatVoixBambara, synthetiserVoixBambara, transcrireVoixBambara } from "./voixBambaraApi";
import { creerLecteurBambara } from "./voixBambaraLecture";
import { ouvrirMicro } from "./voixBambaraMicro";
import { decouperEnMorceaux, nettoyerPourVoix } from "./voixBambaraTexte";

/** Valeur envoyée avec chaque message du mode bambara : le serveur y répond en bambara oral. */
export const CLIENT_VOIX_BAMBARA = "voix_bambara";

type EtatVoix = "connexion" | "connecte" | "ecoute" | "reponse" | "travail" | "silence" | "erreur" | "ferme";

type OptionsVoixBambara = {
  surEtat: (etat: EtatVoix) => void;
  surErreur: (message: string) => void;
  /** Dépose la parole transcrite dans le chat et rend la réponse écrite de Classinus. */
  surDemande: (question: string) => Promise<string>;
};

export async function ouvrirVoixBambara(options: OptionsVoixBambara): Promise<SessionGeminiLive> {
  // Créé avant toute attente : le navigateur n'autorise le son qu'à la suite d'un geste de l'utilisateur.
  const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const contexte = new Contexte();
  options.surEtat("connexion");
  try {
    const etat = await lireEtatVoixBambara();
    if (!etat.disponible) throw new Error("La voix bambara n'est pas branchée pour le moment.");
    const lecteur = creerLecteurBambara(contexte, (texte) => synthetiserVoixBambara(texte));
    let ferme = false;

    const reprendre = () => {
      if (ferme) return;
      options.surEtat("ecoute");
      micro.ecouter();
    };

    const traiter = async (audio: Blob, mime: string) => {
      if (ferme) return;
      options.surEtat("travail");
      try {
        const texte = await transcrireVoixBambara(audio, mime);
        if (ferme || !texte) return;
        const reponse = await options.surDemande(texte);
        if (ferme) return;
        const morceaux = decouperEnMorceaux(nettoyerPourVoix(reponse), etat.texte_max);
        if (morceaux.length === 0) return;
        options.surEtat("reponse");
        await lecteur.lire(morceaux);
      } catch (e) {
        if (!ferme) options.surErreur(messageErreurVoix(e));
      } finally {
        reprendre();
      }
    };

    const micro = await ouvrirMicro({ contexte, surEnregistrement: (audio, mime) => void traiter(audio, mime) });
    options.surEtat("connecte");
    reprendre();

    return {
      niveaux: () => ({ entree: micro.niveau(), sortie: lecteur.niveau() }),
      fermer() {
        if (ferme) return;
        ferme = true;
        lecteur.interrompre();
        micro.fermer();
        void contexte.close().catch(() => {});
        options.surEtat("ferme");
      },
      // Bouton Arrêter : la parole en cours est coupée, l'écoute reprend ensuite.
      interrompre: () => lecteur.interrompre(),
      annoncerReponse: () => {},
      direMessageBulle: () => {},
    };
  } catch (e) {
    void contexte.close().catch(() => {});
    throw e;
  }
}
