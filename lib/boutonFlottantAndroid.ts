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
import type { CarteBulleNative } from "./cartesBulleAndroid";

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

export type TexteEcritBouton = {
  /** Numero de l'envoi, a renvoyer a accuserTexte. 0 pour un texte rejoue a l'ouverture de l'appli. */
  numero: number;
  /** Message ecrit dans le champ du bouton Ecrire (lot 2), deja nettoye des espaces autour. */
  texte: string;
};

/** Ce que la bulle native montre (lot 3) : rien, une information (petit message) ou la reponse de Classinus. */
export type ModeBulleNative = "aucune" | "information" | "reponse";

export type EtatBulleNative = {
  mode: ModeBulleNative;
  /** Texte a afficher. Pour une reponse, du markdown : le natif le met en forme de facon simplifiee. */
  texte?: string;
  /** Vrai si la reponse contient ce que le natif ne sait pas dessiner : la bulle propose d'ouvrir Classinus. */
  proposerOuvrir?: boolean;
  /** Adresses https des images de la reponse (lot 4) : une rangee qui defile sous le texte. */
  images?: string[];
  /** Cartes d'apercu des liens et videos de la reponse (lot 4), trouvees par la page. */
  cartes?: CarteBulleNative[];
};

/** Etat de la voix en direct pour le bouton et la bulle de la voix (lot 4). */
export type EtatVoixNative = "inactif" | "connexion" | "actif" | "reponse";

/** Etat du micro et de la voix pousse au natif (lot 4). */
export type EtatMicroVoixNatif = {
  /** L'enregistrement de la dictee est en cours de transcription : le micro pulse et est grise. */
  transcription: boolean;
  voix: EtatVoixNative;
};

/** Onde de la bulle de la voix (lot 4) : etat et niveaux sonores de 0 a 1. */
export type NiveauxVoixNatif = {
  etat: string;
  entree: number;
  sortie: number;
};

/** Dictee terminee (lot 4) : le son en base64, a envoyer a la transcription. */
export type DicteeTerminee = { audio: string; typeMime: string };

/** Code d'erreur du micro natif (lot 4) : REFUSE, INDISPONIBLE, AUCUNE_VOIX ou OCCUPE. */
export type ErreurMicroNative = { code: string };

/** Geste de l'etudiant sur la fleche ou la bulle native. */
export type ActionBulle = "basculer" | "suspendre" | "reprendre";

export type ActionBulleDemandee = {
  action: ActionBulle;
};

export type CodeErreurBoutonFlottant = "PERMISSION_REFUSEE" | "ECHEC";

type PluginBoutonFlottant = {
  etat(): Promise<EtatBoutonFlottant>;
  demarrer(options?: OptionsDemarrageBoutonFlottant): Promise<{ demarre: true }>;
  arreter(): Promise<{ demarre: false }>;
  definirEtatCanal(options: { actif: boolean }): Promise<void>;
  signalerPret(): Promise<void>;
  accuserBascule(options: { numero: number }): Promise<void>;
  accuserTexte(options: { numero: number }): Promise<void>;
  definirBulle(options: EtatBulleNative): Promise<void>;
  definirEtatMicroVoix(options: EtatMicroVoixNatif): Promise<void>;
  definirNiveauxVoix(options: NiveauxVoixNatif): Promise<void>;
  demarrerFluxMicro(): Promise<{ demarre: boolean }>;
  arreterFluxMicro(): Promise<void>;
  annulerDictee(): Promise<void>;
  armerMicro(): Promise<{ arme: boolean }>;
  reculerAppli(): Promise<void>;
  addListener(
    evenement: "basculeDemande",
    ecouteur: (demande: DemandeBasculeBouton) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    evenement: "texteEcrit",
    ecouteur: (texte: TexteEcritBouton) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    evenement: "bulleAction",
    ecouteur: (geste: ActionBulleDemandee) => void,
  ): Promise<PluginListenerHandle>;
  addListener(evenement: "dicteeEtat", ecouteur: (etat: { ecoute: boolean }) => void): Promise<PluginListenerHandle>;
  addListener(evenement: "dicteeTerminee", ecouteur: (dictee: DicteeTerminee) => void): Promise<PluginListenerHandle>;
  addListener(evenement: "voixDemandee", ecouteur: () => void): Promise<PluginListenerHandle>;
  addListener(evenement: "fluxMorceau", ecouteur: (morceau: { pcm: string }) => void): Promise<PluginListenerHandle>;
  addListener(evenement: "fluxInterrompu", ecouteur: () => void): Promise<PluginListenerHandle>;
  addListener(evenement: "erreurMicro", ecouteur: (erreur: ErreurMicroNative) => void): Promise<PluginListenerHandle>;
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

/** Dit au natif que le texte ecrit est recu (sinon il le garde et lance l'appli apres 1,5 seconde). */
export function accuserTexteBouton(numero: number): Promise<void> {
  return BoutonFlottant.accuserTexte({ numero });
}

/** Ecoute les messages ecrits dans le champ du bouton Ecrire. Appeler remove() sur le resultat pour se desabonner. */
export function ecouterTexteBouton(
  ecouteur: (texte: TexteEcritBouton) => void,
): Promise<PluginListenerHandle> {
  return BoutonFlottant.addListener("texteEcrit", ecouteur);
}

/** Dessine la bulle native pres de la fleche de Classinus (sans effet canal coupe). */
export function definirBulleNative(etat: EtatBulleNative): Promise<void> {
  return BoutonFlottant.definirBulle(etat);
}

/** Ecoute les gestes sur la fleche et la bulle natives. Appeler remove() sur le resultat pour se desabonner. */
export function ecouterActionBulle(
  ecouteur: (geste: ActionBulleDemandee) => void,
): Promise<PluginListenerHandle> {
  return BoutonFlottant.addListener("bulleAction", ecouteur);
}

// Lot 4 : micro de dictee, mode vocal et bulle de la voix.

/** Pousse l'etat du micro (transcription) et de la voix au bouton et a la bulle de la voix. */
export function definirEtatMicroVoixNatif(etat: EtatMicroVoixNatif): Promise<void> {
  return BoutonFlottant.definirEtatMicroVoix(etat);
}

/** Pousse l'etat et les niveaux sonores de la voix a l'onde de la bulle (une quinzaine de fois par seconde). */
export function definirNiveauxVoixNatif(niveaux: NiveauxVoixNatif): Promise<void> {
  return BoutonFlottant.definirNiveauxVoix(niveaux);
}

/** Demande le flux du micro natif pour la voix en direct. demarre est faux si le micro ne peut pas etre pris. */
export function demarrerFluxMicroNatif(): Promise<{ demarre: boolean }> {
  return BoutonFlottant.demarrerFluxMicro();
}

export function arreterFluxMicroNatif(): Promise<void> {
  return BoutonFlottant.arreterFluxMicro();
}

/** Abandonne la dictee en cours sans rien envoyer. */
export function annulerDicteeNative(): Promise<void> {
  return BoutonFlottant.annulerDictee();
}

/** Arme le service du micro depuis l'appli visible (voix lancee depuis l'appli). arme est faux si c'est refuse. */
export function armerMicroNatif(): Promise<{ arme: boolean }> {
  return BoutonFlottant.armerMicro();
}

export function ecouterEtatDictee(ecouteur: (etat: { ecoute: boolean }) => void): Promise<PluginListenerHandle> {
  return BoutonFlottant.addListener("dicteeEtat", ecouteur);
}

export function ecouterDicteeTerminee(ecouteur: (dictee: DicteeTerminee) => void): Promise<PluginListenerHandle> {
  return BoutonFlottant.addListener("dicteeTerminee", ecouteur);
}

/** L'etudiant a touche le bouton du mode vocal du bouton flottant : ouvrir ou fermer la voix. */
export function ecouterVoixDemandee(ecouteur: () => void): Promise<PluginListenerHandle> {
  return BoutonFlottant.addListener("voixDemandee", ecouteur);
}

/** Morceaux de 100 ms du micro (PCM 16 bits, 16 kHz, mono, base64) pendant le flux de la voix. */
export function ecouterMorceauFlux(ecouteur: (morceau: { pcm: string }) => void): Promise<PluginListenerHandle> {
  return BoutonFlottant.addListener("fluxMorceau", ecouteur);
}

/** Le flux s'est arrete sans que la page l'ait demande (micro pris par un appel, par exemple). */
export function ecouterFluxInterrompu(ecouteur: () => void): Promise<PluginListenerHandle> {
  return BoutonFlottant.addListener("fluxInterrompu", ecouteur);
}

export function ecouterErreurMicro(ecouteur: (erreur: ErreurMicroNative) => void): Promise<PluginListenerHandle> {
  return BoutonFlottant.addListener("erreurMicro", ecouteur);
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
