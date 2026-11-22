// Page bambara (22/11/2026, demande de Bourama : « comme chez Google Images ») : le calcul partagé par les vraies
// vignettes (CarteVisuelBambara.tsx) et par les cases d'attente (EffetConstruction.tsx), pour que les deux aient
// exactement la même forme. Les images forment des rangées de hauteur égale : chaque vignette est large à la mesure
// de sa photo (largeur divisée par hauteur = le ratio), et la rangée s'étire pour remplir la ligne. La hauteur d'une
// rangée est --bb-hauteur-rangee, définie par .bb-rangees-images dans bambara.css (plus haute sur grand écran).

import type { CSSProperties } from "react";

// Une photo très large ou très haute est rognée à ces limites, comme sur Google : sinon elle prendrait toute une ligne.
export const RATIO_MIN = 0.6;
export const RATIO_MAX = 2.4;
// Ratio avant que la photo soit chargée : une photo moyenne, la vignette s'ajuste dès que la vraie taille est connue.
export const RATIO_ATTENTE = 1.4;

export function limiterRatio(largeur: number, hauteur: number): number {
  if (!largeur || !hauteur) return RATIO_ATTENTE;
  return Math.min(RATIO_MAX, Math.max(RATIO_MIN, largeur / hauteur));
}

/** Style d'une vignette de rangée : sa largeur suit le ratio, elle grandit en proportion pour remplir la ligne. */
export function styleRangee(ratio: number): CSSProperties {
  return { flexGrow: Math.round(ratio * 100), flexShrink: 1, flexBasis: `calc(var(--bb-hauteur-rangee) * ${ratio})` };
}

/** Espace vertical qui donne à la vignette sa hauteur d'après son ratio (la hauteur suit la largeur réelle). */
export function styleHauteur(ratio: number): CSSProperties {
  return { display: "block", paddingBottom: `${(100 / ratio).toFixed(3)}%` };
}
