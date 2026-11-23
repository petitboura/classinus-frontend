"use client";

// Page bambara (23/11/2026, demande de Bourama) : la lecture à voix haute d'une réponse, bloc de texte par bloc de
// texte. Chaque bloc complet est mis en file dès qu'il arrive (la réponse est encore en train d'être écrite), puis lu
// à son tour, seul, et son vocal est rendu à part (un message audio par bloc, réécoutable au clic).
//
// Avant de lire un bloc, on attend que la page le dise prêt (`avantBloc` : le bloc est apparu à l'écran au défilement,
// aucun message audio n'est réécouté). Une coupure de la voix (bouton arrêter, bulle mise en pause, une réécoute qui
// démarre) abandonne tout ce qui restait à lire de cette réponse, comme avant avec la réponse entière.

import { messageDepuisTampons, type MessageAudioBambara } from "./audioMessageBambara";
import { blocsDeReponse } from "./blocsBambara";
import type { LecteurBambara } from "./voixBambaraLecture";
import { decouperEnMorceaux } from "./voixBambaraTexte";

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
  /** Le texte brut de la réponse écrit jusqu'ici ; `termine` à la fin. Les nouveaux blocs de texte complets partent en file. */
  suivre: (brut: string, termine: boolean) => void;
  /** Se termine quand tout ce qui était en file est lu. Échoue si la voix échoue. */
  terminer: () => Promise<void>;
  /** Abandonne ce qui reste à lire (sans couper la voix en cours : voir `lecteur.interrompre`). */
  annuler: () => void;
};

export function creerLectureBlocs(options: OptionsLectureBlocs): LectureBlocs {
  const file: Array<{ rang: number; texte: string }> = [];
  let misEnFile = 0;
  let fini = false;
  let annule = false;
  let reveil: (() => void) | null = null;
  let boucle: Promise<void> | null = null;

  const reveiller = () => {
    const r = reveil;
    reveil = null;
    r?.();
  };

  const lireUnBloc = async (rang: number, texte: string) => {
    if (!(await options.avantBloc(rang)) || annule) return;
    const morceaux = decouperEnMorceaux(texte, options.texteMax);
    if (morceaux.length === 0) return;
    options.surDebutBloc?.(rang);
    const tampons: AudioBuffer[] = [];
    const avant = options.lecteur.interruptions();
    try {
      await options.lecteur.lire(morceaux, (tampon) => tampons.push(tampon));
    } finally {
      // Même coupée, la partie déjà lue reste réécoutable.
      const lu = messageDepuisTampons(tampons);
      if (lu) options.surAudioBloc(rang, lu);
    }
    // La voix a été coupée pendant ce bloc : le reste de la réponse n'est plus lu.
    if (options.lecteur.interruptions() !== avant) annule = true;
  };

  const lancerBoucle = () => {
    if (boucle) return;
    boucle = (async () => {
      while (!annule) {
        const suivant = file.shift();
        if (!suivant) {
          if (fini) break;
          await new Promise<void>((resoudre) => { reveil = resoudre; });
          continue;
        }
        await lireUnBloc(suivant.rang, suivant.texte);
      }
      file.length = 0;
    })();
    // L'erreur est rendue par terminer() ; ici on évite seulement une erreur non traitée.
    boucle.catch(() => {});
  };

  return {
    suivre(brut, termine) {
      if (annule) return;
      const textes = blocsDeReponse(brut, termine).filter((b) => b.genre === "texte");
      for (let i = misEnFile; i < textes.length; i += 1) {
        const bloc = textes[i];
        if (bloc.genre === "texte") file.push({ rang: bloc.rang, texte: bloc.texte });
      }
      misEnFile = Math.max(misEnFile, textes.length);
      if (termine) fini = true;
      lancerBoucle();
      reveiller();
    },
    async terminer() {
      fini = true;
      lancerBoucle();
      reveiller();
      await boucle;
    },
    annuler() {
      annule = true;
      file.length = 0;
      reveiller();
    },
  };
}
