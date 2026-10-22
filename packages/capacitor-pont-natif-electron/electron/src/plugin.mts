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
import { app, BrowserWindow, clipboard, globalShortcut, screen } from "electron";
import { ElectronPlugin, defineElectronPlugin } from "@capawesome/capacitor-electron/plugin";
// Import direct du module compile du paquet voisin (pas un appel de
// plugin Capacitor : juste une fonction Node partagee entre les deux
// paquets). Necessite que capacitor-dossiers-electron soit deja
// construit (npm run build) avant celui-ci -- voir le README a la
// racine de ce paquet.
import { obtenirAppareilIdPc } from "capacitor-dossiers-electron/electron/dist/plugin.mjs";
// Lot V : lecture en texte de la fenetre au premier plan (UI Automation).
import { lireFenetreAuPremierPlan, zoneDepuisParametres, fenetreVoulueDepuisParametres } from "./lectureFenetreWindows.mjs";
import { pointerCurseurEcran, annoncerUtilisationCurseurReel, avecSourisTraversante, marquerEcran } from "capacitor-superposition-electron/electron/dist/plugin.mjs";
import { convertirZonesPageEnEcran, elementsDansZones } from "./zonesCrayon.mjs";
import { cliquerParAccessibiliteWindows } from "./clicWindows.mjs";
import { cliquerEcran } from "./clicEcran.mjs";
import { analyserTouches, libelleCombinaison } from "./touchesClavier.mjs";
import { creerGardeClavier } from "./gardeClavier.mjs";
import { taperTexteAdapte, nettoyerTexteFrappe } from "./frappeAdaptee.mjs";
import { cibleDepuisParametres, cibleCorrespond, messageMauvaiseCible, messageFrappeInterrompue, pointeurDeplace } from "./cibleSaisie.mjs";
import { ecrireEnArrierePlanWindows, activerFenetreParTitreWindows, RAISON_FENETRE_INTROUVABLE } from "./ecritureArrierePlan.mjs";
import { creerCollage, type PressePapiers } from "./collageFrappe.mjs";
import { creerArretGlobal } from "./arretGlobal.mjs";
import {
  combinaisonsOuvrentExecuter,
  creerGestionnaireAutorisations,
  delaiAutorisationDepuisParametres,
  estApplicationProtegee,
  listeDepuisParametres,
  type DecisionAutorisation,
  type OptionsDemande,
} from "./applicationsProtegees.mjs";
import {
  BOUTONS_SENSIBLE,
  appliquerChoix,
  creerAccords,
  decider,
  politiqueDepuisParametres,
  texteDemande,
  toujoursDepuisParametres,
  type ActionControlee,
  type Cible,
} from "./politiqueAutorisation.mjs";

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
const DELAI_ENTRE_TOUCHES_MS = 4;
// Courte tenue entre deux touches d'un raccourci : assez pour que Windows enregistre
// Ctrl ou Alt avant la touche suivante, sans rendre le raccourci lent.
const TENUE_RACCOURCI_MS = 20;

// Garde du clavier (voir gardeClavier.mts) : créée au premier besoin, partagée par
// tous les outils clavier pour qu'aucune touche ne reste enfoncée.
let gardeClavier: ReturnType<typeof creerGardeClavier> | null = null;
async function obtenirGardeClavier(): Promise<ReturnType<typeof creerGardeClavier>> {
  const { keyboard } = await import("@nut-tree-fork/nut-js");
  if (!gardeClavier) {
    gardeClavier = creerGardeClavier(keyboard, { pauseMs: TENUE_RACCOURCI_MS });
    // Fermeture de l'appli en plein raccourci : relâcher tout de suite.
    const relacher = () => { void gardeClavier?.relacherToutEnUrgence(); };
    app.on("before-quit", relacher);
    app.on("will-quit", relacher);
  }
  return gardeClavier;
}

// Arrêt global (voir arretGlobal.mts) : Échap arrête Clovis de n'importe où pendant une
// tâche. Le renderer arme le raccourci au début de la tâche et le désarme à la fin
// (armerArretGlobal et desarmerArretGlobal plus bas).
const MESSAGE_ARRET_GLOBAL =
  "L'étudiant a appuyé sur Échap pour t'arrêter : arrête la tâche en cours et ne recommence pas cette action.";
let arretGlobalSurQuitEnregistre = false;

// Applications protégées (voir applicationsProtegees.mts) : accord de l'étudiant, action par
// action. La bulle de la superposition affiche la demande (événement "autorisation") et
// renvoie la réponse par repondreAutorisation.
const autorisations = creerGestionnaireAutorisations({
  envoyer: (evenement) => {
    try { notifierWeb?.("autorisation", evenement); } catch (e) { console.warn("PontNatif : demande d'accord non relayee", e); }
  },
});

// Accords de l'étudiant (18/10/2026, voir politiqueAutorisation.mts) : "cette fois seulement" vaut
// pour la tâche en cours dans l'application, "toujours pour cette appli" reste. Retenus ici, dans
// l'application PC, tant qu'elle tourne : les conditions et la mémoire sur le compte de l'étudiant
// viendront du serveur (parametres.autorisation.applications_toujours), sans changer ce code.
const accords = creerAccords();

const arretGlobal = creerArretGlobal(globalShortcut, {
  surArret: () => {
    // Une demande d'accord encore ouverte est refusée : l'étudiant vient d'arrêter Clovis.
    autorisations.refuserTout();
    accords.reinitialiserTache();
    // Relâcher tout de suite les touches que Clovis tient enfoncées (Ctrl, Alt, Maj...).
    void gardeClavier?.relacherToutEnUrgence();
    // Le renderer principal coupe la tâche, comme le bouton d'arrêt de la superposition.
    try { notifierWeb?.("arretGlobal", {}); } catch (e) { console.warn("PontNatif : arret global non relaye", e); }
  },
});

function decrireActionSysteme(type: string, parametres: Record<string, unknown>): string {
  switch (type) {
    case "pointer_ecran":
      return "Classinus pointe à l'écran";
    case "marquer_ecran":
      return "Classinus marque un endroit de l'écran";
    case "cliquer_ecran":
      return "Classinus clique à l'écran";
    case "taper_clavier":
      return "Classinus a écrit du texte";
    case "appuyer_touches": {
      // Annonce du raccourci dans le journal de l'etudiant, avant l'execution.
      const analyse = analyserTouches(parametres.touches);
      return analyse.ok
        ? `Classinus utilise le raccourci ${analyse.combinaisons.map(libelleCombinaison).join(", ")}`
        : "Classinus utilise le clavier";
    }
    case "ouvrir_application": {
      const nom = String(parametres.nom ?? "").trim();
      return nom ? `Classinus a ouvert ${nom}` : "Classinus a ouvert une application";
    }
    case "lire_ecran": {
      const fenetre = fenetreVoulueDepuisParametres(parametres);
      return fenetre ? `Classinus regarde la fenêtre « ${fenetre} »` : "Classinus regarde l'écran";
    }
    case "demander_autorisation":
      return "Classinus te demande l'autorisation";
    default:
      return "Classinus agit sur l'ordinateur";
  }
}

async function traiterMessage(ws: WebSocket, brut: string): Promise<void> {
  let message: unknown;
  try {
    message = JSON.parse(brut);
  } catch {
    return;
  }
  // Arrêt annoncé par le serveur (12/10/2026, demande Bourama : « arrêter c'est arrêter »), quand
  // l'étudiant arrête la tâche avec le bouton Arrêter du chat ou du canal, sur cet appareil ou un
  // autre. Même effet que sur Échap (garde-fou 1) : la frappe et les raccourcis en cours s'arrêtent,
  // les touches tenues sont relâchées, une demande d'accord ouverte est refusée. On ne prévient pas
  // l'interface ici : elle a reçu le même message du serveur sur sa propre connexion.
  if (typeof message === "object" && message !== null && (message as { arret_tache?: unknown }).arret_tache === true) {
    arretGlobal.demanderArret();
    autorisations.refuserTout();
    void gardeClavier?.relacherToutEnUrgence();
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
  // Arrêt demandé par l'étudiant (Échap) : plus aucune action sur le PC, la lecture de
  // l'écran reste possible pour que Clovis voie où il s'est arrêté.
  if (type !== "lire_ecran" && arretGlobal.arretDemande()) return { erreur: MESSAGE_ARRET_GLOBAL };
  arretGlobal.signalerActivite();
  // Lecture automatique (le serveur lit l'écran avant un tour ou après une action,
  // sans que Classinus l'ait décidé) : rien à afficher, ni journal ni bulle.
  if (type === "lire_ecran" && parametres.automatique === true) {
    return executerActionSysteme(type, parametres);
  }
  notifier({ id, phase: "debut", description: decrireActionSysteme(type, parametres) });
  const resultat = await executerActionSysteme(type, parametres);
  const enErreur =
    typeof resultat === "object" && resultat !== null && typeof (resultat as { erreur?: unknown }).erreur === "string";
  const descriptionFin = type === "lire_ecran" ? descriptionFinLecture(resultat, enErreur) : undefined;
  notifier({ id, phase: "fin", statut: enErreur ? "erreur" : "succes", ...(descriptionFin ? { description: descriptionFin } : {}) });
  return resultat;
}

// Ce que Classinus a réellement pu lire, dit au passé une fois la lecture finie.
function descriptionFinLecture(resultat: unknown, enErreur: boolean): string {
  if (enErreur || typeof resultat !== "object" || resultat === null) return "Classinus n'a pas pu lire l'écran";
  const lecture = resultat as { fenetre_classinus?: unknown; mode?: unknown; elements?: unknown; texte_long_ignore?: unknown; fenetre_visee?: unknown; titre_fenetre_active?: unknown };
  if (lecture.fenetre_visee === true) {
    const titre = typeof lecture.titre_fenetre_active === "string" && lecture.titre_fenetre_active ? ` « ${lecture.titre_fenetre_active} »` : "";
    return Array.isArray(lecture.elements) && lecture.elements.length > 0
      ? `Classinus a lu la fenêtre${titre} sans la mettre devant`
      : `Classinus n'a lu que le titre de la fenêtre${titre}`;
  }
  if (lecture.fenetre_classinus === true) return "Classinus n'a vu aucune autre fenêtre que la sienne";
  if (lecture.mode !== "uia" || !Array.isArray(lecture.elements) || lecture.elements.length === 0) {
    return "Classinus n'a lu que le titre de la fenêtre";
  }
  if (lecture.texte_long_ignore === true) return "Classinus a lu l'écran (sans le texte long)";
  return "Classinus a lu l'écran";
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

// Quelle application reçoit le clavier : la fenêtre au premier plan, ou la première fenêtre
// hors Classinus quand c'est Classinus qui a le focus (comme pour lire_ecran). Lecture
// minimale (un seul élément), seul le nom du programme et le titre comptent ici.
async function applicationAuPremierPlan(): Promise<{
  statut: "classinus" | "identifiee" | "inconnue";
  application: string | null;
  titre: string | null;
}> {
  const lecture = await lireFenetreAuPremierPlan({ nb_max_elements: 1, nb_max_fenetres: 0 }, handleSuperposition(), false);
  if ("erreur" in lecture) return { statut: "inconnue", application: null, titre: null };
  if (lecture.fenetre_classinus) return { statut: "classinus", application: null, titre: null };
  if (!lecture.application) return { statut: "inconnue", application: null, titre: lecture.titre_fenetre_active };
  return { statut: "identifiee", application: lecture.application, titre: lecture.titre_fenetre_active };
}

// Ecriture dans une fenêtre qui n'est pas devant (12/10/2026, demande de Bourama). Renvoie
// { fini: true, resultat } quand tout est dit (écrit en arrière plan, ou refus à expliquer),
// ou { fini: false } quand la fenêtre visée vient d'être mise devant, avec l'annonce faite : le
// clavier prend alors le relais comme avant.
async function ecrireDerriereOuBasculer(
  cible: string,
  texte: string,
  parametres: Record<string, unknown>,
  titreDevant: string | null,
): Promise<{ fini: true; resultat: Record<string, unknown> } | { fini: false }> {
  const mauvaiseCible = { fini: true as const, resultat: { erreur: messageMauvaiseCible(cible, titreDevant) } };
  if (process.platform !== "win32") return mauvaiseCible;
  const liste = listeDepuisParametres(parametres);
  // Politique d'autorisation (18/10/2026) : l'application de la fenêtre visée est identifiée
  // AVANT d'écrire (lecture légère de cette fenêtre), puis l'accord est demandé comme pour le
  // clavier. Application illisible : traitée comme sensible (voir politiqueAutorisation.mts).
  if (politiqueActive(parametres)) {
    const lecture = await lireFenetreAuPremierPlan({ fenetre_cible: cible, nb_max_elements: 1, nb_max_fenetres: 0 }, handleSuperposition(), false);
    const refus = await controlerAutorisation("ecrire", parametres, {
      application: "erreur" in lecture ? null : lecture.application,
      titre: "erreur" in lecture ? cible : (lecture.titre_fenetre_active ?? cible),
    });
    if (refus) return { fini: true, resultat: { erreur: refus } };
  }
  let arriere = await ecrireEnArrierePlanWindows({ cible, texte, applicationsProtegees: politiqueActive(parametres) ? [] : liste });
  if (arriere.statut === "protegee") {
    const refus = await demanderAccord(`Clovis veut écrire dans ${arriere.fenetre}. Autoriser cette fois ?`, arriere.fenetre, parametres);
    if (refus) return { fini: true, resultat: { erreur: refus } };
    arriere = await ecrireEnArrierePlanWindows({ cible, texte, applicationsProtegees: liste, forcer: true });
  }
  if (arriere.statut === "effectue") {
    return { fini: true, resultat: { ok: true, mode: "arriere_plan", fenetre: arriere.fenetre } };
  }
  if (arriere.statut === "incertain") {
    return { fini: true, resultat: { erreur: `${arriere.raison}. Je ne réessaie pas, pour ne pas écrire le texte deux fois. Regarde la fenêtre « ${cible} » avant de continuer.` } };
  }
  if (arriere.statut === "protegee") return mauvaiseCible;
  // Fenêtre introuvable : rien à passer devant, le modèle doit choisir une fenêtre qui existe.
  if (arriere.raison === RAISON_FENETRE_INTROUVABLE) return mauvaiseCible;
  // L'application ne se laisse pas écrire derrière : on prévient, puis on passe devant.
  try {
    await annoncerUtilisationCurseurReel(
      `Je ne peux pas écrire dans « ${cible} » sans la mettre devant. Je la passe devant et j'écris avec ton clavier. Tu peux m'arrêter avec Échap.`
    );
  } catch {
    return { fini: true, resultat: { erreur: "L'annonce n'a pas pu être affichée. Je n'ai rien écrit et je n'ai pas pris ton clavier." } };
  }
  const devant = await activerFenetreParTitreWindows(cible);
  if (devant.statut !== "effectue") {
    return { fini: true, resultat: { erreur: `Je n'ai pas pu mettre « ${cible} » devant. Rien n'a été écrit.` } };
  }
  await new Promise<void>(resolve => setTimeout(resolve, 350));
  return { fini: false };
}

// Pose la question à l'étudiant et attend. Renvoie la décision, et le message à donner à Clovis
// quand l'action ne doit PAS être faite (null si elle est autorisée).
async function poserQuestion(
  texte: string,
  nom: string,
  parametres: Record<string, unknown>,
  options?: OptionsDemande,
): Promise<{ decision: DecisionAutorisation; refus: string | null }> {
  const decision = await autorisations.demander(texte, delaiAutorisationDepuisParametres(parametres), options);
  if (decision === "accepte" || decision === "toujours") return { decision, refus: null };
  if (arretGlobal.arretDemande()) return { decision, refus: MESSAGE_ARRET_GLOBAL };
  if (decision === "delai") {
    return {
      decision,
      refus: `L'étudiant n'a pas répondu à temps à la demande d'autorisation (${nom}) : l'action n'a PAS été faite. Ne réessaie pas sans qu'il te le demande.`,
    };
  }
  return {
    decision,
    refus: `L'étudiant a refusé cette action (${nom}). Ne réessaie pas : explique-lui ce que tu voulais faire et propose une autre approche.`,
  };
}

// Renvoie null si l'action est autorisée, sinon le message à donner à Clovis (action NON faite).
async function demanderAccord(texte: string, nom: string, parametres: Record<string, unknown>, options?: OptionsDemande): Promise<string | null> {
  return (await poserQuestion(texte, nom, parametres, options)).refus;
}

// Politique d'autorisation du 18/10/2026 (voir politiqueAutorisation.mts) : regarder, écrire,
// ouvrir et cliquer demandent l'accord de l'étudiant, application par application. Éteinte tant
// que le serveur n'envoie pas parametres.autorisation : le plugin garde alors son comportement
// d'avant (seules les applications protégées demandent un accord). Renvoie null si l'action est
// autorisée, sinon le message à donner à Clovis.
function politiqueActive(parametres: Record<string, unknown>): boolean {
  return politiqueDepuisParametres(parametres).active;
}

function synchroniserAccords(parametres: Record<string, unknown>): void {
  const toujours = toujoursDepuisParametres(parametres);
  if (toujours) accords.remplacerToujours(toujours);
}

const MESSAGE_LECTURE_NON_AUTORISEE =
  "Classinus n'a pas encore l'autorisation de regarder cette application. Appelle lire_ecran : l'étudiant choisira s'il t'autorise. Ne réessaie pas sans cela.";

async function controlerAutorisation(
  action: ActionControlee,
  parametres: Record<string, unknown>,
  cible: Cible,
): Promise<string | null> {
  const politique = politiqueDepuisParametres(parametres);
  if (!politique.active) return null;
  synchroniserAccords(parametres);
  const decision = decider({ politique, action, cible, accords });
  if (decision.type === "autorise") return null;
  const nom = cible.titre?.trim() || cible.application?.trim() || "";
  const { decision: reponse, refus } = await poserQuestion(texteDemande(action, nom), nom || "application non identifiée", parametres, {
    boutons: decision.boutons,
    risque: decision.risque,
  });
  if (refus) return refus;
  appliquerChoix({ choix: reponse === "toujours" ? "toujours_appli" : "cette_fois", cible, sensible: decision.sensible, accords });
  return null;
}

// Ce que la lecture vient de lire : peut-elle être donnée à Clovis ? Une lecture décidée par le
// serveur (automatique) ne pose jamais de question : sans accord, elle ne donne rien et renvoie
// Clovis vers lire_ecran, qui demande.
async function controlerLecture(lecture: object, parametres: Record<string, unknown>): Promise<string | null> {
  const politique = politiqueDepuisParametres(parametres);
  if (!politique.active) return null;
  const l = lecture as {
    application?: unknown;
    titre_fenetre_active?: unknown;
    fenetre_classinus?: unknown;
    zone_lue?: unknown;
    bureau_premier_plan?: unknown;
  };
  if (l.fenetre_classinus === true) return null;
  const application =
    l.zone_lue === "bureau" || l.bureau_premier_plan === true
      ? "bureau"
      : l.zone_lue === "barre_des_taches"
        ? "barre des taches"
        : typeof l.application === "string" && l.application
          ? l.application
          : null;
  const titre = typeof l.titre_fenetre_active === "string" ? l.titre_fenetre_active : null;
  if (parametres.automatique === true) {
    synchroniserAccords(parametres);
    return decider({ politique, action: "lire", cible: { application, titre }, accords }).type === "autorise"
      ? null
      : MESSAGE_LECTURE_NON_AUTORISEE;
  }
  return controlerAutorisation("lire", parametres, { application, titre });
}

// Garde-fou 2 : le clavier va dans une application protégée ? Dans le doute (application non
// identifiée), on demande aussi : mieux vaut une question de trop qu'une frappe dans un
// terminal. Sans liste envoyée par le serveur, la protection n'est pas activée. Avec la politique
// d'autorisation du 18/10/2026 (parametres.autorisation), toute application demande un accord.
async function verifierAccordClavier(parametres: Record<string, unknown>, verbe: string): Promise<string | null> {
  if (politiqueActive(parametres)) {
    const cible = await applicationAuPremierPlan();
    if (cible.statut === "classinus") return null;
    return controlerAutorisation("ecrire", parametres, {
      application: cible.statut === "identifiee" ? cible.application : null,
      titre: cible.titre,
    });
  }
  const liste = listeDepuisParametres(parametres);
  if (liste.length === 0) return null;
  const cible = await applicationAuPremierPlan();
  if (cible.statut === "classinus") return null;
  if (cible.statut === "identifiee" && !estApplicationProtegee(cible.application, liste)) return null;
  const nom = cible.titre?.trim() || cible.application || "une application que Classinus n'a pas pu identifier";
  return demanderAccord(`Clovis veut ${verbe} dans ${nom}. Autoriser cette fois ?`, nom, parametres);
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
        if (clicEnCours) return { erreur: "Un clic de Classinus est déjà en cours." };
        // Politique d'autorisation (18/10/2026) : le clic va dans l'application au premier plan.
        // Application normale déjà autorisée pour la tâche : pas de question à chaque clic.
        // Application sensible : la question revient avant chaque clic.
        if (politiqueActive(parametres)) {
          const devant = await applicationAuPremierPlan();
          if (devant.statut !== "classinus") {
            const refusClic = await controlerAutorisation("cliquer", parametres, {
              application: devant.statut === "identifiee" ? devant.application : null,
              titre: devant.titre,
            });
            if (refusClic) return { erreur: refusClic };
          }
        }
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
        const { keyboard, Key, getActiveWindow } = await import("@nut-tree-fork/nut-js");
        const texte = String(parametres.texte ?? "");
        if (!texte) return { erreur: "texte vide" };
        // 12/10/2026 : le modele doit dire dans quelle fenetre le texte va. Sans cela, rien
        // n'est tape (avant, le texte partait dans n'importe quelle fenetre au premier plan).
        const cible = cibleDepuisParametres(parametres);
        if (!cible) {
          return {
            erreur:
              "Texte NON tapé : tu n'as pas dit dans quelle fenêtre écrire (paramètre « cible »). Rien n'a été écrit. " +
              "Relis l'écran, puis recommence en donnant le titre de la fenêtre voulue.",
          };
        }
        await restaurerFocusSousSuperposition();
        // La vitesse et le traitement de l'indentation dépendent de l'application au
        // premier plan (voir frappeAdaptee.mts). Si son titre est illisible, frappe rapide.
        const lireFenetreActive = async (): Promise<{ identifiant: number | null; titre: string | null }> => {
          const fenetre = await getActiveWindow();
          // L'identifiant de la fenêtre ne change pas quand son titre change (étoile d'un
          // document non enregistré). Il n'est pas déclaré par la bibliothèque : lu avec prudence.
          const brut = (fenetre as unknown as { windowHandle?: unknown }).windowHandle;
          let titre: string | null = null;
          try { titre = await fenetre.getTitle(); } catch { titre = null; }
          return { identifiant: typeof brut === "number" ? brut : null, titre };
        };
        let depart: { identifiant: number | null; titre: string | null };
        try {
          depart = await lireFenetreActive();
        } catch {
          depart = { identifiant: null, titre: null };
        }
        // La fenêtre visée est-elle celle qui est devant ? Le titre d'abord (rapide), le nom du
        // programme seulement si le titre ne suffit pas.
        let bonneFenetre = cibleCorrespond(cible, depart.titre, null);
        if (!bonneFenetre) {
          const programme = await applicationAuPremierPlan();
          bonneFenetre = cibleCorrespond(cible, depart.titre, programme.application);
        }
        if (!bonneFenetre) {
          // 12/10/2026 (demande de Bourama) : la fenêtre visée n'est pas devant, l'étudiant
          // travaille ailleurs. On écrit dedans en arrière plan, sans clavier ni souris. Si
          // l'application ne le permet pas, Classinus prévient, passe la fenêtre devant et
          // écrit au clavier sans s'arrêter ; l'étudiant peut l'arrêter avec Échap.
          const issue = await ecrireDerriereOuBasculer(cible, texte, parametres, depart.titre);
          if (issue.fini) return issue.resultat;
          try {
            depart = await lireFenetreActive();
          } catch {
            depart = { identifiant: null, titre: null };
          }
          if (!cibleCorrespond(cible, depart.titre, null)) return { erreur: messageMauvaiseCible(cible, depart.titre) };
        }
        const titreFenetre = depart.titre;
        const refusClavier = await verifierAccordClavier(parametres, "écrire");
        if (refusClavier) return { erreur: refusClavier };
        // L'étudiant a-t-il gardé la main au clavier de Clovis ? Vérifié avant de commencer (l'accord
        // a pu durer longtemps) puis avant chaque bloc de texte. Trois signaux (13/10/2026) :
        // 1. l'identifiant de la fenêtre est le même qu'au départ ;
        // 2. son titre correspond encore à la cible (un autre onglet du navigateur garde le même
        //    identifiant mais change de titre) ; seulement si c'est le titre qui l'avait reconnue ;
        // 3. le pointeur n'a pas bougé de plus de quelques pixels : Clovis ne le déplace jamais
        //    pendant qu'il écrit, donc un mouvement vient de l'étudiant qui va dans un autre champ
        //    de la même fenêtre, ce que les deux premiers signaux ne voient pas.
        const reconnueParLeTitre = cibleCorrespond(cible, depart.titre, null);
        const pointeurDepart = screen.getCursorScreenPoint();
        const memeFenetreQueDepart = async (): Promise<boolean> => {
          try {
            if (pointeurDeplace(pointeurDepart, screen.getCursorScreenPoint())) return false;
            const maintenant = await lireFenetreActive();
            if (depart.identifiant !== null && maintenant.identifiant !== null) {
              if (depart.identifiant !== maintenant.identifiant) return false;
              return reconnueParLeTitre ? cibleCorrespond(cible, maintenant.titre, null) : true;
            }
            return cibleCorrespond(cible, maintenant.titre, null);
          } catch {
            return false;
          }
        };
        if (!(await memeFenetreQueDepart())) {
          let titreMaintenant: string | null = null;
          try { titreMaintenant = (await lireFenetreActive()).titre; } catch { titreMaintenant = null; }
          return { erreur: messageMauvaiseCible(cible, titreMaintenant) };
        }
        const garde = await obtenirGardeClavier();
        const resultat = await taperTexteAdapte({
          clavier: keyboard as unknown as Parameters<typeof taperTexteAdapte>[0]["clavier"],
          garde,
          entree: Key.Enter,
          maj: Key.LeftShift,
          debut: Key.Home,
          texte,
          titreFenetre,
          arretDemande: () => arretGlobal.arretDemande(),
          fenetreToujoursBonne: memeFenetreQueDepart,
          collage: creerCollage({
            presse: clipboard as unknown as PressePapiers,
            garde,
            ctrl: Key.LeftControl,
            v: Key.V,
          }),
        });
        // Arrêt demandé par l'étudiant (Échap) : prioritaire sur toute autre issue.
        if (arretGlobal.arretDemande()) return { erreur: MESSAGE_ARRET_GLOBAL };
        if (!resultat.ok && resultat.fenetreChangee) {
          const lignesTexte = nettoyerTexteFrappe(texte).split(/\r\n|\r|\n/);
          const total = lignesTexte.reduce((n, l) => n + Array.from(l).length, 0) + lignesTexte.length - 1;
          return { erreur: messageFrappeInterrompue(cible, resultat.tapes, total) };
        }
        if (!resultat.ok) return { erreur: resultat.erreur };
        return { ok: true };
      }
      case "appuyer_touches": {
        // Touches seules et raccourcis (ctrl+c, alt+tab, enter...), comme un
        // utilisateur. Une touche inconnue est refusee, jamais devinee.
        const analyse = analyserTouches(parametres.touches);
        if (!analyse.ok) return { erreur: analyse.erreur };
        const { keyboard, Key } = await import("@nut-tree-fork/nut-js");
        await restaurerFocusSousSuperposition();
        // Win+R (fenêtre Exécuter) demande toujours l'accord ; sinon on regarde où va le clavier.
        const refusTouches =
          (listeDepuisParametres(parametres).length > 0 || politiqueActive(parametres)) && combinaisonsOuvrentExecuter(analyse.combinaisons)
            ? await demanderAccord(
                "Clovis veut ouvrir la fenêtre Exécuter de Windows (Win+R). Autoriser cette fois ?",
                "la fenêtre Exécuter",
                parametres,
                // La fenêtre Exécuter lance n'importe quel programme : toujours sensible, la question revient à chaque fois.
                politiqueActive(parametres) ? { boutons: BOUTONS_SENSIBLE, risque: politiqueDepuisParametres(parametres).messageRisque } : undefined
              )
            : await verifierAccordClavier(parametres, "utiliser le clavier");
        if (refusTouches) return { erreur: refusTouches };
        // Sans ce réglage, la bibliothèque attend 300 ms après chaque touche.
        keyboard.config.autoDelayMs = DELAI_ENTRE_TOUCHES_MS;
        const garde = await obtenirGardeClavier();
        for (const noms of analyse.combinaisons) {
          if (arretGlobal.arretDemande()) return { erreur: MESSAGE_ARRET_GLOBAL };
          const touches = noms.map((nom) => (Key as unknown as Record<string, number>)[nom]);
          if (touches.some((t) => typeof t !== "number")) return { erreur: `touche non disponible sur ce système : ${noms.join("+")}` };
          // Chaque touche est enfoncée puis relâchée séparément, même en cas d'erreur
          // en cours de route : jamais de Ctrl, Alt, Maj ou Windows resté enfoncé.
          const resultat = await garde.combinaison(touches);
          if (!resultat.ok) return { erreur: resultat.erreur };
        }
        return { ok: true, combinaisons: analyse.combinaisons.map(libelleCombinaison) };
      }
      case "ouvrir_application": {
        const nom = String(parametres.nom ?? "").trim();
        if (!nom) return { erreur: "nom d'application vide" };
        if (politiqueActive(parametres)) {
          // Politique d'autorisation (18/10/2026) : toute ouverture demande l'accord de l'étudiant.
          const refusOuverture = await controlerAutorisation("ouvrir", parametres, { application: nom, titre: null });
          if (refusOuverture) return { erreur: refusOuverture };
        } else if (estApplicationProtegee(nom, listeDepuisParametres(parametres))) {
          const refusOuverture = await demanderAccord(`Clovis veut ouvrir ${nom}. Autoriser cette fois ?`, nom, parametres);
          if (refusOuverture) return { erreur: refusOuverture };
        }
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
        if (!("erreur" in lecture)) {
          // Politique d'autorisation (18/10/2026) : la lecture reste dans l'application PC tant que
          // l'étudiant n'a pas autorisé cette application, rien n'est donné à Clovis avant.
          const refusLecture = await controlerLecture(lecture, parametres);
          return refusLecture ? { erreur: refusLecture } : lecture;
        }
        // Fenetre choisie par son titre : en cas d'echec (introuvable, plusieurs, reduite), l'erreur
        // est rendue telle quelle. Le repli ci dessous donnerait le titre de la fenetre au premier
        // plan, qui n'est pas celle qu'on voulait lire.
        if (fenetreVoulueDepuisParametres(parametres)) return { erreur: lecture.erreur };

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
        // Même accord pour le titre seul : un titre de fenêtre peut déjà être sensible.
        if (!titreEstClassinus) {
          const refusTitre = await controlerLecture({ application: null, titre_fenetre_active: titre }, parametres);
          if (refusTitre) return { erreur: refusTitre };
        }
        return {
          titre_fenetre_active: titre,
          application: null,
          fenetre_classinus: false,
          fenetres_ouvertes: [],
          elements: [],
          coupe: false,
          mode: "titre_seul",
          zone_lue: zoneDepuisParametres(parametres),
          erreur_lecture: titreEstClassinus
            ? `${lecture.erreur} (la fenetre active est une fenetre de Classinus, son titre est ignore)`
            : lecture.erreur,
        };
      }
      case "demander_autorisation": {
        // Classinus a l'OBLIGATION (décision de Bourama, 18/10/2026) de demander lui-même une
        // autorisation avant une action qu'il sent sensible (payer, supprimer, envoyer). Même
        // bulle, deux choix seulement : la question revient à chaque fois, avec l'avertissement.
        const texte = String(parametres.texte ?? "").trim().slice(0, 300);
        if (!texte) return { erreur: "texte vide : dis à l'étudiant ce que tu veux faire et pourquoi." };
        const politique = politiqueDepuisParametres(parametres);
        const { refus } = await poserQuestion(texte, "cette action", parametres, {
          boutons: BOUTONS_SENSIBLE,
          risque: politique.messageRisqueAction,
        });
        return refus ? { erreur: refus } : { ok: true, autorise: true };
      }
      default:
        return { erreur: "Classinus ne reconnaît pas cette action sur l’ordinateur. Demande-lui d’utiliser une action disponible." };
    }
  } catch (e) {
    console.warn("Échec inattendu d’une action système Electron :", e);
    return { erreur: "Classinus n’a pas pu terminer cette action sur l’ordinateur. Vérifie que la fenêtre cible est disponible et que les autorisations nécessaires sont accordées, puis réessaie." };
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
    arretGlobal.desarmer();
    autorisations.refuserTout();
  }

  // Réponse de l'étudiant à une demande d'accord (bulle de la superposition). Une réponse
  // inconnue, en double ou tardive est ignorée.
  // 18/10/2026 : choix (cette_fois, toujours_appli, refuser) ; accepte reste lu pour une
  // interface plus ancienne qui n'envoie que Autoriser ou Refuser.
  async repondreAutorisation(options: { id: string; choix?: string; accepte?: boolean }): Promise<void> {
    autorisations.repondre(options.id, options.choix ?? options.accepte);
  }

  // Début d'une tâche de Clovis : Échap devient le raccourci d'arrêt. Renvoie arme=false
  // si une autre application avait déjà pris ce raccourci.
  async armerArretGlobal(): Promise<{ arme: boolean }> {
    notifierWeb = (evenement, donnees) => this.context.notifyListeners(evenement, donnees);
    // Nouvelle demande de l'étudiant : les accords "cette fois seulement" de la précédente tombent.
    accords.reinitialiserTache();
    if (!arretGlobalSurQuitEnregistre) {
      arretGlobalSurQuitEnregistre = true;
      app.on("will-quit", () => arretGlobal.desarmer());
    }
    return { arme: arretGlobal.armer() };
  }

  // Fin de la tâche : Échap redevient normal dans toutes les applications.
  async desarmerArretGlobal(): Promise<void> {
    arretGlobal.desarmer();
    accords.reinitialiserTache();
  }

  // Crayon, lot 3 : lit la fenetre au premier plan (meme lecture que lire_ecran, la fenetre de
  // superposition est ignoree) et rend TOUS les elements lus, ceux qui tombent dans les zones
  // entourees etant marques `entoure: true` (decision de Bourama, 11/10/2026 : le grand modele
  // doit voir tout ce que la lecture d'ecran lit, avec ce qui est entoure repere).
  // Les zones arrivent en pixels de la page de superposition.
  async lireElementsEntoures(options: { zones: unknown[] }): Promise<unknown> {
    const fenetre = fenetreSuperposition();
    if (!fenetre) return { erreur: "La superposition de Classinus n'est pas prête." };
    const versEcran = (p: { x: number; y: number }) =>
      process.platform === "win32" || process.platform === "linux"
        ? screen.dipToScreenPoint({ x: Math.round(p.x), y: Math.round(p.y) })
        : p;
    const origine = fenetre.getContentBounds();
    const zones = convertirZonesPageEnEcran(
      Array.isArray(options?.zones) ? options.zones : [],
      { x: origine.x, y: origine.y },
      fenetre.webContents.getZoomFactor(),
      versEcran
    );
    if (zones.length === 0) return { erreur: "Aucune zone entourée valide." };
    const lecture = await lireFenetreAuPremierPlan({ zones_entourees: zones }, handleSuperposition());
    if ("erreur" in lecture) return lecture;
    const entoures = new Set<unknown>(elementsDansZones(lecture.elements, zones));
    // Un champ ou un document dont le texte exact a ete lu sous le trait compte comme entoure,
    // meme si son centre tombe hors de la zone.
    return {
      ...lecture,
      elements: lecture.elements.map((e) => ({ ...e, entoure: entoures.has(e) || Boolean(e.texte_entoure) })),
      zones,
    };
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
  { name: "PontNatif", methods: ["enregistrerToken", "deconnexion", "rattraperActionsEnAttente", "executerActionSysteme", "armerArretGlobal", "desarmerArretGlobal", "repondreAutorisation", "lireElementsEntoures"] },
  PontNatifImpl
);
