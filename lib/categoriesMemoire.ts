import type { QueryClient } from "@tanstack/react-query";
import { appelerApi } from "@/lib/api";
import { clesRequetes } from "@/lib/clesRequetes";
import { demanderDoubleConfirmationOubli } from "@/lib/confirmationOubliMemoire";

// Catégories de la mémoire de l'élève et effacement d'UNE catégorie
// (29/09/2026, demande Bourama : "Oublier" une catégorie se fait depuis
// l'écran Ma mémoire ET depuis Paramètres, avec la même double
// confirmation). Une seule implémentation ici pour que les deux écrans ne
// puissent pas diverger. Effacer TOUTE la mémoire reste une action de
// Paramètres (components/ParametresAccueil.tsx), avec la même règle de
// confirmation (lib/confirmationOubliMemoire.ts).

// Doit rester alignée avec CATEGORIES_MEMOIRE_ELEVE (core/memoire_eleve.py,
// clovis-backend) : le backend refuse toute autre catégorie.
export const CATEGORIES_MEMOIRE = ["identite", "scolarite", "apprentissage", "preferences"] as const;

const TITRES_CATEGORIES: Record<string, string> = {
  identite: "Identité",
  scolarite: "Scolarité",
  apprentissage: "Apprentissage",
  preferences: "Préférences",
};

export function titreCategorieMemoire(categorie: string): string {
  if (TITRES_CATEGORIES[categorie]) return TITRES_CATEGORIES[categorie];
  const texte = categorie.replace(/_/g, " ");
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

type MemoireEnCache = { categories: { categorie: string; lignes: unknown[] }[] };

/**
 * Double confirmation, puis effacement d'une catégorie. Renvoie le message
 * de succès à afficher, ou null si l'élève a annulé (rien n'est alors
 * envoyé au serveur). Laisse remonter l'erreur de l'appel serveur : chaque
 * écran l'affiche à sa façon.
 */
export async function oublierCategorieMemoire(categorie: string, queryClient: QueryClient): Promise<string | null> {
  const titre = titreCategorieMemoire(categorie);
  if (
    !demanderDoubleConfirmationOubli(
      `Oublier tout ce que Classinus a retenu dans la catégorie « ${titre} » ?`,
      `Tout ce que Classinus a retenu dans « ${titre} » sera effacé.`
    )
  )
    return null;

  await appelerApi(`/api/memoire-eleve/${encodeURIComponent(categorie)}`, { method: "DELETE" });

  // Met à jour le cache déjà chargé (s'il existe) pour que l'écran Ma
  // mémoire n'affiche jamais des données périmées après l'effacement.
  queryClient.setQueryData<MemoireEnCache>(clesRequetes.memoire, (ancien) =>
    ancien
      ? { categories: ancien.categories.map((c) => (c.categorie === categorie ? { ...c, lignes: [] } : c)) }
      : ancien
  );
  return `Catégorie « ${titre} » oubliée.`;
}
