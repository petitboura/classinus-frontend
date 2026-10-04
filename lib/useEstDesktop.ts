"use client";

import { useSyncExternalStore } from "react";

// Meme seuil que la classe md: de Tailwind (768px) : sert a ne monter que la
// version du menu qui est reellement visible, au lieu de monter les deux et de
// masquer l'une par CSS (une instance masquee garde ses ecouteurs actifs).
const REQUETE_DESKTOP = "(min-width: 768px)";

function abonner(rappel: () => void) {
  const media = window.matchMedia(REQUETE_DESKTOP);
  media.addEventListener("change", rappel);
  return () => media.removeEventListener("change", rappel);
}

function lire() {
  return window.matchMedia(REQUETE_DESKTOP).matches;
}

// Cote serveur et pendant l'hydratation : on suppose un ordinateur. Sur
// ordinateur le premier rendu est donc identique a celui du serveur, sans
// element qui apparait apres coup ; sur mobile la version ordinateur est
// retiree des le premier rendu client, sans effet visible puisqu'elle etait
// deja masquee.
function lireServeur() {
  return true;
}

export function useEstDesktop(): boolean {
  return useSyncExternalStore(abonner, lire, lireServeur);
}
