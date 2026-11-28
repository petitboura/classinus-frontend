// Apparence commune des icônes de la barre latérale (rail PC et tiroir mobile
// du chat). Source unique lue par AppSidebar.tsx et MenuGroupeRail.tsx.
//
// 27/11/2026, refonte "Calme" demandée par Bourama (branche barre-calme), d'après
// la refonte de Linear : la barre doit s'effacer devant le contenu. Icônes de 16 px
// au trait fin, lignes plus hautes, libellés en graisse moyenne, un seul trait de
// séparation. Cela remplace l'ancienne règle "icônes petites, trait renforcé,
// lignes serrées" (alignée sur RaccourcisChat.tsx) : ne pas la rétablir sans
// demande de Bourama.

/** Taille des icônes des boutons de la barre latérale, en pixels. */
export const TAILLE_ICONE_RAIL = 16;

/** Épaisseur du trait des icônes de la barre latérale (2 par défaut dans lucide). */
export const TRAIT_ICONE_RAIL = 1.75;

// Espacement du rail PC. La cellule garde la largeur de 40 px (l'icône reste
// centrée quand le rail est replié) et mesure 34 px de haut (refonte Calme, elle
// en faisait 28), la marge entre deux éléments reste très petite, et le texte se
// rapproche de l'icône. Le trait sous le bouton du haut dépend de cette hauteur
// (voir AppSidebar.tsx).
// Le tiroir mobile a une cellule tactile de 36 px de haut, des lignes à 4 px
// l'une de l'autre et un libellé près de son icône (retour de Bourama le
// 18/10/2026 : lignes et icônes trop éloignées).

/** Cellule d'une icône dans le rail PC. */
export const CELLULE_ICONE_RAIL = "flex h-[34px] w-10 flex-shrink-0 items-center justify-center";

/** Cellule d'une icône dans le tiroir mobile (taille tactile). */
export const CELLULE_ICONE_TACTILE = "flex h-9 w-8 flex-shrink-0 items-center justify-center";

/** Marge au dessus de chaque ligne du tiroir mobile. */
export const ECART_ELEMENTS_TIROIR = "mt-1";

/** Écart entre l'icône et le libellé dans le tiroir mobile. */
export const ECART_LIBELLE_TIROIR = "gap-1";

/** Marge au dessus de chaque élément du rail PC. */
export const ECART_ELEMENTS_RAIL = "mt-0.5";

/** Rapproche le libellé de son icône dans le rail PC. Annule l'écart du gap et
 *  une partie du vide à droite de l'icône (la cellule garde 40 px de large). */
export const RAPPROCHE_LIBELLE_RAIL = "-ml-2.5";
