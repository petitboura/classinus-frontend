// Repère un bloc de code Markdown (```lang ... ```) qui n'est pas encore
// refermé dans un texte en cours de streaming. Renvoie la ligne (à partir de
// 1) où ce bloc s'ouvre, ou null si tous les blocs sont fermés.
//
// Sert à ne monter un élément riche (diagramme, graphique, QCM, fiche,
// widget...) qu'une seule fois, quand son code est complet, au lieu de le
// recréer à chaque morceau de texte reçu.
export function ligneFenceOuverte(texte: string): number | null {
  const lignes = texte.split("\n");
  let ouverte: { caractere: string; longueur: number; ligne: number } | null = null;

  for (let i = 0; i < lignes.length; i++) {
    const m = /^\s*(`{3,}|~{3,})(.*)$/.exec(lignes[i]);
    if (!m) continue;
    const marque = m[1];
    const reste = m[2];

    if (!ouverte) {
      // Une ouverture avec des accents graves dans l'info n'en est pas une.
      if (marque[0] === "`" && reste.includes("`")) continue;
      ouverte = { caractere: marque[0], longueur: marque.length, ligne: i + 1 };
    } else if (marque[0] === ouverte.caractere && marque.length >= ouverte.longueur && reste.trim() === "") {
      ouverte = null;
    }
  }

  return ouverte ? ouverte.ligne : null;
}
