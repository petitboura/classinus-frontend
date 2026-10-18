// Cree le 18/10/2026, Bourama : la fenetre de superposition ne couvre plus tout l'ecran, elle
// est decoupee (BrowserWindow.setShape) a la forme de ce que la page affiche. En dehors de
// ces zones, rien n'est peint, aucun clic n'est recu et tout traverse vers l'application
// dessous, sans passer par le passe-clic (setIgnoreMouseEvents).
//
// Module pur (aucune dependance Electron) : les zones recues de la page sont validees,
// converties en coordonnees de fenetre et bornees ici ; l'appel systeme est injecte. Ca
// permet de le tester sur n'importe quel systeme (npm run test:forme-superposition).
//
// Regles qui comptent :
// - une liste VIDE passee a setShape remet la fenetre rectangulaire (toute la surface) :
//   on ne l'envoie jamais pour dire "rien a afficher", on envoie un point de 1 pixel ;
// - tant que la page n'a rien mesure, la fenetre garde sa taille d'origine (elle n'est pas
//   encore montree, voir plugin.mts) ;
// - crayon sorti, toute la fenetre doit capter la souris : forme entiere ;
// - si setShape echoue ou n'existe pas (plateforme, version), la fenetre redevient entiere
//   et on n'insiste plus : l'ancien comportement (fenetre pleine, passe-clic) continue.

export type RectPage = { x: number; y: number; largeur: number; hauteur: number };
export type RectFenetre = { x: number; y: number; width: number; height: number };

// Plafond de zones (la page en envoie deja moins, voir lib/formeSuperposition.ts).
export const NB_MAX_RECTS_FORME = 64;
// Forme quand la page n'affiche rien : un pixel dans un coin, jamais une liste vide.
export const FORME_VIDE: RectFenetre[] = [{ x: 0, y: 0, width: 1, height: 1 }];

function nombreFini(valeur: unknown): valeur is number {
  return typeof valeur === "number" && Number.isFinite(valeur);
}

/**
 * Zones de la page (pixels de la page) vers zones de fenetre (pixels de fenetre, entiers),
 * bornees a la fenetre. Les zones invalides ou hors fenetre sont ignorees. Trop de zones :
 * un seul rectangle englobant.
 */
export function construireForme(rects: unknown, zoom: number, largeur: number, hauteur: number): RectFenetre[] {
  if (!Array.isArray(rects)) return [];
  if (!nombreFini(zoom) || zoom <= 0 || !nombreFini(largeur) || !nombreFini(hauteur) || largeur <= 0 || hauteur <= 0) return [];
  const sortie: RectFenetre[] = [];
  for (const brut of rects) {
    if (typeof brut !== "object" || brut === null) continue;
    const { x, y, largeur: l, hauteur: h } = brut as Record<string, unknown>;
    if (!nombreFini(x) || !nombreFini(y) || !nombreFini(l) || !nombreFini(h) || l <= 0 || h <= 0) continue;
    const gauche = Math.max(0, Math.floor(x * zoom));
    const haut = Math.max(0, Math.floor(y * zoom));
    const droite = Math.min(largeur, Math.ceil((x + l) * zoom));
    const bas = Math.min(hauteur, Math.ceil((y + h) * zoom));
    if (droite <= gauche || bas <= haut) continue;
    sortie.push({ x: gauche, y: haut, width: droite - gauche, height: bas - haut });
  }
  if (sortie.length <= NB_MAX_RECTS_FORME) return sortie;
  const g = Math.min(...sortie.map((r) => r.x));
  const hh = Math.min(...sortie.map((r) => r.y));
  const d = Math.max(...sortie.map((r) => r.x + r.width));
  const b = Math.max(...sortie.map((r) => r.y + r.height));
  return [{ x: g, y: hh, width: d - g, height: b - hh }];
}

export interface DependancesForme {
  // setShape n'existe que sous Windows et Linux.
  plateformeSupportee: boolean;
  // Taille de la fenetre (pixels de fenetre) et zoom de sa page, ou null si elle n'existe plus.
  fenetre: () => { largeur: number; hauteur: number; zoom: number } | null;
  appliquer: (rects: RectFenetre[]) => void;
  // Remet la fenetre rectangulaire (setShape([])).
  reinitialiser: () => void;
  surErreur?: (erreur: unknown) => void;
}

export function creerGestionnaireForme(deps: DependancesForme) {
  let rectsPage: unknown = null;
  let pleinEcran = false;
  let derniereCle: string | null = null;
  let indisponible = false;

  function reappliquer(): void {
    if (!deps.plateformeSupportee || indisponible) return;
    const fenetre = deps.fenetre();
    if (!fenetre) return;
    let rects: RectFenetre[];
    if (pleinEcran) {
      rects = [{ x: 0, y: 0, width: Math.ceil(fenetre.largeur), height: Math.ceil(fenetre.hauteur) }];
    } else if (rectsPage === null) {
      return;
    } else {
      rects = construireForme(rectsPage, fenetre.zoom, fenetre.largeur, fenetre.hauteur);
      if (rects.length === 0) rects = FORME_VIDE;
    }
    const cle = JSON.stringify(rects);
    if (cle === derniereCle) return;
    derniereCle = cle;
    try {
      deps.appliquer(rects);
    } catch (erreur) {
      indisponible = true;
      try { deps.reinitialiser(); } catch { /* fenetre fermee entre temps */ }
      deps.surErreur?.(erreur);
    }
  }

  return {
    /** Zones affichees par la page (pixels de la page), envoyees par definirForme. */
    definirRects(rects: unknown): void {
      rectsPage = rects;
      reappliquer();
    },
    /** Crayon sorti : toute la fenetre capte la souris. */
    definirPleinEcran(actif: boolean): void {
      if (pleinEcran === actif) return;
      pleinEcran = actif;
      reappliquer();
    },
    /** La fenetre vient d'etre recreee ou redimensionnee : la forme doit etre reposee. */
    reposer(): void {
      derniereCle = null;
      reappliquer();
    },
    // Pour les tests.
    estIndisponible: () => indisponible,
  };
}
