"use client";

import { useEffect, useRef } from "react";
import { declarerAction, retirerAction } from "./actionsApplicatives";

type OptionsDeclarerAction = {
  id: string;
  description: string;
  actif: boolean;
  // Défauts prudents (décision Bourama) : sensible tant que non précisé,
  // jamais de poursuite en arrière-plan tant que non précisé.
  sensible?: boolean;
  continuerEnArrierePlan?: boolean;
  executer: () => void | Promise<void>;
  // Ajout chantier G (16/09/2026) : ref React classique posée sur
  // l'élément DOM concerné (ex: <button ref={ref}>). Optionnelle --
  // permet au curseur virtuel de s'y déplacer avant exécution ou pour
  // un simple pointage (mode guidage), sans effet si omise.
  ref?: React.RefObject<HTMLElement | null>;
};

/**
 * À poser dans n'importe quel composant (bouton, champ, section) pour
 * déclarer une action que Clovis peut exécuter à la place de
 * l'étudiant. Se réinscrit automatiquement à chaque changement de
 * `actif`/`description` (ex: un bouton qui devient actif/inactif selon
 * le formulaire), et se désinscrit TOUJOURS au démontage -- c'est ce qui
 * garantit qu'une action jamais visible à l'écran n'apparaît jamais dans
 * obtenirActionsDisponibles().
 *
 * `executer` est passé par référence à chaque rendu via une ref interne
 * (pas besoin que l'appelant le mémoïse avec useCallback) : c'est
 * toujours la dernière version qui est appelée.
 */
export function useDeclarerAction(options: OptionsDeclarerAction): void {
  const executerRef = useRef(options.executer);
  executerRef.current = options.executer;

  const { id, description, actif, sensible = true, continuerEnArrierePlan = false, ref } = options;

  useEffect(() => {
    declarerAction({
      id,
      description,
      actif,
      sensible,
      continuerEnArrierePlan,
      executer: () => executerRef.current(),
      obtenirElement: ref ? () => ref.current : undefined,
    });
    return () => retirerAction(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, description, actif, sensible, continuerEnArrierePlan, ref]);
}
