// Regle de lisibilite des tableaux du chat : jamais de defilement horizontal,
// jamais d'elargissement hors de la colonne de texte, jamais de cartes.
// Le tableau reste dans la colonne : le texte des cases passe a la ligne (le
// tableau s'allonge) et il devient plus petit quand il y a beaucoup de colonnes.
// Colonnes comptees en totalite, colonne des noms de lignes comprise.
export function classeTailleTableau(nbColonnes: number): string {
  if (nbColonnes <= 3) return "text-sm";
  if (nbColonnes === 4) return "text-[13px]";
  if (nbColonnes === 5) return "text-xs";
  if (nbColonnes <= 7) return "text-[11px]";
  return "text-[10px]";
}
