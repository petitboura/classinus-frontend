// Créé le 19/10/2026, demande Bourama : mise à jour automatique de l'appli PC
// (installée sous Windows), avec publication de l'installeur dans les releases
// du dépôt public petitboura/classinus-pc.
//
// Noyau PUR : aucune importation d'Electron ni d'electron-updater ici. Le
// "miseur" (electron-updater en vrai, un faux dans le test) et les minuteurs
// sont injectés. Le test tests/verifier-mise-a-jour-pc.mjs le fait tourner sur
// n'importe quel système.
//
// Principe retenu :
// - vérification 30 secondes après le démarrage (pour ne pas ralentir
//   l'ouverture), puis toutes les 4 heures, tant que l'appli tourne ;
// - téléchargement automatique en arrière-plan ;
// - installation au prochain vrai arrêt de l'appli (autoInstallOnAppQuit :
//   quitter depuis l'icône près de l'horloge, ou arrêt/redémarrage de Windows),
//   ou tout de suite sur demande de l'étudiant (bouton des Paramètres).
//   Classinus tourne en arrière-plan (fermer la fenêtre ne l'arrête pas, voir
//   electron/arrierePlan.ts) : sans le bouton, une mise à jour pourrait
//   attendre longtemps le prochain arrêt.
// - jamais de préversion, jamais de retour à une version plus ancienne.

export type NomEtatMiseAJourPc =
  | "indisponible" // appli non installée (développement) : rien ne se passe
  | "inactif" // pas encore de vérification
  | "verification"
  | "a-jour"
  | "telechargement"
  | "prete" // téléchargée, installable
  | "erreur";

export interface EtatMiseAJourPc {
  etat: NomEtatMiseAJourPc;
  versionActuelle: string;
  versionDisponible: string | null;
  /** 0 à 100 pendant le téléchargement, sinon null. */
  progression: number | null;
  /** Texte lisible par l'étudiant (jamais le détail technique de l'erreur). */
  message: string | null;
  /** Horodatage (ms) de la dernière vérification terminée, sinon null. */
  derniereVerification: number | null;
}

/** Ce que le noyau utilise d'electron-updater (autoUpdater). */
export interface MiseurAJour {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  allowDowngrade: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(evenement: string, rappel: (...args: any[]) => void): unknown;
  checkForUpdates(): Promise<unknown>;
  quitAndInstall(silencieux?: boolean, relancer?: boolean): void;
}

export interface TacheMinuteur {
  arreter(): void;
}

export interface OptionsMiseAJourPc {
  miseur: MiseurAJour;
  versionActuelle: string;
  /** app.isPackaged : faux en développement, où il n'y a rien à mettre à jour. */
  empaquetee: boolean;
  surChangement: (etat: EtatMiseAJourPc) => void;
  /** Détail technique, réservé au journal du processus principal. */
  journaliser?: (texte: string) => void;
  maintenant?: () => number;
  planifier?: (rappel: () => void, delaiMs: number, repeter: boolean) => TacheMinuteur;
  delaiInitialMs?: number;
  intervalleMs?: number;
}

/**
 * Miseur qui ne fait rien : utilisé quand l'appli n'est pas installée, pour ne même pas
 * toucher à electron-updater en développement.
 */
export const MISEUR_INERTE: MiseurAJour = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  allowPrerelease: false,
  allowDowngrade: false,
  on: () => undefined,
  checkForUpdates: async () => null,
  quitAndInstall: () => undefined,
};

export const DELAI_INITIAL_MS = 30_000;
export const INTERVALLE_VERIFICATION_MS = 4 * 60 * 60 * 1000;

export const MESSAGE_INDISPONIBLE =
  "La mise à jour automatique n'existe que dans l'application Classinus installée.";
export const MESSAGE_ERREUR_VERIFICATION =
  "Vérification impossible pour le moment. Classinus réessaiera automatiquement.";
export const MESSAGE_ERREUR_INSTALLATION =
  "L'installation n'a pas pu démarrer. Elle sera tentée à la fermeture de Classinus.";

function planifierParDefaut(rappel: () => void, delaiMs: number, repeter: boolean): TacheMinuteur {
  const minuteur = repeter ? setInterval(rappel, delaiMs) : setTimeout(rappel, delaiMs);
  // Un minuteur ne doit jamais empêcher le processus de s'arrêter.
  minuteur.unref?.();
  return { arreter: () => (repeter ? clearInterval(minuteur) : clearTimeout(minuteur)) };
}

export function creerMiseAJourPc(options: OptionsMiseAJourPc) {
  const {
    miseur,
    versionActuelle,
    empaquetee,
    surChangement,
    journaliser = () => {},
    maintenant = () => Date.now(),
    planifier = planifierParDefaut,
    delaiInitialMs = DELAI_INITIAL_MS,
    intervalleMs = INTERVALLE_VERIFICATION_MS,
  } = options;

  let etat: EtatMiseAJourPc = {
    etat: "inactif",
    versionActuelle,
    versionDisponible: null,
    progression: null,
    message: null,
    derniereVerification: null,
  };
  let demarre = false;
  let verificationEnCours = false;
  const taches: TacheMinuteur[] = [];

  function changer(partiel: Partial<EtatMiseAJourPc>): void {
    etat = { ...etat, ...partiel };
    try {
      surChangement({ ...etat });
    } catch {
      // Un écouteur qui échoue ne doit jamais casser la mise à jour.
    }
  }

  function telechargementOuPrete(): boolean {
    return etat.etat === "telechargement" || etat.etat === "prete";
  }

  function brancherEvenements(): void {
    miseur.on("checking-for-update", () => {
      if (telechargementOuPrete()) return;
      changer({ etat: "verification", message: null });
    });
    miseur.on("update-available", (info?: { version?: string }) => {
      changer({
        etat: "telechargement",
        versionDisponible: info?.version ?? null,
        progression: 0,
        message: null,
      });
    });
    miseur.on("update-not-available", () => {
      if (etat.etat === "prete") return;
      changer({
        etat: "a-jour",
        versionDisponible: null,
        progression: null,
        message: null,
        derniereVerification: maintenant(),
      });
    });
    miseur.on("download-progress", (progres?: { percent?: number }) => {
      const pourcentage = Number(progres?.percent);
      changer({
        etat: "telechargement",
        progression: Number.isFinite(pourcentage) ? Math.max(0, Math.min(100, Math.round(pourcentage))) : etat.progression,
      });
    });
    miseur.on("update-downloaded", (info?: { version?: string }) => {
      changer({
        etat: "prete",
        versionDisponible: info?.version ?? etat.versionDisponible,
        progression: 100,
        message: null,
        derniereVerification: maintenant(),
      });
    });
    miseur.on("error", (erreur?: unknown) => {
      journaliser(`erreur de mise a jour : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
      // Une mise à jour déjà téléchargée reste installable malgré une erreur ensuite.
      if (etat.etat === "prete") return;
      changer({
        etat: "erreur",
        progression: null,
        message: MESSAGE_ERREUR_VERIFICATION,
        derniereVerification: maintenant(),
      });
    });
  }

  async function verifier(): Promise<EtatMiseAJourPc> {
    if (!demarre || !empaquetee) return { ...etat };
    if (verificationEnCours || telechargementOuPrete()) return { ...etat };
    verificationEnCours = true;
    try {
      await miseur.checkForUpdates();
      // Si aucun événement n'a conclu la vérification, on ne reste pas bloqué.
      if (etat.etat === "verification") {
        changer({ etat: "a-jour", message: null, derniereVerification: maintenant() });
      }
    } catch (erreur) {
      journaliser(`verification impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
      if (!telechargementOuPrete()) {
        changer({
          etat: "erreur",
          progression: null,
          message: MESSAGE_ERREUR_VERIFICATION,
          derniereVerification: maintenant(),
        });
      }
    } finally {
      verificationEnCours = false;
    }
    return { ...etat };
  }

  function demarrer(): void {
    if (demarre) return;
    demarre = true;
    if (!empaquetee) {
      changer({ etat: "indisponible", message: MESSAGE_INDISPONIBLE });
      return;
    }
    miseur.autoDownload = true;
    miseur.autoInstallOnAppQuit = true;
    miseur.allowPrerelease = false;
    miseur.allowDowngrade = false;
    brancherEvenements();
    taches.push(planifier(() => void verifier(), delaiInitialMs, false));
    taches.push(planifier(() => void verifier(), intervalleMs, true));
  }

  /** Lance l'installation maintenant (ferme puis relance Classinus). Faux si rien n'est prêt. */
  function installer(): boolean {
    if (etat.etat !== "prete") return false;
    try {
      miseur.quitAndInstall(false, true);
      return true;
    } catch (erreur) {
      journaliser(`installation impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
      changer({ message: MESSAGE_ERREUR_INSTALLATION });
      return false;
    }
  }

  function arreter(): void {
    for (const tache of taches.splice(0)) tache.arreter();
  }

  return {
    demarrer,
    verifier,
    installer,
    arreter,
    lireEtat: (): EtatMiseAJourPc => ({ ...etat }),
  };
}
