import type { MetadataRoute } from "next";
import {
  listerBibliothequePublique,
  rechercherSkillsPublics,
  listerEtablissementsPublics,
  listerDossiersCataloguePublic,
} from "@/lib/api";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import {
  SECTIONS_DECOUVRIR,
  SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE,
  SOUS_PAGES_DECOUVRIR_PERSONNALISER,
  SOUS_PAGES_DECOUVRIR_CONCENTRATION,
  SOUS_PAGES_DECOUVRIR_BUREAU,
} from "@/lib/sectionsDecouvrir";
import { USAGES_DECOUVRIR } from "@/lib/usagesDecouvrir";

const URL_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// 21/11/2026, demande Bourama : le plan du site se refabrique tout seul toutes
// les heures. Un fichier, un dossier ou un skill publié apparaît ainsi sans
// attendre le prochain déploiement (les lectures de l'API ci dessous suivent
// le même rythme).
export const revalidate = 3600;

// Date de dernière modification (lastmod) : seulement quand une vraie date
// existe dans les données. Les pages fixes n'en reçoivent pas, car une date
// inventée (celle du build) ferait ignorer toutes les dates par les moteurs.
function dateModification(valeur: string | null | undefined): Date | undefined {
  if (!valeur) return undefined;
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function urlsBibliothequePublique(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];
  const LIMITE_PAGE = 200;
  let decalage = 0;

  for (;;) {
    let page: Awaited<ReturnType<typeof listerBibliothequePublique>>;
    try {
      page = await listerBibliothequePublique(undefined, { decalage, limite: LIMITE_PAGE });
    } catch {
      break;
    }
    for (const entree of page) {
      urls.push({ url: `${URL_BASE}/bibliotheque/${entree.id}`, lastModified: dateModification(entree.created_at) });
    }
    if (page.length < LIMITE_PAGE) break;
    decalage += LIMITE_PAGE;
  }
  return urls;
}

async function urlsSkillsPubliques(): Promise<MetadataRoute.Sitemap> {
  try {
    const skills = await rechercherSkillsPublics();
    return skills.map((skill) => ({ url: `${URL_BASE}/skills/${skill.id}` }));
  } catch {
    return [];
  }
}

async function urlsEtablissements(): Promise<MetadataRoute.Sitemap> {
  try {
    const etablissements = await listerEtablissementsPublics();
    return etablissements.map((etablissement) => ({
      url: `${URL_BASE}/etablissements/${etablissement.id}`,
      lastModified: dateModification(etablissement.created_at),
    }));
  } catch {
    return [];
  }
}

async function urlsDossiers(): Promise<MetadataRoute.Sitemap> {
  try {
    const dossiers = await listerDossiersCataloguePublic();
    return dossiers.map((dossier) => ({
      url: `${URL_BASE}/dossiers/${dossier.id}`,
      lastModified: dateModification(dossier.created_at),
    }));
  } catch {
    return [];
  }
}

// Toutes les pages /decouvrir sont dérivées des registres qui alimentent
// directement le guide public : une nouvelle section ou sous-page n'a donc
// plus besoin d'être ajoutée manuellement au sitemap.
function urlsDecouvrir(): MetadataRoute.Sitemap {
  const chemins = [
    ROUTES_DECOUVRIR.accueil,
    ...SECTIONS_DECOUVRIR.map((section) => section.href),
    ...SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE.map((page) => page.href),
    ...SOUS_PAGES_DECOUVRIR_PERSONNALISER.map((page) => page.href),
    ...SOUS_PAGES_DECOUVRIR_CONCENTRATION.map((page) => page.href),
    ...SOUS_PAGES_DECOUVRIR_BUREAU.map((page) => page.href),
    ...USAGES_DECOUVRIR.map((usage) => usage.href),
  ];

  return [...new Set(chemins)].map((href) => ({
    url: `${URL_BASE}${href}`,
    priority: href === ROUTES_DECOUVRIR.accueil ? 0.9 : 0.7,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [bibliotheque, skills, etablissements, dossiers] = await Promise.all([
    urlsBibliothequePublique(),
    urlsSkillsPubliques(),
    urlsEtablissements(),
    urlsDossiers(),
  ]);

  const urlsStatiques: MetadataRoute.Sitemap = [
    { url: URL_BASE, priority: 1 },
    { url: `${URL_BASE}/bibliotheque` },
    { url: `${URL_BASE}/comportements` },
    { url: `${URL_BASE}/etablissements` },
    { url: `${URL_BASE}/abonnements` },
    ...urlsDecouvrir(),
  ];

  // Évite les doublons entre les pages fixes et les listes issues des données
  // publiques, tout en gardant la première entrée (et ses métadonnées).
  const toutesLesUrls = [
    ...urlsStatiques,
    ...bibliotheque,
    ...skills,
    ...etablissements,
    ...dossiers,
  ];
  const uniques = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entree of toutesLesUrls) {
    uniques.set(entree.url, uniques.get(entree.url) ?? entree);
  }
  return [...uniques.values()];
}
