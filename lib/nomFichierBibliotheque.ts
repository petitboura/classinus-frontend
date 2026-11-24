// Nom affiché d'un fichier de la bibliothèque perso.
//
// Le nom affiché est la description (c'est là que le modèle écrit le nouveau
// nom quand il renomme un fichier du chat), avec le nom d'origine du fichier
// en repli. Avant le 24/11/2026, le backend enregistrait pour chaque fichier
// joint au chat une description générique identique ("Document envoyé en
// conversation", etc.) : tous les fichiers du chat portaient alors le même nom
// à l'écran. Ces anciennes descriptions sont traitées comme vides, pour que le
// vrai nom du fichier s'affiche sans migration. Un nom choisi par le modèle ou
// par l'utilisateur n'est jamais touché.

const DESCRIPTIONS_GENERIQUES_ANCIENNES: ReadonlySet<string> = new Set([
  "Document envoyé en conversation",
  "Image envoyée en conversation",
  "Audio envoyé en conversation",
  "Vidéo envoyée en conversation",
]);

type FichierNommable = {
  nom_fichier: string;
  description: string | null;
};

export function nomAffichageFichier(f: FichierNommable): string {
  const description = (f.description ?? "").trim();
  if (description && !DESCRIPTIONS_GENERIQUES_ANCIENNES.has(description)) return description;
  return f.nom_fichier;
}

// Texte secondaire affiché sous le nom d'un fichier partagé : la description,
// sauf si elle répète le nom du fichier ou si c'est une ancienne description
// générique (sans intérêt pour le lecteur).
export function descriptionUtileFichier(f: FichierNommable): string | null {
  const description = (f.description ?? "").trim();
  if (!description) return null;
  if (DESCRIPTIONS_GENERIQUES_ANCIENNES.has(description)) return null;
  if (description === f.nom_fichier) return null;
  return description;
}
