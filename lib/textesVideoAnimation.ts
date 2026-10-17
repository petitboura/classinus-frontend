// Textes du bouton "télécharger en vidéo" du bloc animation (07/10/2026,
// demande Bourama). Même modèle que lib/textesAnimation.ts : une seule langue
// active pour l'instant (fr), en ajouter une ne demande qu'une entrée dans
// TEXTES. Séparés de textesAnimation.ts car ceux-là sont aussi injectés dans
// l'iframe du lecteur, et ceux d'ici n'ont rien à y faire.
import { LOCALE_ACTIVE, type Locale } from "@/lib/erreurs";

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

export type TextesVideoAnimation = typeof TEXTES_FR;

const TEXTES: Partial<Record<Locale, TextesVideoAnimation>> = { fr: TEXTES_FR };

export function textesVideoAnimation(locale: Locale = LOCALE_ACTIVE): TextesVideoAnimation {
  return TEXTES[locale] ?? TEXTES_FR;
}
