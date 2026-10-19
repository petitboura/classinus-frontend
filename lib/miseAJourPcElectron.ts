// Créé le 19/10/2026, demande Bourama : mise à jour automatique de l'appli PC.
//
// Côté site du plugin Electron "MiseAJourPc" (voir
// packages/capacitor-mise-a-jour-pc-electron). Tout est inerte hors de l'appli
// PC : sur le web et sur mobile, surAppliPc() est faux et rien n'appelle le
// plugin, comme pour le démarrage automatique (lib/superpositionElectron.ts).

import { Capacitor, registerPlugin } from "@capacitor/core";

export type NomEtatMiseAJourPc =
  | "indisponible"
  | "inactif"
  | "verification"
  | "a-jour"
  | "telechargement"
  | "prete"
  | "erreur";

/** Même forme que EtatMiseAJourPc du plugin (miseAJourPc.mts). */
export interface EtatMiseAJourPc {
  etat: NomEtatMiseAJourPc;
  versionActuelle: string;
  versionDisponible: string | null;
  progression: number | null;
  message: string | null;
  derniereVerification: number | null;
}

interface PluginMiseAJourPc {
  lireEtat(): Promise<EtatMiseAJourPc>;
  verifier(): Promise<EtatMiseAJourPc>;
  installer(): Promise<{ lance: boolean }>;
  addListener(
    nomEvenement: "etat",
    rappel: (etat: EtatMiseAJourPc) => void
  ): Promise<{ remove: () => Promise<void> | void }>;
}

const MiseAJourPc = registerPlugin<PluginMiseAJourPc>("MiseAJourPc");

export function surAppliPc(): boolean {
  return Capacitor.getPlatform() === "electron";
}

export function lireEtatMiseAJourPc() {
  return MiseAJourPc.lireEtat();
}

export function verifierMiseAJourPc() {
  return MiseAJourPc.verifier();
}

/** Ferme puis relance Classinus pour installer. `lance` est faux si rien n'est prêt ou si le lancement a échoué. */
export function installerMiseAJourPc() {
  return MiseAJourPc.installer();
}

/** Écoute chaque changement d'état. Renvoie la fonction qui arrête l'écoute. */
export async function ecouterMiseAJourPc(rappel: (etat: EtatMiseAJourPc) => void): Promise<() => void> {
  const poignee = await MiseAJourPc.addListener("etat", rappel);
  return () => {
    void poignee.remove();
  };
}
