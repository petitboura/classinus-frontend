"use client";

// Lecture au fil de l'eau de la page bambara (23/11/2026, demande de Bourama) : avant, la voix attendait la fin de la
// réponse avant de lire quoi que ce soit. Maintenant le texte brut de la réponse lui est confié à mesure qu'il arrive :
// dès qu'une phrase est terminée elle part à la voix, pendant que l'IA écrit la suite. Le texte est le même, seul le
// moment de la lecture change. Sans `alimenter` (autre appelant), tout est lu à la fin comme avant.

import type { LecteurBambara } from "./voixBambaraLecture";
import { suivreTexteVoix } from "./voixBambaraTexte";

export type LectureEnFlux = {
  /** Texte brut cumulé de la réponse, à chaque morceau reçu. Rien ne se lit tant qu'une phrase n'est pas terminée. */
  alimenter: (brutCumule: string) => void;
  /** Fin de la réponse : le reste est lu, puis rend la main à la fin de la lecture (échoue si la voix échoue). */
  terminer: (brutFinal: string) => Promise<void>;
  /** Coupe la voix : ce qui arrive encore n'est plus lu. */
  annuler: () => void;
};

type Options = {
  lecteur: LecteurBambara;
  /** Taille maximale d'un morceau confié à la voix (donnée par le serveur). */
  texteMax: number;
  /** Reçoit chaque morceau de voix au moment où il commence à être lu (pour en faire un message audio). */
  surTampon?: (tampon: AudioBuffer) => void;
  /** Attendue avant le premier son : la lecture patiente tant qu'elle n'est pas résolue. */
  avantJouer?: () => Promise<void>;
};

export function creerLectureEnFlux({ lecteur, texteMax, surTampon, avantJouer }: Options): LectureEnFlux {
  const suite = suivreTexteVoix(texteMax);
  const flux = lecteur.flux({ surTampon, avantJouer });
  // Un échec de la voix en cours de route est rendu à `terminer` ; ici il ne doit pas rester sans réponse.
  flux.fini.catch(() => {});
  return {
    alimenter(brutCumule) {
      const morceaux = suite.avancer(brutCumule);
      if (morceaux.length > 0) flux.ajouter(morceaux);
    },
    async terminer(brutFinal) {
      const morceaux = suite.finir(brutFinal);
      if (morceaux.length > 0) flux.ajouter(morceaux);
      flux.terminer();
      await flux.fini;
    },
    annuler() {
      flux.annuler();
    },
  };
}
