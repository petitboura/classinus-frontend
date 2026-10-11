// Crayon du canal en direct sur PC (11/10/2026, demande Bourama) : l'étudiant
// entoure ou souligne ce qu'il veut montrer à Classinus, directement sur son écran.
// Ce fichier ne contient que l'état et les règles du dessin ; l'affichage est dans
// components/CoucheCrayonAgent.tsx et les boutons dans components/BoutonsCrayonCanal.tsx.
//
// Règles :
// - plusieurs traits possibles, ils restent affichés ensemble ;
// - 10 secondes après le dernier trait, tous les traits s'estompent mais restent
//   gardés en mémoire : on peut les faire réapparaître ;
// - effacer les supprime pour de bon ;
// - dessiner un nouveau trait alors que les anciens sont estompés repart d'une
//   feuille vide, pour ne pas faire resurgir un vieux dessin au milieu d'un nouveau.
//
// L'état vit dans la page qui dessine (la fenêtre de superposition), il n'est pas
// partagé avec la fenêtre principale.

import { useSyncExternalStore } from "react";

export const DUREE_AFFICHAGE_TRAITS_MS = 10000;
// Durée du fondu à l'estompage et à l'effacement, reprise par l'affichage.
export const DUREE_FONDU_TRAITS_MS = 400;

const NB_MAX_TRAITS = 20;
const NB_MAX_POINTS_PAR_TRAIT = 1500;
// Un point trop proche du précédent n'apporte rien au tracé.
const ECART_MIN_ENTRE_POINTS = 2;

export type PointTrait = { x: number; y: number };
export type Trait = { id: number; points: PointTrait[] };

export type EtatCrayon = {
  actif: boolean;
  traits: Trait[];
  // Traits affichés à l'écran (faux pendant le fondu et une fois estompés).
  visibles: boolean;
  // Vrai tant que des traits estompés peuvent encore être rappelés.
  restaurable: boolean;
};

const ETAT_INITIAL: EtatCrayon = { actif: false, traits: [], visibles: true, restaurable: false };

let etat: EtatCrayon = ETAT_INITIAL;
let traitEnCours: Trait | null = null;
let compteurTraits = 0;
let minuteurEstompage: ReturnType<typeof setTimeout> | null = null;
let minuteurVidage: ReturnType<typeof setTimeout> | null = null;
const abonnes = new Set<() => void>();

function changer(suite: Partial<EtatCrayon>) {
  etat = { ...etat, ...suite };
  abonnes.forEach((a) => a());
}

function annulerMinuteurs() {
  if (minuteurEstompage) clearTimeout(minuteurEstompage);
  if (minuteurVidage) clearTimeout(minuteurVidage);
  minuteurEstompage = null;
  minuteurVidage = null;
}

function programmerEstompage() {
  if (minuteurEstompage) clearTimeout(minuteurEstompage);
  minuteurEstompage = setTimeout(() => {
    minuteurEstompage = null;
    if (etat.traits.length > 0) changer({ visibles: false, restaurable: true });
  }, DUREE_AFFICHAGE_TRAITS_MS);
}

export function lireEtatCrayon(): EtatCrayon {
  return etat;
}

export function abonnerCrayon(sur: () => void): () => void {
  abonnes.add(sur);
  return () => {
    abonnes.delete(sur);
  };
}

export function useCrayonEcran(): EtatCrayon {
  return useSyncExternalStore(abonnerCrayon, lireEtatCrayon, () => ETAT_INITIAL);
}

/** Sort ou range le crayon. Ranger le crayon garde les traits déjà dessinés. */
export function basculerCrayon() {
  if (etat.actif) terminerTrait();
  changer({ actif: !etat.actif });
}

/** Canal éteint : plus de crayon, plus de traits. */
export function reinitialiserCrayon() {
  annulerMinuteurs();
  traitEnCours = null;
  if (etat === ETAT_INITIAL) return;
  etat = ETAT_INITIAL;
  abonnes.forEach((a) => a());
}

export function commencerTrait(x: number, y: number) {
  if (!etat.actif || !Number.isFinite(x) || !Number.isFinite(y)) return;
  annulerMinuteurs();
  // Anciens traits estompés : on repart d'une feuille vide.
  const base = etat.visibles ? etat.traits : [];
  compteurTraits += 1;
  traitEnCours = { id: compteurTraits, points: [{ x, y }] };
  changer({ traits: [...base, traitEnCours].slice(-NB_MAX_TRAITS), visibles: true, restaurable: false });
}

export function ajouterPoint(x: number, y: number) {
  if (!traitEnCours || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const points = traitEnCours.points;
  if (points.length >= NB_MAX_POINTS_PAR_TRAIT) return;
  const dernier = points[points.length - 1];
  if (Math.hypot(x - dernier.x, y - dernier.y) < ECART_MIN_ENTRE_POINTS) return;
  // Le trait en cours grandit sur place (pas de copie à chaque mouvement de souris) ;
  // seul l'objet d'état change pour prévenir l'affichage.
  points.push({ x, y });
  changer({});
}

export function terminerTrait() {
  if (!traitEnCours) return;
  traitEnCours = null;
  programmerEstompage();
}

/**
 * Un seul bouton pour les deux cas : traits affichés, il les efface pour de bon ;
 * traits estompés, il les fait réapparaître pour 10 secondes de plus.
 */
export function rappelerOuEffacerTraits() {
  if (etat.traits.length === 0) return;
  annulerMinuteurs();
  if (etat.visibles) {
    changer({ visibles: false, restaurable: false });
    minuteurVidage = setTimeout(() => {
      minuteurVidage = null;
      changer({ traits: [] });
    }, DUREE_FONDU_TRAITS_MS);
    return;
  }
  if (!etat.restaurable) return;
  changer({ visibles: true, restaurable: false });
  programmerEstompage();
}
