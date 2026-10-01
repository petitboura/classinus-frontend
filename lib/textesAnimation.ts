// Textes affichés par le lecteur d'animation du chat (29/09/2026,
// demande Bourama).
//
// Regroupés ici, par langue, sur le même modèle que lib/textesMinuteurs.ts
// et lib/erreurs.ts : une seule locale active pour l'instant (fr), mais
// ajouter une langue ne demande que de renseigner une entrée dans TEXTES
// ci dessous, sans toucher aux composants. Ces textes sont aussi injectés
// dans le document de l'iframe (voir components/chat/animation/
// construireDocumentAnimation.ts), qui ne peut pas les importer lui même.
import { LOCALE_ACTIVE, type Locale } from "@/lib/erreurs";

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

export type TextesAnimation = typeof TEXTES_FR;

const TEXTES: Partial<Record<Locale, TextesAnimation>> = { fr: TEXTES_FR };

export function textesAnimation(locale: Locale = LOCALE_ACTIVE): TextesAnimation {
  return TEXTES[locale] ?? TEXTES_FR;
}
