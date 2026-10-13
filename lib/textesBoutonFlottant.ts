// Textes du bouton flottant du canal en direct sur Android (13/10/2026,
// demande Bourama).
//
// Regroupes ici, par langue, sur le meme modele que lib/textesVisionEcran.ts :
// une seule locale active pour l'instant (fr), ajouter une langue ne demande
// que de renseigner une entree dans TEXTES ci-dessous. Les trois premiers
// textes sont ceux de la notification permanente que le systeme Android
// affiche tant que le bouton est disponible (le natif les garde pour pouvoir
// ramener le bouton apres un redemarrage du telephone).
import { LOCALE_ACTIVE, type Locale } from "@/lib/erreurs";

const TEXTES_FR = {
  notificationTitre: "Le bouton Classinus est disponible",
  notificationTexte: "Touche le bouton pour activer ou couper le canal en direct, depuis n'importe quelle application.",
  notificationMasquer: "Masquer le bouton",
  reglageTitre: "Bouton flottant",
  reglageDescription: "Garde le bouton du canal en direct par-dessus les autres applications, même quand Classinus est fermé.",
  messageActive: "Bouton flottant activé.",
  messageDesactive: "Bouton flottant masqué.",
  messagePermissionRefusee: "Autorise l'affichage par-dessus les autres applications dans les réglages du téléphone, puis réessaie.",
  messageEchec: "Le bouton flottant n'a pas pu démarrer. Réessaie dans un instant.",
} as const;

const TEXTES: Partial<Record<Locale, typeof TEXTES_FR>> = { fr: TEXTES_FR };

export function textesBoutonFlottant(locale: Locale = LOCALE_ACTIVE): typeof TEXTES_FR {
  return TEXTES[locale] ?? TEXTES_FR;
}
