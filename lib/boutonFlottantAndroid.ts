"use client";

// Cree le 13/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Point d'entree JS du plugin natif BoutonFlottant
// (android/app/src/main/java/com/classinus/app/boutonflottant/).
//
// Le bouton est une petite fenetre du systeme affichee par-dessus les autres
// applications, meme Classinus ferme. Il ne contient aucune logique du canal :
// un appui est transmis a la page (evenement basculeDemande) qui bascule le
// canal en direct comme le bouton du canal dans l'appli (voir
// lib/pontBoutonFlottantCanal.ts).
//
// Ce fichier ne contient AUCUN texte affiche a l'utilisateur : le plugin
// renvoie des codes d'erreur stables, l'ecran appelant choisit le message
// (voir lib/textesBoutonFlottant.ts).
//
// Disponible seulement dans l'appli Android (Capacitor).

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export type EtatBoutonFlottant = {
  /** La permission "Afficher par-dessus les autres applications" est-elle accordee ? */
  permissionAccordee: boolean;
  /** Le bouton est-il en place en ce moment ? */
  demarre: boolean;
  /** Choix de l'etudiant : true (il le veut), false (il l'a masque). Absent tant qu'il n'a jamais choisi. */
  choix?: boolean;
};

export type OptionsDemarrageBoutonFlottant = {
  /** Textes de la notification permanente, a fournir deja traduits. Sinon texte par defaut du natif. */
  titre?: string;
  texte?: string;
  libelleMasquer?: string;
};

export type DemandeBasculeBouton = {
  /** Numero de l'appui, a renvoyer a accuserBascule. 0 pour un appui rejoue a l'ouverture de l'appli. */
  numero: number;
  /** Vrai si l'appli n'etait pas a l'ecran : une fois le canal bascule, rendre la main a l'appli d'avant. */
  reculerApres: boolean;
};

export type CodeErreurBoutonFlottant = "PERMISSION_REFUSEE" | "ECHEC";

type PluginBoutonFlottant = {
  etat(): Promise<EtatBoutonFlottant>;
  demarrer(options?: OptionsDemarrageBoutonFlottant): Promise<{ demarre: true }>;
  arreter(): Promise<{ demarre: false }>;
  definirEtatCanal(options: { actif: boolean }): Promise<void>;
  signalerPret(): Promise<void>;
  accuserBascule(options: { numero: number }): Promise<void>;
  reculerAppli(): Promise<void>;
  addListener(
    evenement: "basculeDemande",
    ecouteur: (demande: DemandeBasculeBouton) => void,
  ): Promise<PluginListenerHandle>;
};

const BoutonFlottant = registerPlugin<PluginBoutonFlottant>("BoutonFlottant");

/** true seulement dans l'appli Android : le bouton n'existe ni sur le web ni sur iOS. */
export function boutonFlottantDisponible(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** Code d'erreur stable d'un rejet du plugin, ou null si l'erreur n'en porte pas. */
export function codeErreurBoutonFlottant(e: unknown): CodeErreurBoutonFlottant | null {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code as CodeErreurBoutonFlottant;
  }
  return null;
}

export function etatBoutonFlottant(): Promise<EtatBoutonFlottant> {
  return BoutonFlottant.etat();
}

/** Montre le bouton et garde l'appli en vie. Rejette avec PERMISSION_REFUSEE si l'affichage par-dessus les autres applis n'est pas accorde. */
export function demarrerBoutonFlottant(options?: OptionsDemarrageBoutonFlottant): Promise<{ demarre: true }> {
  return BoutonFlottant.demarrer(options);
}

/** Retire le bouton : l'etudiant ne le veut plus, il ne reviendra pas apres un redemarrage. */
export function arreterBoutonFlottant(): Promise<{ demarre: false }> {
  return BoutonFlottant.arreter();
}

/** Dessine le bouton selon l'etat du canal en direct (sombre au repos, or quand le canal est actif). */
export function definirEtatCanalBouton(actif: boolean): Promise<void> {
  return BoutonFlottant.definirEtatCanal({ actif });
}

/** Dit au natif que la page ecoute les appuis. Un appui fait appli fermee est rejoue des cet appel. */
export function signalerBoutonPret(): Promise<void> {
  return BoutonFlottant.signalerPret();
}

/** Dit au natif que l'appui est pris en compte (sinon il lance l'appli apres 1,5 seconde). */
export function accuserBasculeBouton(numero: number): Promise<void> {
  return BoutonFlottant.accuserBascule({ numero });
}

/** Renvoie l'appli en arriere-plan, l'etudiant retrouve l'application d'avant. */
export function reculerAppli(): Promise<void> {
  return BoutonFlottant.reculerAppli();
}

/** Ecoute les appuis sur le bouton. Appeler remove() sur le resultat pour se desabonner. */
export function ecouterBasculeBouton(
  ecouteur: (demande: DemandeBasculeBouton) => void,
): Promise<PluginListenerHandle> {
  return BoutonFlottant.addListener("basculeDemande", ecouteur);
}
