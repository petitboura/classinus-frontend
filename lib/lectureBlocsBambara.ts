"use client";

// Page bambara : la lecture à voix haute d'une réponse, bloc de texte par bloc de texte (23/11/2026, demande de Bourama),
// et phrase par phrase à l'intérieur d'un bloc (23/11/2026, lecture au fil de l'eau). Les blocs sont lus l'un après
// l'autre, seuls, dans l'ordre. Dès qu'une phrase d'un bloc est terminée elle part à la voix, même si le bloc est encore
// en train d'être écrit, et son vocal est rendu à part (un message audio par bloc, réécoutable au clic).
//
// Avant le premier son d'un bloc, on attend que la page le dise prêt (`avantBloc` : le bloc est apparu à l'écran au
// défilement, aucun message audio n'est réécouté). La voix de la première phrase est préparée pendant cette attente.
// Une coupure de la voix (bouton arrêter, bulle mise en pause, une réécoute qui démarre) abandonne tout ce qui restait à
// lire de cette réponse.

import { messageDepuisTampons, type MessageAudioBambara } from "./audioMessageBambara";
import { blocsDeReponse } from "./blocsBambara";
import { creerLectureEnFlux, type LectureEnFlux } from "./voixBambaraFlux";
import type { LecteurBambara } from "./voixBambaraLecture";

export type OptionsLectureBlocs = {
  lecteur: LecteurBambara;
  /** Longueur maximale d'un morceau envoyé à la voix. */
  texteMax: number;
  /** Rend true quand le bloc de ce rang peut être lu, false s'il faut l'abandonner (page quittée, arrêt). */
  avantBloc: (rang: number) => Promise<boolean>;
  /** La voix commence à lire un bloc. */
  surDebutBloc?: (rang: number) => void;
  /** Ce que la voix a lu d'un bloc (en entier, ou jusqu'à sa coupure) : son vocal réécoutable. */
  surAudioBloc: (rang: number, message: MessageAudioBambara) => void;
};

export type LectureBlocs = {
  /** Le texte brut de la réponse écrit jusqu'ici ; `termine` à la fin. Les phrases terminées partent à la voix. */
  suivre: (brut: string, termine: boolean) => void;
  /** Se termine quand tout ce qui a été écrit est lu. Échoue si la voix échoue. */
  terminer: () => Promise<void>;
  /** Abandonne ce qui reste à lire et coupe la voix de la réponse. */
  annuler: () => void;
};

// Ce que la lecture sait d'un bloc de texte : son texte propre jusqu'ici, et s'il est fini d'être écrit.
type SourceBloc = { texte: string; fini: boolean };

export function creerLectureBlocs(options: OptionsLectureBlocs): LectureBlocs {
  const sources: SourceBloc[] = [];
  let termine = false;
  let annule = false;
  let reveil: (() => void) | null = null;
  let boucle: Promise<void> | null = null;
  let fluxCourant: LectureEnFlux | null = null;

  const reveiller = () => {
    const r = reveil;
    reveil = null;
    r?.();
  };
  const attendre = () => new Promise<void>((resoudre) => { reveil = resoudre; });

  const lireUnBloc = async (rang: number) => {
    const tampons: AudioBuffer[] = [];
    const coupuresAvant = options.lecteur.interruptions();
    // Le bloc est refusé (pas lu) : seul lui est sauté, les blocs suivants gardent leur tour.
    let saute = false;
    const flux = creerLectureEnFlux({
      lecteur: options.lecteur,
      texteMax: options.texteMax,
      surTampon: (tampon) => tampons.push(tampon),
      // La première phrase est déjà en préparation ici : on attend seulement que la page dise le bloc prêt.
      avantJouer: async () => {
        if (annule) return;
        if (!(await options.avantBloc(rang))) {
          saute = true;
          flux.annuler();
          reveiller();
          return;
        }
        options.surDebutBloc?.(rang);
      },
    });
    fluxCourant = flux;
    try {
      for (;;) {
        if (annule) {
          flux.annuler();
          return;
        }
        if (saute) return;
        const source = sources[rang];
        if (source.fini) {
          await flux.terminer(source.texte);
          return;
        }
        flux.alimenter(source.texte);
        await attendre();
      }
    } finally {
      if (fluxCourant === flux) fluxCourant = null;
      // Même coupée, la partie déjà lue reste réécoutable.
      const lu = messageDepuisTampons(tampons);
      if (lu) options.surAudioBloc(rang, lu);
      // La voix a été coupée pendant ce bloc : le reste de la réponse n'est plus lu.
      if (!saute && options.lecteur.interruptions() !== coupuresAvant) annule = true;
    }
  };

  const lancerBoucle = () => {
    if (boucle) return;
    boucle = (async () => {
      for (let rang = 0; !annule; rang += 1) {
        // Le bloc de ce rang n'existe pas encore : on attend qu'il apparaisse, ou la fin de la réponse.
        while (!sources[rang] && !termine && !annule) await attendre();
        if (annule || !sources[rang]) break;
        await lireUnBloc(rang);
      }
    })();
    // L'erreur est rendue par terminer() ; ici on évite seulement une erreur non traitée.
    boucle.catch(() => {});
  };

  return {
    suivre(brut, fini) {
      if (annule) return;
      const complets = blocsDeReponse(brut, fini).filter((b) => b.genre === "texte");
      // Tant que la réponse s'écrit, le paragraphe encore ouvert n'est pas un bloc complet : une ligne vide fictive le ferme
      // pour que ses phrases déjà terminées puissent être lues. Il redevient un bloc complet quand sa vraie fin arrive.
      const visibles = fini ? complets : blocsDeReponse(brut + "\n\n", false).filter((b) => b.genre === "texte");
      visibles.forEach((bloc, i) => {
        sources[bloc.rang] = { texte: bloc.texte, fini: fini || i < complets.length };
      });
      if (fini) termine = true;
      lancerBoucle();
      reveiller();
    },
    async terminer() {
      termine = true;
      for (const source of sources) source.fini = true;
      lancerBoucle();
      reveiller();
      await boucle;
    },
    annuler() {
      annule = true;
      fluxCourant?.annuler();
      reveiller();
    },
  };
}
