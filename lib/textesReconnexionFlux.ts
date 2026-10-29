// Textes du bandeau de reconnexion du chat (28/10/2026, demande de Bourama : le travail ne doit
// plus s'arrêter quand la connexion est perturbée). Même modèle que lib/textesMinuteurs.ts.
import type { Locale } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import type { Elargir } from "@/lib/i18n/types";

const TEXTES_FR = {
  message: "Connexion perdue, reconnexion en cours. Classinus continue de travailler, la suite s'affichera dès le retour.",
} as const;

const TEXTES_EN: Elargir<typeof TEXTES_FR> = {
  message: "Connection lost, reconnecting. Classinus keeps working and the rest will appear as soon as you are back.",
};

const TEXTES: Record<Locale, Elargir<typeof TEXTES_FR>> = { fr: TEXTES_FR, en: TEXTES_EN };

export function textesReconnexionFlux(locale: Locale = obtenirLocale()): Elargir<typeof TEXTES_FR> {
  return TEXTES[locale] ?? TEXTES_FR;
}
