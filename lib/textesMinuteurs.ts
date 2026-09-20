// Textes affichés par les minuteurs du chat (20/09/2026, demande Bourama).
//
// Regroupés ici, par langue, sur le même modèle que lib/erreurs.ts : une
// seule locale active pour l'instant (fr), mais ajouter une langue ne
// demande que de renseigner une entrée dans TEXTES ci-dessous, sans
// toucher aux composants. Aucun texte affiché n'est écrit en dur dans
// components/chat/minuteurs/.
import { LOCALE_ACTIVE, type Locale } from "@/lib/erreurs";

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
  autreDuree: "Autre durée en minutes",
  lancer: "Lancer",
  minuteursMasques: "Minuteurs masqués",
  infoCourt: "Lance un minuteur qui ne bloque rien. Classinus peut aussi en lancer un de lui même et agir quand il se termine.",
  infoAria: "Plus d'informations sur les minuteurs",
  minutesCourt: (n: number) => `${n} min`,
} as const;

const TEXTES: Partial<Record<Locale, typeof TEXTES_FR>> = { fr: TEXTES_FR };

export function textesMinuteurs(locale: Locale = LOCALE_ACTIVE): typeof TEXTES_FR {
  return TEXTES[locale] ?? TEXTES_FR;
}
