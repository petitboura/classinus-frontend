// Cree le 27/09/2026, Bourama : chantier "canal en direct sort de l'appli"
// (voir plan-canal-en-direct-pc.md), Lot Q.
//
// Contrat impose par @capawesome/capacitor-electron (voir son README,
// section "Plugin Development") : ce fichier compile doit se trouver a
// exactement <src>/dist/plugin.mjs (src déclaré dans package.json,
// champ capacitor.electron.src = "electron"), et exporter une classe
// dont la propriete statique __capacitorElectronPlugin (posee ici via
// defineElectronPlugin) declare son nom Capacitor et ses methodes
// exposees au web. C'est cette propriete, pas un import de ce paquet,
// qui fait le contrat -- garde ici pour beneficier du typage et de la
// classe de base ElectronPlugin.
//
// But de ce plugin, pour l'instant : donner a la fenetre Electron un
// appareil_id PERSISTANT et PROPRE au PC, exactement comme
// IdentifiantAppareil.kt le fait deja pour Android (meme fichier,
// meme raisonnement : cle = (user_id, appareil_id) cote backend, voir
// clovis-backend/core/canal_agent_applicatif.py -- sans identifiant
// propre, appareilId resterait "" et se comporterait comme un onglet
// web classique. Cote JS, ce plugin est deja appele tel quel, sans
// aucun changement necessaire : voir obtenirAppareilIdPourCanal() dans
// lib/canalAgentApplicatif.ts, qui appelle deja
// registerPlugin('Dossiers').obtenirInfosAppareil() des que
// Capacitor.isNativePlatform() est vrai -- ce que la plateforme
// Electron rapporte nativement (Capacitor.getPlatform() === 'electron').
//
// Nom du plugin volontairement identique a celui deja utilise cote
// Android/iOS ("Dossiers") : c'est la meme methode obtenirInfosAppareil
// qui est appelee depuis le meme code JS partage, quelle que soit la
// plateforme. Les autres methodes du plugin Dossiers cote mobile
// (choisirDossier, listerContenu, etc., voir
// android/app/src/main/java/com/classinus/app/dossiers/DossiersPlugin.kt)
// ne sont PAS reprises ici : rien ne les appelle depuis une fenetre
// Electron pour l'instant (la gestion de dossiers sur PC est un
// chantier a part, non demande ici). Seule obtenirInfosAppareil est
// declaree dans "methods" ci-dessous ; si une autre methode Dossiers
// est appelee depuis une fenetre Electron avant d'avoir ete ajoutee
// ici, Capacitor rejettera l'appel (methode non exposee), plutot que
// de planter silencieusement.

import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { app } from "electron";
import { ElectronPlugin, defineElectronPlugin } from "@capawesome/capacitor-electron/plugin";

const NOM_FICHIER_IDENTIFIANT = "clovis-identifiant-appareil.json";

interface EtatIdentifiantAppareil {
  appareilId: string;
  nomPersonnalise: string | null;
}

/**
 * Libelle par defaut si l'utilisateur n'a rien choisi. Le PC n'a pas de
 * "modele" comparable a Build.MODEL sur Android : le nom d'ordinateur
 * (hostname) est l'equivalent le plus proche, presque toujours deja
 * parlant pour l'utilisateur (ex. "DESKTOP-A1B2C3", "PC-Bourama").
 */
function libelleParDefaut(): string {
  try {
    return hostname() || "PC";
  } catch {
    return "PC";
  }
}

/**
 * Lit/ecrit l'etat persiste dans le dossier userData d'Electron
 * (equivalent des SharedPreferences Android utilisees par
 * IdentifiantAppareil.kt) : un fichier JSON simple, cree au premier
 * appel. Comme cote Android, un identifiant n'est jamais resynchronise
 * entre installations : desinstaller puis reinstaller l'appli en
 * genere un nouveau, ce qui est le comportement voulu.
 */
function cheminFichierIdentifiant(): string {
  const dossier = app.getPath("userData");
  if (!existsSync(dossier)) mkdirSync(dossier, { recursive: true });
  return join(dossier, NOM_FICHIER_IDENTIFIANT);
}

function lireEtat(): EtatIdentifiantAppareil | null {
  try {
    const brut = readFileSync(cheminFichierIdentifiant(), "utf-8");
    const donnees = JSON.parse(brut) as Partial<EtatIdentifiantAppareil>;
    if (typeof donnees.appareilId !== "string" || !donnees.appareilId) return null;
    return {
      appareilId: donnees.appareilId,
      nomPersonnalise: typeof donnees.nomPersonnalise === "string" ? donnees.nomPersonnalise : null,
    };
  } catch {
    return null;
  }
}

function ecrireEtat(etat: EtatIdentifiantAppareil): void {
  writeFileSync(cheminFichierIdentifiant(), JSON.stringify(etat), "utf-8");
}

function obtenirOuCreerEtat(): EtatIdentifiantAppareil {
  const existant = lireEtat();
  if (existant) return existant;
  const nouvel_etat: EtatIdentifiantAppareil = { appareilId: randomUUID(), nomPersonnalise: null };
  ecrireEtat(nouvel_etat);
  return nouvel_etat;
}

class DossiersImpl extends ElectronPlugin {
  /**
   * Meme forme de reponse que le plugin Android (voir DossiersPlugin.kt,
   * methode obtenirInfosAppareil) : appareilId (utilise par
   * lib/canalAgentApplicatif.ts), appareilNom (libelle actuel, choisi ou
   * par defaut), nomPersonnalise (true si l'utilisateur l'a choisi
   * lui-meme). Le canal agent applicatif n'a besoin que d'appareilId,
   * mais les deux autres champs sont deja lus par
   * components/NomAppareilCarte.tsx cote mobile -- les garder ici évite
   * un cas particulier si ce composant est un jour reutilise sur PC.
   */
  async obtenirInfosAppareil(): Promise<{ appareilId: string; appareilNom: string; nomPersonnalise: boolean }> {
    const etat = obtenirOuCreerEtat();
    return {
      appareilId: etat.appareilId,
      appareilNom: etat.nomPersonnalise ?? libelleParDefaut(),
      nomPersonnalise: etat.nomPersonnalise !== null,
    };
  }
}

export const Dossiers = defineElectronPlugin({ name: "Dossiers", methods: ["obtenirInfosAppareil"] }, DossiersImpl);
