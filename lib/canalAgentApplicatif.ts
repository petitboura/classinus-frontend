"use client";

// Chantier agent applicatif, chantier C, partie frontend. Canal SEPARE
// de lib/canalTempsReel.ts (decision 0.1). Meme cycle de vie
// (ouverture/fermeture liee a visibilitychange), mais aucune logique de
// dossier ici -- uniquement la reception d'une demande d'execution
// d'action et la reponse.
//
// Rappel important (decision Bourama) : la demande est DIFFUSEE a
// TOUTES les connexions actives du compte cote backend (voir
// core/canal_agent_applicatif.py) -- si l'action `action_id` n'est pas
// montee ICI, on repond {"ignore": true} pour laisser une chance a une
// AUTRE connexion du meme compte (autre onglet/appareil) de repondre
// reellement, plutot que de faire echouer la demande a tort.

import { supabase } from "./supabase";
import { obtenirAction } from "./actionsApplicatives";
import { demanderConfirmationDepuisAgent } from "./contexteConfirmationAction";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

let socket: WebSocket | null = null;
let tentativeReconnexion: ReturnType<typeof setTimeout> | null = null;
let fermetureVoulue = false;
let dejaInitialise = false;

function urlWebSocket(token: string): string | null {
  if (!API_URL) return null;
  const base = API_URL.replace(/^http/, "ws");
  // appareil_id volontairement absent (pas de cible a identifier, voir
  // core/canal_agent_applicatif.py) -- le backend n'utilise cette
  // connexion que pour diffuser, jamais pour cibler.
  return `${base}/api/canal-agent-applicatif/ws?token=${encodeURIComponent(token)}`;
}

function envoyerReponse(id: string, resultat: unknown) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ id, resultat }));
}

async function traiterDemandeAction(id: string, actionId: string) {
  const action = obtenirAction(actionId);

  // Pas montee ICI (autre onglet/appareil, ou action deja disparue) :
  // "ignore", jamais une erreur -- laisse la vraie connexion repondre.
  if (!action || !action.actif) {
    envoyerReponse(id, { ignore: true });
    return;
  }

  if (action.sensible) {
    const accepte = await demanderConfirmationDepuisAgent(action.description);
    if (!accepte) {
      envoyerReponse(id, { refuse: true });
      return;
    }
    // Revalidation juste avant execution (decision Bourama, meme
    // principe que le mode generique du chantier F) : l'ecran a pu
    // changer pendant que l'etudiant repondait a la fenetre.
    const actionRevalidee = obtenirAction(actionId);
    if (!actionRevalidee || !actionRevalidee.actif) {
      envoyerReponse(id, { erreur: "L'action n'est plus disponible à l'écran (l'écran a changé)." });
      return;
    }
  }

  try {
    await action.executer();
    envoyerReponse(id, { succes: true });
  } catch (e) {
    envoyerReponse(id, { erreur: e instanceof Error ? e.message : "Erreur inconnue lors de l'exécution." });
  }
}

function traiterMessage(message: unknown) {
  if (!message || typeof message !== "object") return;
  const m = message as { id?: string; action_id?: string };
  if (m.id && m.action_id) {
    traiterDemandeAction(m.id, m.action_id);
  }
}

function planifierReconnexion() {
  if (fermetureVoulue || tentativeReconnexion) return;
  tentativeReconnexion = setTimeout(() => {
    tentativeReconnexion = null;
    ouvrirCanal();
  }, 3000);
}

async function ouvrirCanal() {
  if (document.visibilityState !== "visible") return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  const url = urlWebSocket(session.access_token);
  if (!url) return;

  fermetureVoulue = false;
  const ws = new WebSocket(url);

  ws.onmessage = (evenement) => {
    try {
      traiterMessage(JSON.parse(evenement.data));
    } catch {
      // Message mal forme : ignore, meme principe que canalTempsReel.ts.
    }
  };

  ws.onclose = () => {
    if (socket === ws) socket = null;
    planifierReconnexion();
  };

  ws.onerror = () => {
    ws.close();
  };

  socket = ws;
}

function fermerCanal() {
  fermetureVoulue = true;
  if (tentativeReconnexion) {
    clearTimeout(tentativeReconnexion);
    tentativeReconnexion = null;
  }
  socket?.close();
  socket = null;
}

/** À appeler une seule fois, même schéma que initialiserCanalTempsReel. */
export function initialiserCanalAgentApplicatif() {
  if (dejaInitialise || typeof window === "undefined") return;
  dejaInitialise = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      ouvrirCanal();
    } else {
      fermerCanal();
    }
  });

  window.addEventListener("online", () => {
    ouvrirCanal();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      ouvrirCanal();
    } else if (event === "SIGNED_OUT") {
      fermerCanal();
    }
  });

  ouvrirCanal();
}
