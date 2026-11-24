import { PAGES_PRIVEES, TOUS_LES_ROBOTS_IA } from "@/lib/robotsAdresses";

// robots.txt de Maame. Sur l'adresse de Maame (maame.classinus.com), /robots.txt est réécrit vers cette route par
// next.config.mjs : Maame est une appli à part (voir lib/maame.ts), elle ne reprend donc pas le plan du site de
// Classinus. Mêmes règles d'exploration (lib/robotsAdresses.ts), mais sans ligne Sitemap : la seule page publique
// de Maame est son accueil.
export const dynamic = "force-static";

export function GET(): Response {
  const groupe = (agent: string): string[] => [
    `User-Agent: ${agent}`,
    "Allow: /",
    ...PAGES_PRIVEES.map((page) => `Disallow: ${page}`),
    "",
  ];
  const lignes = ["*", ...TOUS_LES_ROBOTS_IA].flatMap(groupe);
  return new Response(`${lignes.join("\n").trimEnd()}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
