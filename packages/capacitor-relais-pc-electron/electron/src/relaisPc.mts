// Créé le 28/10/2026, demande Bourama : relais téléphone embarqué dans
// l'appli PC (décision D31). Depuis D37 (29/10/2026 : relais 100 % automatique,
// aucun réglage à ouvrir), l'appli lance toute seule Relais-Class-Tech.exe au
// démarrage, sans deuxième téléchargement ; les boutons de la carte Paramètres
// restent en secours manuel.
//
// Noyau PUR : aucune importation d'Electron ni de node:child_process ici. Le
// lancement, la lecture de santé et les minuteurs sont injectés. Le test
// tests/verifier-relais-pc.mjs le fait tourner sur n'importe quel système.
//
// Principe retenu :
// - l'exe utilisé est celui du dossier de données (userData/relais), préparé
//   par electron/relais.ts au lancement de l'appli (exe toujours neuf,
//   réglages de l'étudiant conservés) ;
// - après le lancement, on contrôle la page de santé jusqu'à ce qu'elle
//   réponde (démarrage du serveur Python = quelques secondes), puis l'état
//   passe à "enmarche" ;
// - la fenêtre console de l'exe reste cachée (windowsHide côté plugin) ; la
//   page de santé ne s'ouvre que sur demande, depuis la carte Paramètres ;
// - à la fermeture de Classinus, le relais s'arrête avec l'appli (voir
//   plugin.mts, before-quit).

export type NomEtatRelaisPc =
  | "indisponible" // exe absent : installeur construit sans relais, ou développement
  | "arrete"
  | "demarrage" // lancé, santé pas encore confirmée
  | "enmarche" // la page de santé répond
  | "erreur";

export interface EtatRelaisPc {
  etat: NomEtatRelaisPc;
  /** Page de santé complète (http://hôte:port/relais/sante), sinon null. */
  urlSante: string | null;
  /** Texte lisible par l'étudiant (jamais le détail technique de l'erreur). */
  message: string | null;
  /** Numéro du processus lancé, sinon null. */
  pid: number | null;
}

/** Ce que le noyau utilise du processus lancé (spawn emballé côté plugin). */
export interface ProcessusRelais {
  pid: number | null;
  readonly quitte: boolean;
  /** Code de sortie quand le processus est parti, sinon null. */
  readonly codeSortie: number | null;
  tuer(): void;
  surSortie(rappel: () => void): void;
}

export interface TacheMinuteurRelais {
  arreter(): void;
}

export interface OptionsRelaisPc {
  /** Chemin complet de l'exe, ou null quand il est absent (indisponible).
   * En fonction, il est relu à chaque démarrage et à chaque lecture d'état :
   * l'exe copié après la création du noyau est vu sans rien relancer (démarrage
   * automatique, D37 : electron/relais.ts recopie l'exe au lancement de l'appli,
   * parfois après la création du noyau). */
  cheminExe: string | null | (() => string | null);
  dossierTravail: string;
  /** Page de santé complète, lue dans les réglages (hôte et port à jour). */
  urlSante: () => string;
  lancer: (cheminExe: string, dossierTravail: string) => ProcessusRelais;
  /** Vrai quand la page de santé répond ok:true. */
  lireSante: (url: string) => Promise<boolean>;
  surChangement: (etat: EtatRelaisPc) => void;
  /** Détail technique, réservé au journal du processus principal. */
  journaliser?: (texte: string) => void;
  planifier?: (rappel: () => void, delaiMs: number) => TacheMinuteurRelais;
  tentativesRedemarrage?: number;
  delaiRedemarrageMs?: number;
  /** Attente avant le premier contrôle de santé (le serveur Python démarre). */
  delaiSanteMs?: number;
  /** Contrôles de santé au maximum pendant le démarrage. */
  essaisSante?: number;
  /** Pause entre deux contrôles de santé. */
  intervalleEssaiMs?: number;
}

export const DELAI_SANTE_MS = 3000;
export const ESSAIS_SANTE = 10;
export const INTERVALLE_ESSAI_MS = 2000;
export const TENTATIVES_REDEMARRAGE = 3;
export const DELAI_REDEMARRAGE_MS = 2000;

export const MESSAGE_INDISPONIBLE =
  "Le relais téléphone n'est pas dans cette installation de Classinus.";
export const MESSAGE_LANCEMENT_IMPOSSIBLE =
  "Le relais n'a pas pu démarrer. Réessaie dans un moment.";
export const MESSAGE_INJOIGNABLE =
  "Le relais a démarré mais ne répond pas. Arrête-le puis relance-le.";
export const MESSAGE_ARRET_INATTENDU =
  "Le relais s'est arrêté tout seul. Relance-le depuis ici.";

function planifierParDefaut(rappel: () => void, delaiMs: number): TacheMinuteurRelais {
  const minuteur = setTimeout(rappel, delaiMs);
  // Un minuteur ne doit jamais empêcher le processus de s'arrêter.
  minuteur.unref?.();
  return { arreter: () => clearTimeout(minuteur) };
}

export function creerRelaisPc(options: OptionsRelaisPc) {
  const {
    cheminExe,
    dossierTravail,
    urlSante,
    lancer,
    lireSante,
    surChangement,
    journaliser = () => {},
    planifier = planifierParDefaut,
    tentativesRedemarrage = TENTATIVES_REDEMARRAGE,
    delaiRedemarrageMs = DELAI_REDEMARRAGE_MS,
    delaiSanteMs = DELAI_SANTE_MS,
    essaisSante = ESSAIS_SANTE,
    intervalleEssaiMs = INTERVALLE_ESSAI_MS,
  } = options;

  function lireCheminExe(): string | null {
    try {
      return typeof cheminExe === "function" ? cheminExe() : cheminExe;
    } catch {
      return null;
    }
  }

  const exeInitial = lireCheminExe();
  let etat: EtatRelaisPc = {
    etat: exeInitial ? "arrete" : "indisponible",
    urlSante: null,
    message: exeInitial ? null : MESSAGE_INDISPONIBLE,
    pid: null,
  };
  let processus: ProcessusRelais | null = null;
  let arretDemande = false;
  let tacheSante: TacheMinuteurRelais | null = null;
  let tacheRedemarrage: TacheMinuteurRelais | null = null;
  let redemarragesRestants = tentativesRedemarrage;

  function changer(partiel: Partial<EtatRelaisPc>): void {
    etat = { ...etat, ...partiel };
    try {
      surChangement({ ...etat });
    } catch {
      // Un écouteur qui échoue ne doit jamais casser le relais.
    }
  }

  function annulerControleSante(): void {
    tacheSante?.arreter();
    tacheSante = null;
  }

  function annulerRedemarrage(): void {
    tacheRedemarrage?.arreter();
    tacheRedemarrage = null;
  }

  function programmerRedemarrage(): void {
    if (redemarragesRestants <= 0 || arretDemande) return;
    const tentative = tentativesRedemarrage - redemarragesRestants + 1;
    redemarragesRestants -= 1;
    journaliser(`redemarrage automatique ${tentative}/${tentativesRedemarrage} dans ${delaiRedemarrageMs}ms`);
    changer({ etat: "demarrage", message: `Nouvelle tentative ${tentative}/${tentativesRedemarrage}…`, pid: null });
    tacheRedemarrage = planifier(() => {
      tacheRedemarrage = null;
      if (arretDemande) return;
      demarrer();
    }, delaiRedemarrageMs);
  }

  function pageSante(): string {
    try {
      return urlSante();
    } catch {
      return "";
    }
  }

  function controlerSante(restants: number): void {
    if (!processus || processus.quitte) return;
    if (restants <= 0) {
      changer({ etat: "erreur", message: MESSAGE_INJOIGNABLE });
      return;
    }
    const url = pageSante();
    void lireSante(url)
      .then((ok) => {
        if (!processus || processus.quitte) return;
        if (ok) {
          redemarragesRestants = tentativesRedemarrage;
          annulerRedemarrage();
          changer({ etat: "enmarche", message: null });
          return;
        }
        tacheSante = planifier(() => controlerSante(restants - 1), intervalleEssaiMs);
      })
      .catch((erreur: unknown) => {
        journaliser(`controle de sante impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
        if (!processus || processus.quitte) return;
        tacheSante = planifier(() => controlerSante(restants - 1), intervalleEssaiMs);
      });
  }

  function surveillerSortie(proc: ProcessusRelais): void {
    proc.surSortie(() => {
      if (processus !== proc) return;
      annulerControleSante();
      processus = null;
      if (arretDemande) {
        arretDemande = false;
        changer({ etat: "arrete", message: null, pid: null });
      } else if (etat.etat === "demarrage" || etat.etat === "enmarche") {
        journaliser(`le relais est parti tout seul (code ${proc.codeSortie ?? "inconnu"})`);
        if (redemarragesRestants > 0) programmerRedemarrage();
        else changer({ etat: "erreur", message: MESSAGE_ARRET_INATTENDU, pid: null });
      }
    });
  }

  /** Lance l'exe. Renvoie l'état (démarrage en cours, santé à confirmer). */
  function demarrer(): EtatRelaisPc {
    if (processus && !processus.quitte) return { ...etat };
    const exe = lireCheminExe();
    if (!exe) {
      if (etat.etat !== "indisponible") {
        changer({ etat: "indisponible", urlSante: null, message: MESSAGE_INDISPONIBLE, pid: null });
      }
      return { ...etat };
    }
    annulerControleSante();
    // Un redemarrage auto arrive en etat "demarrage" : ne pas remettre le compteur a zero, sinon boucle infinie si l'exe crashe en boucle.
    if (etat.etat !== "demarrage") redemarragesRestants = tentativesRedemarrage;
    annulerRedemarrage();
    processus = null;
    arretDemande = false;
    let proc: ProcessusRelais;
    try {
      proc = lancer(exe, dossierTravail);
    } catch (erreur) {
      journaliser(`lancement impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
      changer({ etat: "erreur", message: MESSAGE_LANCEMENT_IMPOSSIBLE, pid: null });
      return { ...etat };
    }
    processus = proc;
    surveillerSortie(proc);
    changer({ etat: "demarrage", urlSante: pageSante(), message: null, pid: proc.pid });
    tacheSante = planifier(() => controlerSante(essaisSante), delaiSanteMs);
    return { ...etat };
  }

  /** Arrête l'exe lancé. Sans effet quand rien ne tourne. */
  function arreter(): EtatRelaisPc {
    annulerControleSante();
    annulerRedemarrage();
    redemarragesRestants = tentativesRedemarrage;
    const proc = processus;
    if (!proc || proc.quitte) {
      processus = null;
      arretDemande = false;
      if (etat.etat === "demarrage" || etat.etat === "enmarche" || etat.etat === "erreur") {
        changer({ etat: "arrete", message: null, pid: null });
      }
      return { ...etat };
    }
    // Le processus est gardé jusqu'à sa sortie : c'est elle qui confirme
    // l'arrêt (surveillerSortie). En attendant, un nouveau demarrer() ne
    // lance pas de deuxième processus.
    arretDemande = true;
    try {
      proc.tuer();
    } catch (erreur) {
      journaliser(`arret impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
    return { ...etat };
  }

  /** Relit l'état réel (processus parti entre-temps, santé à jour) puis le renvoie. */
  async function lireEtat(): Promise<EtatRelaisPc> {
    const exe = lireCheminExe();
    if (!exe) {
      if (etat.etat !== "indisponible") {
        changer({ etat: "indisponible", urlSante: null, message: MESSAGE_INDISPONIBLE, pid: null });
      }
      return { ...etat };
    }
    if (etat.etat === "indisponible") {
      changer({ etat: "arrete", message: null, pid: null });
    }
    const proc = processus;
    if (!proc || proc.quitte) {
      if (etat.etat === "demarrage" || etat.etat === "enmarche") {
        processus = null;
        changer({ etat: "arrete", message: null, pid: null });
      }
      return { ...etat };
    }
    if (etat.etat !== "demarrage" && etat.etat !== "enmarche") {
      return { ...etat };
    }
    let ok = false;
    try {
      ok = await lireSante(pageSante());
    } catch (erreur) {
      journaliser(`lecture de sante impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    }
    if (!processus || processus.quitte) return { ...etat };
    if (ok) {
      changer({ etat: "enmarche", message: null });
    } else if (etat.etat !== "enmarche") {
      // Un seul échec de santé ne rétrograde jamais un relais déjà en marche :
      // la santé peut dépasser le délai HTTP quand ADB hésite (USB, pilote),
      // alors que le processus est toujours vivant. Seule sa mort réelle
      // (surveillerSortie) peut sortir de "enmarche".
      changer({ etat: "demarrage" });
    }
    return { ...etat };
  }

  return { demarrer, arreter, lireEtat };
}
