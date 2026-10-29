// Créé le 28/10/2026, demande Bourama : relais téléphone embarqué dans
// l'appli PC (décision D31).
//
// Côté site du plugin Electron "RelaisPc" (voir
// packages/capacitor-relais-pc-electron). Tout est inerte hors de l'appli
// PC : sur le web et sur mobile, surAppliPc() est faux et rien n'appelle le
// plugin, comme pour la mise à jour (lib/miseAJourPcElectron.ts).

import { registerPlugin } from "@capacitor/core";
import { surAppliPc } from "./miseAJourPcElectron";

export { surAppliPc };

export type NomEtatRelaisPc =
  | "indisponible"
  | "arrete"
  | "demarrage"
  | "enmarche"
  | "erreur";

/** Même forme que EtatRelaisPc du plugin (relaisPc.mts). */
export interface EtatRelaisPc {
  etat: NomEtatRelaisPc;
  urlSante: string | null;
  message: string | null;
  pid: number | null;
}

/** Réponse d'un outil téléphone : le texte du résultat, ou une erreur claire. */
export type ReponseOutilRelaisPc = { texte: string } | { erreur: string };

interface PluginRelaisPc {
  lireEtat(): Promise<EtatRelaisPc>;
  demarrer(): Promise<EtatRelaisPc>;
  arreter(): Promise<EtatRelaisPc>;
  ouvrirPageSante(): Promise<{ ouvert: boolean }>;
  appelerOutil(options: { nom: string; args: Record<string, unknown> }): Promise<ReponseOutilRelaisPc>;
  addListener(
    nomEvenement: "etat",
    rappel: (etat: EtatRelaisPc) => void
  ): Promise<{ remove: () => Promise<void> | void }>;
}

const RelaisPc = registerPlugin<PluginRelaisPc>("RelaisPc");

export function lireEtatRelaisPc() {
  return RelaisPc.lireEtat();
}

export function demarrerRelaisPc() {
  return RelaisPc.demarrer();
}

export function arreterRelaisPc() {
  return RelaisPc.arreter();
}

/** Exécute un outil téléphone via le relais local. Réservé à l'appli PC. */
export function appelerOutilRelaisPc(nom: string, args: Record<string, unknown>) {
  return RelaisPc.appelerOutil({ nom, args });
}

/** Ouvre la page de santé dans le navigateur. `ouvert` est faux quand le relais est indisponible. */
export function ouvrirPageSanteRelaisPc() {
  return RelaisPc.ouvrirPageSante();
}

/** Écoute chaque changement d'état. Renvoie la fonction qui arrête l'écoute. */
export async function ecouterRelaisPc(rappel: (etat: EtatRelaisPc) => void): Promise<() => void> {
  const poignee = await RelaisPc.addListener("etat", rappel);
  return () => {
    void poignee.remove();
  };
}
