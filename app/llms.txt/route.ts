import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import {
  SECTIONS_DECOUVRIR,
  SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE,
  SOUS_PAGES_DECOUVRIR_CONCENTRATION,
  SOUS_PAGES_DECOUVRIR_PERSONNALISER,
  SOUS_PAGES_DECOUVRIR_BUREAU,
} from "@/lib/sectionsDecouvrir";
import {
  QUESTIONS_DECOUVRIR_BIBLIOTHEQUE,
  QUESTIONS_DECOUVRIR_GENERAL,
  QUESTIONS_DECOUVRIR_PERSONNALISER,
  QUESTIONS_DECOUVRIR_CONCENTRATION,
  QUESTIONS_DECOUVRIR_BUREAU,
} from "@/lib/questionsDecouvrir";
import { QUESTIONS_GENERALES_CLASSINUS, RESUME_CLASSINUS, USAGES_DECOUVRIR } from "@/lib/usagesDecouvrir";

// Le contenu public de /llms.txt est construit à partir des mêmes sources que
// les pages /decouvrir : routes, descriptions, usages et questions fréquentes.
// Ajouter une page à ces registres la rend visible ici sans recopier son texte.
export const dynamic = "force-static";

const URL_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function lien(titre: string, href: string, description: string): string {
  return `- [${titre}](${URL_BASE}${href}): ${description}`;
}

function lignesQuestions(groupes: { titre: string; questions: { question: string; reponse: string }[] }[]): string[] {
  return groupes.flatMap((groupe) => [
    `### ${groupe.titre}`,
    "",
    ...groupe.questions.flatMap((q) => [`**${q.question}**`, q.reponse, ""]),
  ]);
}

export function GET(): Response {
  const pages = [
    ...SECTIONS_DECOUVRIR.filter((section) => section.slug !== "usages"),
    ...SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE,
    ...SOUS_PAGES_DECOUVRIR_PERSONNALISER,
    ...SOUS_PAGES_DECOUVRIR_CONCENTRATION,
    ...SOUS_PAGES_DECOUVRIR_BUREAU,
  ];
  const lignes: string[] = [
    `# ${RESUME_CLASSINUS.nom}`,
    "",
    `> ${RESUME_CLASSINUS.description}`,
    "",
    `${RESUME_CLASSINUS.nom} est en français. Sa phrase d'accroche : ${RESUME_CLASSINUS.accroche}`,
    "",
    "## Fonctions principales",
    "",
    ...RESUME_CLASSINUS.fonctions.map((fonction) => `- ${fonction}`),
    "",
    "## Usages",
    "",
    lien("Vue d'ensemble des usages", ROUTES_DECOUVRIR.usages.accueil, RESUME_CLASSINUS.description),
    ...USAGES_DECOUVRIR.map((usage) => lien(usage.titreCarte, usage.href, usage.description)),
    "",
    "## Guides et pages Découvrir",
    "",
    ...pages.map((page) => lien(page.titre, page.href, page.description)),
    "",
    "## Questions fréquentes",
    "",
    ...QUESTIONS_GENERALES_CLASSINUS.flatMap((q) => [`**${q.question}**`, q.reponse, ""]),
    ...lignesQuestions([
      ...QUESTIONS_DECOUVRIR_GENERAL,
      ...QUESTIONS_DECOUVRIR_BIBLIOTHEQUE,
      ...QUESTIONS_DECOUVRIR_PERSONNALISER,
      ...QUESTIONS_DECOUVRIR_CONCENTRATION,
      ...QUESTIONS_DECOUVRIR_BUREAU,
    ]),
    ...USAGES_DECOUVRIR.flatMap((usage) => [
      `### ${usage.titrePage}`,
      "",
      ...usage.questions.flatMap((q) => [`**${q.question}**`, q.reponse, ""]),
    ]),
  ];

  return new Response(`${lignes.join("\n").trimEnd()}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
