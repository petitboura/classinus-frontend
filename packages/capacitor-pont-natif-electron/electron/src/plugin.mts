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

import { exec } from "node:child_process";
import WebSocket from "ws";
import { ElectronPlugin, defineElectronPlugin } from "@capawesome/capacitor-electron/plugin";
// Import direct du module compile du paquet voisin (pas un appel de
// plugin Capacitor : juste une fonction Node partagee entre les deux
// paquets). Necessite que capacitor-dossiers-electron soit deja
// construit (npm run build) avant celui-ci -- voir le README a la
// racine de ce paquet.
import { obtenirAppareilIdPc } from "capacitor-dossiers-electron/electron/dist/plugin.mjs";

/**
 * URL du backend clovis-backend (alias classinus-backend). Le
 * processus principal Electron n'a pas acces aux variables
 * NEXT_PUBLIC_* inlinees a la construction du site web (celles-ci ne
 * vivent que dans le bundle web statique) -- d'ou cette valeur separee,
 * surchargeable par la variable d'environnement CLASSINUS_API_URL au
 * lancement si besoin (tests locaux, changement d'environnement).
 *
 * Valeur par defaut = domaine Railway confirme le 05/09/2026 (voir
 * memoire du chantier mobile). A REVERIFIER par Bourama au moment du
 * premier vrai test : le renommage des depots GitHub (23-25/09/2026)
 * n'a normalement pas change ce domaine, mais ca n'a pas ete confirme
 * pour ce chantier precis.
 */
const URL_API_BACKEND = process.env.CLASSINUS_API_URL || "https://clovis-backend-production.up.railway.app";

function urlWebSocketCanal(): string {
  return URL_API_BACKEND.replace(/^http/, "ws") + "/api/canal-agent-applicatif/ws";
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

async function traiterMessage(ws: WebSocket, brut: string): Promise<void> {
  let message: unknown;
  try {
    message = JSON.parse(brut);
  } catch {
    return;
  }
  if (!estMessageActionSysteme(message)) return; // pas pour nous, on ignore silencieusement

  const resultat = await executerActionSysteme(message.action_systeme, message.parametres || {});
  ws.send(JSON.stringify({ id: message.id, resultat }));
}

async function executerActionSysteme(type: string, parametres: Record<string, unknown>): Promise<unknown> {
  // Import paresseux : @nut-tree-fork/nut-js et screenshot-desktop
  // contiennent des modules natifs precompiles par plateforme --
  // les charger seulement quand une action est reellement demandee
  // evite un echec au demarrage de l'appli si jamais l'un des deux
  // pose probleme sur une machine donnee (a surveiller au premier
  // vrai test, voir le README de ce paquet).
  const { mouse, keyboard, Point, Button, getActiveWindow } = await import("@nut-tree-fork/nut-js");

  try {
    switch (type) {
      case "cliquer_ecran": {
        const x = Number(parametres.x);
        const y = Number(parametres.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return { erreur: "coordonnees x/y invalides" };
        }
        await mouse.setPosition(new Point(x, y));
        await mouse.click(Button.LEFT);
        return { ok: true };
      }
      case "taper_clavier": {
        const texte = String(parametres.texte ?? "");
        if (!texte) return { erreur: "texte vide" };
        await keyboard.type(texte);
        return { ok: true };
      }
      case "ouvrir_application": {
        const nom = String(parametres.nom ?? "").trim();
        if (!nom) return { erreur: "nom d'application vide" };
        // Lancement simple via l'interpreteur de commandes Windows :
        // suffisant pour un nom d'executable connu du PATH (notepad,
        // calc...) ou associe a une extension. Pas de verification
        // prealable que l'application existe : une erreur ici remonte
        // via le callback exec, traitee comme un echec normal.
        await new Promise<void>((resolve, reject) => {
          exec(nom, (erreur) => (erreur ? reject(erreur) : resolve()));
        });
        return { ok: true };
      }
      case "lire_ecran": {
        // Lot S : capture simple, verifie seulement que la capture et
        // la lecture du titre de fenetre fonctionnent. La lecture fine
        // du contenu affiche (OCR ou UI Automation Windows) est
        // volontairement laissee pour un lot ulterieur si le besoin se
        // confirme (voir plan-canal-en-direct-pc.md).
        const screenshotDesktop = (await import("screenshot-desktop")).default;
        await screenshotDesktop(); // prend la capture, non exploitee pour l'instant (voir ci-dessus)
        let titre: string | null = null;
        try {
          const fenetre = await getActiveWindow();
          titre = await fenetre.getTitle();
        } catch {
          titre = null;
        }
        return { titre_fenetre_active: titre };
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
  async enregistrerToken(options: { token: string }): Promise<void> {
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
  { name: "PontNatif", methods: ["enregistrerToken", "deconnexion", "rattraperActionsEnAttente"] },
  PontNatifImpl
);
