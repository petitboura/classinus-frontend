// Installation de Classinus depuis le navigateur du téléphone (25/11/2026, demande de Bourama). L'appli APK est
// abandonnée : sur Android et iPhone, on installe le site lui même sur l'écran d'accueil (PWA). État partagé par le
// bouton flottant (components/BoutonFlottantTelecharger.tsx), le bouton de la barre latérale
// (components/BoutonInstaller.tsx), la page /telecharger et la fenêtre des étapes
// (components/PanneauInstallation.tsx).
//
// Le bandeau d'installation de Chrome doit rester affiché sur Android : on garde la proposition du navigateur pour
// la relancer depuis nos boutons, SANS jamais appeler preventDefault() (c'est ce qui masquerait son bandeau).
//
// L'écoute démarre dès le chargement de ce module (importé par le layout racine) : la proposition n'est envoyée
// qu'une fois, souvent avant l'ouverture de la barre latérale. Rien ne se passe sur ordinateur, qui garde son propre
// fonctionnement.

import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

export const CLE_BOUTON_MASQUE = "classinus.installation.bouton_masque";

export type PlateformeInstallation = "android" | "ios";

export type EtatInstallation = {
  /** null tant qu'on ne sait pas, sur ordinateur et dans une appli native. */
  plateforme: PlateformeInstallation | null;
  /** Classinus est ouvert depuis l'écran d'accueil : plus rien à proposer. */
  ouvertCommeAppli: boolean;
  /** Le navigateur sait que Classinus est déjà installé (Chrome sur Android seulement). */
  dejaInstalle: boolean;
  /** « Je n'arrive pas à l'installer » a été choisi sur ce téléphone. */
  boutonMasque: boolean;
  /** La fenêtre des étapes est ouverte. */
  aideOuverte: boolean;
};

type PropositionInstallation = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{ outcome: string }>;
};

const ETAT_INITIAL: EtatInstallation = {
  plateforme: null,
  ouvertCommeAppli: false,
  dejaInstalle: false,
  boutonMasque: false,
  aideOuverte: false,
};

let etat = ETAT_INITIAL;
let proposition: PropositionInstallation | null = null;
let demarre = false;
const abonnes = new Set<() => void>();

function changer(partiel: Partial<EtatInstallation>) {
  etat = { ...etat, ...partiel };
  abonnes.forEach((prevenir) => prevenir());
}

function lireBoutonMasque(): boolean {
  try {
    return window.localStorage.getItem(CLE_BOUTON_MASQUE) === "1";
  } catch {
    return false;
  }
}

function plateformeActuelle(): PlateformeInstallation | null {
  if (Capacitor.isNativePlatform()) return null;
  if (/Android/i.test(navigator.userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return "ios";
  return null;
}

function estOuvertCommeAppli(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function verifierDejaInstalle() {
  try {
    const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<{ platform?: string }[]> };
    const applis = (await nav.getInstalledRelatedApps?.()) ?? [];
    // Seule la version web compte : une ancienne appli APK encore présente ne doit pas cacher le bouton.
    if (applis.some((appli) => appli.platform === "webapp")) changer({ dejaInstalle: true });
  } catch {
    // Navigateur qui ne sait pas répondre : on continue de proposer l'installation.
  }
}

function demarrer() {
  if (demarre || typeof window === "undefined") return;
  demarre = true;
  const plateforme = plateformeActuelle();
  if (!plateforme) return;

  window.addEventListener("beforeinstallprompt", (evenement) => {
    proposition = evenement as PropositionInstallation;
    // Chrome ne la renvoie que si Classinus n'est pas (ou plus) installé.
    changer({ dejaInstalle: false });
  });
  window.addEventListener("appinstalled", () => {
    proposition = null;
    changer({ dejaInstalle: true, aideOuverte: false });
  });

  etat = {
    ...etat,
    plateforme,
    ouvertCommeAppli: estOuvertCommeAppli(),
    boutonMasque: lireBoutonMasque(),
  };
  if (plateforme === "android") void verifierDejaInstalle();
}

demarrer();

/**
 * Ouvre la fenêtre d'installation du téléphone quand le navigateur la propose, sinon la page des étapes (iPhone,
 * navigateur qui ne propose rien, ou proposition déjà utilisée).
 */
export async function installerClassinus(): Promise<void> {
  const courante = proposition;
  if (!courante) {
    changer({ aideOuverte: true });
    return;
  }
  // Une proposition ne sert qu'une fois.
  proposition = null;
  try {
    await courante.prompt();
    const choix = await courante.userChoice;
    if (choix.outcome === "accepted") changer({ dejaInstalle: true });
  } catch {
    changer({ aideOuverte: true });
  }
}

export function fermerAideInstallation() {
  changer({ aideOuverte: false });
}

/** « Je n'arrive pas à l'installer » : le bouton flottant disparaît pour de bon sur ce téléphone. */
export function masquerBoutonFlottant() {
  try {
    window.localStorage.setItem(CLE_BOUTON_MASQUE, "1");
  } catch {
    // Stockage bloqué : le bouton reste masqué jusqu'au prochain chargement.
  }
  changer({ boutonMasque: true, aideOuverte: false });
}

function sAbonner(prevenir: () => void) {
  abonnes.add(prevenir);
  return () => {
    abonnes.delete(prevenir);
  };
}

export function useInstallationWeb(): EtatInstallation {
  return useSyncExternalStore(
    sAbonner,
    () => etat,
    () => ETAT_INITIAL
  );
}
