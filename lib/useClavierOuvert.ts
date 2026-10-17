"use client";

import { useSyncExternalStore } from "react";

// Vrai quand le clavier du téléphone est ouvert : un champ de texte a le focus
// sur un écran tactile étroit. Sert à masquer la barre du bas (elle remontait
// au dessus du clavier et mangeait la place) et, avec le canal en direct, à ne
// garder que le champ d'écriture. Le focus est plus fiable que la taille de la
// fenêtre, qui rétrécit déjà avec le clavier (voir interactiveWidget dans
// app/layout.tsx) et change aussi à d'autres moments.
//
// Un seul état partagé : tous les composants qui utilisent ce hook lisent la
// même valeur, avec une seule écoute du focus pour toute l'appli.

const TYPES_SANS_CLAVIER = new Set(["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image", "hidden"]);

function estChampTexte(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) return !TYPES_SANS_CLAVIER.has(el.type) && !el.readOnly && !el.disabled;
  return el instanceof HTMLElement && el.isContentEditable;
}

let ouvert = false;
let ecouteInstallee = false;
const abonnes = new Set<() => void>();

function recalculer() {
  const tactileEtroit =
    window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(max-width: 767px)").matches;
  const suivant = tactileEtroit && estChampTexte(document.activeElement);
  if (suivant === ouvert) return;
  ouvert = suivant;
  abonnes.forEach((f) => f());
}

function installerEcoute() {
  if (ecouteInstallee) return;
  ecouteInstallee = true;
  document.addEventListener("focusin", recalculer);
  // Pendant focusout, le nouvel élément actif n'est pas encore connu : on
  // attend la fin du changement de focus, sinon passer d'un champ à l'autre
  // ferait clignoter l'état.
  document.addEventListener("focusout", () => setTimeout(recalculer, 0));
}

function sAbonner(rappel: () => void) {
  installerEcoute();
  abonnes.add(rappel);
  return () => {
    abonnes.delete(rappel);
  };
}

export function useClavierOuvert(): boolean {
  return useSyncExternalStore(
    sAbonner,
    () => ouvert,
    () => false,
  );
}
