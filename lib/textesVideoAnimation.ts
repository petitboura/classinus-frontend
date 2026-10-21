// Textes du bouton "télécharger en vidéo" du bloc animation (07/10/2026,
// demande Bourama). Séparés de textesAnimation.ts car les textes de ce
// module ne sont pas injectés dans l'iframe du lecteur.
import type { Locale } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import type { Elargir } from "@/lib/i18n/types";

const TEXTES_FR = {
  telecharger: "Télécharger",
  horizontal: "Vidéo 16:9 (horizontal)",
  vertical: "Vidéo 9:16 (vertical)",
  envoi: "Envoi",
  creation: (pourcent: number) => `Création ${pourcent} %`,
  annuler: "Annuler la création de la vidéo",
  telechargement: "Téléchargement",
  ok: "Vidéo téléchargée",
  echec: "Échec de la vidéo",
  nomFichier: (format: string) => `animation-${format.replace(":", "x")}.mp4`,
} as const;

export type TextesVideoAnimation = Elargir<typeof TEXTES_FR>;

const TEXTES_EN: Elargir<typeof TEXTES_FR> = {
  telecharger: "Download",
  horizontal: "Video 16:9 (landscape)",
  vertical: "Video 9:16 (portrait)",
  envoi: "Uploading",
  creation: (pourcent: number) => `Creating ${pourcent}%`,
  annuler: "Cancel video creation",
  telechargement: "Downloading",
  ok: "Video downloaded",
  echec: "Video failed",
  nomFichier: (format: string) => `animation-${format.replace(":", "x")}.mp4`,
};

const TEXTES: Record<Locale, Elargir<typeof TEXTES_FR>> = { fr: TEXTES_FR, en: TEXTES_EN };

export function textesVideoAnimation(locale: Locale = obtenirLocale()): TextesVideoAnimation {
  return TEXTES[locale] ?? TEXTES_FR;
}
