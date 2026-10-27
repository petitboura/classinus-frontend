// Regles de lisibilite des elements riches du chat (tableaux, comparatifs) :
// on ne fait jamais defiler un tableau de gauche a droite, on adapte son
// affichage a la place disponible. Les memes nombres sont annonces au LLM
// cote backend (core/origine_appareil.py) : les changer ici, c'est les
// changer aussi la-bas.
//
// Nombres comptes en colonnes TOTALES, colonne des noms de lignes comprise.
export const MAX_COLONNES_TELEPHONE = 3;
export const MAX_COLONNES_PC = 6;
export const MAX_COLONNES_PC_LARGE = 10;

export type ModeTableau = "normal" | "large" | "cartes";

// normal : reste dans la colonne de texte, le texte des cases passe a la ligne.
// large  : s'elargit des deux cotes (BlocLarge), le texte passe a la ligne.
// cartes : une carte empilee par ligne, aucune largeur a gerer.
export function modeTableau(nbColonnes: number, estDesktop: boolean): ModeTableau {
  if (!estDesktop) return nbColonnes <= MAX_COLONNES_TELEPHONE ? "normal" : "cartes";
  if (nbColonnes <= MAX_COLONNES_PC) return "normal";
  return nbColonnes <= MAX_COLONNES_PC_LARGE ? "large" : "cartes";
}
