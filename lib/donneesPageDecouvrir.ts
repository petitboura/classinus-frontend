import { ID_ORGANISATION, ID_SITE } from "./donneesApplication";
import { ROUTES_DECOUVRIR } from "./routesDecouvrir";
import {
  SECTIONS_DECOUVRIR,
  SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE,
  SOUS_PAGES_DECOUVRIR_BUREAU,
  SOUS_PAGES_DECOUVRIR_CONCENTRATION,
  SOUS_PAGES_DECOUVRIR_PERSONNALISER,
} from "./sectionsDecouvrir";
import { USAGES_DECOUVRIR } from "./usagesDecouvrir";

// Chantier données structurées (12/10/2026, demande Bourama). Pour chaque page
// /decouvrir, fabrique deux fiches pour les machines (schema.org) :
//   1. le fil d'ariane (BreadcrumbList), par exemple Découvrir Classinus, puis
//      Bureau, puis Programme : il aide Google à comprendre la structure du
//      site et à afficher des sous liens ;
//   2. la page elle même (WebPage, ou CollectionPage si elle a des pages
//      filles), rattachée au site et à l'organisation.
//
// Rien n'est écrit à la main page par page : tout vient des listes qui
// alimentent déjà les cartes (lib/sectionsDecouvrir.tsx, lib/usagesDecouvrir.ts).
// Une page ajoutée à une de ces listes a donc son fil d'ariane toute seule, et
// le titre d'une fiche ne peut pas contredire celui de la carte.
const URL_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type EntreeDecouvrir = { href: string; titre: string; description: string };

const RACINE: EntreeDecouvrir = {
  href: ROUTES_DECOUVRIR.accueil,
  titre: "Découvrir Classinus",
  description: "Les fonctionnalités de Classinus, présentées section par section.",
};

const ENTREES: EntreeDecouvrir[] = [
  RACINE,
  ...SECTIONS_DECOUVRIR,
  ...SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE,
  ...SOUS_PAGES_DECOUVRIR_PERSONNALISER,
  ...SOUS_PAGES_DECOUVRIR_CONCENTRATION,
  ...SOUS_PAGES_DECOUVRIR_BUREAU,
  ...USAGES_DECOUVRIR.map((u) => ({ href: u.href, titre: u.titreCarte, description: u.description })),
];

function sansSlashFinal(chemin: string): string {
  return chemin.length > 1 ? chemin.replace(/\/+$/, "") : chemin;
}

/**
 * Fiches pour les machines d'une page /decouvrir, ou null si l'adresse n'est
 * pas une page connue (aucune fiche inventée).
 */
export function donneesPageDecouvrir(chemin: string): Record<string, unknown> | null {
  const cheminPropre = sansSlashFinal(chemin);
  const page = ENTREES.find((e) => e.href === cheminPropre);
  if (!page) return null;

  // Fil d'ariane : chaque début d'adresse connu, du plus court au plus long.
  // Un niveau sans page propre (aucune entrée à cette adresse) est sauté.
  const segments = cheminPropre.split("/").filter(Boolean);
  const ariane: EntreeDecouvrir[] = [];
  for (let i = 1; i <= segments.length; i++) {
    const debut = `/${segments.slice(0, i).join("/")}`;
    const entree = ENTREES.find((e) => e.href === debut);
    if (entree) ariane.push(entree);
  }

  const aDesFilles = ENTREES.some((e) => e.href.startsWith(`${cheminPropre}/`));
  const url = `${URL_BASE}${page.href}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: ariane.map((e, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: e.titre,
          item: `${URL_BASE}${e.href}`,
        })),
      },
      {
        "@type": aDesFilles ? "CollectionPage" : "WebPage",
        "@id": `${url}#page`,
        url,
        name: page.titre,
        description: page.description,
        inLanguage: "fr",
        isPartOf: { "@id": ID_SITE },
        about: { "@id": ID_ORGANISATION },
      },
    ],
  };
}
