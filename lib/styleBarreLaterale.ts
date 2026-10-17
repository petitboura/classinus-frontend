// Apparence commune des icônes de la barre latérale (rail PC et tiroir mobile
// du chat). Alignée sur les petits boutons sous la barre de saisie (voir
// components/chat/RaccourcisChat.tsx) : icônes petites, trait renforcé. Source
// unique lue par AppSidebar.tsx et MenuGroupeRail.tsx.

/** Taille des icônes des boutons de la barre latérale, en pixels. */
export const TAILLE_ICONE_RAIL = 14;

/** Épaisseur du trait des icônes de la barre latérale (2 par défaut dans lucide). */
export const TRAIT_ICONE_RAIL = 2.25;

/** Taille des icônes dans la bulle des sous-sections sur PC, en pixels. */
export const TAILLE_ICONE_BULLE = 12;

// Espacement du rail PC. La cellule garde la largeur de 40 px (l'icône reste
// centrée quand le rail est replié) mais perd en hauteur, la marge entre deux
// éléments se réduit presque à zéro, et le texte se rapproche de l'icône, pour
// que les icônes fines ne paraissent pas éloignées.
// Le tiroir mobile garde la cellule tactile de 40 px de haut.

/** Cellule d'une icône dans le rail PC. */
export const CELLULE_ICONE_RAIL = "flex h-7 w-10 flex-shrink-0 items-center justify-center";

/** Cellule d'une icône dans le tiroir mobile (taille tactile). */
export const CELLULE_ICONE_TACTILE = "flex h-10 w-10 flex-shrink-0 items-center justify-center";

/** Marge au dessus de chaque élément du rail PC. */
export const ECART_ELEMENTS_RAIL = "mt-0.5";

/** Rapproche le libellé de son icône dans le rail PC. Annule l'écart du gap et
 *  une partie du vide à droite de l'icône (la cellule garde 40 px de large). */
export const RAPPROCHE_LIBELLE_RAIL = "-ml-2.5";
