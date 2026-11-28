"use client";

import { useEffect, useRef } from "react";

// 28/11/2026, demande Bourama : sur telephone, un glissement du doigt vers la
// droite ouvre le menu depuis n'importe ou sur l'ecran du chat, pas seulement
// avec le bouton.
//
// La zone ecoutee est celle qui porte l'attribut data-zone-glissement-menu. Les
// fenetres posees dans le corps de la page (plein ecran, bulles, lecteur) sont
// donc hors jeu d'office. Dans la zone, le geste laisse la priorite a tout ce
// qui se sert deja d'un glissement : contenu qui peut encore defiler vers la
// droite, curseur de reglage, zone qui gere elle meme le doigt, champ en cours
// de saisie, texte selectionne, fenetre ou petit menu ouvert par dessus.

/** Distance horizontale a parcourir avant d'ouvrir. */
const DISTANCE_MIN_PX = 60;
/** Pente maximale (vertical / horizontal) pour que le geste compte comme horizontal. */
const PENTE_MAX = 0.6;
/** Deplacement vertical a partir duquel un geste surtout vertical est abandonne. */
const ABANDON_VERTICAL_PX = 24;
/** Au dela, ce n'est plus un glissement mais un doigt pose. */
const DUREE_MAX_MS = 800;
/** Un element fixe plus haut que ceci est une fenetre ou un panneau, pas un en-tete. */
const HAUTEUR_PANNEAU_PX = 120;

function gesteReserve(cible: Element, zone: Element): boolean {
  if (cible.closest("input[type='range'], [role='slider'], [role='dialog'], [aria-modal='true']")) return true;

  const saisie = cible.closest("input, textarea, [contenteditable='true'], math-field");
  if (saisie && saisie.contains(document.activeElement)) return true;

  for (let el: Element | null = cible; el && el !== zone; el = el.parentElement) {
    const style = window.getComputedStyle(el);
    if (style.touchAction === "none") return true;
    if (style.position === "fixed" && (el as HTMLElement).offsetHeight > HAUTEUR_PANNEAU_PX) return true;
    // Un glissement vers la droite ramene un contenu deja avance vers son debut :
    // il lui revient. Revenu au debut, le geste suivant ouvre le menu.
    const defileEnLargeur = style.overflowX === "auto" || style.overflowX === "scroll";
    if (defileEnLargeur && el.scrollWidth > el.clientWidth + 1 && el.scrollLeft > 0) return true;
  }
  return false;
}

function texteSelectionne(): boolean {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString());
}

export function useGlissementOuvreMenu(actif: boolean, ouvrir: () => void) {
  const ouvrirRef = useRef(ouvrir);
  ouvrirRef.current = ouvrir;

  useEffect(() => {
    if (!actif) return;
    let depart: { x: number; y: number; t: number; id: number } | null = null;

    function debut(e: TouchEvent) {
      depart = null;
      if (e.touches.length !== 1) return;
      // Page agrandie avec deux doigts : le glissement sert a se deplacer dedans.
      if ((window.visualViewport?.scale ?? 1) > 1.01) return;
      const cible = e.target instanceof Element ? e.target : null;
      const zone = cible?.closest("[data-zone-glissement-menu]");
      if (!cible || !zone) return;
      if (zone.querySelector("[data-sans-glissement]")) return;
      if (texteSelectionne() || gesteReserve(cible, zone)) return;
      const doigt = e.touches[0];
      depart = { x: doigt.clientX, y: doigt.clientY, t: e.timeStamp, id: doigt.identifier };
    }

    function suivre(doigt: Touch, instant: number) {
      if (!depart || doigt.identifier !== depart.id) return;
      if (instant - depart.t > DUREE_MAX_MS) {
        depart = null;
        return;
      }
      const dx = doigt.clientX - depart.x;
      const dy = Math.abs(doigt.clientY - depart.y);
      if (dy > ABANDON_VERTICAL_PX && dy > Math.abs(dx)) {
        depart = null;
        return;
      }
      if (dx >= DISTANCE_MIN_PX && dy <= dx * PENTE_MAX) {
        depart = null;
        if (!texteSelectionne()) ouvrirRef.current();
      }
    }

    function mouvement(e: TouchEvent) {
      if (e.touches.length !== 1) depart = null;
      else suivre(e.touches[0], e.timeStamp);
    }

    // Un geste tres vif peut ne donner aucune position intermediaire : le point
    // ou le doigt se leve est lu lui aussi.
    function fin(e: TouchEvent) {
      if (e.touches.length === 0) suivre(e.changedTouches[0], e.timeStamp);
      depart = null;
    }

    function annulation() {
      depart = null;
    }

    const options = { passive: true } as const;
    document.addEventListener("touchstart", debut, options);
    document.addEventListener("touchmove", mouvement, options);
    document.addEventListener("touchend", fin, options);
    document.addEventListener("touchcancel", annulation, options);
    return () => {
      document.removeEventListener("touchstart", debut);
      document.removeEventListener("touchmove", mouvement);
      document.removeEventListener("touchend", fin);
      document.removeEventListener("touchcancel", annulation);
    };
  }, [actif]);
}
