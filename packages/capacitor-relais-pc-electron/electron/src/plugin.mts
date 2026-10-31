// Créé le 28/10/2026, demande Bourama : relais téléphone embarqué dans
// l'appli PC (décision D31).
//
// Contrat imposé par @capawesome/capacitor-electron (même principe que les
// plugins Dossiers, PontNatif, SuperpositionAgent et MiseAJourPc de ce dépôt) :
// ce fichier compilé doit se trouver à <src>/dist/plugin.mjs, et exporter une
// classe dont la propriété statique __capacitorElectronPlugin (posée par
// defineElectronPlugin) déclare le nom Capacitor et les méthodes exposées.
//
// Toute la logique est dans relaisPc.mts (noyau pur, testé sans Electron).
// Ici, seulement le branchement : le lancement de l'exe, la lecture de la
// page de santé en HTTP local, et l'événement "etat" qui prévient la fenêtre
// à chaque changement.
//
// L'exe utilisé est celui du dossier de données (userData/relais), préparé par
// electron/relais.ts au lancement de l'appli : les constantes ci-dessous sont
// DUPLIQUÉES depuis ce module (les deux projets sont compilés séparément, un
// import entre eux serait fragile). Le test tests/verifier-relais-pc.mjs
// vérifie que les deux copies restent identiques.
//
// Le lancement cache la fenêtre console de l'exe (windowsHide) et part tout
// seul au démarrage de l'appli (D37, 29/10/2026, demande Bourama : aucun réglage
// à ouvrir, voir load ci-dessous) : la carte Paramètres n'est qu'un voyant,
// ses boutons Lancer et Arrêter restant en secours manuel. La page de santé que
// l'exe ouvrirait toute seule dans le navigateur est repoussée à demain
// (RELAIS_PC_DELAI_PAGE, voir demarrage_1clic.py dans class-tech) : c'est la
// carte qui l'ouvre, sur demande, avec ouvrirPageSante.

import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { get } from "node:http";
import { join } from "node:path";
import { app, shell } from "electron";
import { ElectronPlugin, defineElectronPlugin } from "@capawesome/capacitor-electron/plugin";

import { creerRelaisPc, type EtatRelaisPc, type ProcessusRelais } from "./relaisPc.mjs";

// Copies de electron/relais.ts (voir le commentaire en tête de fichier).
const NOM_EXE_RELAIS = "Relais-Class-Tech.exe";
const NOM_REGLAGES_RELAIS = "reglages.json";
const NOM_DOSSIER_RELAIS = "relais";
const HOTE_RELAIS_DEFAUT = "127.0.0.1";
const PORT_RELAIS_DEFAUT = 8765;

// Repousse à demain la page que l'exe ouvrirait toute seule (voir en tête).
const DELAI_PAGE_RELAIS_S = "86400";

// Un contrôle de santé ne doit jamais attendre longtemps : le relais est local.
const DELAI_SANTE_HTTP_MS = 3000;
const NOM_FICHIER_JOURNAL_RELAIS = "relais.log";
const TAILLE_MAX_JOURNAL_RELAIS = 500 * 1024;

// Démarrage automatique (D37) : la première tentative attend un peu, pour
// laisser electron/relais.ts recopier l'exe neuf dans le dossier de données
// (au premier lancement, il n'y est pas encore). Tant que l'exe est absent, on
// réessaie à cet intervalle, puis on abandonne (la carte Paramètres garde le
// bouton Lancer en secours manuel).
const DELAI_PREMIER_DEMARRAGE_MS = 2000;
const INTERVALLE_REESSAI_DEMARRAGE_MS = 2000;
const ESSAIS_DEMARRAGE_AUTO = 15;

function dossierRelaisDonnees(): string {
  return join(app.getPath("userData"), NOM_DOSSIER_RELAIS);
}

function cheminJournalRelais(): string {
  return join(dossierRelaisDonnees(), NOM_FICHIER_JOURNAL_RELAIS);
}

function ecrireJournalRelais(texte: string): void {
  try {
    const chemin = cheminJournalRelais();
    try {
      const s = statSync(chemin);
      if (s.size > TAILLE_MAX_JOURNAL_RELAIS) {
        const contenu = readFileSync(chemin, "utf8");
        const garde = contenu.slice(-Math.floor(TAILLE_MAX_JOURNAL_RELAIS / 2));
        appendFileSync(chemin, "", "utf8");
        require("node:fs").writeFileSync(chemin, garde, "utf8");
      }
    } catch {}
    const ligne = `[${new Date().toISOString()}] ${texte}\n`;
    appendFileSync(chemin, ligne, "utf8");
  } catch {}
}

function journaliserRelais(texte: string): void {
  try { console.error(`[relais-pc] ${texte}`); } catch {}
  ecrireJournalRelais(texte);
}

function cheminExe(): string | null {
  try {
    const chemin = join(dossierRelaisDonnees(), NOM_EXE_RELAIS);
    return existsSync(chemin) ? chemin : null;
  } catch {
    return null;
  }
}

function adresseBase(): string {
  let hote = HOTE_RELAIS_DEFAUT;
  let port = PORT_RELAIS_DEFAUT;
  try {
    const donnees = JSON.parse(
      readFileSync(join(dossierRelaisDonnees(), NOM_REGLAGES_RELAIS), "utf8")
    ) as Partial<{ hote: unknown; port: unknown }>;
    if (typeof donnees.hote === "string" && donnees.hote.trim()) hote = donnees.hote.trim();
    const portLu = Number(donnees.port);
    if (Number.isInteger(portLu) && portLu >= 1 && portLu <= 65535) port = portLu;
  } catch {
    // Réglages absents ou illisibles : les défauts.
  }
  return `http://${hote}:${port}`;
}

function pageSante(): string {
  return `${adresseBase()}/relais/sante`;
}

/** Emballe un processus lancé pour le noyau (voir ProcessusRelais). */
function emballerProcessus(proc: ChildProcess): ProcessusRelais {
  let quitte = false;
  let codeSortie: number | null = null;
  const rappels: Array<() => void> = [];
  proc.on("exit", (code) => {
    quitte = true;
    codeSortie = code;
    for (const rappel of rappels.splice(0)) {
      try {
        rappel();
      } catch {
        // Un rappel qui échoue ne doit jamais casser les autres.
      }
    }
  });
  return {
    pid: proc.pid ?? null,
    get quitte() {
      return quitte;
    },
    get codeSortie() {
      return codeSortie;
    },
    tuer() {
      try {
        proc.kill();
      } catch {
        // Déjà parti : rien à faire.
      }
    },
    surSortie(rappel: () => void) {
      if (quitte) rappel();
      else rappels.push(rappel);
    },
  };
}

/** Vrai quand la page de santé répond {"ok": true}. Faux sinon, jamais d'erreur levée. */
function lireSanteHttp(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let termine = false;
    const finir = (ok: boolean) => {
      if (!termine) {
        termine = true;
        resolve(ok);
      }
    };
    try {
      const requete = get(url, { timeout: DELAI_SANTE_HTTP_MS }, (reponse) => {
        let corps = "";
        reponse.on("data", (morceau: unknown) => {
          corps += String(morceau);
        });
        reponse.on("end", () => {
          try {
            const donnees = JSON.parse(corps) as Partial<{ ok: unknown }>;
            finir(reponse.statusCode === 200 && donnees.ok === true);
          } catch {
            finir(false);
          }
        });
        reponse.on("error", () => finir(false));
      });
      requete.on("timeout", () => {
        requete.destroy();
        finir(false);
      });
      requete.on("error", () => finir(false));
    } catch {
      finir(false);
    }
  });
}

class RelaisPcImpl extends ElectronPlugin {
  private noyau = creerRelaisPc({
    cheminExe: () => cheminExe(),
    dossierTravail: dossierRelaisDonnees(),
    urlSante: pageSante,
    lancer: (cheminExe, dossierTravail) => {
      const proc = spawn(cheminExe, [], {
        cwd: dossierTravail,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        env: { ...process.env, RELAIS_PC_DELAI_PAGE: DELAI_PAGE_RELAIS_S },
      });
      journaliserRelais(`relais lance pid=${proc.pid ?? "?"}`);
      proc.stdout?.on("data", (chunk: unknown) => {
        const t = String(chunk);
        for (const l of t.split(/\r?\n/)) if (l) ecrireJournalRelais(`[stdout] ${l}`);
      });
      proc.stderr?.on("data", (chunk: unknown) => {
        const t = String(chunk);
        for (const l of t.split(/\r?\n/)) if (l) ecrireJournalRelais(`[stderr] ${l}`);
      });
      proc.on("error", (err: unknown) => {
        const m = err instanceof Error ? err.message : String(err);
        journaliserRelais(`spawn error: ${m}`);
      });
      return emballerProcessus(proc);
    },
    lireSante: lireSanteHttp,
    surChangement: (etat) => this.context.notifyListeners("etat", etat),
    journaliser: journaliserRelais,
  });

  load(): void {
    app.on("before-quit", () => {
      try {
        this.noyau.arreter();
      } catch {}
    });
    try {
      const minuteur = setTimeout(() => this.demarrerToutSeul(ESSAIS_DEMARRAGE_AUTO), DELAI_PREMIER_DEMARRAGE_MS);
      minuteur.unref?.();
    } catch {}
  }

  private demarrerToutSeul(restants: number): void {
    if (restants <= 0) return;
    let etat: EtatRelaisPc;
    try {
      etat = this.noyau.demarrer();
    } catch {
      return;
    }
    if (etat.etat !== "indisponible") return;
    try {
      const minuteur = setTimeout(() => this.demarrerToutSeul(restants - 1), INTERVALLE_REESSAI_DEMARRAGE_MS);
      minuteur.unref?.();
    } catch {}
  }

  async lireEtat(): Promise<EtatRelaisPc> {
    return this.noyau.lireEtat();
  }

  async demarrer(): Promise<EtatRelaisPc> {
    return this.noyau.demarrer();
  }

  async arreter(): Promise<EtatRelaisPc> {
    return this.noyau.arreter();
  }

  async ouvrirPageSante(): Promise<{ ouvert: boolean }> {
    if (!cheminExe()) return { ouvert: false };
    try {
      await shell.openExternal(pageSante());
      return { ouvert: true };
    } catch {
      return { ouvert: false };
    }
  }
}

export const RelaisPc = defineElectronPlugin(
  { name: "RelaisPc", methods: ["lireEtat", "demarrer", "arreter", "ouvrirPageSante"] },
  RelaisPcImpl
);
