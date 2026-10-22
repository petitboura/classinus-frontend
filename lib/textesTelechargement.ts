// Textes du suivi des téléchargements (10/10/2026, demande Bourama : afficher
// l'avancement en pourcentage et informer quand un téléchargement échoue).
// Même modèle FR/EN que lib/textesVideoAnimation.ts.
import type { Locale } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import type { Elargir } from "@/lib/i18n/types";

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

export type TextesTelechargement = Elargir<typeof TEXTES_FR>;

const TEXTES_EN: Elargir<typeof TEXTES_FR> = {
  telecharger: "Download",
  preparation: "Preparing",
  pourcentage: (valeur: number) => `${valeur}%`,
  termine: "Downloaded",
  reessayer: "Try again",
  echecCourt: "Failed, try again",
  erreurReseau: "The download failed. Check your connection and try again.",
  erreurIncomplet: "The download stopped before it finished. Try again.",
  erreurIntrouvable: "This file cannot be found or is no longer available.",
  erreurAcces: "You do not have access to this file.",
  erreurServeur: "The server is not responding right now. Try again shortly.",
  erreurUrlVide: "This file has no download address.",
};

const TEXTES: Record<Locale, Elargir<typeof TEXTES_FR>> = { fr: TEXTES_FR, en: TEXTES_EN };

export function textesTelechargement(locale: Locale = obtenirLocale()): TextesTelechargement {
  return TEXTES[locale] ?? TEXTES_FR;
}
