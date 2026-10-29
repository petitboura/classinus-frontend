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
import { existsSync, readFileSync } from "node:fs";
import { get, request } from "node:http";
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

// Un outil téléphone peut prendre du temps (le téléphone répond lentement) : 100 s au maximum.
const DELAI_OUTIL_HTTP_MS = 100000;

// Relais relancé juste avant l'appel : on attend qu'il réponde, 15 contrôles d'1 s au maximum.
const ESSAIS_REVEIL_RELAIS = 15;
const INTERVALLE_REVEIL_RELAIS_MS = 1000;

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

function attendre(ms: number): Promise<void> {
  return new Promise((resoudre) => setTimeout(resoudre, ms));
}

/** Réponse d'un outil téléphone : le texte du résultat, ou une erreur claire. */
type ReponseOutil = { texte: string } | { erreur: string };

/**
 * Exécute un outil sur le relais local (POST /relais/outil/{nom} avec {"args": ...}).
 * Le relais répond {ok, resultat} ou {ok: false, erreur}. Ne lève jamais.
 */
function posterOutilHttp(url: string, args: Record<string, unknown>): Promise<ReponseOutil> {
  return new Promise((resolve) => {
    let termine = false;
    const finir = (reponse: ReponseOutil) => {
      if (!termine) {
        termine = true;
        resolve(reponse);
      }
    };
    let corps: string;
    try {
      corps = JSON.stringify({ args });
    } catch {
      finir({ erreur: "Les arguments de cet outil téléphone sont invalides." });
      return;
    }
    try {
      const requete = request(
        url,
        {
          method: "POST",
          headers: { "content-type": "application/json", "content-length": Buffer.byteLength(corps) },
          timeout: DELAI_OUTIL_HTTP_MS,
        },
        (reponse) => {
          let texte = "";
          reponse.on("data", (morceau: unknown) => {
            texte += String(morceau);
          });
          reponse.on("end", () => {
            if (reponse.statusCode !== 200) {
              finir({ erreur: `Le relais téléphone a refusé cet outil (erreur ${reponse.statusCode ?? "inconnue"}).` });
              return;
            }
            let donnees: unknown;
            try {
              donnees = JSON.parse(texte);
            } catch {
              finir({ erreur: "Le relais téléphone a renvoyé une réponse illisible." });
              return;
            }
            if (!donnees || typeof donnees !== "object") {
              finir({ erreur: "Le relais téléphone a renvoyé une réponse illisible." });
              return;
            }
            const objet = donnees as Partial<{ ok: unknown; resultat: unknown; erreur: unknown }>;
            if (objet.ok === true) {
              const resultat = objet.resultat;
              finir({
                texte: typeof resultat === "string" ? resultat : JSON.stringify(resultat ?? null),
              });
              return;
            }
            finir({
              erreur:
                typeof objet.erreur === "string" && objet.erreur.trim()
                  ? objet.erreur
                  : "Le relais téléphone n'a pas pu exécuter cet outil.",
            });
          });
          reponse.on("error", () => finir({ erreur: "La réponse du relais téléphone a été coupée." }));
        }
      );
      requete.on("timeout", () => {
        requete.destroy();
        finir({ erreur: "Le relais téléphone met trop longtemps à répondre (plus de 100 secondes)." });
      });
      requete.on("error", () =>
        finir({ erreur: "Le relais téléphone ne répond pas. Vérifie qu'il est lancé, puis réessaie." })
      );
      requete.end(corps);
    } catch {
      finir({ erreur: "Le relais téléphone ne répond pas. Vérifie qu'il est lancé, puis réessaie." });
    }
  });
}

class RelaisPcImpl extends ElectronPlugin {
  private noyau = creerRelaisPc({
    // En fonction, relu à chaque démarrage et à chaque lecture d'état : l'exe
    // que electron/relais.ts recopie au lancement est vu même s'il arrive après.
    cheminExe: () => cheminExe(),
    dossierTravail: dossierRelaisDonnees(),
    urlSante: pageSante,
    lancer: (cheminExe, dossierTravail) =>
      emballerProcessus(
        spawn(cheminExe, [], {
          cwd: dossierTravail,
          stdio: "ignore",
          windowsHide: true,
          env: { ...process.env, RELAIS_PC_DELAI_PAGE: DELAI_PAGE_RELAIS_S },
        })
      ),
    lireSante: lireSanteHttp,
    surChangement: (etat) => this.context.notifyListeners("etat", etat),
    journaliser: (texte) => console.error(`[relais-pc] ${texte}`),
  });

  load(): void {
    // Classinus fermé pour de bon : le relais part avec l'appli, jamais seul.
    app.on("before-quit", () => {
      try {
        this.noyau.arreter();
      } catch {
        // On quitte de toute façon.
      }
    });
    // Démarrage automatique (D37) : le relais part tout seul avec l'appli,
    // sans aucun réglage à ouvrir. Comme la vérification de mise à jour
    // (plugin MiseAJourPc), load ne fait que planifier : il ne ralentit donc
    // pas le démarrage. Ne lève jamais.
    try {
      const minuteur = setTimeout(() => this.demarrerToutSeul(ESSAIS_DEMARRAGE_AUTO), DELAI_PREMIER_DEMARRAGE_MS);
      minuteur.unref?.();
    } catch {
      // Sans minuteur, le relais reste manuel : la carte Paramètres garde le bouton Lancer.
    }
  }

  /** Lance le relais, en réessayant tant que l'exe n'est pas encore copié. Ne lève jamais. */
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
    } catch {
      // Plus de réessai possible : la carte Paramètres garde le bouton Lancer en secours.
    }
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

  /**
   * Exécute un outil téléphone sur le relais local. Si le relais est arrêté,
   * il est relancé au mieux avant l'appel. Ne lève jamais.
   */
  async appelerOutil(options: { nom: string; args?: Record<string, unknown> }): Promise<ReponseOutil> {
    try {
      const nom = typeof options?.nom === "string" ? options.nom.trim() : "";
      if (!nom) return { erreur: "Nom d'outil téléphone manquant." };
      const args = options?.args && typeof options.args === "object" ? options.args : {};
      try {
        const etat = await this.noyau.lireEtat();
        if (etat.etat === "arrete" || etat.etat === "erreur") {
          this.noyau.demarrer();
          for (let i = 0; i < ESSAIS_REVEIL_RELAIS; i++) {
            if (await lireSanteHttp(pageSante())) break;
            await attendre(INTERVALLE_REVEIL_RELAIS_MS);
          }
        } else if (etat.etat === "demarrage") {
          for (let i = 0; i < ESSAIS_REVEIL_RELAIS; i++) {
            if (await lireSanteHttp(pageSante())) break;
            await attendre(INTERVALLE_REVEIL_RELAIS_MS);
          }
        }
      } catch {
        // Au mieux : l'appel décidera.
      }
      return await posterOutilHttp(`${adresseBase()}/relais/outil/${encodeURIComponent(nom)}`, args);
    } catch {
      return { erreur: "L'outil téléphone n'a pas pu être exécuté. Réessaie dans un moment." };
    }
  }

  /** Ouvre la page de santé dans le navigateur. Faux quand le relais est indisponible. */
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
  { name: "RelaisPc", methods: ["lireEtat", "demarrer", "arreter", "ouvrirPageSante", "appelerOutil"] },
  RelaisPcImpl
);
