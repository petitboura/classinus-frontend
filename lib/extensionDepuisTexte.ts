// Extension que le texte d'un lien annonce quand l'adresse elle-même n'en a
// pas (ex. https://site.com?download=12725 avec le texte "Liste 2026.pdf").
// Ne renvoie qu'un candidat : chaque appelant le valide contre sa propre liste
// de types connus (documents, images, audio, vidéo).
//
// Une adresse dont le dernier segment du chemin porte déjà un point
// (page.html, rapport.pdf) n'est jamais concernée : son type vient de
// l'adresse, pas du texte.
export function extensionDepuisTexte(href: string, texteLien?: string): string | null {
  if (!texteLien) return null;
  let dernierSegment: string;
  try {
    dernierSegment = new URL(href).pathname.split("/").pop() ?? "";
  } catch {
    return null;
  }
  if (dernierSegment.includes(".")) return null;
  const trouve = texteLien.trim().match(/\.([a-zA-Z0-9]{2,5})$/);
  return trouve ? trouve[1].toLowerCase() : null;
}
