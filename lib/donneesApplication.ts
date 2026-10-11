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
    featureList: [...RESUME_CLASSINUS.fonctions],
  };
}
