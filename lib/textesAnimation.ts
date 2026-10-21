// Textes affichés par le lecteur d'animation du chat (29/09/2026,
// demande Bourama).
//
// Les dictionnaires FR/EN suivent le même modèle que les autres textes
// localisés. Ces textes sont aussi injectés dans le document de l'iframe
// (voir components/chat/animation/construireDocumentAnimation.ts), qui ne
// peut pas importer directement les modules du frontend.
import type { Locale } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import type { Elargir } from "@/lib/i18n/types";

const TEXTES_FR = {
  titre: "Animation",
  sousTitre: "Lecture",
  iframeTitre: "Animation",
  lecture: "Lecture",
  pause: "Pause",
  recommencer: "Recommencer",
  position: "Position dans l'animation",
  chapitres: "Parties de l'animation",
  erreurAnimation: "Erreur dans l'animation",
  erreurTroisD: "Impossible de charger la 3D. Vérifie ta connexion puis recharge.",
  erreurTroisDIndisponible: "La 3D n'est pas disponible sur cet appareil.",
  aucuneScene: "Cette animation est vide.",
} as const;

export type TextesAnimation = Elargir<typeof TEXTES_FR>;

const TEXTES_EN: Elargir<typeof TEXTES_FR> = {
  titre: "Animation",
  sousTitre: "Playback",
  iframeTitre: "Animation",
  lecture: "Play",
  pause: "Pause",
  recommencer: "Restart",
  position: "Animation position",
  chapitres: "Animation sections",
  erreurAnimation: "Animation error",
  erreurTroisD: "Unable to load 3D. Check your connection and reload.",
  erreurTroisDIndisponible: "3D is not available on this device.",
  aucuneScene: "This animation is empty.",
};

const TEXTES: Record<Locale, Elargir<typeof TEXTES_FR>> = { fr: TEXTES_FR, en: TEXTES_EN };

export function textesAnimation(locale: Locale = obtenirLocale()): TextesAnimation {
  return TEXTES[locale] ?? TEXTES_FR;
}
