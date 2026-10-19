import type { MetadataRoute } from "next";

// Chantier "Classinus ouvert" (10/09/2026, Lot F). N'existait pas du tout
// avant ce chantier -- sans lui, un moteur de recherche n'a même pas le
// droit implicite de venir lire /sitemap.xml en confiance.
//
// Interdits : les écrans "espace personnel" (chat, bureau, réglages...)
// -- aucun contenu SEO à y gagner (pages purement "use client", un robot
// n'y verrait qu'une coquille vide) et ce n'est pas un espace public.
// Le reste (accueil, bibliothèque, skills, établissements, dossiers, et
// toutes leurs pages de détail des lots A à E) reste autorisé.
const URL_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const PAGES_PRIVEES = [
  "/tableau-de-bord",
  "/bureau",
  "/parametres",
  "/personnaliser",
  "/plus",
  "/rappels",
  "/memoire",
  "/connecter-claude",
  "/connecter-thonny",
  "/controle-session",
];

// Robots des IA (11/10/2026, chantier "visibilité auprès des IA", demande
// Bourama). Le groupe général ci dessus les laisse déjà entrer, mais les
// nommer ici rend l'autorisation explicite : un outil de vérification, une
// règle de pare feu ou un modèle de fichier par défaut ne peut plus la
// confondre avec un blocage. Noms exacts, la casse compte.
//
// IMPORTANT : un robot nommé ne lit QUE son propre groupe et ignore le
// groupe général. La liste des pages privées est donc répétée pour chacun,
// sinon il pourrait entrer dans le chat ou les réglages. Elle vient de la
// constante PAGES_PRIVEES, une seule source pour tous les groupes.
//
// Deux familles : ceux qui lisent le site pour répondre à une question en
// direct (recherche, navigation d'une IA), et ceux qui le lisent pour
// entraîner un modèle (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended).
// Les deux sont autorisés : Bourama veut que les IA connaissent Classinus.
// Pour fermer l'entraînement plus tard sans perdre la recherche en direct, il
// suffit de retirer la seconde famille de cette liste.
const ROBOTS_IA_RECHERCHE_DIRECTE = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];
const ROBOTS_IA_ENTRAINEMENT = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PAGES_PRIVEES },
      ...[...ROBOTS_IA_RECHERCHE_DIRECTE, ...ROBOTS_IA_ENTRAINEMENT].map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PAGES_PRIVEES,
      })),
    ],
    sitemap: `${URL_BASE}/sitemap.xml`,
  };
}
