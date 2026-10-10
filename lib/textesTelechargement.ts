// Textes du suivi des téléchargements (10/10/2026, demande Bourama : afficher
// l'avancement en pourcentage et informer quand un téléchargement échoue).
// Même modèle que lib/textesVideoAnimation.ts : une seule langue active pour
// l'instant (fr), en ajouter une ne demande qu'une entrée dans TEXTES.
import { LOCALE_ACTIVE, type Locale } from "@/lib/erreurs";

const TEXTES_FR = {
  telecharger: "Télécharger",
  preparation: "Préparation",
  pourcentage: (valeur: number) => `${valeur} %`,
  termine: "Téléchargé",
  reessayer: "Réessayer",
  echecCourt: "Échec, réessayer",
  erreurReseau: "Le téléchargement a échoué. Vérifie ta connexion et réessaie.",
  erreurIncomplet: "Le téléchargement s'est interrompu avant la fin. Réessaie.",
  erreurIntrouvable: "Ce fichier est introuvable ou n'est plus disponible.",
  erreurAcces: "Tu n'as pas accès à ce fichier.",
  erreurServeur: "Le serveur ne répond pas pour le moment. Réessaie dans un instant.",
  erreurUrlVide: "Ce fichier n'a pas d'adresse de téléchargement.",
} as const;

export type TextesTelechargement = typeof TEXTES_FR;

const TEXTES: Partial<Record<Locale, TextesTelechargement>> = { fr: TEXTES_FR };

export function textesTelechargement(locale: Locale = LOCALE_ACTIVE): TextesTelechargement {
  return TEXTES[locale] ?? TEXTES_FR;
}
