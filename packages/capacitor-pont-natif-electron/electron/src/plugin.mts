// Cree le 27/09/2026, Bourama : chantier "canal en direct sort de
// l'appli" (voir plan-canal-en-direct-pc.md), Lot S.
//
// Meme contrat que capacitor-dossiers-electron (voir son README) :
// ce fichier compile doit se trouver a electron/dist/plugin.mjs.
//
// Ce plugin s'appelle "PontNatif" -- MEME NOM que le plugin deja
// utilise sur Android/iOS (voir lib/supabase.ts, deja appele des
// aujourd'hui sur toute plateforme native, aucun changement necessaire
// cote web) : a chaque changement de session Supabase,
// enregistrerToken({token}) est deja appele automatiquement. Sur
// Android/iOS ce plugin sert au token push et au rattrapage d'actions
// mobiles en attente (non pertinent ici). Sur Electron, on reutilise
// exactement ce meme appel pour ouvrir et maintenir a jour la DEUXIEME
// connexion WebSocket dediee aux actions systeme du canal agent
// applicatif (la fenetre principale garde sa propre connexion pour les
// clics dans la page Classinus, chantiers existants -- non touchee
// ici).
//
// Rappel important (voir core/canal_agent_applicatif.py,
// fonction connecter()) : deux connexions avec le MEME
// (user_id, appareil_id) se remplacent et se ferment l'une l'autre.
// Cette connexion utilise donc un appareil_id different de celui de la
// fenetre principale (meme UUID de base, suffixe "-systeme").

import { spawn } from "node:child_process";
import WebSocket from "ws";
import { BrowserWindow } from "electron";
import { ElectronPlugin, defineElectronPlugin } from "@capawesome/capacitor-electron/plugin";
// Import direct du module compile du paquet voisin (pas un appel de
// plugin Capacitor : juste une fonction Node partagee entre les deux
// paquets). Necessite que capacitor-dossiers-electron soit deja
// construit (npm run build) avant celui-ci -- voir le README a la
// racine de ce paquet.
import { obtenirAppareilIdPc } from "capacitor-dossiers-electron/electron/dist/plugin.mjs";
// Lot V : lecture en texte de la fenetre au premier plan (UI Automation).
import { lireFenetreAuPremierPlan } from "./lectureFenetreWindows.mjs";
import { pointerCurseurEcran, annoncerUtilisationCurseurReel, avecSourisTraversante, marquerEcran } from "capacitor-superposition-electron/electron/dist/plugin.mjs";
import { cliquerParAccessibiliteWindows } from "./clicWindows.mjs";
import { cliquerEcran } from "./clicEcran.mjs";

/**
 * URL du backend clovis-backend (alias classinus-backend). Le
 * processus principal Electron n'a pas acces aux variables
 * NEXT_PUBLIC_* inlinees a la construction du site web (celles-ci ne
 * vivent que dans le bundle web statique) -- d'ou cette valeur separee,
 * La destination du renderer est transmise par enregistrerToken(apiUrl).
 * Sans elle, la valeur reste surchargeable par CLASSINUS_API_URL au
 * lancement si besoin (tests locaux, changement d'environnement).
 *
 * Valeur par defaut = https://api.classinus.com, adresse du backend
 * confirmee par Bourama le 28/09/2026.
 */
// Corrige le 28/09/2026 : adresse confirmee par Bourama, l'ancienne valeur
// (domaine Railway) n'etait plus la bonne.
let urlApiBackend = process.env.CLASSINUS_API_URL || "https://api.classinus.com";

function urlWebSocketCanal(): string {
  return urlApiBackend.replace(/^http/, "ws") + "/api/canal-agent-applicatif/ws";
}

// --- Gestion de la connexion systeme (une seule a la fois) ---

let connexionActuelle: WebSocket | null = null;
let jetonActuel: string | null = null;
let minuteurReconnexion: ReturnType<typeof setTimeout> | null = null;
const DELAI_RECONNEXION_MS = 5000;

function fermerConnexion(): void {
  if (minuteurReconnexion) {
    clearTimeout(minuteurReconnexion);
    minuteurReconnexion = null;
  }
  if (connexionActuelle) {
    try {
      connexionActuelle.close();
    } catch {
      // rien a faire, la connexion est de toute facon abandonnee
    }
    connexionActuelle = null;
  }
}

function planifierReconnexion(): void {
  if (minuteurReconnexion || !jetonActuel) return;
  minuteurReconnexion = setTimeout(() => {
    minuteurReconnexion = null;
    if (jetonActuel) ouvrirConnexion(jetonActuel);
  }, DELAI_RECONNEXION_MS);
}

function ouvrirConnexion(jeton: string): void {
  fermerConnexion();
  jetonActuel = jeton;

  const appareilId = `${obtenirAppareilIdPc()}-systeme`;
  const ws = new WebSocket(urlWebSocketCanal());
  connexionActuelle = ws;

  ws.on("open", () => {
    // Handshake identique a celui de lib/canalAgentApplicatif.ts cote
    // web (voir api/canal_agent_applicatif.py) : le jeton n'est jamais
    // mis dans l'URL, toujours dans le premier message.
    ws.send(JSON.stringify({ auth_token: jeton, appareil_id: appareilId }));
  });

  ws.on("message", (data) => {
    void traiterMessage(ws, data.toString());
  });

  ws.on("close", () => {
    if (connexionActuelle === ws) {
      connexionActuelle = null;
      planifierReconnexion();
    }
  });

  ws.on("error", () => {
    // "close" suit toujours "error" pour une connexion WebSocket native
    // (bibliotheque ws) -- la reconnexion est deja geree la-bas, rien
    // a dupliquer ici.
  });
}

interface MessageActionSysteme {
  id: string;
  action_systeme: string;
  parametres: Record<string, unknown>;
}

function estMessageActionSysteme(valeur: unknown): valeur is MessageActionSysteme {
  return (
    typeof valeur === "object" &&
    valeur !== null &&
    typeof (valeur as any).id === "string" &&
    typeof (valeur as any).action_systeme === "string"
  );
}

// Lot T (27/09/2026, voir plan-canal-en-direct-pc.md) : diffuse a la
// fenetre principale (qui tient le journal et la bulle, voir
// lib/superpositionElectron.ts) une phrase courte decrivant l'action
// systeme, AVANT l'execution (phase "debut") puis avec son issue APRES
// (phase "fin"), sur le meme modele que les actions DOM
// (pousserJournalDepuisAgent puis mettreAJourJournalDepuisAgent, voir
// lib/canalAgentApplicatif.ts). Renseigne par la methode
// enregistrerToken ci dessous, seul moment ou le contexte du plugin est
// disponible ; sans lui (rien d'enregistre), l'action s'execute quand
// meme, simplement sans trace visuelle.
type NotifierWeb = (evenement: string, donnees: Record<string, unknown>) => void;
let notifierWeb: NotifierWeb | null = null;
let clicEnCours = false;

function decrireActionSysteme(type: string, parametres: Record<string, unknown>): string {
  switch (type) {
    case "pointer_ecran":
      return "Clovis pointe à l'écran";
    case "marquer_ecran":
      return "Clovis marque un endroit de l'écran";
    case "cliquer_ecran":
      return "Clovis clique à l'écran";
    case "taper_clavier":
      return "Clovis a écrit du texte";
    case "ouvrir_application": {
      const nom = String(parametres.nom ?? "").trim();
      return nom ? `Clovis a ouvert ${nom}` : "Clovis a ouvert une application";
    }
    case "lire_ecran":
      return "Clovis a regardé l'écran";
    default:
      return "Clovis a agi sur l'ordinateur";
  }
}

async function traiterMessage(ws: WebSocket, brut: string): Promise<void> {
  let message: unknown;
  try {
    message = JSON.parse(brut);
  } catch {
    return;
  }
  if (!estMessageActionSysteme(message)) return; // pas pour nous, on ignore silencieusement

  const resultat = await executerAvecJournal(message.id, message.action_systeme, message.parametres || {});
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ id: message.id, resultat }));
}

async function executerAvecJournal(id: string, type: string, parametres: Record<string, unknown>): Promise<unknown> {
  const notifier = (donnees: Record<string, unknown>) => {
    // Une erreur du miroir ne doit pas empêcher l'exécution ni sa réponse.
    try { notifierWeb?.("actionSysteme", donnees); } catch (e) { console.warn("PontNatif : journal indisponible", e); }
  };
  notifier({ id, phase: "debut", description: decrireActionSysteme(type, parametres) });
  const resultat = await executerActionSysteme(type, parametres);
  const enErreur =
    typeof resultat === "object" && resultat !== null && typeof (resultat as { erreur?: unknown }).erreur === "string";
  notifier({ id, phase: "fin", statut: enErreur ? "erreur" : "succes" });
  return resultat;
}

function fenetreSuperposition(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows().find(f => !f.isDestroyed() && f.getTitle() === "classinus-superposition-agent");
}

function handleSuperposition(): string {
  if (process.platform !== "win32") return "0";
  const handle = fenetreSuperposition()?.getNativeWindowHandle();
  if (!handle) return "0";
  return (handle.length >= 8 ? handle.readBigUInt64LE() : BigInt(handle.readUInt32LE())).toString();
}

async function restaurerFocusSousSuperposition(): Promise<void> {
  if (!BrowserWindow.getAllWindows().some(f => !f.isDestroyed() && f.isFocused())) return;
  const resultat = await lireFenetreAuPremierPlan({}, handleSuperposition(), true);
  if ("erreur" in resultat) throw new Error(resultat.erreur);
}

async function executerActionSysteme(type: string, parametres: Record<string, unknown>): Promise<unknown> {
  // Import paresseux : @nut-tree-fork/nut-js contient des modules
  // natifs precompiles par plateforme. Le charger seulement quand une
  // action est reellement demandee evite un echec au demarrage de
  // l'appli si jamais il pose probleme sur une machine donnee (a
  // surveiller au premier vrai test, voir le README de ce paquet).

  try {
    switch (type) {
      case "pointer_ecran":
        return await pointerCurseurEcran({ x: Number(parametres.x), y: Number(parametres.y) });
      case "marquer_ecran":
        return await marquerEcran({
          forme: String(parametres.forme ?? ""),
          x: Number(parametres.x),
          y: Number(parametres.y),
          largeur: Number(parametres.largeur),
          hauteur: Number(parametres.hauteur),
          delaiMs: Number(parametres.delai_secondes ?? 0) * 1000,
          dureeMs: Number(parametres.duree_secondes ?? 5) * 1000,
        });
      case "cliquer_ecran": {
        const x = Number(parametres.x);
        const y = Number(parametres.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return { erreur: "coordonnees x/y invalides" };
        }
        if (clicEnCours) return { erreur: "Un clic de Clovis est déjà en cours." };
        clicEnCours = true;
        try {
          return await cliquerEcran({ x, y }, {
            pointer: pointerCurseurEcran,
            accessibilite: cliquerParAccessibiliteWindows,
            annoncer: annoncerUtilisationCurseurReel,
            souris: async point => {
              const { mouse, Point, Button } = await import("@nut-tree-fork/nut-js");
              await restaurerFocusSousSuperposition();
              // L'overlay passe en traversée avant le vrai clic : ni curseur
              // dessiné ni bulle d'annonce ne doivent intercepter ce clic.
              await avecSourisTraversante(async () => {
                const depart = await mouse.getPosition();
                try {
                  await mouse.setPosition(new Point(point.x, point.y));
                  await mouse.click(Button.LEFT);
                } finally {
                  const actuel = await mouse.getPosition();
                  // Si l'étudiant a déjà repris sa souris, garder sa position.
                  if (Math.abs(actuel.x - point.x) <= 1 && Math.abs(actuel.y - point.y) <= 1) await mouse.setPosition(depart);
                }
              });
            },
          });
        } finally { clicEnCours = false; }
      }
      case "taper_clavier": {
        const { keyboard } = await import("@nut-tree-fork/nut-js");
        const texte = String(parametres.texte ?? "");
        if (!texte) return { erreur: "texte vide" };
        await restaurerFocusSousSuperposition();
        await keyboard.type(texte);
        return { ok: true };
      }
      case "ouvrir_application": {
        const nom = String(parametres.nom ?? "").trim();
        if (!nom) return { erreur: "nom d'application vide" };
        // Accuser le lancement sans attendre la fermeture de l'application.
        await new Promise<void>((resolve, reject) => {
          const enfant = spawn(nom, [], { detached: true, stdio: "ignore", shell: false });
          enfant.once("error", reject);
          enfant.once("spawn", () => { enfant.unref(); resolve(); });
        });
        return { ok: true };
      }
      case "lire_ecran": {
        // Lot V (28/09/2026, decision Bourama : aucune image envoyee au
        // modele, seulement du texte) : lit le contenu de la fenetre au
        // premier plan via UI Automation, voir lectureFenetreWindows.mts.
        // Les limites viennent du backend (parametres de la demande).
        const lecture = await lireFenetreAuPremierPlan(parametres, handleSuperposition());
        if (!("erreur" in lecture)) return lecture;

        // Repli : si la lecture fine echoue (PowerShell absent ou bloque,
        // delai depasse...), on garde au moins le titre de la fenetre,
        // comme avant le Lot V, en signalant que le contenu n'est pas lu.
        let titre: string | null = null;
        try {
          const { getActiveWindow } = await import("@nut-tree-fork/nut-js");
          const fenetre = await getActiveWindow();
          titre = await fenetre.getTitle();
        } catch {
          titre = null;
        }
        // Une demande faite depuis la superposition lui donne le focus :
        // son titre (ou celui d'une autre fenetre de Classinus) ne decrit
        // pas ce que l'etudiant regarde, on ne le renvoie donc pas.
        const titresClassinus = BrowserWindow.getAllWindows()
          .filter(f => !f.isDestroyed())
          .map(f => f.getTitle());
        const titreEstClassinus = titre !== null && titresClassinus.includes(titre);
        if (titreEstClassinus) titre = null;
        return {
          titre_fenetre_active: titre,
          application: null,
          fenetre_classinus: false,
          fenetres_ouvertes: [],
          elements: [],
          coupe: false,
          mode: "titre_seul",
          erreur_lecture: titreEstClassinus
            ? `${lecture.erreur} (la fenetre active est une fenetre de Classinus, son titre est ignore)`
            : lecture.erreur,
        };
      }
      default:
        return { erreur: `type d'action systeme inconnu : ${type}` };
    }
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : String(e) };
  }
}

// --- Plugin Capacitor expose au web (meme nom et memes methodes que sur
// Android/iOS, voir lib/supabase.ts) ---

class PontNatifImpl extends ElectronPlugin {
  async executerActionSysteme(options: { id: string; type: string; parametres?: Record<string, unknown> }): Promise<unknown> {
    notifierWeb = (evenement, donnees) => this.context.notifyListeners(evenement, donnees);
    return executerAvecJournal(options.id, options.type, options.parametres ?? {});
  }

  async enregistrerToken(options: { token: string; apiUrl?: string }): Promise<void> {
    notifierWeb = (evenement, donnees) => this.context.notifyListeners(evenement, donnees);
    // Même destination que le renderer : les builds staging ne doivent pas ouvrir le canal système en production.
    if (options.apiUrl) {
      const url = new URL(options.apiUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("URL API invalide");
      urlApiBackend = url.href.replace(/\/$/, "");
    }
    ouvrirConnexion(options.token);
  }

  async deconnexion(): Promise<void> {
    jetonActuel = null;
    fermerConnexion();
  }

  async rattraperActionsEnAttente(): Promise<{ traitees: number }> {
    // Pas d'equivalent PC a la file d'actions differees mobile
    // (core/actions_appareil_mobile.py) : les actions systeme PC sont
    // toujours synchrones (canal agent applicatif), jamais posees en
    // attente. Renvoie toujours 0, sans erreur, pour que l'appel cote
    // web (lib/supabase.ts) reste silencieux comme sur les autres
    // plateformes quand il n'y a rien a rattraper.
    return { traitees: 0 };
  }
}

export const PontNatif = defineElectronPlugin(
  { name: "PontNatif", methods: ["enregistrerToken", "deconnexion", "rattraperActionsEnAttente", "executerActionSysteme"] },
  PontNatifImpl
);
