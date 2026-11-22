// Textes des limites visibles dans le chat : avertissement de liste GitHub
// tronquée (sélecteur de dépôts) et explication sous le bouton de reprise de
// l'agent. Même principe que textesVideoAnimation.ts : un dictionnaire par
// langue, choisi avec la langue active.
import type { Locale } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import type { Elargir } from "@/lib/i18n/types";

const TEXTES_FR = {
  depotsTronques: (maximum: number) =>
    `Seuls les ${maximum} dépôts les plus récemment mis à jour sont affichés. D'autres dépôts existent sur GitHub.`,
  repriseRepetition:
    "L'agent a répété la même action plusieurs fois et s'est arrêté pour éviter de tourner en boucle. Tu peux réessayer.",
  repriseLimite: (libelleBouton: string) =>
    `La limite d'actions pour cette réponse est atteinte. Le travail déjà réalisé est conservé. Sélectionne « ${libelleBouton} » pour reprendre avec un nouveau budget d'actions.`,
  reessayer: "Réessayer",
  continuer: "Continuer",
} as const;

export type TextesLimitesChat = Elargir<typeof TEXTES_FR>;

const TEXTES_EN: Elargir<typeof TEXTES_FR> = {
  depotsTronques: (maximum: number) =>
    `Only the ${maximum} most recently updated repositories are shown. More repositories exist on GitHub.`,
  repriseRepetition:
    "The agent repeated the same action several times and stopped to avoid looping. You can try again.",
  repriseLimite: (libelleBouton: string) =>
    `The action limit for this reply has been reached. The work already done is kept. Select « ${libelleBouton} » to resume with a new action budget.`,
  reessayer: "Try again",
  continuer: "Continue",
};

const TEXTES: Record<Locale, Elargir<typeof TEXTES_FR>> = { fr: TEXTES_FR, en: TEXTES_EN };

export function textesLimitesChat(locale: Locale = obtenirLocale()): TextesLimitesChat {
  return TEXTES[locale] ?? TEXTES_FR;
}
