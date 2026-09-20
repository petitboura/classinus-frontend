"use client";

// Éléments flottants déplaçables (20/09/2026, demande Bourama : rendre
// déplaçables le bouton du canal en direct avec ses boutons de dictée et
// d'écriture, et le bouton du journal des actions).
//
// Principe : l'élément garde son emplacement d'origine (ancrage CSS
// habituel, marges de la barre du bas et du rail latéral comprises), et on
// lui ajoute seulement un décalage (translate). Rien de ce qui positionne
// l'élément par défaut n'est donc touché, et il suffit de remettre le
// décalage à zéro pour retrouver la place d'origine.
//
// Glisser souris ou doigt (événements Pointer) : un mouvement de moins de
// SEUIL_GLISSEMENT pixels reste un simple clic, jamais un déplacement. Le
// clic qui suit un vrai glissement est ignoré (sinon relâcher le bouton
// après l'avoir déplacé l'activerait). Le décalage n'est pas gardé après un
// rechargement de la page, comme le bouton de découverte (GuideFlottant.tsx).
//
// L'élément reste toujours entièrement visible : bornes à l'écran pendant le
// glissement, et recadrage quand sa taille change (ouverture d'un panneau)
// ou quand la fenêtre se redimensionne.

import { useCallback, useEffect, useRef, useState } from "react";

const SEUIL_GLISSEMENT = 4;
const MARGE = 12;
// Plus grande en haut : le haut de l'écran porte déjà les notifications, le
// menu et, sur téléphone, la barre d'état.
const MARGE_HAUT = 60;
// Un glissement ne démarre jamais depuis un champ de saisie (sélection de
// texte) ni depuis un élément qui se déclare non déplaçable.
const SELECTEUR_NON_DEPLACABLE = "textarea, input, select, [data-pas-deplacement]";

export type Decalage = { x: number; y: number };

/**
 * Correction à appliquer à un déplacement (dx, dy) pour que le rectangle
 * `rect` reste entièrement dans l'écran. Si l'élément est plus grand que la
 * zone disponible, c'est son bord haut/gauche qui prime.
 */
export function bornerDeplacement(
  rect: { left: number; right: number; top: number; bottom: number },
  dx: number,
  dy: number,
  largeurEcran: number,
  hauteurEcran: number
): Decalage {
  const minDx = MARGE - rect.left;
  const maxDx = Math.max(minDx, largeurEcran - MARGE - rect.right);
  const minDy = MARGE_HAUT - rect.top;
  const maxDy = Math.max(minDy, hauteurEcran - MARGE - rect.bottom);
  return { x: Math.min(Math.max(dx, minDx), maxDx), y: Math.min(Math.max(dy, minDy), maxDy) };
}

export function useDeplacable<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [decalage, setDecalage] = useState<Decalage>({ x: 0, y: 0 });
  const decalageRef = useRef<Decalage>({ x: 0, y: 0 });
  // Vrai pendant un glissement et jusqu'à la fin du clic qui le suit.
  const aGlisse = useRef(false);
  const arreterEcoute = useRef<(() => void) | null>(null);

  const appliquer = useCallback((valeur: Decalage) => {
    decalageRef.current = valeur;
    setDecalage(valeur);
  }, []);

  const surPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || !element) return;
      if ((e.target as HTMLElement).closest(SELECTEUR_NON_DEPLACABLE)) return;
      arreterEcoute.current?.();

      const rectDepart = element.getBoundingClientRect();
      const decalageDepart = decalageRef.current;
      const departX = e.clientX;
      const departY = e.clientY;
      const idPointeur = e.pointerId;
      aGlisse.current = false;
      const selectionAvant = document.body.style.userSelect;

      const surMouvement = (ev: PointerEvent) => {
        if (ev.pointerId !== idPointeur) return;
        const dx = ev.clientX - departX;
        const dy = ev.clientY - departY;
        if (!aGlisse.current) {
          if (Math.hypot(dx, dy) < SEUIL_GLISSEMENT) return;
          aGlisse.current = true;
          document.body.style.userSelect = "none";
        }
        const borne = bornerDeplacement(rectDepart, dx, dy, window.innerWidth, window.innerHeight);
        appliquer({ x: decalageDepart.x + borne.x, y: decalageDepart.y + borne.y });
      };

      const terminer = () => {
        window.removeEventListener("pointermove", surMouvement);
        window.removeEventListener("pointerup", terminer);
        window.removeEventListener("pointercancel", terminer);
        arreterEcoute.current = null;
        document.body.style.userSelect = selectionAvant;
        // Le clic qui suit le relâchement est dispatché avant ce délai : il
        // est donc ignoré, mais un clic ultérieur reste normal même si le
        // relâchement a eu lieu hors de l'élément (aucun clic dans ce cas).
        setTimeout(() => {
          aGlisse.current = false;
        }, 0);
      };

      window.addEventListener("pointermove", surMouvement);
      window.addEventListener("pointerup", terminer);
      window.addEventListener("pointercancel", terminer);
      arreterEcoute.current = terminer;
    },
    [element, appliquer]
  );

  const surClicCapture = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!aGlisse.current) return;
    e.stopPropagation();
    e.preventDefault();
  }, []);

  // Recadrage : l'élément change de taille (panneau qui s'ouvre) ou la
  // fenêtre change de taille (rotation du téléphone, clavier).
  useEffect(() => {
    if (!element) return;
    const recadrer = () => {
      const correction = bornerDeplacement(element.getBoundingClientRect(), 0, 0, window.innerWidth, window.innerHeight);
      if (correction.x !== 0 || correction.y !== 0) {
        appliquer({ x: decalageRef.current.x + correction.x, y: decalageRef.current.y + correction.y });
      }
    };
    const observateur = typeof ResizeObserver !== "undefined" ? new ResizeObserver(recadrer) : null;
    observateur?.observe(element);
    window.addEventListener("resize", recadrer);
    return () => {
      observateur?.disconnect();
      window.removeEventListener("resize", recadrer);
    };
  }, [element, appliquer]);

  // Nettoyage si l'élément disparaît en plein glissement.
  useEffect(() => () => arreterEcoute.current?.(), []);

  return {
    /** À passer en `ref` de l'élément à déplacer. */
    ref: setElement,
    /** À fusionner dans le `style` de l'élément à déplacer. */
    style: { transform: `translate(${decalage.x}px, ${decalage.y}px)` } as React.CSSProperties,
    /** À poser sur l'élément qui sert de poignée (ou sur l'élément entier). */
    poignee: { onPointerDown: surPointerDown, onClickCapture: surClicCapture },
  };
}
