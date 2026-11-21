// Textes du bloc ```svg du chat (dessin vectoriel affiché dans le fil).
//
// Les dictionnaires FR/EN suivent le même modèle que les autres textes
// localisés (voir lib/textesAnimation.ts).
import type { Locale } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import type { Elargir } from "@/lib/i18n/types";

const TEXTES_FR = {
  construction: "Construction du dessin",
  invalide: "Ce dessin n’a pas pu être affiché car son code est incomplet ou invalide. Demande à Classinus de le recréer.",
  descriptionParDefaut: "Dessin créé par Classinus",
  nomFichierParDefaut: "dessin",
  telecharger: "Télécharger",
  telecharge: "Téléchargé",
  telechargerLibelle: "Télécharger le dessin en image",
  agrandir: "Agrandir le dessin",
  fermer: "Fermer",
  titrePleinEcran: "Dessin",
} as const;

export type TextesSvg = Elargir<typeof TEXTES_FR>;

const TEXTES_EN: Elargir<typeof TEXTES_FR> = {
  construction: "Building the drawing",
  invalide: "This drawing couldn’t be displayed because its code is incomplete or invalid. Ask Classinus to recreate it.",
  descriptionParDefaut: "Drawing created by Classinus",
  nomFichierParDefaut: "drawing",
  telecharger: "Download",
  telecharge: "Downloaded",
  telechargerLibelle: "Download the drawing as an image",
  agrandir: "Enlarge the drawing",
  fermer: "Close",
  titrePleinEcran: "Drawing",
};

const TEXTES: Record<Locale, Elargir<typeof TEXTES_FR>> = { fr: TEXTES_FR, en: TEXTES_EN };

export function textesSvg(locale: Locale = obtenirLocale()): TextesSvg {
  return TEXTES[locale] ?? TEXTES_FR;
}
