// Textes de la vision de l'ecran sur Android (11/10/2026, demande Bourama,
// lot 4 du chantier "vision ecran").
//
// Regroupes ici, par langue, sur le meme modele que lib/textesMinuteurs.ts :
// une seule locale active pour l'instant (fr), ajouter une langue ne demande
// que de renseigner une entree dans TEXTES ci-dessous. Ces textes sont ceux de
// la notification permanente que le systeme Android affiche tant que la vision
// de l'ecran est active (voir lib/pontVisionEcranCanal.ts).
import { LOCALE_ACTIVE, type Locale } from "@/lib/erreurs";

const TEXTES_FR = {
  notificationTitre: "Classinus peut lire ton écran",
  notificationTexte: "Le canal en direct est actif. Classinus lit le texte de ton écran pour t'aider.",
  notificationArreter: "Arrêter",
} as const;

const TEXTES: Partial<Record<Locale, typeof TEXTES_FR>> = { fr: TEXTES_FR };

export function textesVisionEcran(locale: Locale = LOCALE_ACTIVE): typeof TEXTES_FR {
  return TEXTES[locale] ?? TEXTES_FR;
}
