// Textes de l'éditeur vidéo contextuel (EditeurVideoContextuel.tsx) et des
// erreurs de uploaderVideoEspace (lib/api.ts). Même convention que
// textesVideoAnimation.ts : une version française, une version anglaise, et la
// langue lue depuis le choix de l'interface.
import type { Locale } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import type { Elargir } from "@/lib/i18n/types";

const TEXTES_FR = {
  entete: "Modifier une vidéo avec Clovis",
  ariaFermer: "Fermer l'éditeur vidéo",
  conversationRequise: "Ouvre une conversation avant de lancer le montage vidéo.",
  reessayer: "Réessayer",
  apercuEtSelection: "Aperçu et sélection",
  selectionnerZone: "Sélectionner une zone",
  dessinerZone: "Dessine la zone dans l’image…",
  preparationApercu: "Préparation de l’aperçu…",
  ariaZoneSelectionnee: "Zone sélectionnée",
  aideZone: "Fais glisser sur l’image pour encadrer l’élément à modifier. La zone sera conservée quand tu relâches.",
  zoneSelectionnee: "Zone d’image sélectionnée",
  retirerZone: "Retirer la zone",
  intervalle: "Intervalle temporel",
  toutelaVideo: "Toute la vidéo",
  intervalleChoisi: (debut: string, fin: string) => `De ${debut} à ${fin}`,
  dureeEtConsigne: (duree: string) =>
    `Durée de la vidéo : ${duree}. Déplace un curseur pour choisir le passage à modifier.`,
  debut: "Début",
  fin: "Fin",
  ariaDebut: "Début de la sélection",
  ariaFin: "Fin de la sélection",
  questionModification: "Que veux-tu modifier ?",
  exemple: "Ex. : enlève le bruit de fond sur ce passage, zoome sur le tableau et ajoute un titre discret…",
  aideOperations: "Clovis choisira les opérations adaptées. L’original restera intact.",
  preparationVideo: "Préparation de la vidéo…",
  videoPrete: "Vidéo prête",
  invitationSelection: "Sélectionne un passage ou une zone pour afficher l’action.",
  demander: "Demander à Clovis",
  erreurPreparation: "Impossible de préparer cette vidéo.",
  erreurConnexion: "Connecte-toi pour modifier une vidéo.",
  erreurConversation: "Ouvre une conversation avant de modifier une vidéo.",
  menuApercu: "Aperçu",
  menuModifier: "Modifier avec Clovis",
} as const;

export type TextesEditeurVideo = Elargir<typeof TEXTES_FR>;

const TEXTES_EN: Elargir<typeof TEXTES_FR> = {
  entete: "Edit a video with Clovis",
  ariaFermer: "Close the video editor",
  conversationRequise: "Open a conversation before starting the video edit.",
  reessayer: "Try again",
  apercuEtSelection: "Preview and selection",
  selectionnerZone: "Select an area",
  dessinerZone: "Draw the area on the image…",
  preparationApercu: "Preparing the preview…",
  ariaZoneSelectionnee: "Selected area",
  aideZone: "Drag on the image to frame the element to change. The area is kept when you release.",
  zoneSelectionnee: "Image area selected",
  retirerZone: "Remove the area",
  intervalle: "Time range",
  toutelaVideo: "Whole video",
  intervalleChoisi: (debut: string, fin: string) => `From ${debut} to ${fin}`,
  dureeEtConsigne: (duree: string) =>
    `Video length: ${duree}. Move a slider to choose the part to change.`,
  debut: "Start",
  fin: "End",
  ariaDebut: "Start of the selection",
  ariaFin: "End of the selection",
  questionModification: "What do you want to change?",
  exemple: "E.g. remove the background noise in this part, zoom in on the board and add a discreet title…",
  aideOperations: "Clovis will choose the right operations. The original stays untouched.",
  preparationVideo: "Preparing the video…",
  videoPrete: "Video ready",
  invitationSelection: "Select a part or an area to show the action.",
  demander: "Ask Clovis",
  erreurPreparation: "This video could not be prepared.",
  erreurConnexion: "Sign in to edit a video.",
  erreurConversation: "Open a conversation before editing a video.",
  menuApercu: "Preview",
  menuModifier: "Edit with Clovis",
};

const TEXTES: Record<Locale, Elargir<typeof TEXTES_FR>> = { fr: TEXTES_FR, en: TEXTES_EN };

export function textesEditeurVideo(locale: Locale = obtenirLocale()): TextesEditeurVideo {
  return TEXTES[locale] ?? TEXTES_FR;
}
