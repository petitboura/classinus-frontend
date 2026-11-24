import type { MetadataRoute } from "next";
import { PAGES_PRIVEES, TOUS_LES_ROBOTS_IA } from "@/lib/robotsAdresses";

// Chantier "Classinus ouvert" (10/09/2026, Lot F). Sans ce fichier, un moteur de recherche n'a même pas le droit
// implicite de venir lire /sitemap.xml en confiance.
//
// Interdits : les écrans "espace personnel" (voir lib/robotsAdresses.ts). Le reste (accueil, bibliothèque, skills,
// établissements, dossiers, et toutes leurs pages de détail) reste autorisé.
//
// Sur l'adresse de Maame, /robots.txt est réécrit vers app/maame-robots.txt/route.ts (voir next.config.mjs).
// Les règles des robots (noms, pages privées) viennent de lib/robotsAdresses.ts pour les deux adresses.
const URL_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PAGES_PRIVEES },
      ...TOUS_LES_ROBOTS_IA.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PAGES_PRIVEES,
      })),
    ],
    sitemap: `${URL_BASE}/sitemap.xml`,
  };
}
