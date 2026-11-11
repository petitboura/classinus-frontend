// Textes de la page de test des voix bambara (components/bouche, app/dev-demo-bouche).
// Même convention que textesEditeurVideo.ts : une version française, une version
// anglaise, et la langue lue depuis le choix de l'interface.
import type { Locale } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import type { Elargir } from "@/lib/i18n/types";

const TEXTES_FR = {
  titre: "Essai des voix bambara",
  consigne: "Écris une phrase en bambara, puis écoute chaque voix pour les comparer.",
  champTexte: "Texte en bambara",
  exemple: "Ex. : An ka taa sugu la.",
  compteur: (n: number, max: number) => `${n} / ${max} caractères`,
  ecouter: "Écouter",
  toutEcouter: "Tout écouter",
  generation: "Lecture en préparation…",
  premiereFois: "La première fois, la voix met plus longtemps à se charger.",
  locuteur: "Locuteur",
  locuteurNumero: (n: number) => `Locuteur ${n}`,
  lecteurAudio: (nom: string) => `Écouter la voix ${nom}`,
  licenceNonCommerciale: "Licence non commerciale : pour tester seulement",
  licenceAVerifier: "Licence à vérifier avant toute mise en production",
  experimental: "Modèle expérimental",
  aucuneVoix: "Aucune voix n'est activée pour le moment.",
  reessayer: "Réessayer",
  erreurChargement: "Impossible de charger la liste des voix.",
};

const TEXTES_EN: Elargir<typeof TEXTES_FR> = {
  titre: "Bambara voice test",
  consigne: "Write a sentence in Bambara, then listen to each voice to compare them.",
  champTexte: "Text in Bambara",
  exemple: "E.g. An ka taa sugu la.",
  compteur: (n: number, max: number) => `${n} / ${max} characters`,
  ecouter: "Listen",
  toutEcouter: "Listen to all",
  generation: "Preparing the audio…",
  premiereFois: "The first time, a voice takes longer to load.",
  locuteur: "Speaker",
  locuteurNumero: (n: number) => `Speaker ${n}`,
  lecteurAudio: (nom: string) => `Listen to the voice ${nom}`,
  licenceNonCommerciale: "Non-commercial licence: for testing only",
  licenceAVerifier: "Licence to check before any production use",
  experimental: "Experimental model",
  aucuneVoix: "No voice is enabled right now.",
  reessayer: "Try again",
  erreurChargement: "Could not load the list of voices.",
};

export function textesBouche(locale: Locale = obtenirLocale()): typeof TEXTES_FR {
  return locale === "en" ? TEXTES_EN : TEXTES_FR;
}
