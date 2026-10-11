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

// Raccourcis clavier du crayon, source unique. Format Electron pour le système, et
// libellé affiché dans les infobulles des boutons.
export type ActionCrayon = "basculer" | "rappeler" | "effacer";
export const ACCELERATEURS_CRAYON: Record<ActionCrayon, string> = {
  basculer: "CommandOrControl+Shift+Y",
  rappeler: "CommandOrControl+Shift+U",
  effacer: "CommandOrControl+Shift+L",
};
export const LIBELLES_RACCOURCIS_CRAYON: Record<ActionCrayon, string> = {
  basculer: "Ctrl+Maj+Y",
  rappeler: "Ctrl+Maj+U",
  effacer: "Ctrl+Maj+L",
};
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
  // Raccourcis refusés par le système (déjà pris par une autre application) : l'infobulle
  // de leur bouton n'annonce pas un raccourci qui ne marche pas.
  raccourcisIndisponibles: ActionCrayon[];
};

const ETAT_INITIAL: EtatCrayon = { actif: false, traits: [], visibles: true, restaurable: false, raccourcisIndisponibles: [] };

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

/** Fait réapparaître des traits estompés, pour 10 secondes de plus. Sans effet sinon. */
export function rappelerTraits() {
  if (etat.visibles || !etat.restaurable) return;
  annulerMinuteurs();
  changer({ visibles: true, restaurable: false });
  programmerEstompage();
}

/** Efface les traits pour de bon, affichés ou estompés. */
export function effacerTraits() {
  if (etat.traits.length === 0) return;
  annulerMinuteurs();
  if (!etat.visibles) {
    // Déjà estompés : rien à faire disparaître en fondu.
    changer({ traits: [], restaurable: false });
    return;
  }
  changer({ visibles: false, restaurable: false });
  minuteurVidage = setTimeout(() => {
    minuteurVidage = null;
    changer({ traits: [] });
  }, DUREE_FONDU_TRAITS_MS);
}

/** Le bouton des traits : efface s'ils sont affichés, les rappelle s'ils sont estompés. */
export function rappelerOuEffacerTraits() {
  if (etat.visibles) effacerTraits();
  else rappelerTraits();
}

export function definirRaccourcisIndisponibles(actions: ActionCrayon[]) {
  const pareil = actions.length === etat.raccourcisIndisponibles.length && actions.every((a) => etat.raccourcisIndisponibles.includes(a));
  if (!pareil) changer({ raccourcisIndisponibles: actions });
}
