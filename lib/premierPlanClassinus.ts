"use client";

// Canal en direct sur PC (11/10/2026, demande Bourama) : savoir si la fenêtre principale
// de Classinus est celle qui a le focus. Sert à n'envoyer à Classinus la liste de ce qui
// est affiché dans l'appli (boutons, liens, champs, éditeur) et à ne laisser lire la page
// que dans ce cas. Dès qu'on est dans une autre application, seule la lecture d'écran du
// PC travaille. La petite barre flottante (superposition) compte comme une autre fenêtre :
// quand on s'en sert, la fenêtre principale n'a plus le focus.
// Hors de l'appli PC (site, mobile), la réponse est toujours vraie : rien ne change.

import { estDansFenetreSuperposition, surElectron } from "@/lib/superpositionElectron";

export function classinusAuPremierPlan(): boolean {
  if (typeof document === "undefined") return true;
  if (!surElectron() || estDansFenetreSuperposition()) return true;
  return document.hasFocus();
}

/** Prévient à chaque fois que la fenêtre principale gagne ou perd le focus. Renvoie la fonction d'arrêt. */
export function ecouterPremierPlanClassinus(surChangement: (premierPlan: boolean) => void): () => void {
  if (typeof window === "undefined" || !surElectron()) return () => {};
  const prevenir = () => surChangement(classinusAuPremierPlan());
  window.addEventListener("focus", prevenir);
  window.addEventListener("blur", prevenir);
  document.addEventListener("visibilitychange", prevenir);
  return () => {
    window.removeEventListener("focus", prevenir);
    window.removeEventListener("blur", prevenir);
    document.removeEventListener("visibilitychange", prevenir);
  };
}
