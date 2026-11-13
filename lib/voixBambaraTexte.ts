// Préparation du texte lu à voix haute dans le mode vocal bambara. L'IA reçoit la consigne de ne
// rien écrire d'enrichi, mais ce qui reste de mise en forme (titres, gras, listes, liens, émojis)
// ne doit jamais être prononcé : on le retire avant d'envoyer le texte à la voix.

/** Retire la mise en forme et tout ce qui ne se prononce pas. */
export function nettoyerPourVoix(texte: string): string {
  return texte
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/[*`~]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function couperSurEspaces(phrase: string, max: number): string[] {
  const morceaux: string[] = [];
  let reste = phrase.trim();
  while (reste.length > max) {
    let coupe = reste.lastIndexOf(" ", max);
    if (coupe <= 0) coupe = max;
    morceaux.push(reste.slice(0, coupe).trim());
    reste = reste.slice(coupe).trim();
  }
  if (reste) morceaux.push(reste);
  return morceaux;
}

/**
 * Découpe un texte en morceaux d'au plus `max` caractères, en coupant de préférence entre deux
 * phrases, pour que la voix commence à parler pendant que la suite est préparée.
 */
export function decouperEnMorceaux(texte: string, max: number): string[] {
  const limite = Math.max(20, Math.floor(max));
  const phrases = texte
    .split(/(?<=[.!?…])\s+|\n+/u)
    .map((p) => p.trim())
    .filter(Boolean);
  const morceaux: string[] = [];
  let courant = "";
  for (const phrase of phrases) {
    const parties = phrase.length > limite ? couperSurEspaces(phrase, limite) : [phrase];
    for (const partie of parties) {
      if (courant && courant.length + 1 + partie.length > limite) {
        morceaux.push(courant);
        courant = partie;
      } else {
        courant = courant ? `${courant} ${partie}` : partie;
      }
    }
  }
  if (courant) morceaux.push(courant);
  return morceaux;
}
