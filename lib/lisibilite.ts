// Regle de lisibilite des tableaux du chat : jamais de cartes, jamais d'en-tete
// colle. Le texte des cases passe a la ligne (le tableau s'allonge) et il devient
// plus petit quand il y a beaucoup de colonnes. Au dela de 7 colonnes le tableau
// peut aussi s'elargir vers les bords puis defiler de gauche a droite, voir
// lib/useTableLargeur.ts.
// Colonnes comptees en totalite, colonne des noms de lignes comprise.
export function classeTailleTableau(nbColonnes: number): string {
  if (nbColonnes <= 3) return "text-sm";
  if (nbColonnes === 4) return "text-[13px]";
  if (nbColonnes === 5) return "text-xs";
  if (nbColonnes <= 7) return "text-[11px]";
  if (nbColonnes <= 9) return "text-[10px]";
  return "text-[9px]";
}
