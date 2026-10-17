// Listes sans carte : les lignes sont posées à nu et séparées par un trait qui
// commence après l'icône (aligné sur le texte) et va jusqu'au bord droit. Le
// trait est dessiné par la ligne elle même, sauf pour la dernière de la liste.
// Chaque ligne doit être un enfant direct de son conteneur pour que le dernier
// trait disparaisse. Les décalages valent le padding gauche de la ligne (16 px),
// la largeur de l'icône et l'espace entre l'icône et le texte.

/** Ligne avec une icône de 18 px et un espace de 12 px avant le texte. */
export const LIGNE_TRAIT_ICONE_18 =
  "relative after:absolute after:bottom-0 after:left-[46px] after:right-0 after:h-px after:bg-dj-bordure last:after:hidden";

/** Ligne avec une icône de 16 px et un espace de 12 px avant le texte. */
export const LIGNE_TRAIT_ICONE_16 =
  "relative after:absolute after:bottom-0 after:left-[44px] after:right-0 after:h-px after:bg-dj-bordure last:after:hidden";

/** Ligne avec une pastille d'icône de 28 px et un espace de 8 px avant le texte. */
export const LIGNE_TRAIT_ICONE_28 =
  "relative after:absolute after:bottom-0 after:left-[52px] after:right-0 after:h-px after:bg-dj-bordure last:after:hidden";

/** Épaisseur du trait des icônes des sections et sous-sections (2 par défaut dans lucide). */
export const TRAIT_ICONE_SECTION = 2.5;
