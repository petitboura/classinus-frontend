import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import {
  SECTIONS_DECOUVRIR,
  SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE,
  SOUS_PAGES_DECOUVRIR_CONCENTRATION,
  SOUS_PAGES_DECOUVRIR_PERSONNALISER,
} from "@/lib/sectionsDecouvrir";
import { QUESTIONS_GENERALES_CLASSINUS, RESUME_CLASSINUS, USAGES_DECOUVRIR } from "@/lib/usagesDecouvrir";

// Chantier "visibilité auprès des IA" (11/10/2026, demande Bourama). Fiche
// /llms.txt : un petit fichier texte, au format proposé pour les IA, qui dit
// en clair ce qu'est Classinus et où trouver chaque réponse. Une IA qui visite
// le site y lit l'essentiel sans avoir à parcourir tout le site.
//
// Rien n'est écrit ici à la main : tout vient des mêmes listes que les pages
// /decouvrir (lib/usagesDecouvrir.ts et lib/sectionsDecouvrir.tsx). Une page
// ou une fonction ajoutée là apparaît donc ici toute seule, et ce fichier ne
// peut jamais contredire le site.
//
// Même base d'adresse que robots.ts et sitemap.ts. "force-static" : le
// fichier est fabriqué une fois à la construction, pas à chaque visite, et
// reste compatible avec l'export statique de l'appli mobile (next.config.mjs).
export const dynamic = "force-static";

const URL_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function lien(titre: string, href: string, description: string): string {
  return `- [${titre}](${URL_BASE}${href}): ${description}`;
}

export function GET(): Response {
  const lignes: string[] = [
    `# ${RESUME_CLASSINUS.nom}`,
    "",
    `> ${RESUME_CLASSINUS.description}`,
    "",
    `${RESUME_CLASSINUS.nom} est en français. Sa phrase d'accroche : ${RESUME_CLASSINUS.accroche}`,
    "",
    "## Fonctions",
    "",
    ...RESUME_CLASSINUS.fonctions.map((fonction) => `- ${fonction}`),
    "",
    "## Ce que tu peux faire avec Classinus",
    "",
    lien("Vue d'ensemble des usages", ROUTES_DECOUVRIR.usages.accueil, RESUME_CLASSINUS.description),
    ...USAGES_DECOUVRIR.map((usage) => lien(usage.titreCarte, usage.href, usage.description)),
    "",
    "## Découvrir chaque section",
    "",
    ...SECTIONS_DECOUVRIR.filter((section) => section.slug !== "usages").map((section) =>
      lien(section.titre, section.href, section.description),
    ),
    ...[
      ...SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE,
      ...SOUS_PAGES_DECOUVRIR_PERSONNALISER,
      ...SOUS_PAGES_DECOUVRIR_CONCENTRATION,
    ].map((sousPage) => lien(sousPage.titre, sousPage.href, sousPage.description)),
    "",
    "## Questions fréquentes",
    "",
    ...QUESTIONS_GENERALES_CLASSINUS.flatMap((q) => [`**${q.question}**`, q.reponse, ""]),
    ...USAGES_DECOUVRIR.flatMap((usage) => usage.questions.flatMap((q) => [`**${q.question}**`, q.reponse, ""])),
  ];

  return new Response(`${lignes.join("\n").trimEnd()}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
