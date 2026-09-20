"use client";

// Chantier agent applicatif (voir plan-agent-applicatif-clovis.md),
// chantier F : mode générique de secours (DOM + sélecteur), pour tout
// ce qui n'a pas encore d'action déclarée via le chantier A. Le modèle
// doit toujours préférer lister_actions_disponibles puis
// executer_action_application, et n'utiliser ce mode qu'en dernier
// recours (rappelé dans le docstring de l'outil côté backend).
//
// Depuis le 19/09/2026 (décision Bourama), aucune confirmation n'est
// demandée avant un clic : l'exécution est directe (voir
// lib/canalAgentApplicatif.ts).

// Informations de style d'un noeud, lues une seule fois par scan quand un
// cache est fourni (un scan interroge des centaines d'éléments qui
// partagent les mêmes parents, inutile de relire leur style à chaque
// fois).
type InfoNoeud = {
  transparent: boolean;
  affichageContenu: boolean;
  coupeX: boolean;
  coupeY: boolean;
  defile: boolean;
  position: string;
  creeBlocConteneur: boolean;
  // Seulement lu pour les noeuds qui coupent leur contenu ou qui défilent.
  rect: DOMRect | null;
};

export type CacheAffichage = Map<HTMLElement, InfoNoeud>;

// Tolérance en pixels pour ne pas conclure à tort sur un arrondi.
const TOLERANCE_PX = 0.5;

function coupeLeContenu(valeur: string): boolean {
  return valeur === "hidden" || valeur === "clip";
}

function defileSurAxe(valeur: string): boolean {
  return valeur === "auto" || valeur === "scroll" || valeur === "overlay";
}

// Un ancêtre avec transform, filter, etc. devient le repère des
// éléments en position fixed ou absolute qu'il contient : leur position
// (et leur découpe) se calcule alors par rapport à lui.
function creeUnBlocConteneur(style: CSSStyleDeclaration): boolean {
  if (style.transform && style.transform !== "none") return true;
  if (style.filter && style.filter !== "none") return true;
  if (style.perspective && style.perspective !== "none") return true;
  if (style.willChange && /transform|filter|perspective/.test(style.willChange)) return true;
  if (style.contain && /paint|layout|strict|content/.test(style.contain)) return true;
  return false;
}

function lireInfoNoeud(noeud: HTMLElement, cache?: CacheAffichage): InfoNoeud {
  const enCache = cache?.get(noeud);
  if (enCache) return enCache;

  const style = window.getComputedStyle(noeud);
  const coupeX = coupeLeContenu(style.overflowX);
  const coupeY = coupeLeContenu(style.overflowY);
  const defile = defileSurAxe(style.overflowX) || defileSurAxe(style.overflowY);
  const info: InfoNoeud = {
    transparent: style.opacity === "0",
    affichageContenu: style.display === "contents",
    coupeX,
    coupeY,
    defile,
    position: style.position,
    creeBlocConteneur: creeUnBlocConteneur(style),
    rect: coupeX || coupeY || defile ? noeud.getBoundingClientRect() : null,
  };
  cache?.set(noeud, info);
  return info;
}

function ancetreServantDeRepere(
  noeud: HTMLElement,
  accepte: (info: InfoNoeud) => boolean,
  cache?: CacheAffichage
): HTMLElement | null {
  let parent = noeud.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    if (accepte(lireInfoNoeud(parent, cache))) return parent;
    parent = parent.parentElement;
  }
  return null;
}

function leDocumentDefile(): boolean {
  const defilant = document.scrollingElement;
  if (!defilant) return false;
  return defilant.scrollHeight > defilant.clientHeight + 1 || defilant.scrollWidth > defilant.clientWidth + 1;
}

/**
 * Vrai si l'élément est réellement affiché à l'écran, pas seulement
 * présent dans la page avec une taille. Correctif du 20/09/2026
 * (Bourama : "l'IA voit les éléments mais clique au mauvais endroit") :
 * une zone repliée (par exemple "Avis sur Classinus" dans le menu du
 * profil) garde ses boutons dans la page avec leur vraie taille, mais
 * son parent, à hauteur zéro, les cache entièrement. Clovis les voyait
 * donc comme disponibles et son curseur partait vers un endroit vide.
 *
 * Deux cas sont écartés, et seulement quand c'est certain :
 * - l'élément est entièrement caché par un parent qui coupe son
 *   contenu (overflow hidden ou clip) ;
 * - l'élément est entièrement hors de l'écran et rien ne permet de
 *   l'y ramener (pas de parent qui défile, page qui ne défile pas).
 * Un élément à moitié caché reste disponible, et un élément dans une
 * zone qui défile reste disponible (le scrollIntoView de l'appelant
 * le ramène à l'écran).
 */
function estAfficheALEcran(element: HTMLElement, rect: DOMRect, cache?: CacheAffichage): boolean {
  let courant = element;
  let infoCourant = lireInfoNoeud(element, cache);
  let peutDefiler = false;
  let fixeSansRepere = false;
  // Position à comparer aux parents qui coupent leur contenu. Dès qu'une
  // zone défilante entoure l'élément, sa position actuelle ne prouve
  // plus rien (un défilement le ramène dans la zone) : on retient alors
  // la zone défilante elle même.
  let rectEffectif = rect;

  for (;;) {
    // Le parent qui peut réellement couper cet élément dépend de sa
    // position : un élément fixed ou absolute échappe aux parents qui
    // ne lui servent pas de repère.
    let parent: HTMLElement | null;
    if (infoCourant.position === "fixed") {
      parent = ancetreServantDeRepere(courant, (info) => info.creeBlocConteneur, cache);
      if (!parent) {
        fixeSansRepere = true;
        break;
      }
    } else if (infoCourant.position === "absolute") {
      parent = ancetreServantDeRepere(
        courant,
        (info) => info.position !== "static" || info.creeBlocConteneur,
        cache
      );
    } else {
      parent = courant.parentElement;
    }

    if (!parent || parent === document.body || parent === document.documentElement) break;

    const info = lireInfoNoeud(parent, cache);
    if (!info.affichageContenu) {
      if (info.rect) {
        const zone = info.rect;
        if (
          info.coupeX &&
          (rectEffectif.right <= zone.left + TOLERANCE_PX || rectEffectif.left >= zone.right - TOLERANCE_PX)
        ) {
          return false;
        }
        if (
          info.coupeY &&
          (rectEffectif.bottom <= zone.top + TOLERANCE_PX || rectEffectif.top >= zone.bottom - TOLERANCE_PX)
        ) {
          return false;
        }
        if (info.defile) {
          peutDefiler = true;
          rectEffectif = zone;
        }
      }
    }

    courant = parent;
    infoCourant = info;
  }

  const horsEcran =
    rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight;
  // Une zone qui défile entre l'élément et son support peut le ramener à
  // l'écran. Sinon, la page elle même ne le peut que si l'élément n'est
  // pas dans un bloc fixe.
  if (horsEcran && !peutDefiler && (fixeSansRepere || !leDocumentDefile())) return false;

  return true;
}

// Attribut posé sur les éléments que le canal en direct superpose lui même
// à l'application (curseur de Clovis, bulle, boutons du canal). Ils ne
// comptent jamais comme "un élément qui en masque un autre" : sinon un
// bouton de la page passerait pour masqué dès que la bulle est au dessus.
export const ATTRIBUT_SUPERPOSITION = "data-agent-superposition";

// Points testés dans l'élément (fractions de sa partie visible) : le
// centre et les quatre quarts.
const POINTS_TEST_MASQUAGE: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.5],
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75],
];

/**
 * Vrai si l'élément est recouvert par un AUTRE élément de l'application
 * (fenêtre, popup, menu ouvert, fond opaque) : un vrai clic à cet endroit
 * tomberait sur ce qui le recouvre, pas sur lui. Ajouté le 20/09/2026
 * (Bourama : "les popups passent en dessus, ce qui empêche l'IA de voir
 * et de cliquer") : sans ça, Clovis voyait dans sa liste les boutons de la
 * page cachés derrière une popup, alors qu'il ne pouvait pas les atteindre.
 *
 * Réponse "masqué" seulement quand c'est CERTAIN : les cinq points testés
 * dans la partie visible de l'élément sont tous recouverts par un élément
 * sans rapport avec lui. Si un seul point montre l'élément (ou l'un de ses
 * parents ou enfants, ou son libellé), il reste disponible. Comme
 * elementsFromPoint, le test suit la même règle que la souris : un
 * élément en pointer-events none ne masque rien, et les éléments
 * superposés par le canal lui même sont ignorés.
 */
export function estMasqueParAutreElement(element: HTMLElement, cache?: CacheAffichage): boolean {
  if (typeof document === "undefined") return false;
  const rect = element.getBoundingClientRect();
  let gauche = Math.max(rect.left, 0);
  let droite = Math.min(rect.right, window.innerWidth);
  let haut = Math.max(rect.top, 0);
  let bas = Math.min(rect.bottom, window.innerHeight);

  // Partie de l'élément réellement visible : on retire ce que coupent ou
  // font défiler ses parents. Un élément dont la partie visible est vide
  // est simplement hors de sa zone de défilement (le scrollIntoView de
  // l'appelant le ramène), pas masqué : sans ça, tout ce qui est en bas
  // d'une longue liste passerait à tort pour recouvert par ce qu'il y a
  // sous la liste.
  const cacheLocal = cache ?? new Map<HTMLElement, InfoNoeud>();
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const info = lireInfoNoeud(parent, cacheLocal);
    if (info.rect && (info.coupeX || info.coupeY || info.defile)) {
      gauche = Math.max(gauche, info.rect.left);
      droite = Math.min(droite, info.rect.right);
      haut = Math.max(haut, info.rect.top);
      bas = Math.min(bas, info.rect.bottom);
    }
    parent = parent.parentElement;
  }

  // Rien (ou presque rien) de visible : ce cas relève de estAfficheALEcran
  // et du défilement, pas du masquage.
  if (droite - gauche < 2 || bas - haut < 2) return false;

  for (const [fx, fy] of POINTS_TEST_MASQUAGE) {
    const x = gauche + (droite - gauche) * fx;
    const y = haut + (bas - haut) * fy;
    const dessus = document
      .elementsFromPoint(x, y)
      .find((candidat) => !candidat.closest(`[${ATTRIBUT_SUPERPOSITION}]`));
    // Aucun élément de l'application à ce point : incertain, on ne conclut pas.
    if (!dessus) return false;
    if (dessus === element || element.contains(dessus) || dessus.contains(element)) return false;
    if (dessus instanceof HTMLLabelElement && dessus.control === element) return false;
  }
  return true;
}

/**
 * Vrai si l'élément est réellement visible et actionnable à l'instant
 * présent -- jamais mémorisé, toujours recalculé au moment de l'appel
 * (même principe que obtenirActionsDisponibles pour le chantier A).
 * `cache` est facultatif : le scan en fournit un pour ne lire qu'une
 * fois le style de chaque parent commun. Un élément recouvert par une
 * popup ou une fenêtre n'est PAS disponible (voir estMasqueParAutreElement).
 */
export function estVisibleEtActif(element: HTMLElement, cache?: CacheAffichage): boolean {
  return estVisibleEtActifSansMasquage(element, cache) && !estMasqueParAutreElement(element, cache);
}

/**
 * Mêmes vérifications que estVisibleEtActif, sauf celle du masquage :
 * sert à savoir si un élément est bien là mais recouvert (pour le dire
 * clairement à Clovis) plutôt que simplement absent.
 */
export function estVisibleEtActifSansMasquage(element: HTMLElement, cache?: CacheAffichage): boolean {
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-disabled") === "true") return false;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.display === "none") return false;

  // L'opacité, contrairement à visibility/display/pointer-events, ne se
  // transmet pas aux enfants via l'héritage CSS : un parent à
  // opacity-0 (popup fermé animé en CSS, ex: menu bouton utilitaire de
  // BarreDeSaisie.tsx) laisse donc les éléments à l'intérieur avec leur
  // propre opacité par défaut (1), même invisibles à l'écran. On
  // remonte donc explicitement la chaîne des parents pour vérifier ça
  // en plus.
  let parent: HTMLElement | null = element;
  while (parent) {
    if (lireInfoNoeud(parent, cache).transparent) return false;
    parent = parent.parentElement;
  }

  return estAfficheALEcran(element, rect, cache);
}

/**
 * Résout un sélecteur CSS vers un unique élément cliquable actuellement
 * monté, visible et actif. Renvoie null aussi bien si l'élément est
 * introuvable QUE s'il est trouvé mais indisponible -- l'appelant
 * traite les deux cas de la même façon ("ignore", pour laisser une
 * chance à une autre connexion du même compte, voir
 * lib/canalAgentApplicatif.ts), jamais une supposition sur pourquoi
 * l'élément n'est pas utilisable ici.
 */
export function resoudreElementCliquable(selecteur: string): HTMLElement | null {
  let element: Element | null;
  try {
    element = document.querySelector(selecteur);
  } catch {
    // Sélecteur CSS syntaxiquement invalide fourni par le modèle.
    return null;
  }
  if (!(element instanceof HTMLElement)) return null;
  if (!estVisibleEtActif(element)) return null;
  return element;
}
