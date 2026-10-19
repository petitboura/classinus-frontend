// Créé le 19/10/2026, demande Bourama : mise à jour automatique de l'appli PC.
//
// Contrat imposé par @capawesome/capacitor-electron (même principe que les
// plugins Dossiers, PontNatif et SuperpositionAgent de ce dépôt) : ce fichier
// compilé doit se trouver à <src>/dist/plugin.mjs, et exporter une classe
// dont la propriété statique __capacitorElectronPlugin (posée par
// defineElectronPlugin) déclare le nom Capacitor et les méthodes exposées.
//
// Toute la logique est dans miseAJourPc.mts (noyau pur, testé sans Electron).
// Ici, seulement le branchement : electron-updater, la version de l'appli, et
// l'événement "etat" qui prévient la fenêtre à chaque changement.
//
// electron-updater lit où chercher les mises à jour dans app-update.yml, que
// electron-builder écrit tout seul dans l'installeur à partir de la section
// "publish" de electron/electron-builder.config.js (dépôt public
// petitboura/classinus-updates-pc). Aucun jeton n'est nécessaire côté appli : le dépôt
// est public.
//
// "load" est attendu avant l'ouverture de la première fenêtre : il ne fait que
// planifier la première vérification (30 s plus tard), il ne ralentit donc pas
// le démarrage.

import { app } from "electron";
import electronUpdater from "electron-updater";
import { ElectronPlugin, defineElectronPlugin } from "@capawesome/capacitor-electron/plugin";

import { creerMiseAJourPc, MISEUR_INERTE, type EtatMiseAJourPc } from "./miseAJourPc.mjs";

// electron-updater est un module CommonJS : sous ESM, l'import par défaut est
// la seule forme sûre. On n'en extrait PAS autoUpdater ici : c'est un accesseur
// qui crée l'objet de mise à jour à la première lecture, ce qu'on ne veut faire
// que dans l'appli installée.

class MiseAJourPcImpl extends ElectronPlugin {
  private noyau = creerMiseAJourPc({
    // En développement, on ne touche pas à electron-updater : il n'y a rien à mettre à jour.
    miseur: app.isPackaged ? electronUpdater.autoUpdater : MISEUR_INERTE,
    versionActuelle: app.getVersion(),
    empaquetee: app.isPackaged,
    surChangement: (etat) => this.context.notifyListeners("etat", etat),
    journaliser: (texte) => console.error(`[mise-a-jour-pc] ${texte}`),
  });

  load(): void {
    this.noyau.demarrer();
  }

  async lireEtat(): Promise<EtatMiseAJourPc> {
    return this.noyau.lireEtat();
  }

  async verifier(): Promise<EtatMiseAJourPc> {
    return this.noyau.verifier();
  }

  /** Ferme puis relance Classinus pour installer. Renvoie faux si rien n'est prêt. */
  async installer(): Promise<{ lance: boolean }> {
    return { lance: this.noyau.installer() };
  }
}

export const MiseAJourPc = defineElectronPlugin(
  { name: "MiseAJourPc", methods: ["lireEtat", "verifier", "installer"] },
  MiseAJourPcImpl
);
