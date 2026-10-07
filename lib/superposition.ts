"use client";

// Cree le 07/10/2026, demande Bourama : lot 2 du chantier "vision ecran"
// (Clovis pointe, surligne et souligne par-dessus les autres applis
// Android). Point d'entree JS du plugin natif Superposition
// (android/app/src/main/java/com/classinus/app/visionecran/).
//
// La fenetre de superposition est INTOUCHABLE : les gestes de l'eleve la
// traversent. Clovis montre, l'eleve agit lui-meme.
//
// Ce fichier ne contient AUCUN texte affiche a l'utilisateur : le plugin
// renvoie des codes d'erreur stables, c'est l'ecran appelant (lot 4) qui
// choisit le message et le traduit. Les etiquettes des marques sont
// fournies par l'appelant, deja traduites.
//
// Disponible seulement dans l'appli Android (Capacitor).

import { Capacitor, registerPlugin } from "@capacitor/core";

export type TypeMarqueSuperposition = "pointer" | "surligner" | "souligner";

export type MarqueSuperposition = {
  type: TypeMarqueSuperposition;
  /** Pour "pointer", la pointe de la fleche. Pour les deux autres, le coin haut gauche de la zone. */
  x: number;
  y: number;
  /** Obligatoire pour "surligner" et "souligner". */
  largeur?: number;
  /** Obligatoire pour "surligner". Pour "souligner", le trait est trace sous y + hauteur. */
  hauteur?: number;
  /** Court texte affiche pres de la marque (80 caracteres maximum), deja traduit. */
  etiquette?: string;
  /** Couleur au format "#RRGGBB". Sinon l'or du logo. */
  couleur?: string;
};

export type OptionsAfficherSuperposition = {
  marques: MarqueSuperposition[];
  /**
   * Dimensions de l'espace dans lequel les positions sont exprimees, par
   * exemple { largeur, hauteur } de l'image renvoyee par capturerEcran().
   * Le natif convertit lui-meme vers l'ecran. Sans espace, les positions
   * sont des pixels d'ecran.
   */
  espace?: { largeur: number; hauteur: number };
  /** Duree d'affichage en millisecondes (8000 par defaut). 0 garde les marques jusqu'a effacer(). */
  dureeMs?: number;
};

export type EtatSuperposition = {
  permissionAccordee: boolean;
  affichee: boolean;
};

export type CodeErreurSuperposition = "PERMISSION_REFUSEE" | "MARQUES_INVALIDES" | "ECHEC";

type PluginSuperposition = {
  etat(): Promise<EtatSuperposition>;
  demanderPermission(): Promise<{ accordee: boolean }>;
  afficher(options: OptionsAfficherSuperposition): Promise<{ affichee: true }>;
  effacer(): Promise<{ affichee: false }>;
};

const Superposition = registerPlugin<PluginSuperposition>("Superposition");

/** true seulement dans l'appli Android : la superposition n'existe ni sur le web ni sur iOS. */
export function superpositionDisponible(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** Code d'erreur stable d'un rejet du plugin, ou null si l'erreur n'en porte pas. */
export function codeErreurSuperposition(e: unknown): CodeErreurSuperposition | null {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code as CodeErreurSuperposition;
  }
  return null;
}

export function etatSuperposition(): Promise<EtatSuperposition> {
  return Superposition.etat();
}

/**
 * Envoie l'eleve dans les reglages systeme pour activer "Afficher par-dessus
 * les autres applications". Se resout quand il revient, avec le nouvel etat.
 */
export function demanderPermissionSuperposition(): Promise<{ accordee: boolean }> {
  return Superposition.demanderPermission();
}

/** Montre les marques. Rejette avec PERMISSION_REFUSEE si l'eleve n'a pas active la permission. */
export function afficherSuperposition(options: OptionsAfficherSuperposition): Promise<{ affichee: true }> {
  return Superposition.afficher(options);
}

export function effacerSuperposition(): Promise<{ affichee: false }> {
  return Superposition.effacer();
}
