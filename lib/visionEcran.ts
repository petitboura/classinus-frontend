"use client";

// Cree le 07/10/2026, demande Bourama : lot 1 du chantier "vision ecran"
// (Clovis voit l'ecran du telephone Android). Point d'entree JS du plugin
// natif VisionEcran (android/app/src/main/java/com/classinus/app/visionecran/).
//
// Ce fichier ne contient AUCUN texte affiche a l'utilisateur : le plugin
// renvoie des codes d'erreur stables, c'est l'ecran appelant (lot 4) qui
// choisit le message et le traduit.
//
// Disponible seulement dans l'appli Android (Capacitor). Sur le web et sur
// iOS, visionEcranDisponible() renvoie false et rien ne doit etre appele.

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export type EtatVisionEcran = {
  actif: boolean;
  /** Taille reelle de l'ecran en pixels, dans son orientation actuelle (seulement si actif). */
  ecranLargeur?: number;
  ecranHauteur?: number;
};

export type OptionsDemarrageVisionEcran = {
  /** Textes de la notification permanente, a fournir deja traduits. Sinon texte par defaut du natif. */
  titre?: string;
  texte?: string;
  libelleArreter?: string;
  /** Grand cote maximal de la capture interne, en pixels. */
  tailleCaptureMax?: number;
};

export type OptionsCaptureVisionEcran = {
  /** Grand cote maximal de l'image envoyee, en pixels. */
  tailleMax?: number;
  /** Qualite JPEG, de 30 a 95. */
  qualite?: number;
};

export type CaptureVisionEcran = {
  /** JPEG encode en base64, sans prefixe "data:". */
  image: string;
  typeMime: "image/jpeg";
  /** Taille de l'image envoyee. */
  largeur: number;
  hauteur: number;
  /** Taille reelle de l'ecran : sert a convertir une position de l'image en position d'ecran (pointage). */
  ecranLargeur: number;
  ecranHauteur: number;
  /** Moment de la capture, en millisecondes depuis 1970. */
  horodatage: number;
};

export type ChangementEtatVisionEcran = {
  actif: boolean;
  /** Seulement pour un echec ou un arret force (ex: ARRET_SYSTEME). */
  erreur?: string;
};

export type CodeErreurVisionEcran =
  | "REFUSE"
  | "INDISPONIBLE"
  | "DEJA_EN_COURS"
  | "DELAI"
  | "ECHEC"
  | "INACTIF"
  | "AUCUNE_IMAGE"
  | "CAPTURE_ECHEC";

type PluginVisionEcran = {
  etat(): Promise<EtatVisionEcran>;
  demarrer(options?: OptionsDemarrageVisionEcran): Promise<EtatVisionEcran>;
  capturer(options?: OptionsCaptureVisionEcran): Promise<CaptureVisionEcran>;
  arreter(): Promise<{ actif: false }>;
  addListener(
    evenement: "etatChange",
    ecouteur: (changement: ChangementEtatVisionEcran) => void,
  ): Promise<PluginListenerHandle>;
};

const VisionEcran = registerPlugin<PluginVisionEcran>("VisionEcran");

/** true seulement dans l'appli Android : la capture n'existe ni sur le web ni sur iOS. */
export function visionEcranDisponible(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** Code d'erreur stable d'un rejet du plugin, ou null si l'erreur n'en porte pas. */
export function codeErreurVisionEcran(e: unknown): CodeErreurVisionEcran | null {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code as CodeErreurVisionEcran;
  }
  return null;
}

export function etatVisionEcran(): Promise<EtatVisionEcran> {
  return VisionEcran.etat();
}

/** Ouvre la fenetre d'autorisation du systeme puis lance la capture. Rejette avec le code REFUSE si l'etudiant refuse. */
export function demarrerVisionEcran(options?: OptionsDemarrageVisionEcran): Promise<EtatVisionEcran> {
  return VisionEcran.demarrer(options);
}

export function capturerEcran(options?: OptionsCaptureVisionEcran): Promise<CaptureVisionEcran> {
  return VisionEcran.capturer(options);
}

export function arreterVisionEcran(): Promise<{ actif: false }> {
  return VisionEcran.arreter();
}

/** Ecoute les demarrages, arrets et coupures par le systeme. Appeler remove() sur le resultat pour se desabonner. */
export function ecouterEtatVisionEcran(
  ecouteur: (changement: ChangementEtatVisionEcran) => void,
): Promise<PluginListenerHandle> {
  return VisionEcran.addListener("etatChange", ecouteur);
}
