// Crayon du canal en direct sur PC (11/10/2026, demande Bourama) : l'étudiant
// entoure ou souligne ce qu'il veut montrer à Classinus, directement sur son écran.
// Ce fichier ne contient que l'état et les règles du dessin ; l'affichage est dans
// components/CoucheCrayonAgent.tsx et les boutons dans components/BoutonsCrayonCanal.tsx.
//
// Règles :
// - plusieurs traits possibles, ils restent affichés ensemble ;
// - les traits restent à l'écran tant qu'ils n'ont pas été envoyés à Classinus (décision de
//   Bourama, 11/10/2026) : pas d'effacement automatique avant l'envoi. Une fois envoyés, ils
//   s'estompent au bout de 10 secondes mais restent gardés en mémoire : on peut les faire
//   réapparaître ;
// - effacer (bouton ou raccourci) les fait disparaître de la même façon : ils restent
//   gardés en mémoire et on peut TOUJOURS les faire réapparaître, même effacés à la main
//   (décision de Bourama, 11/10/2026). Seul un nouveau dessin ou l'extinction du canal
//   les fait disparaître pour de bon ;
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
  // Vrai pendant qu'un trait est en train d'être tracé (bouton de la souris enfoncé).
  dessine: boolean;
  // Vrai tant que des traits estompés ou effacés peuvent encore être rappelés.
  restaurable: boolean;
  // Vrai une fois les traits envoyés à Classinus : ils ne sont plus joints aux messages
  // suivants, jusqu'au prochain trait ou jusqu'à leur retour à l'écran.
  envoyes: boolean;
  // Vrai si l'étudiant a effacé les traits lui-même : rappelables, mais plus joints aux
  // messages tant qu'ils ne sont pas revenus à l'écran.
  ecartes: boolean;
  // Raccourcis refusés par le système (déjà pris par une autre application) : l'infobulle
  // de leur bouton n'annonce pas un raccourci qui ne marche pas.
  raccourcisIndisponibles: ActionCrayon[];
};

const ETAT_INITIAL: EtatCrayon = { actif: false, traits: [], visibles: true, dessine: false, restaurable: false, envoyes: false, ecartes: false, raccourcisIndisponibles: [] };

let etat: EtatCrayon = ETAT_INITIAL;
let traitEnCours: Trait | null = null;
let compteurTraits = 0;
let minuteurEstompage: ReturnType<typeof setTimeout> | null = null;
const abonnes = new Set<() => void>();

function changer(suite: Partial<EtatCrayon>) {
  etat = { ...etat, ...suite };
  abonnes.forEach((a) => a());
}

function annulerMinuteurs() {
  if (minuteurEstompage) clearTimeout(minuteurEstompage);
  minuteurEstompage = null;
}

function programmerEstompage() {
  if (minuteurEstompage) clearTimeout(minuteurEstompage);
  minuteurEstompage = setTimeout(() => {
    minuteurEstompage = null;
    // Seuls des traits déjà envoyés s'estompent tout seuls.
    if (etat.traits.length > 0 && etat.envoyes) changer({ visibles: false, restaurable: true });
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
  changer({ traits: [...base, traitEnCours].slice(-NB_MAX_TRAITS), visibles: true, dessine: true, restaurable: false, envoyes: false, ecartes: false });
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
  changer({ dessine: false });
}

/** Les traits viennent d'être envoyés à Classinus : ils s'estompent 10 secondes plus tard. */
export function marquerTraitsEnvoyes() {
  if (etat.traits.length === 0 || etat.envoyes) return;
  changer({ envoyes: true });
  programmerEstompage();
}

/**
 * L'envoi du dessin a échoué (la lecture de l'écran n'a rien donné) : les traits redeviennent
 * à joindre et restent à l'écran, pour réessayer. Sans effet si l'étudiant a déjà effacé les
 * traits lui-même ou commencé un nouveau dessin entre temps.
 */
export function annulerEnvoiTraits() {
  if (etat.traits.length === 0 || !etat.envoyes || etat.ecartes) return;
  annulerMinuteurs();
  changer({ envoyes: false, visibles: true, restaurable: false });
}

/** Fait réapparaître des traits estompés ou effacés. Ils restent jusqu'au prochain envoi ou effacement. */
export function rappelerTraits() {
  if (etat.visibles || !etat.restaurable) return;
  annulerMinuteurs();
  changer({ visibles: true, restaurable: false, envoyes: false, ecartes: false });
}

/** Efface les traits de l'écran. Ils restent gardés en mémoire et peuvent toujours revenir. */
export function effacerTraits() {
  if (etat.traits.length === 0) return;
  annulerMinuteurs();
  changer({ visibles: false, restaurable: true, ecartes: true });
}

/** Vrai s'il y a un dessin à joindre au prochain message : dessiné, pas encore envoyé, pas effacé à la main. */
export function traitsAJoindre(e: Pick<EtatCrayon, "traits" | "envoyes" | "ecartes">): boolean {
  return e.traits.length > 0 && !e.envoyes && !e.ecartes;
}

/** Le bouton des traits : efface s'ils sont affichés, les rappelle sinon (estompés ou effacés). */
export function rappelerOuEffacerTraits() {
  if (etat.visibles) effacerTraits();
  else rappelerTraits();
}

export function definirRaccourcisIndisponibles(actions: ActionCrayon[]) {
  const pareil = actions.length === etat.raccourcisIndisponibles.length && actions.every((a) => etat.raccourcisIndisponibles.includes(a));
  if (!pareil) changer({ raccourcisIndisponibles: actions });
}
