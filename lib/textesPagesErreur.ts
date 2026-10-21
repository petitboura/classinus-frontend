// Textes des écrans d'erreur (app/error.tsx, app/global-error.tsx) et de l'état
// « lien impossible à vérifier » de la réinitialisation du mot de passe.
// Français et anglais, même modèle que lib/textesTelechargement.ts : ajouter
// une autre langue ne demande qu'une entrée dans TEXTES (le typage force à
// fournir toutes les clés).
import { LOCALE_ACTIVE, type Locale } from "@/lib/erreurs";

const TEXTES_FR = {
  pageTitre: "Cette page n’a pas pu s’afficher",
  pageProbleme: "Un problème inattendu a interrompu l’affichage de cette page.",
  globalTitre: "Classinus a rencontré un problème",
  globalProbleme: "L’application n’a pas pu afficher cet écran correctement.",
  verifierAvantRefaire: "Vérifie l’état de ta dernière action avant de la refaire : elle a peut-être déjà été effectuée.",
  reessayer: "Réessayer",
  lienNonVerifiableTitre: "Impossible de vérifier le lien",
  lienNonVerifiableRepli: "Vérifie ta connexion puis réessaie.",
  nouveauLien: "Demander un nouveau lien",
} as const;

export type TextesPagesErreur = { [Cle in keyof typeof TEXTES_FR]: string };

const TEXTES_EN: TextesPagesErreur = {
  pageTitre: "This page couldn’t be displayed",
  pageProbleme: "An unexpected problem interrupted the display of this page.",
  globalTitre: "Classinus ran into a problem",
  globalProbleme: "The app couldn’t display this screen correctly.",
  verifierAvantRefaire: "Check the result of your last action before repeating it: it may already have gone through.",
  reessayer: "Try again",
  lienNonVerifiableTitre: "Couldn’t verify the link",
  lienNonVerifiableRepli: "Check your connection and try again.",
  nouveauLien: "Request a new link",
};

const TEXTES: Record<Locale, TextesPagesErreur> = { fr: TEXTES_FR, en: TEXTES_EN };

export function textesPagesErreur(locale: Locale = LOCALE_ACTIVE): TextesPagesErreur {
  return TEXTES[locale];
}
