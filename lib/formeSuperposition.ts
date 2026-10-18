"use client";

// Cree le 18/10/2026, Bourama : la fenetre de superposition PC ne doit plus couvrir tout
// l'ecran (elle prenait le focus, figeait la fenetre du dessous, cachait des choses).
// Elle garde sa taille mais est DECOUPEE a la forme de ce que Classinus dessine : en dehors
// de ces zones, Windows ne voit plus aucune fenetre Classinus (rien n'est peint, aucun clic
// n'est recu, tout traverse vers l'application dessous).
//
// Ce module est cote PAGE de superposition : il mesure ce qui est affiche et previent le
// processus principal d'Electron (plugin SuperpositionAgent, methode definirForme), qui
// applique la forme avec BrowserWindow.setShape (voir forme.mts du paquet
// capacitor-superposition-electron).
//
// Ce qui est mesure (tout ce qui est visible, rien de plus) :
// - chaque element en position "fixed" (curseur, bulle, boutons, journal, menus, fenetres) avec
//   tout ce qui en depasse (un menu "absolute" qui s'ouvre au dessus d'un bouton) ;
// - un conteneur "fixed" qui coupe son contenu (defilement) compte pour sa seule boite ;
// - data-agent-forme="exclure" : conteneur plein ecran qui ne peint presque rien (marques,
//   couche du crayon), ignore ;
// - data-agent-forme="inclure" : ce qu'il peint vraiment (une marque, les traits), ajoute meme
//   s'il est dans un conteneur exclu.
// Une marge entoure chaque zone (ombres, deplacement entre deux mesures).
//
// Ce module ne decide rien sur les clics : le passe-clic reste decide par le plugin
// (suivreSouris). Il ne fait que reduire la surface occupee par la fenetre.

import { definirFormeSuperposition } from "@/lib/superpositionElectron";

// `interactif` : contient un element qui doit recevoir la souris (data-agent-superposition="true").
// Une zone d'affichage seul (marque, trait) laisse passer le clic quand le pointeur est dessus.
export type RectForme = { x: number; y: number; largeur: number; hauteur: number; interactif?: boolean };
const SELECTEUR_INTERACTIF = '[data-agent-superposition="true"]';

export const ATTRIBUT_FORME = "data-agent-forme";
export const FORME_EXCLURE = "exclure";
export const FORME_INCLURE = "inclure";
// A etaler sur un element : { ...PROPS_FORME_EXCLURE } ou { ...PROPS_FORME_INCLURE }.
export const PROPS_FORME_EXCLURE = { [ATTRIBUT_FORME]: FORME_EXCLURE } as const;
export const PROPS_FORME_INCLURE = { [ATTRIBUT_FORME]: FORME_INCLURE } as const;

// Marge autour de chaque zone : ombres des boutons et des bulles (shadow-xl, ~25 px), et
// avance d'un element en mouvement (curseur : ~15 px par image) entre deux mesures.
export const MARGE_FORME_PX = 40;
// Au dela, la forme est remplacee par un seul rectangle englobant (pas de liste interminable).
export const NB_MAX_RECTS_FORME = 48;
// Ecart sous lequel deux mesures sont considerees identiques (pas d'envoi pour un demi pixel).
const TOLERANCE_PX = 1;
// Filet de securite : remesure meme sans evenement (transition CSS sans mutation du DOM).
const INTERVALLE_FILET_MS = 400;

function enAnimation(element: Element): boolean {
  return typeof element.getAnimations === "function" && element.getAnimations().length > 0;
}

function estAffiche(element: Element, style: CSSStyleDeclaration): boolean {
  if (style.display === "none" || style.visibility === "hidden") return false;
  // Une opacite a zero cache l'element, sauf s'il est en train d'apparaitre (transition).
  if (Number.parseFloat(style.opacity) === 0 && !enAnimation(element)) return false;
  return true;
}

function coupeSonContenu(style: CSSStyleDeclaration): boolean {
  return style.overflowX !== "visible" || style.overflowY !== "visible";
}

function contenu(a: RectForme, b: RectForme): boolean {
  // Une zone interactive ne disparait jamais dans une zone d'affichage seul.
  if (b.interactif && !a.interactif) return false;
  return (
    a.x <= b.x + TOLERANCE_PX &&
    a.y <= b.y + TOLERANCE_PX &&
    a.x + a.largeur >= b.x + b.largeur - TOLERANCE_PX &&
    a.y + a.hauteur >= b.y + b.hauteur - TOLERANCE_PX
  );
}

/** Retire les zones entierement contenues dans une autre, puis plafonne le nombre de zones. */
export function reduireRects(rects: RectForme[]): RectForme[] {
  // Ordre stable (aire, puis position) : deux mesures identiques donnent la meme liste.
  const parAire = [...rects].sort((a, b) => b.largeur * b.hauteur - a.largeur * a.hauteur || a.y - b.y || a.x - b.x);
  const gardes: RectForme[] = [];
  for (const r of parAire) {
    if (!gardes.some((g) => contenu(g, r))) gardes.push(r);
  }
  if (gardes.length <= NB_MAX_RECTS_FORME) return gardes;
  const gauche = Math.min(...gardes.map((r) => r.x));
  const haut = Math.min(...gardes.map((r) => r.y));
  const droite = Math.max(...gardes.map((r) => r.x + r.largeur));
  const bas = Math.max(...gardes.map((r) => r.y + r.hauteur));
  return [{ x: gauche, y: haut, largeur: droite - gauche, hauteur: bas - haut, interactif: gardes.some((r) => r.interactif) }];
}

export function memesRects(a: RectForme[] | null, b: RectForme[]): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every((r, i) =>
    Math.abs(r.x - b[i].x) <= TOLERANCE_PX &&
    Math.abs(r.y - b[i].y) <= TOLERANCE_PX &&
    Math.abs(r.largeur - b[i].largeur) <= TOLERANCE_PX &&
    Math.abs(r.hauteur - b[i].hauteur) <= TOLERANCE_PX &&
    Boolean(r.interactif) === Boolean(b[i].interactif)
  );
}

/**
 * Zones occupees par ce que la page affiche, en pixels de la page, marge comprise.
 * Liste vide : rien n'est affiche.
 */
export function calculerRectsForme(doc: Document): RectForme[] {
  const vue = doc.defaultView;
  if (!vue || !doc.body) return [];
  const brutes: RectForme[] = [];

  // `fin` : un trait horizontal ou vertical (soulignement, trait du crayon) a une largeur ou une
  // hauteur nulle une fois mesure, mais il est bien affiche : la marge lui donne sa surface.
  const ajouter = (element: Element, fin = false) => {
    const r = element.getBoundingClientRect();
    if (![r.left, r.top, r.width, r.height].every(Number.isFinite)) return;
    const mesurable = fin ? r.width > 0 || r.height > 0 : r.width > 0 && r.height > 0;
    if (!mesurable) return;
    brutes.push({
      x: r.left - MARGE_FORME_PX,
      y: r.top - MARGE_FORME_PX,
      largeur: r.width + MARGE_FORME_PX * 2,
      hauteur: r.height + MARGE_FORME_PX * 2,
      interactif: element.closest(SELECTEUR_INTERACTIF) !== null,
    });
  };

  const parcourir = (element: Element, dansFixe: boolean) => {
    const style = vue.getComputedStyle(element);
    if (!estAffiche(element, style)) return;
    if (element.getAttribute(ATTRIBUT_FORME) === FORME_EXCLURE) return;
    const fixe = style.position === "fixed";
    if (fixe || dansFixe) {
      ajouter(element);
      // Un element qui coupe son contenu ne montre rien au dela de sa boite.
      if (coupeSonContenu(style)) return;
      for (const enfant of Array.from(element.children)) parcourir(enfant, true);
      return;
    }
    for (const enfant of Array.from(element.children)) parcourir(enfant, false);
  };

  parcourir(doc.body, false);

  // Ce qu'un conteneur exclu peint vraiment (marques, traits du crayon).
  for (const element of Array.from(doc.querySelectorAll(`[${ATTRIBUT_FORME}="${FORME_INCLURE}"]`))) {
    const style = vue.getComputedStyle(element);
    if (estAffiche(element, style)) ajouter(element, true);
  }

  return reduireRects(brutes);
}

/**
 * Suit en continu ce que la page affiche et envoie la forme au processus principal a chaque
 * changement. Retourne la fonction qui arrete le suivi.
 */
export function demarrerSuiviForme(
  doc: Document,
  envoyer: (rects: RectForme[]) => void = definirFormeSuperposition
): () => void {
  const vue = doc.defaultView;
  if (!vue) return () => {};
  let image = 0;
  let dernier: RectForme[] | null = null;
  let arrete = false;

  const mesurer = () => {
    image = 0;
    if (arrete) return;
    const rects = calculerRectsForme(doc);
    if (!memesRects(dernier, rects)) {
      dernier = rects;
      envoyer(rects);
    }
    // Des animations tournent : leurs positions changent sans que le DOM bouge.
    if (typeof doc.getAnimations === "function" && doc.getAnimations().length > 0) planifier();
  };
  function planifier() {
    if (image || arrete) return;
    image = vue!.requestAnimationFrame(mesurer);
  }

  const observateur = new vue.MutationObserver(planifier);
  observateur.observe(doc.documentElement, { childList: true, subtree: true, attributes: true });
  const evenements = ["transitionrun", "transitionend", "animationstart", "animationend", "resize"];
  evenements.forEach((nom) => vue.addEventListener(nom, planifier, true));
  const filet = vue.setInterval(planifier, INTERVALLE_FILET_MS);
  planifier();

  return () => {
    arrete = true;
    observateur.disconnect();
    evenements.forEach((nom) => vue.removeEventListener(nom, planifier, true));
    vue.clearInterval(filet);
    if (image) vue.cancelAnimationFrame(image);
  };
}
