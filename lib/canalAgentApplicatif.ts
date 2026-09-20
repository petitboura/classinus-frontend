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
// chaque changement detecte du DOM -- un court debounce evite une
// rafale de messages quand plusieurs elements se (dé)montent dans le
// meme cycle de rendu.
//
// Revision (17/09/2026, voir plan-scan-generique-agent-applicatif.md) :
// l'ancien systeme de declaration manuelle (chantiers A/D d'origine,
// lib/actionsApplicatives.ts + lib/useDeclarerAction.ts) est remplace
// par un scan generique et automatique du DOM
// (lib/scanElementsInteractifs.ts) -- plus aucune description ecrite a
// la main dans un composant. Le declenchement du rescan, auparavant lie
// a un evenement emis par une declaration manuelle, est desormais un
// MutationObserver generique sur le document -- coherent avec le
// principe "rien a decrire, rien a cabler a la main".
//
// Ajout chantier F (16/09/2026), fusionne ici le 17/09/2026 : meme
// canal, mode "clic par identifiant genere" -- l'element cible est
// resolu par son attribut data-agent-id (pose par le scan), jamais
// invente ni devine par le modele. Deplace aussi le curseur virtuel
// (chantier B) avant le clic reel, via le pont
// lib/contexteCurseurVirtuel.tsx.
//
// Retrait de la confirmation (19/09/2026, decision Bourama) : plus
// aucune fenetre de validation avant execution, quel que soit le mode
// (scan ou clic generique) -- l'IA agit directement. Chantier H
// (bouton "toujours autoriser") annule en consequence, devenu sans
// objet. Chaque execution est desormais journalisee et sa description
// poussee vers la bulle de dialogue via lib/contexteCanalEnDirect.tsx
// (chantier I).
//
// Ajout chantier G (16/09/2026, demande Bourama) : mode guidage --
// troisieme forme de message recue, {"id", "montrer_action_id"} :
// deplace uniquement le curseur vers l'element cible, sans jamais
// l'executer.
//
// Ajout chantier P (19/09/2026, decision Bourama) : quatrieme forme de
// message recue, {"texte_clovis": "..."} : commentaire libre pousse par
// le modele du tour de conversation en cours (outil dire_a_l_etudiant
// cote backend), sans reponse attendue. Affiche dans la bulle de dialogue
// et garde dans le journal, quelle que soit la section de l'app.
//
// Ajout du 19/09/2026 (decision Bourama : le message de l'etudiant doit
// etre envoye) : envoyerMessageEtudiant. Le message part sur ce canal ;
// si un tour de Clovis est en cours, le backend le lui fait lire a son
// prochain aller-retour (accuse pris_en_compte=true). Sinon (ou canal
// ferme, ou accuse perdu) il est envoye comme un message normal du chat,
// via le repli enregistre par components/PontMessageCanalVersChat.tsx.

import { supabase } from "./supabase";
import { appelerApiStream } from "./api";
import { scannerElementsInteractifs, decrireElement } from "./scanElementsInteractifs";
import { deplacerCurseurDepuisAgent } from "./contexteCurseurVirtuel";
import { estVisibleEtActif, resoudreElementCliquable } from "./clicGenerique";
import {
  pousserJournalDepuisAgent,
  mettreAJourJournalDepuisAgent,
  afficherReponseDepuisAgent,
  afficherTexteDepuisAgent,
  type ImageCanal,
  type SourceCanal,
  obtenirConversationIdCanal,
} from "./contexteCanalEnDirect";

const ATTRIBUT_AGENT_ID = "data-agent-id";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

let socket: WebSocket | null = null;
let tentativeReconnexion: ReturnType<typeof setTimeout> | null = null;
let fermetureVoulue = false;
let dejaInitialise = false;
let observateurDom: MutationObserver | null = null;

function resoudreElementParAgentId(agentId: string): HTMLElement | null {
  let element: Element | null;
  try {
    element = document.querySelector(`[${ATTRIBUT_AGENT_ID}="${CSS.escape(agentId)}"]`);
  } catch {
    return null;
  }
  if (!(element instanceof HTMLElement)) return null;
  if (!estVisibleEtActif(element)) return null;
  return element;
}

function urlWebSocket(token: string): string | null {
  if (!API_URL) return null;
  const base = API_URL.replace(/^http/, "ws");
  // appareil_id volontairement absent (pas de cible a identifier, voir
  // core/canal_agent_applicatif.py) -- le backend n'utilise cette
  // connexion que pour diffuser, jamais pour cibler.
  return `${base}/api/canal-agent-applicatif/ws?token=${encodeURIComponent(token)}`;
}

let repliMessageEtudiant: ((texte: string) => void) | null = null;

/** Enregistre (ou retire, avec null) la fonction qui envoie un texte comme message normal du chat. */
export function enregistrerRepliMessageEtudiant(fn: ((texte: string) => void) | null) {
  repliMessageEtudiant = fn;
}

const DELAI_ACCUSE_MESSAGE_MS = 8000;
const LONGUEUR_MAX_DESCRIPTION_JOURNAL = 80;
const messagesEnAttenteAccuse = new Map<string, { texte: string; minuteur: ReturnType<typeof setTimeout> }>();
let compteurMessageEtudiant = 0;

function texteCourt(texte: string): string {
  return texte.length > LONGUEUR_MAX_DESCRIPTION_JOURNAL
    ? `${texte.slice(0, LONGUEUR_MAX_DESCRIPTION_JOURNAL).trimEnd()}…`
    : texte;
}

const AGENT_ID_CANAL = "clovis";

// Historique local de la conversation dédiée au canal (voir
// lib/contexteCanalEnDirect.tsx, conversationId) -- chat() côté backend
// ne recharge jamais l'historique depuis la base lui même, il se fie
// entièrement à ce que le frontend lui passe à chaque appel (voir
// core/main.py:chat(), `if historique is None: historique = []`). Donc
// c'est ici, et seulement ici, que la mémoire d'une session du canal
// vit d'un message au suivant. Réinitialisé dès que conversationId
// change (nouvelle activation, voir la comparaison plus bas) -- jamais
// mélangé avec une session précédente du canal ni avec le chat normal.
let historiqueCanalDirect: { role: "user" | "assistant"; content: string }[] = [];
let conversationIdCanalConnu: string | null = null;

/**
 * Déclenche un VRAI tour de Clovis (19/09/2026, décision Bourama : "il
 * doit pouvoir lui même via le chat écrire et s'envoyer un message... et
 * faire comme si de rien n'était") -- même route HTTP (/api/chat), même
 * pipeline, même sauvegarde en base (core/persistance_echanges.py) que
 * le chat normal, sur la conversation dédiée au canal
 * (lib/contexteCanalEnDirect.tsx), avec canal_en_direct=true pour que
 * les outils de clic soient forcés (voir core/main.py:chat()).
 *
 * Jamais de composant de chat monté ni ouvert pour ça : appelerApiStream
 * est une fonction pure, aucun rendu associé. La réponse finale du
 * modèle est affichée dans la bulle (chantier J), en rendu complet de chat -- tout ce que le
 * modèle dit en cours de route via dire_a_l_etudiant arrive déjà par un
 * autre canal (WebSocket canal_agent_applicatif, indépendant de cet
 * appel HTTP), voir traiterTexteClovis plus haut dans ce fichier.
 *
 * Renvoie false si aucune conversation de canal n'existe encore (canal
 * jamais activé cette session) ou si l'appel échoue -- l'appelant garde
 * alors le message plutôt que de le perdre (voir envoyerViaRepli).
 */
async function envoyerTourCanalDirect(texte: string): Promise<boolean> {
  const conversationId = obtenirConversationIdCanal();
  if (!conversationId) return false;

  if (conversationId !== conversationIdCanalConnu) {
    conversationIdCanalConnu = conversationId;
    historiqueCanalDirect = [];
  }

  const idJournal = pousserJournalDepuisAgent(`Toi : ${texteCourt(texte)}`, "en_cours");
  let reponseAccumulee = "";
  // Sources et images trouvées par les outils pendant ce tour, pour que la
  // réponse s'affiche comme dans le chat (pastilles de citation [[n]],
  // liste de sources, galerie d'images). Mêmes événements que ChatIA.tsx,
  // dédoublonnés de la même façon.
  const sources: SourceCanal[] = [];
  const clesSources = new Set<string>();
  let images: ImageCanal[] = [];

  try {
    await appelerApiStream(
      "/api/chat",
      {
        message: texte,
        agent_id: AGENT_ID_CANAL,
        historique: historiqueCanalDirect,
        conversation_id: conversationId,
        longueur_reponse: "moyenne",
        fuseau_horaire: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canal_en_direct: true,
      },
      (evenement) => {
        if (evenement?.type === "reponse" && typeof evenement.texte === "string") {
          reponseAccumulee += evenement.texte;
        } else if (evenement?.type === "sources" && Array.isArray(evenement.sources)) {
          for (const source of evenement.sources as SourceCanal[]) {
            const cle = source.url_extrait || source.url;
            if (clesSources.has(cle)) continue;
            clesSources.add(cle);
            sources.push(source);
          }
        } else if (evenement?.type === "images" && Array.isArray(evenement.images) && evenement.images.length > 0) {
          images = evenement.images as ImageCanal[];
        }
      }
    );

    historiqueCanalDirect = [
      ...historiqueCanalDirect,
      { role: "user", content: texte },
      { role: "assistant", content: reponseAccumulee },
    ];

    if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "succes");
    // Filet de sécurité : si Clovis n'a rien dit via dire_a_l_etudiant
    // pendant le tour, sa réponse finale s'affiche quand même dans la
    // bulle -- jamais un tour silencieux du point de vue de l'étudiant.
    if (reponseAccumulee.trim()) afficherReponseDepuisAgent({ texte: reponseAccumulee.trim(), sources, images });
    return true;
  } catch (e) {
    if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "erreur");
    return false;
  }
}

function envoyerViaRepli(texte: string) {
  // Priorité (19/09/2026, décision Bourama) : un vrai tour indépendant
  // sur la conversation du canal, sans jamais ouvrir le chat -- le repli
  // vers le chat (components/PontMessageCanalVersChat.tsx) ne reste que
  // pour le cas où le canal n'a jamais été activé cette session (aucune
  // conversation dédiée) ou pour l'échec réseau, jamais le chemin normal.
  envoyerTourCanalDirect(texte).then((ok) => {
    if (ok) return;
    pousserJournalDepuisAgent(`Ton message envoyé dans le chat : ${texteCourt(texte)}`, "succes");
    repliMessageEtudiant?.(texte);
  });
}

/**
 * Envoie un message ecrit ou dicte par l'etudiant pendant que Clovis
 * travaille. Ne perd jamais le message : si un tour est deja en cours,
 * il lui est injecte (accuse WebSocket) ; sinon (pas de tour en cours,
 * ou pas d'accuse dans le delai), un tour independant est declenche
 * directement sur la conversation du canal (voir envoyerTourCanalDirect) ;
 * en tout dernier recours seulement (canal jamais active, ou echec
 * reseau), envoi comme message normal du chat.
 */
export function envoyerMessageEtudiant(texte: string) {
  const propre = texte.trim();
  if (!propre) return;
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    envoyerViaRepli(propre);
    return;
  }
  compteurMessageEtudiant += 1;
  const idMessage = `message-etudiant-${Date.now()}-${compteurMessageEtudiant}`;
  const minuteur = setTimeout(() => {
    if (messagesEnAttenteAccuse.delete(idMessage)) envoyerViaRepli(propre);
  }, DELAI_ACCUSE_MESSAGE_MS);
  messagesEnAttenteAccuse.set(idMessage, { texte: propre, minuteur });
  socket.send(JSON.stringify({ id_message: idMessage, message_etudiant: propre }));
}

function traiterAccuseMessageEtudiant(idMessage: unknown, prisEnCompte: unknown) {
  if (typeof idMessage !== "string") return;
  const attente = messagesEnAttenteAccuse.get(idMessage);
  if (!attente) return;
  clearTimeout(attente.minuteur);
  messagesEnAttenteAccuse.delete(idMessage);
  if (prisEnCompte === true) {
    pousserJournalDepuisAgent(`Ton message à Classinus : ${texteCourt(attente.texte)}`, "succes");
  } else {
    envoyerViaRepli(attente.texte);
  }
}

function envoyerReponse(id: string, resultat: unknown) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ id, resultat }));
}

let debounceEtatActions: ReturnType<typeof setTimeout> | null = null;

function envoyerEtatActionsMaintenant() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ etat_actions: scannerElementsInteractifs() }));
}

/**
 * Poussee chantier D : un court debounce (200ms) evite d'envoyer un
 * message par action quand plusieurs se (dé)montent dans le meme cycle
 * de rendu (ex: changement de page qui démonte 5 boutons d'un coup),
 * sans introduire de latence perceptible pour Classinus.
 */
function envoyerEtatActions() {
  if (debounceEtatActions) clearTimeout(debounceEtatActions);
  debounceEtatActions = setTimeout(() => {
    debounceEtatActions = null;
    envoyerEtatActionsMaintenant();
  }, 200);
}

/**
 * Chantier C, revise (17/09/2026) pour le scan generique, puis a
 * nouveau (19/09/2026, decision Bourama) : plus aucune confirmation --
 * l'IA execute directement, sans jamais attendre de validation de
 * l'etudiant. `actionId` est un identifiant genere par le scan
 * (attribut data-agent-id), pas un identifiant declare a la main.
 * Chaque execution est journalisee (chantier I/K) et sa description
 * poussee vers la bulle de dialogue (chantier I/J).
 */
async function traiterDemandeAction(id: string, actionId: string) {
  const element = resoudreElementParAgentId(actionId);

  // Pas montee ICI (autre onglet/appareil, ou element deja disparu) :
  // "ignore", jamais une erreur -- laisse la vraie connexion repondre.
  if (!element) {
    envoyerReponse(id, { ignore: true });
    return;
  }

  const description = decrireElement(element);
  const idJournal = pousserJournalDepuisAgent(description);
  afficherTexteDepuisAgent(description);

  try {
    element.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
    await deplacerCurseurDepuisAgent(element, { cliquer: true, forme: "main" });

    // Toute derniere verification, juste avant le clic physique -- on
    // re-resout l'element par son data-agent-id plutot que de verifier
    // l'ancien objet DOM : React peut l'avoir remplace par un nouveau
    // noeud, identique visuellement et sous le meme data-agent-id,
    // pendant le voyage du curseur, ce qui ferait a tort croire que
    // l'element a disparu si on ne verifiait que l'ancien objet.
    const elementActuel = resoudreElementParAgentId(actionId);
    if (!elementActuel) {
      if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "erreur");
      envoyerReponse(id, { erreur: "L'élément a disparu juste avant le clic." });
      return;
    }

    elementActuel.click();
    if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "succes");
    envoyerReponse(id, { succes: true });
  } catch (e) {
    if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "erreur");
    envoyerReponse(id, { erreur: e instanceof Error ? e.message : "Erreur inconnue lors de l'exécution." });
  }
}

/**
 * Chantier F : mode générique de secours. Même principe que
 * traiterDemandeAction depuis le 19/09/2026 : exécution directe, sans
 * confirmation, journalisée de la même façon.
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

  const idJournal = pousserJournalDepuisAgent(description);
  afficherTexteDepuisAgent(description);

  element.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  await deplacerCurseurDepuisAgent(element, { cliquer: true, forme: "main" });

  // Toute dernière vérification, juste avant le clic physique -- on
  // re-résout l'élément par son sélecteur CSS plutôt que de vérifier
  // l'ancien objet DOM (même raison que traiterDemandeAction : React
  // peut avoir remplacé le nœud entre-temps).
  const elementActuel = resoudreElementCliquable(selecteur);
  if (!elementActuel) {
    if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "erreur");
    envoyerReponse(id, { erreur: "L'élément a disparu juste avant le clic." });
    return;
  }

  try {
    elementActuel.click();
    if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "succes");
    envoyerReponse(id, { succes: true });
  } catch (e) {
    if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "erreur");
    envoyerReponse(id, { erreur: e instanceof Error ? e.message : "Erreur inconnue lors du clic." });
  }
}

/**
 * Chantier G (mode guidage, 16/09/2026, demande Bourama). Deplace
 * simplement le curseur virtuel vers l'element cible, SANS l'executer.
 * Jamais de confirmation ici : un simple pointage visuel n'a aucun
 * effet sur les donnees de l'etudiant.
 */
async function traiterDemandeMontrer(id: string, actionId: string) {
  const element = resoudreElementParAgentId(actionId);
  if (!element) {
    envoyerReponse(id, { ignore: true });
    return;
  }

  element.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  await deplacerCurseurDepuisAgent(element, { cliquer: false, forme: "main" });
  envoyerReponse(id, { succes: true });
}

/**
 * Chantier P : commentaire libre de Clovis. Aucune reponse envoyee, le
 * serveur n'en attend pas. Un texte vide ou non textuel est ignore
 * plutot que d'afficher une bulle vide.
 */
function traiterTexteClovis(texte: unknown) {
  if (typeof texte !== "string") return;
  const propre = texte.trim();
  if (!propre) return;
  pousserJournalDepuisAgent(`Message : ${propre}`, "succes");
  afficherTexteDepuisAgent(propre);
}

function traiterMessage(message: unknown) {
  if (!message || typeof message !== "object") return;
  const m = message as {
    accuse_message_etudiant?: unknown;
    pris_en_compte?: unknown;
    message_etudiant_renvoye?: unknown;
    texte_clovis?: unknown;
    id?: string;
    action_id?: string;
    selecteur_generique?: string;
    description?: string;
    montrer_action_id?: string;
  };
  if (m.accuse_message_etudiant !== undefined) {
    traiterAccuseMessageEtudiant(m.accuse_message_etudiant, m.pris_en_compte);
  } else if (typeof m.message_etudiant_renvoye === "string") {
    // Arrive trop tard pour que le tour de Clovis le lise : meme traitement
    // qu'un accuse negatif.
    envoyerViaRepli(m.message_etudiant_renvoye);
  } else if (m.texte_clovis !== undefined) {
    traiterTexteClovis(m.texte_clovis);
  } else if (m.id && m.action_id) {
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
    demarrerObservationDom();
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
    arreterObservationDom();
    planifierReconnexion();
  };

  ws.onerror = () => {
    ws.close();
  };

  socket = ws;
}

/**
 * Remplace l'ancien evenement "clovis:actions_modifiees" (declaration
 * manuelle) par une observation generique du DOM : tout changement de
 * structure (montage/demontage) ou d'etat (disabled, aria-disabled,
 * hidden, style, class) declenche un rescan debounce. Coherent avec le
 * principe "rien a decrire, rien a cabler a la main" du scan generique.
 * Actif uniquement pendant qu'une connexion est ouverte, pour eviter du
 * travail inutile quand personne n'ecoute cote backend.
 *
 * Correctif du 19/09/2026 (Bourama : "Clovis peut cliquer avant un
 * changement d'ecran mais plus du tout apres") : "style" et "class"
 * ajoutes a attributeFilter. estVisibleEtActif (clicGenerique.ts)
 * traite un parent a opacity:0 comme invisible, mais un changement
 * d'opacite pilote par un style inline ou une classe CSS (transition
 * d'ecran, popup anime) n'est ni un ajout/retrait de noeud ni un
 * disabled/hidden : sans "style"/"class" ici, aucun rescan n'etait
 * declenche quand l'opacite revenait a 1, et un scan tombe pendant la
 * fenetre a opacity:0 figeait une liste d'actions vide ou tronquee cote
 * backend jusqu'au prochain changement de structure ailleurs.
 */
function demarrerObservationDom() {
  if (observateurDom || typeof document === "undefined") return;
  observateurDom = new MutationObserver(() => {
    envoyerEtatActions();
  });
  observateurDom.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled", "aria-disabled", "hidden", "aria-hidden", "style", "class"],
  });
}

function arreterObservationDom() {
  observateurDom?.disconnect();
  observateurDom = null;
}

function fermerCanal() {
  fermetureVoulue = true;
  if (tentativeReconnexion) {
    clearTimeout(tentativeReconnexion);
    tentativeReconnexion = null;
  }
  arreterObservationDom();
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
