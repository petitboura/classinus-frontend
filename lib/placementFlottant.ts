// Règle centrale de placement des éléments flottants ancrés à un bouton
// (menus, listes déroulantes, bulles, volets). Demande Bourama du 17/10/2026 :
// une seule règle pour toute l'app, au lieu d'une correction par bouton ou
// par panneau. Un élément flottant :
//  1. s'ouvre du côté voulu s'il y a la place (réelle, mesurée, jamais estimée),
//  2. sinon s'ouvre de l'autre côté (vers le haut ou vers la gauche),
//  3. sinon il se réduit à la place disponible et défile à l'intérieur de lui-même,
//  4. ne sort jamais de son contenant : la fenêtre ou le panneau qui le porte
//     (élément marqué data-contenant-flottant), sinon l'écran réellement visible
//     (clavier du téléphone exclu).
// Fichier sans React : le calcul est pur, le composant FlottantAncre.tsx et le
// hook usePlacementFlottant s'en servent.

export type CoteFlottant = "bas" | "haut" | "droite" | "gauche";
export type AlignementFlottant = "debut" | "fin" | "centre";

export interface LimitesFlottant {
  haut: number;
  bas: number;
  gauche: number;
  droite: number;
}

export interface ResultatPlacement {
  gauche: number;
  haut: number;
  /** Plafond de hauteur à appliquer : au delà, l'élément défile à l'intérieur. */
  maxHauteur: number;
  /** Plafond de largeur à appliquer. */
  maxLargeur: number;
  cote: CoteFlottant;
}

export const ATTRIBUT_CONTENANT_FLOTTANT = "data-contenant-flottant";
export const MARGE_FLOTTANT_PX = 8;
export const ECART_FLOTTANT_PX = 4;

function borner(valeur: number, min: number, max: number): number {
  return Math.min(Math.max(valeur, min), max);
}

/** Zone dans laquelle un élément flottant a le droit de se trouver : l'écran
 * réellement visible, réduit au contenant (fenêtre ou panneau) le plus proche
 * de l'ancre quand il y en a un. */
export function limitesDe(ancre: Element | null): LimitesFlottant {
  const vv = window.visualViewport;
  const limites: LimitesFlottant = vv
    ? { haut: vv.offsetTop, bas: vv.offsetTop + vv.height, gauche: vv.offsetLeft, droite: vv.offsetLeft + vv.width }
    : { haut: 0, bas: window.innerHeight, gauche: 0, droite: window.innerWidth };
  const contenant = ancre?.closest(`[${ATTRIBUT_CONTENANT_FLOTTANT}]`);
  if (contenant) {
    const r = contenant.getBoundingClientRect();
    limites.haut = Math.max(limites.haut, r.top);
    limites.bas = Math.min(limites.bas, r.bottom);
    limites.gauche = Math.max(limites.gauche, r.left);
    limites.droite = Math.min(limites.droite, r.right);
  }
  return limites;
}

export function calculerPlacement(opts: {
  ancre: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  /** Taille naturelle de l'élément (sans plafond), mesurée. */
  largeur: number;
  hauteur: number;
  limites: LimitesFlottant;
  /** Côtés essayés dans l'ordre. Par défaut : en dessous, puis au dessus. */
  cotes?: CoteFlottant[];
  alignement?: AlignementFlottant;
  marge?: number;
  ecart?: number;
}): ResultatPlacement {
  const { ancre, largeur, hauteur, limites } = opts;
  const marge = opts.marge ?? MARGE_FLOTTANT_PX;
  const ecart = opts.ecart ?? ECART_FLOTTANT_PX;
  const cotes = opts.cotes && opts.cotes.length > 0 ? opts.cotes : (["bas", "haut"] as CoteFlottant[]);
  const alignement = opts.alignement ?? "debut";

  const zone = {
    haut: limites.haut + marge,
    bas: limites.bas - marge,
    gauche: limites.gauche + marge,
    droite: limites.droite - marge,
  };
  const largeurZone = Math.max(0, zone.droite - zone.gauche);
  const hauteurZone = Math.max(0, zone.bas - zone.haut);

  const place: Record<CoteFlottant, number> = {
    bas: zone.bas - (ancre.bottom + ecart),
    haut: ancre.top - ecart - zone.haut,
    droite: zone.droite - (ancre.right + ecart),
    gauche: ancre.left - ecart - zone.gauche,
  };
  const estVertical = (c: CoteFlottant) => c === "bas" || c === "haut";
  const besoin = (c: CoteFlottant) => (estVertical(c) ? hauteur : largeur);

  let cote = cotes.find((c) => place[c] >= besoin(c));
  if (!cote) cote = cotes.reduce((meilleur, c) => (place[c] > place[meilleur] ? c : meilleur), cotes[0]);

  let maxHauteur = hauteurZone;
  let maxLargeur = largeurZone;
  if (estVertical(cote)) maxHauteur = Math.max(0, Math.min(hauteurZone, place[cote]));
  else maxLargeur = Math.max(0, Math.min(largeurZone, place[cote]));

  const l = Math.min(largeur, maxLargeur);
  const h = Math.min(hauteur, maxHauteur);

  let gauche: number;
  let haut: number;
  if (estVertical(cote)) {
    haut = cote === "bas" ? ancre.bottom + ecart : ancre.top - ecart - h;
    gauche =
      alignement === "fin" ? ancre.right - l : alignement === "centre" ? ancre.left + ancre.width / 2 - l / 2 : ancre.left;
  } else {
    gauche = cote === "droite" ? ancre.right + ecart : ancre.left - ecart - l;
    haut =
      alignement === "fin" ? ancre.bottom - h : alignement === "centre" ? ancre.top + ancre.height / 2 - h / 2 : ancre.top;
  }

  gauche = borner(gauche, zone.gauche, Math.max(zone.gauche, zone.droite - l));
  haut = borner(haut, zone.haut, Math.max(zone.haut, zone.bas - h));

  return { gauche, haut, maxHauteur, maxLargeur, cote };
}
