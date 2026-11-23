"use client";

// Page bambara : demande écrite au clavier. Le texte part à l'IA par le même chemin que la parole
// transcrite (lib/pageBambara.ts), la réponse s'affiche en texte au fur et à mesure, puis elle est
// lue à voix haute par la voix bambara, comme avec le micro. Si la voix n'est pas branchée côté
// serveur ou si elle échoue, le texte reste affiché.
//
// Le son n'est autorisé par le navigateur qu'à la suite d'un geste : le contexte audio est donc créé
// au moment de l'envoi, pas plus tard.

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageAudioBambara } from "./audioMessageBambara";
import { messageErreurVoix } from "./erreurs";
import { creerLectureBlocs, type LectureBlocs } from "./lectureBlocsBambara";
import { demanderPageBambara, type RappelsPageBambara } from "./pageBambara";
import { lireEtatVoixBambara, synthetiserVoixBambara } from "./voixBambaraApi";
import { creerLecteurBambara, type LecteurBambara } from "./voixBambaraLecture";

export type EtatEcritureBambara = "inactif" | "travail" | "reponse";

type Options = {
  conversationId: () => string;
  /**
   * Appelé au début d'une demande écrite : un nouveau tour s'ajoute à la conversation et une écoute du micro
   * est fermée. Rend l'identifiant du tour créé, auquel sera rattaché le message audio de la réponse.
   */
  avantEnvoi: (question: string) => string;
  /** La voix a lu un bloc de texte (en entier, ou jusqu'à sa coupure) : son vocal devient un message audio réécoutable du tour donné. */
  surAudioBloc?: (idTour: string, rang: number, message: MessageAudioBambara) => void;
  /** Les identifiants des messages sauvegardés pour le tour donné, une fois l'échange terminé (pour garder les voix). */
  surIds?: (idTour: string, ids: Parameters<NonNullable<RappelsPageBambara["surIds"]>>[0]) => void;
  /**
   * Attendue avant de lire un bloc de texte à voix haute (23/11/2026) : la page y fait patienter la lecture tant qu'un
   * message audio se réécoute et jusqu'à ce que le bloc apparaisse à l'écran. false : le bloc n'est pas lu.
   */
  avantBloc?: (idTour: string, rang: number) => Promise<boolean>;
  surOutilsEnCours: RappelsPageBambara["surOutilsEnCours"];
  surVisuels: RappelsPageBambara["surVisuels"];
  /** Réponse brute du modèle écrite jusqu'ici, à chaque morceau reçu, et `fini` à la dernière fois. */
  surTexte: (brut: string, fini: boolean) => void;
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
  const lectureRef = useRef<LectureBlocs | null>(null);
  const contexteRef = useRef<AudioContext | null>(null);

  const liberer = useCallback(() => {
    lectureRef.current?.annuler();
    lectureRef.current = null;
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
    const idTour = o.avantEnvoi(question);

    const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const contexte = new Contexte();
    contexteRef.current = contexte;
    const lecteur = creerLecteurBambara(contexte, (t) => synthetiserVoixBambara(t));
    lecteurRef.current = lecteur;
    setEtat("travail");

    try {
      const voix = await lireEtatVoixBambara();
      // Chaque bloc de texte de la réponse est lu à part, dès qu'il est complet (lib/lectureBlocsBambara.ts).
      const lecture = voix.disponible
        ? creerLectureBlocs({
            lecteur,
            texteMax: voix.texte_max,
            avantBloc: (rang) => (courante() ? (o.avantBloc ? o.avantBloc(idTour, rang) : Promise.resolve(true)) : Promise.resolve(false)),
            surDebutBloc: () => { if (courante()) setEtat("reponse"); },
            surAudioBloc: (rang, message) => o.surAudioBloc?.(idTour, rang, message),
          })
        : null;
      lectureRef.current = lecture;
      const reponse = await demanderPageBambara(question, o.conversationId(), {
        surOutilsEnCours: (noms) => { if (courante()) o.surOutilsEnCours(noms); },
        surVisuels: (visuels) => { if (courante()) o.surVisuels(visuels); },
        surTexte: (cumule) => {
          if (!courante()) return;
          o.surTexte(cumule, false);
          lecture?.suivre(cumule, false);
        },
        surIds: (ids) => { if (courante()) o.surIds?.(idTour, ids); },
      });
      if (!courante()) {
        lecture?.annuler();
        return;
      }
      o.surTexte(reponse, true);
      if (!lecture) return;
      lecture.suivre(reponse, true);
      await lecture.terminer();
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

  /** Coupe seulement la voix (un message audio va être réécouté) : le texte de la réponse continue d'arriver. */
  const couperVoix = useCallback(() => {
    lecteurRef.current?.interrompre();
  }, []);

  const niveau = useCallback(() => lecteurRef.current?.niveau() ?? 0, []);

  useEffect(() => () => {
    numeroRef.current += 1;
    liberer();
  }, [liberer]);

  return { etat, actif: etat !== "inactif", envoyer, arreter, couperVoix, niveau };
}
