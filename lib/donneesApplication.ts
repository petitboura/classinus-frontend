import { RESUME_CLASSINUS } from "./usagesDecouvrir";

// Chantier "visibilité auprès des IA" (11/10/2026, demande Bourama). Fiche
// d'identité de Classinus pour les machines (schema.org, WebApplication),
// placée dans l'en-tête de toutes les pages par app/layout.tsx. Elle dit aux
// moteurs de recherche et aux IA, sans ambiguïté : le nom, l'adresse, la
// catégorie (application éducative), la langue et la liste des fonctions.
//
// Tout vient de RESUME_CLASSINUS (lib/usagesDecouvrir.ts), la même source que
// les pages /decouvrir et /llms.txt. Même base d'adresse que robots.ts et
// sitemap.ts.
const URL_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Identifiants stables des fiches (schema.org les appelle @id). Ils servent à
// relier les fiches entre elles : l'application, le site et chaque page
// pointent vers la même organisation, au lieu de la redécrire chaque fois.
export const ID_ORGANISATION = `${URL_BASE}/#organisation`;
export const ID_SITE = `${URL_BASE}/#site`;

// Fiche "organisation et site" (12/10/2026, chantier données structurées,
// demande Bourama : nom d'éditeur "Classinus"). Elle dit sans ambiguïté à
// Google et aux IA que Classinus est un service éducatif (le nom existe aussi
// pour une pâtisserie, source d'une confusion constatée dans l'AI Overview).
//
// Volontairement absents : "sameAs" (liens vers des comptes ou profils
// officiels, aucun fourni par Bourama, on n'invente jamais un lien) et tout
// nom d'un autre éditeur (Classinus ne laisse jamais voir l'écosystème
// Djiguignè). À ajouter ici le jour où des liens officiels existent.
export function donneesOrganisation(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ID_ORGANISATION,
        name: RESUME_CLASSINUS.nom,
        url: URL_BASE,
        logo: { "@type": "ImageObject", url: `${URL_BASE}/icone-512.png`, width: 512, height: 512 },
        slogan: RESUME_CLASSINUS.accroche.replace(/\.$/, ""),
        description: RESUME_CLASSINUS.description,
        disambiguatingDescription: "Application d'études avec IA pour les étudiants, sur le web et sur Android",
      },
      {
        "@type": "WebSite",
        "@id": ID_SITE,
        name: RESUME_CLASSINUS.nom,
        url: URL_BASE,
        inLanguage: "fr",
        description: RESUME_CLASSINUS.description,
        publisher: { "@id": ID_ORGANISATION },
      },
    ],
  };
}

export function donneesApplication(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: RESUME_CLASSINUS.nom,
    alternateName: RESUME_CLASSINUS.accroche.replace(/\.$/, ""),
    url: URL_BASE,
    description: RESUME_CLASSINUS.description,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, Android",
    inLanguage: "fr",
    publisher: { "@id": ID_ORGANISATION },
    featureList: [...RESUME_CLASSINUS.fonctions],
  };
}
