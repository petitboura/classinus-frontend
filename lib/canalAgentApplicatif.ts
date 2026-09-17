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
//
// Ajout chantier D (16/09/2026) : poussee continue de l'etat des
// actions disponibles, dans l'autre sens (frontend -> backend), sur ce
// meme canal separe. Envoyee une fois a l'ouverture du canal, puis a
// chaque fois que ecouterActionsModifiees (lib/actionsApplicatives.ts)
// signale un changement -- jamais sur un evenement DOM brut, uniquement
// sur mount/demontage/activation d'une action DECLAREE (meme
// granularite que decidee avec Bourama pour eviter le bruit). Un court
// debounce evite une rafale de messages quand plusieurs actions se
// (dé)montent dans le meme cycle de rendu.
//
// Ajout chantier F (16/09/2026) : meme canal, troisieme forme de
// message recue -- {"id", "selecteur_generique", "description"} --
// pour le mode generique de secours (DOM + selecteur), pour tout ce qui
// n'a pas encore d'action declaree via le chantier A. Aucune
// metadonnee de sensibilite possible ici : la confirmation est
// TOUJOURS demandee, sans exception. Deplace aussi le curseur virtuel
// (chantier B) avant le clic reel, via le pont
// lib/contexteCurseurVirtuel.tsx.
//
// Ajout chantier G (16/09/2026, demande Bourama) : mode guidage --
// quatrieme forme de message recue, {"id", "montrer_action_id"} :
// deplace uniquement le curseur vers l'element d'une action DEJA
// declaree (chantier A), sans jamais l'executer. Reutilise le meme
// mecanisme de reference d'element (ActionDeclaree.obtenirElement,
// pose via la nouvelle option `ref` de useDeclarerAction) desormais
// aussi utilise par traiterDemandeAction (chantier C) pour deplacer
// le curseur avant une VRAIE execution, quand l'action a declare une
// ref -- retrocompatible si elle n'en a pas.

import { supabase } from "./supabase";
import { obtenirAction, obtenirActionsDisponibles, obtenirElementAction, ecouterActionsModifiees } from "./actionsApplicatives";
import { demanderConfirmationDepuisAgent } from "./contexteConfirmationAction";
import { deplacerCurseurDepuisAgent } from "./contexteCurseurVirtuel";
import { estVisibleEtActif, resoudreElementCliquable } from "./clicGenerique";

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

let debounceEtatActions: ReturnType<typeof setTimeout> | null = null;

function envoyerEtatActionsMaintenant() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ etat_actions: obtenirActionsDisponibles() }));
}

/**
 * Poussee chantier D : un court debounce (200ms) evite d'envoyer un
 * message par action quand plusieurs se (dé)montent dans le meme cycle
 * de rendu (ex: changement de page qui démonte 5 boutons d'un coup),
 * sans introduire de latence perceptible pour Clovis.
 */
function envoyerEtatActions() {
  if (debounceEtatActions) clearTimeout(debounceEtatActions);
  debounceEtatActions = setTimeout(() => {
    debounceEtatActions = null;
    envoyerEtatActionsMaintenant();
  }, 200);
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
    // Amélioration du 16/09/2026 (demande Bourama : finir le chantier) :
    // déplace le curseur virtuel vers l'élément réel de l'action avant
    // de l'exécuter, si un élément a été déclaré (voir ref dans
    // useDeclarerAction) -- sans effet, ni blocage, si aucun élément
    // n'a été fourni (rétrocompatible avec les actions déjà déclarées
    // sans ref).
    const element = obtenirElementAction(actionId);
    if (element) {
      await deplacerCurseurDepuisAgent(element, { cliquer: true, forme: "main" });
    }
    await action.executer();
    envoyerReponse(id, { succes: true });
  } catch (e) {
    envoyerReponse(id, { erreur: e instanceof Error ? e.message : "Erreur inconnue lors de l'exécution." });
  }
}

/**
 * Chantier F : mode générique de secours. Contrairement à
 * traiterDemandeAction, aucune métadonnée de sensibilité n'existe ici
 * -- la confirmation est donc TOUJOURS demandée, sans exception (défaut
 * prudent, décision Bourama).
 */
async function traiterDemandeClicGenerique(id: string, selecteur: string, description: string) {
  const element = resoudreElementCliquable(selecteur);

  // Introuvable OU trouvé mais indisponible ICI : "ignore" dans les
  // deux cas -- laisse une chance à une autre connexion du même compte
  // (même principe que traiterDemandeAction), plutôt que de conclure à
  // tort que l'élément n'existe nulle part.
  if (!element) {
    envoyerReponse(id, { ignore: true });
    return;
  }

  const accepte = await demanderConfirmationDepuisAgent(description);
  if (!accepte) {
    envoyerReponse(id, { refuse: true });
    return;
  }

  // Revalidation juste avant le clic reel : l'ecran a pu changer
  // pendant que l'etudiant repondait a la fenetre de confirmation.
  const elementRevalide = resoudreElementCliquable(selecteur);
  if (!elementRevalide) {
    envoyerReponse(id, { erreur: "L'élément n'est plus disponible à l'écran (l'écran a changé)." });
    return;
  }

  elementRevalide.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  await deplacerCurseurDepuisAgent(elementRevalide, { cliquer: true, forme: "main" });

  // Toute dernière vérification, juste avant le clic physique -- le
  // défilement ou l'animation du curseur pourrait, en théorie, avoir
  // fait disparaître l'élément entre temps.
  if (!document.body.contains(elementRevalide) || !estVisibleEtActif(elementRevalide)) {
    envoyerReponse(id, { erreur: "L'élément a disparu juste avant le clic." });
    return;
  }

  try {
    elementRevalide.click();
    envoyerReponse(id, { succes: true });
  } catch (e) {
    envoyerReponse(id, { erreur: e instanceof Error ? e.message : "Erreur inconnue lors du clic." });
  }
}

/**
 * Chantier G (mode guidage, 16/09/2026, demande Bourama : finir ce
 * chantier). Déplace simplement le curseur virtuel vers l'élément de
 * l'action `actionId`, SANS l'exécuter -- pour que Clovis puisse
 * montrer où se trouve une nouveauté en l'expliquant dans le chat,
 * sans agir à la place de l'étudiant. Jamais de confirmation ici : un
 * simple pointage visuel n'a aucun effet sur les données de l'étudiant.
 */
async function traiterDemandeMontrer(id: string, actionId: string) {
  const action = obtenirAction(actionId);
  if (!action || !action.actif) {
    envoyerReponse(id, { ignore: true });
    return;
  }

  const element = obtenirElementAction(actionId);
  if (!element) {
    envoyerReponse(id, {
      erreur: "Cette action n'a pas de position associée à l'écran pour le pointage (aucune ref déclarée).",
    });
    return;
  }

  await deplacerCurseurDepuisAgent(element, { cliquer: false, forme: "main" });
  envoyerReponse(id, { succes: true });
}

function traiterMessage(message: unknown) {
  if (!message || typeof message !== "object") return;
  const m = message as {
    id?: string;
    action_id?: string;
    selecteur_generique?: string;
    description?: string;
    montrer_action_id?: string;
  };
  if (m.id && m.action_id) {
    traiterDemandeAction(m.id, m.action_id);
  } else if (m.id && m.selecteur_generique) {
    traiterDemandeClicGenerique(m.id, m.selecteur_generique, m.description ?? "une action dans l'application");
  } else if (m.id && m.montrer_action_id) {
    traiterDemandeMontrer(m.id, m.montrer_action_id);
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

  ws.onopen = () => {
    // Etat initial des actions disponibles pour CETTE connexion, sans
    // attendre un changement (chantier D) -- sinon le backend n'a rien
    // tant qu'aucune action ne se (dé)monte apres l'ouverture.
    envoyerEtatActionsMaintenant();
  };

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

  // Chantier D : a chaque (dé)montage/changement d'une action déclarée
  // (lib/actionsApplicatives.ts), pousse l'état à jour au backend --
  // sans attendre le tour de conversation suivant.
  ecouterActionsModifiees(envoyerEtatActions);

  ouvrirCanal();
}
