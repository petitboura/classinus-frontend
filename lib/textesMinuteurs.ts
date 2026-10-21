// Textes affichés par les minuteurs du chat (20/09/2026, demande Bourama).
//
// Les dictionnaires FR/EN suivent le même modèle que lib/erreurs.ts, sans
// avoir à modifier les composants qui utilisent ces libellés. Aucun texte
// affiché n'est écrit en dur dans components/chat/minuteurs/.
import type { Locale } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import type { Elargir } from "@/lib/i18n/types";

const TEXTES_FR = {
  titreParDefaut: "Minuteur",
  arreter: "Arrêter",
  reduire: "Réduire",
  agrandir: "Agrandir",
  masquer: "Masquer",
  afficher: "Afficher",
  ajouterCinq: "5 min",
  ajouterCinqAria: "Ajouter 5 minutes",
  retirerCinqAria: "Retirer 5 minutes",
  voirSuite: "Voir la suite prévue",
  masquerSuite: "Masquer la suite prévue",
  aucuneSuite: "Rien de précis n'est prévu, Classinus décidera selon la conversation.",
  termine: "Terminé",
  arrete: "Arrêté",
  boutonMinuteurs: "Minuteurs",
  lancerTitre: "Lancer un minuteur",
  autreDuree: "Autre durée",
  uniteAria: "Unité de la durée",
  unites: { secondes: "secondes", minutes: "minutes", heures: "heures" },
  suiteLabel: "Que doit faire Classinus à la fin ? (facultatif)",
  suitePlaceholder: "Par exemple : me poser 5 questions sur le chapitre 3",
  lancer: "Lancer",
  minuteursMasques: "Minuteurs masqués",
  infoCourt: "Lance un minuteur qui ne bloque rien. Classinus peut aussi en lancer un de lui même et agir quand il se termine.",
  infoAria: "Plus d'informations sur les minuteurs",
  minutesCourt: (n: number) => `${n} min`,
} as const;

const TEXTES_EN: Elargir<typeof TEXTES_FR> = {
  titreParDefaut: "Timer",
  arreter: "Stop",
  reduire: "Minimize",
  agrandir: "Expand",
  masquer: "Hide",
  afficher: "Show",
  ajouterCinq: "5 min",
  ajouterCinqAria: "Add 5 minutes",
  retirerCinqAria: "Remove 5 minutes",
  voirSuite: "View planned follow-up",
  masquerSuite: "Hide planned follow-up",
  aucuneSuite: "Nothing specific is planned; Classinus will decide based on the conversation.",
  termine: "Completed",
  arrete: "Stopped",
  boutonMinuteurs: "Timers",
  lancerTitre: "Start a timer",
  autreDuree: "Custom duration",
  uniteAria: "Duration unit",
  unites: { secondes: "seconds", minutes: "minutes", heures: "hours" },
  suiteLabel: "What should Classinus do when the timer ends? (optional)",
  suitePlaceholder: "For example: ask me 5 questions about chapter 3",
  lancer: "Start",
  minuteursMasques: "Hidden timers",
  infoCourt: "Start a timer that does not block anything. Classinus can also start one on its own and take action when it ends.",
  infoAria: "More information about timers",
  minutesCourt: (n: number) => `${n} min`,
};

const TEXTES: Record<Locale, Elargir<typeof TEXTES_FR>> = { fr: TEXTES_FR, en: TEXTES_EN };

export function textesMinuteurs(locale: Locale = obtenirLocale()): Elargir<typeof TEXTES_FR> {
  return TEXTES[locale] ?? TEXTES_FR;
}
