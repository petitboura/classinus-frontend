// Origines de notre propre stockage de fichiers. Une seule règle partagée, au
// lieu d'une copie par composant qui se désynchronisait à chaque changement
// d'adresse. Elle ne bloque plus l'aperçu des documents (FichierChip ouvre
// tout document depuis le 09/10/2026, avec la mention "fichier externe") ;
// elle sert encore à NoteTexteChip et FichierCode, qui ne doivent prendre en
// charge que nos propres fichiers, et à la recherche dans la bibliothèque
// publique.
//
// Le stockage des fichiers est servi par le backend (NEXT_PUBLIC_API_URL) ou
// par Supabase pour les anciens fichiers. Le 22/09/2026 le backend est passé
// sur api.classinus.com : les fichiers enregistrés avant cette date gardent
// l'ancienne adresse dans leur lien, ils doivent donc rester acceptés.
// Les anciennes adresses se règlent sans toucher au code avec la variable
// NEXT_PUBLIC_ANCIENNES_ORIGINES_FICHIERS (adresses séparées par des virgules) ;
// sans elle, l'ancienne adresse Railway connue ci-dessous sert de valeur par défaut.
const ANCIENNES_ORIGINES_PAR_DEFAUT = ["https://clovis-backend-production.up.railway.app"];

function origineDe(adresse: string | undefined): string | null {
  if (!adresse) return null;
  try {
    return new URL(adresse.trim()).origin;
  } catch {
    return null;
  }
}

function listeOriginesFiables(): string[] {
  const anciennes = process.env.NEXT_PUBLIC_ANCIENNES_ORIGINES_FICHIERS
    ? process.env.NEXT_PUBLIC_ANCIENNES_ORIGINES_FICHIERS.split(",")
    : ANCIENNES_ORIGINES_PAR_DEFAUT;
  return [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_API_URL, ...anciennes]
    .map(origineDe)
    .filter((o): o is string => o !== null);
}

export function estOrigineDeConfiance(href: string): boolean {
  const origine = origineDe(href);
  return origine !== null && listeOriginesFiables().includes(origine);
}
