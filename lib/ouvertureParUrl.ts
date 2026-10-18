import { ROUTES_BIBLIOTHEQUE } from "@/lib/routesBibliotheque";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { obtenirDossierCataloguePublic, type DossierCataloguePublic } from "@/lib/api";

// 18/10/2026, demande Bourama : un lien de partage d'un élément public
// (fichier, dossier ou skill) n'ouvre plus une page dédiée, il ouvre
// l'appli elle-même, sur l'écran où l'élément se trouve, avec l'aperçu
// déjà ouvert comme si la personne avait cliqué dessus. L'adresse change
// au clic et ouvrir cette adresse refait le même aperçu.
//
// Ce fichier est la seule source de vérité des noms de paramètres et des
// adresses : les composants (BibliothequePublique, ComportementsPublics),
// lienPartage (ButtonPartager.tsx) et les pages qui préparent l'aperçu du
// lien (generateMetadata) s'appuient tous dessus, aucune valeur en dur
// ailleurs.

export const PARAMETRES_OUVERTURE = {
  fichier: "fichier",
  dossier: "dossier",
  skill: "skill",
} as const;

export function adresseOuvertureFichierPublic(id: string): string {
  return `${ROUTES_BIBLIOTHEQUE.publique}?${PARAMETRES_OUVERTURE.fichier}=${encodeURIComponent(id)}`;
}

export function adresseOuvertureDossierPublic(id: string): string {
  return `${ROUTES_BIBLIOTHEQUE.publique}?${PARAMETRES_OUVERTURE.dossier}=${encodeURIComponent(id)}`;
}

export function adresseOuvertureSkillPublic(id: string): string {
  return `${ROUTES_PERSONNALISER.skillsPublics}?${PARAMETRES_OUVERTURE.skill}=${encodeURIComponent(id)}`;
}

/**
 * Reconstruit le fil d'ariane d'un dossier public (du plus haut parent
 * jusqu'au dossier lui-même) à partir de son seul id, pour ouvrir
 * directement un sous-dossier depuis un lien.
 *
 * Utilise d'abord la liste de dossiers déjà chargée par l'appli quand
 * elle existe (aucune requête), sinon le détail public d'un dossier
 * (aucune connexion requise), un appel par niveau. La garde de profondeur
 * évite une boucle infinie si les données avaient un cycle.
 */
export async function construirePileDossierPublic(
  id: string,
  dossiersConnus?: DossierCataloguePublic[]
): Promise<{ id: string; nom: string }[]> {
  const pile: { id: string; nom: string }[] = [];
  let courant: string | null = id;
  let profondeur = 0;
  while (courant && profondeur < 30) {
    profondeur += 1;
    const idCourant: string = courant;
    const dossier: Pick<DossierCataloguePublic, "id" | "nom" | "dossier_parent_id"> =
      dossiersConnus?.find((d) => d.id === idCourant) ?? (await obtenirDossierCataloguePublic(idCourant));
    pile.unshift({ id: dossier.id, nom: dossier.nom });
    courant = dossier.dossier_parent_id ?? null;
  }
  return pile;
}
