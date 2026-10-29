// Listes et libellés partagés par le bouton Réglages de la barre de saisie
// (BoutonReglages.tsx) et par BarreDeSaisie.tsx. Source unique : ne plus
// redéfinir ces listes ailleurs.

export type LongueurReponse = "courte" | "moyenne" | "longue";

export const NIVEAUX_LONGUEUR: LongueurReponse[] = ["courte", "moyenne", "longue"];

export const LABELS_LONGUEUR: Record<LongueurReponse, string> = {
  courte: "Courte",
  moyenne: "Moyenne",
  longue: "Longue",
};

// Effort de réflexion (04/10/2026 pour DeepSeek, étendu à chaque fournisseur le 20/10/2026) :
// toutes les valeurs que le serveur sait envoyer (core/efforts_modeles.py). Chaque modèle n'en
// accepte qu'une partie, lue dans ses champs efforts et effort_defaut (voir lib/effortModele.ts).
// "none" coupe la réflexion, donc plus rien à afficher.
export type EffortReflexion = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

// Efforts de DeepSeek : liste utilisée tant qu'aucun modèle n'est choisi (cascade).
export const NIVEAUX_EFFORT: EffortReflexion[] = ["none", "low", "high", "max"];

export const LABELS_EFFORT: Record<EffortReflexion, string> = {
  none: "Aucun",
  minimal: "Minimal",
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
  xhigh: "Très élevé",
  max: "Maximum",
};

// Modèle du sélecteur, tel que le serveur le décrit (core/fournisseurs_llm.py).
export type ModeleDisponible = {
  modele_id: string;
  label: string;
  distributeur: string;
  palier: string;
  efforts?: string[];
  effort_defaut?: string | null;
};

// Regroupement du sélecteur de modèle premium par distributeur (02/08/2026,
// voir ModelesPremiumAgent.tsx côté dashboard pour le même mapping). Ordre
// volontairement identique à la hiérarchie backend
// (core/fournisseurs_llm.py:ORDRE_DISTRIBUTEURS).
export const ORDRE_DISTRIBUTEURS_AFFICHAGE = ["claude", "gpt", "gemini", "deepseek", "grok", "meta"];

export const LABELS_DISTRIBUTEUR: Record<string, string> = {
  claude: "Claude",
  gpt: "GPT",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  grok: "Grok",
  meta: "Meta",
};

// Modes pédagogiques : mêmes clés que MODES_PEDAGOGIQUES côté backend
// (core/profils_agents.py).
export const PERSONAS: { id: string; label: string }[] = [
  { id: "socratique", label: "Socratique" },
  { id: "professeur", label: "Professeur" },
  { id: "tuteur", label: "Tuteur" },
  { id: "examinateur", label: "Examinateur" },
];

// Modes ressources (chantier "mode source") : mêmes clés que MODES_SOURCE
// côté backend (core/profils_agents.py). Réglage indépendant du mode
// pédagogique : deux états et deux appels API distincts.
export const MODES_SOURCE: { id: string; label: string }[] = [
  { id: "recherche", label: "Recherche" },
  { id: "sur_pieces", label: "Sur pièces" },
];
