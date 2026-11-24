// Règles d'exploration partagées par app/robots.ts (Classinus) et app/maame-robots.txt/route.ts (Maame).
// Une seule source : ajouter une page privée ou un robot ici le prend en compte sur les deux adresses.

// Écrans "espace personnel" (chat, bureau, réglages...) : aucun contenu à indexer, et ce n'est pas un espace public.
export const PAGES_PRIVEES = [
  "/tableau-de-bord",
  "/bureau",
  "/parametres",
  "/personnaliser",
  "/plus",
  "/rappels",
  "/memoire",
  "/configuration",
  "/connecter-claude",
  "/connecter-thonny",
  "/controle-session",
];

// Robots des IA (11/10/2026, chantier "visibilité auprès des IA", demande Bourama). Les nommer rend l'autorisation
// explicite : un outil de vérification, une règle de pare feu ou un modèle de fichier par défaut ne peut plus la
// confondre avec un blocage. Noms exacts, la casse compte.
//
// IMPORTANT : un robot nommé ne lit QUE son propre groupe et ignore le groupe général. La liste des pages privées
// est donc répétée pour chacun, sinon il pourrait entrer dans le chat ou les réglages.
//
// Deux familles : ceux qui lisent le site pour répondre à une question en direct (recherche, navigation d'une IA),
// et ceux qui le lisent pour entraîner un modèle. Les deux sont autorisés : Bourama veut que les IA connaissent
// Classinus. Pour fermer l'entraînement plus tard sans perdre la recherche en direct, retirer la seconde famille.
export const ROBOTS_IA_RECHERCHE_DIRECTE = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];
export const ROBOTS_IA_ENTRAINEMENT = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended"];

export const TOUS_LES_ROBOTS_IA = [...ROBOTS_IA_RECHERCHE_DIRECTE, ...ROBOTS_IA_ENTRAINEMENT];
