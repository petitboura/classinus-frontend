"use client";

// Créé le 27/09/2026, Bourama : chantier "canal en direct sort de l'appli"
// (voir plan-canal-en-direct-pc.md), Lot R.
//
// Pont entre la fenêtre PRINCIPALE (vraie connexion WebSocket, DOM réel
// de la page Clovis, voir lib/canalAgentApplicatif.ts et AppShell.tsx) et
// la fenêtre de SUPERPOSITION (app/agent-superposition/page.tsx, montée
// séparément par electron/main.ts) via le plugin Capacitor Electron
// SuperpositionAgent (packages/capacitor-superposition-electron).
//
// Uniquement actif sur la plateforme "electron" -- web et mobile natif ne
// montent jamais de fenêtre de superposition, ce module ne fait donc
// jamais rien ailleurs (voir surElectron ci dessous).
//
// Volontairement un pont "bête" : la conversion des positions écran se
// fait côté plugin natif (voir plugin.mts), pas ici.

import { useEffect, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { ValeurCurseurVirtuel } from "@/lib/contexteCurseurVirtuel";
import {
  pousserJournalDepuisAgent,
  mettreAJourJournalDepuisAgent,
  afficherTexteDepuisAgent,
  type ValeurCanalEnDirect,
} from "@/lib/contexteCanalEnDirect";
import type { ContexteVoixDirecteValeur } from "@/lib/contexteVoixDirecte";
import { conversationActive } from "@/lib/conversationPartagee";

export interface MarqueEcranAffichee {
  id: string;
  forme: "entourer" | "souligner" | "surligner";
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  dureeMs: number;
}

export interface EtatSuperposition {
  marques?: MarqueEcranAffichee[];
  pointageId?: string;
  informationId?: string;
  curseur: { x: number; y: number; echelle: number; visible: boolean; forme: string; enAction: boolean };
  // Voix en direct (02/10/2026) : la session vit dans la fenêtre principale,
  // la superposition n'en reçoit que l'état et les niveaux sonores pour
  // dessiner la bulle de l'onde à côté du curseur, comme sur le site.
  voix?: { actif: boolean; etat: string; niveaux: { entree: number; sortie: number } };
  canal: {
    actif: boolean;
    modeInteraction: string;
    moteurDictee: string;
    dernierTexte: string | null;
    reponseVisible: boolean;
    derniereReponse: ValeurCanalEnDirect["derniereReponse"];
    conversationId: string | null;
    journal: ValeurCanalEnDirect["journal"];
    // Tâche en cours et interruption (02/10/2026, bouton arrêter), voir lib/tacheCanal.ts.
    tacheEnCours?: boolean;
    interrompue?: boolean;
  };
}

// Fréquence d'envoi des niveaux sonores vers la bulle de voix (environ 20 fois
// par seconde, l'onde lisse ensuite entre deux envois).
const INTERVALLE_NIVEAUX_VOIX_MS = 50;

interface ActionSuperposition {
  repere?: "page" | "ecran";
  fonction:
    | "basculerReponse"
    | "suspendreMasquageReponse"
    | "reprendreMasquageReponse"
    | "activer"
    | "desactiver"
    | "choisirModeInteraction"
    | "choisirMoteurDictee"
    | "envoyerMessageEtudiant"
    | "basculerVoix"
    | "arreterTache"
    | "continuerApresArret"
    | "reessayerApresArret"
    | "deposerCurseur";
  args: unknown[];
}

interface PluginSuperpositionAgent {
  accuserPointage(parametres: { id: string }): Promise<void>;
  accuserInformation(parametres: { id: string }): Promise<void>;
  pousserEtat(etat: { curseur?: Record<string, unknown>; [cle: string]: unknown }): Promise<void>;
  envoyerInteraction(action: ActionSuperposition): Promise<void>;
  definirCapturerSouris(parametres: { capturer: boolean }): Promise<void>;
  lireDemarrageAutomatique(): Promise<{ disponible: boolean; actif: boolean }>;
  definirDemarrageAutomatique(parametres: { actif: boolean }): Promise<void>;
  addListener(
    eventName: "etat" | "interaction",
    listenerFunc: (donnee: Record<string, unknown>) => void
  ): Promise<{ remove: () => void }>;
}

const SuperpositionAgent = registerPlugin<PluginSuperpositionAgent>("SuperpositionAgent");

export function surElectron(): boolean {
  return Capacitor.getPlatform() === "electron";
}

// Démarrage automatique de Classinus avec Windows (01/10/2026, demande
// Bourama), réglage des Paramètres (components/DemarrageAutomatiqueCarte.tsx).
// Appelés uniquement depuis la fenêtre principale sur Electron.
export function lireDemarrageAutomatique() {
  return SuperpositionAgent.lireDemarrageAutomatique();
}
export function definirDemarrageAutomatique(actif: boolean) {
  return SuperpositionAgent.definirDemarrageAutomatique({ actif });
}

// Contrôle le passe-clic de la fenêtre de superposition (voir
// electron/main.ts et plugin.mts). Appelé par app/agent-superposition/page.tsx
// depuis un hit-test sur [data-agent-superposition="true"] (attribut déjà
// posé sur le curseur virtuel, voir components/CurseurVirtuelAgent.tsx).
export function definirCapturerSourisSuperposition(capturer: boolean) {
  void SuperpositionAgent.definirCapturerSouris({ capturer });
}

/**
 * Utilisé par la fenêtre de SUPERPOSITION : relaie une interaction
 * utilisateur (glisser exclu, géré localement par framer-motion, voir le
 * commentaire de app/agent-superposition/page.tsx) vers la fenêtre
 * principale, qui appelle la vraie fonction correspondante.
 */
function relayerInteraction(fonction: ActionSuperposition["fonction"], ...args: unknown[]) {
  void SuperpositionAgent.envoyerInteraction({ fonction, args });
}

// Exporté pour lib/canalAgentApplicatif.ts (envoyerMessageEtudiant n'est
// pas une fonction du contexte, voir components/ControlesInteractionCanal.tsx
// et BulleDialogueAgent.tsx qui l'importent directement -- même relais,
// juste appelé depuis un autre fichier).
export function relayerEnvoiMessageEtudiant(texte: string) {
  relayerInteraction("envoyerMessageEtudiant", texte);
}

let dansLaFenetreDeSuperposition = false;
export function marquerFenetreSuperposition() {
  dansLaFenetreDeSuperposition = true;
}
export function estDansFenetreSuperposition(): boolean {
  return dansLaFenetreDeSuperposition ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/agent-superposition"));
}

/**
 * Monté une seule fois dans AppShell.tsx (fenêtre PRINCIPALE), juste
 * après useFournirCurseurVirtuel/useFournirCanalEnDirect. Pousse un
 * instantané à chaque changement pertinent (y compris les déplacements du
 * curseur, animés en continu par framer-motion) et écoute les
 * interactions relayées depuis la superposition.
 */
export function useEmetteurSuperposition(
  curseur: ValeurCurseurVirtuel,
  canal: ValeurCanalEnDirect,
  voix: ContexteVoixDirecteValeur | null = null
) {
  const refValeurs = useRef({ curseur, canal, voix });
  refValeurs.current = { curseur, canal, voix };
  const envoyerRef = useRef<(() => void) | null>(null);
  useJournalActionsSysteme();

  // Comme sur le site (ControlesInteractionCanal.tsx) : désactiver le canal
  // coupe la voix liée à sa conversation. Sur Electron, les contrôles vivent
  // dans la superposition, donc cette coupure doit se faire ici.
  const conversationCanal = canal.actif ? canal.conversationId : null;
  const fermerVoixPourConversation = voix?.fermerPourConversation;
  useEffect(() => {
    if (!surElectron()) return;
    return () => fermerVoixPourConversation?.(conversationCanal);
  }, [conversationCanal, fermerVoixPourConversation]);

  useEffect(() => {
    if (!surElectron()) return;

    let annule = false;
    let enAttente = false;
    const envoyer = () => {
      void SuperpositionAgent.pousserEtat({
        curseur: {
          x: curseur.x.get(),
          y: curseur.y.get(),
          echelle: curseur.echelle.get(),
          visible: curseur.visible,
          forme: curseur.forme,
          enAction: curseur.enAction,
          repere: curseur.repere?.get() ?? "page",
        },
        // Les niveaux ne servent qu'à la bulle du canal : hors canal actif,
        // inutile de lire la session à chaque envoi.
        voix: voix
          ? {
              actif: voix.actif,
              etat: voix.etat,
              niveaux: voix.actif && canal.actif ? voix.lireNiveaux() : { entree: 0, sortie: 0 },
            }
          : undefined,
        canal: {
          actif: canal.actif,
          modeInteraction: canal.modeInteraction,
          moteurDictee: canal.moteurDictee,
          dernierTexte: canal.dernierTexte,
          reponseVisible: canal.reponseVisible,
          derniereReponse: canal.derniereReponse,
          conversationId: canal.conversationId,
          journal: canal.journal,
          tacheEnCours: canal.tacheEnCours,
          interrompue: canal.interrompue,
        },
      });
    };

    // x, y et le repère changent ensemble : ne jamais envoyer une position
    // intermédiaire qui mélange des coordonnées page et écran.
    const pousser = () => {
      if (enAttente) return;
      enAttente = true;
      queueMicrotask(() => {
        enAttente = false;
        if (!annule) envoyer();
      });
    };

    envoyerRef.current = pousser;
    pousser();
    // deplacerVers anime x/y/echelle en continu (plusieurs fois par
    // trajectoire) : écouter ces MotionValue directement plutôt que de
    // dépendre d'un re-rendu React, sinon la superposition afficherait le
    // curseur uniquement au point d'arrivée.
    const retraitX = curseur.x.on("change", pousser);
    const retraitY = curseur.y.on("change", pousser);
    const retraitEchelle = curseur.echelle.on("change", pousser);
    const retraitRepere = curseur.repere?.on("change", pousser);
    return () => {
      annule = true;
      envoyerRef.current = null;
      retraitX();
      retraitY();
      retraitEchelle();
      retraitRepere?.();
    };
  }, [
    curseur,
    canal,
    voix?.actif,
    voix?.etat,
    curseur.visible,
    curseur.forme,
    curseur.enAction,
    canal.actif,
    canal.modeInteraction,
    canal.moteurDictee,
    canal.dernierTexte,
    canal.reponseVisible,
    canal.derniereReponse,
    canal.conversationId,
    canal.journal,
    canal.tacheEnCours,
    canal.interrompue,
  ]);

  // Niveaux sonores de la voix : tant que la bulle de voix est affichée dans
  // la superposition (voix et canal actifs), renvoyer l'état quelques fois par
  // seconde pour que l'onde suive la voix. Rien ne tourne autrement.
  const bulleVoixAffichee = surElectron() && Boolean(voix?.actif) && canal.actif;
  useEffect(() => {
    if (!bulleVoixAffichee) return;
    const minuteur = setInterval(() => envoyerRef.current?.(), INTERVALLE_NIVEAUX_VOIX_MS);
    return () => clearInterval(minuteur);
  }, [bulleVoixAffichee]);

  // Fenêtre principale quittée (déconnexion, page de connexion) : plus
  // personne ne répondrait au bouton permanent de la superposition, qui doit
  // donc disparaître. Il revient avec le premier état poussé à la prochaine
  // montée (voir plugin.mts, afficherSuperpositionPermanente).
  useEffect(() => {
    if (!surElectron()) return;
    return () => {
      void SuperpositionAgent.pousserEtat({ retirer: true });
    };
  }, []);

  useEffect(() => {
    if (!surElectron()) return;
    let retrait: (() => void) | undefined;
    let annule = false;
    SuperpositionAgent.addListener("interaction", (donnee) => {
      const { curseur: c, canal: k } = refValeurs.current;
      const action = donnee as unknown as ActionSuperposition;
      switch (action.fonction) {
        case "basculerReponse":
          k.basculerReponse();
          break;
        case "suspendreMasquageReponse":
          k.suspendreMasquageReponse();
          break;
        case "reprendreMasquageReponse":
          k.reprendreMasquageReponse();
          break;
        case "activer":
          k.activer(action.args[0] as string | undefined);
          break;
        case "desactiver":
          k.desactiver();
          break;
        case "choisirModeInteraction":
          k.choisirModeInteraction(action.args[0] as "voix" | "texte");
          break;
        case "choisirMoteurDictee":
          k.choisirMoteurDictee(action.args[0] as "whisper" | "navigateur");
          break;
        case "deposerCurseur":
          // Correctif 29/09/2026 : la superposition vient de deplacer le
          // curseur (glisser de l'etudiant). La fenetre principale garde
          // la position de reference et la repousse a chaque etat : sans
          // cette mise a jour, le curseur revenait a son ancienne place.
          // Le plugin indique le repère ; sur PC, garder une position écran
          // absolue évite de transporter le curseur avec la fenêtre Classinus.
          if (typeof action.args[0] === "number" && typeof action.args[1] === "number") {
            c.deposerPoint?.({ x: action.args[0], y: action.args[1] }, action.repere ?? "page");
          }
          break;
        case "basculerVoix":
          // Même appel que le bouton du canal sur le site : la conversation
          // partagée (celle du chat affiché) prime sur celle de la superposition.
          refValeurs.current.voix?.basculer(conversationActive() ?? ((action.args[0] as string | null | undefined) ?? null));
          break;
        case "arreterTache":
        case "continuerApresArret":
        case "reessayerApresArret":
          // Import dynamique, même raison que envoyerMessageEtudiant ci-dessous :
          // la tâche vit dans la fenêtre principale, la superposition ne fait que
          // relayer le clic.
          void import("@/lib/tacheCanal").then((m) => {
            if (action.fonction === "arreterTache") m.arreterTacheCanal();
            else if (action.fonction === "continuerApresArret") m.continuerTacheInterrompue();
            else m.reessayerTacheInterrompue();
          });
          break;
        case "envoyerMessageEtudiant":
          // Import dynamique : évite un cycle statique avec
          // canalAgentApplicatif.ts, qui importe relayerEnvoiMessageEtudiant
          // de ce fichier pour le sens inverse (voir plus haut).
          void import("@/lib/canalAgentApplicatif").then((m) => m.envoyerMessageEtudiant(action.args[0] as string));
          break;
        default:
          void c; // évite un avertissement "non utilisé" si aucun cas ci-dessus ne concerne le curseur pour l'instant
      }
    }).then((poignee) => {
      if (annule) poignee.remove();
      else retrait = () => poignee.remove();
    });
    return () => {
      annule = true;
      retrait?.();
    };
  }, []);
}

// Lot T (27/09/2026, voir plan-canal-en-direct-pc.md) : événement émis par
// le plugin PontNatif (packages/capacitor-pont-natif-electron) autour de
// chaque action système du lot S. Même plugin, même nom que celui déjà
// enregistré dans lib/supabase.ts (registerPlugin renvoie l'instance
// existante si le nom est déjà connu).
interface EvenementActionSysteme {
  id: string;
  phase: "debut" | "fin";
  description?: string;
  statut?: "succes" | "erreur";
}

interface PluginPontNatifEvenements {
  addListener(
    eventName: "actionSysteme",
    listenerFunc: (donnee: EvenementActionSysteme) => void
  ): Promise<{ remove: () => void }>;
}

/**
 * Monté dans la fenêtre PRINCIPALE (voir useEmetteurSuperposition) : traduit
 * chaque action système en entrée de journal + phrase de bulle, exactement
 * comme le fait lib/canalAgentApplicatif.ts pour un clic DOM. Le journal
 * vit ici (fenêtre principale) et arrive ensuite dans la superposition par
 * l'instantané habituel (Lot R) : rien de spécifique à faire côté
 * superposition, c'est ce qui garantit le même rendu pour l'étudiant.
 */
function useJournalActionsSysteme() {
  useEffect(() => {
    if (!surElectron()) return;
    const PontNatif = registerPlugin<PluginPontNatifEvenements>("PontNatif");
    const idsJournal = new Map<string, string>();
    let retrait: (() => void) | undefined;
    let annule = false;
    PontNatif.addListener("actionSysteme", (evenement) => {
      if (evenement.phase === "debut" && evenement.description) {
        const idJournal = pousserJournalDepuisAgent(evenement.description, "en_cours");
        if (idJournal) idsJournal.set(evenement.id, idJournal);
        afficherTexteDepuisAgent(evenement.description);
      } else if (evenement.phase === "fin") {
        const idJournal = idsJournal.get(evenement.id);
        if (idJournal) mettreAJourJournalDepuisAgent(idJournal, evenement.statut ?? "succes", evenement.description);
        idsJournal.delete(evenement.id);
      }
    }).then((poignee) => {
      if (annule) poignee.remove();
      else retrait = () => poignee.remove();
    });
    return () => {
      annule = true;
      retrait?.();
    };
  }, []);
}

/**
 * Monté une seule fois dans app/agent-superposition/page.tsx (fenêtre de
 * SUPERPOSITION) : reçoit les instantanés poussés par la fenêtre
 * principale et les stocke localement (voir le composant appelant pour
 * l'usage, useState + useEffect classique).
 */
export function ecouterEtatSuperposition(sur: (etat: EtatSuperposition) => void): () => void {
  let retrait: (() => void) | undefined;
  let annule = false;
  SuperpositionAgent.addListener("etat", (donnee) => {
    sur(donnee as unknown as EtatSuperposition);
    if (typeof donnee.pointageId === "string") {
      const id = donnee.pointageId;
      requestAnimationFrame(() => { void SuperpositionAgent.accuserPointage({ id }); });
    }
    if (typeof donnee.informationId === "string") {
      const id = donnee.informationId;
      requestAnimationFrame(() => requestAnimationFrame(() => { void SuperpositionAgent.accuserInformation({ id }); }));
    }
  }).then((poignee) => {
    if (annule) poignee.remove();
    else retrait = () => poignee.remove();
  });
  return () => {
    annule = true;
    retrait?.();
  };
}

export const interactionsSuperposition = {
  // Position locale à la superposition, convertie en écran absolu par le plugin.
  deposerCurseur: (x: number, y: number) => relayerInteraction("deposerCurseur", x, y),
  basculerReponse: () => relayerInteraction("basculerReponse"),
  suspendreMasquageReponse: () => relayerInteraction("suspendreMasquageReponse"),
  reprendreMasquageReponse: () => relayerInteraction("reprendreMasquageReponse"),
  activer: (conversationId?: string) => relayerInteraction("activer", conversationId),
  desactiver: () => relayerInteraction("desactiver"),
  choisirModeInteraction: (mode: "voix" | "texte") => relayerInteraction("choisirModeInteraction", mode),
  choisirMoteurDictee: (moteur: "whisper" | "navigateur") => relayerInteraction("choisirMoteurDictee", moteur),
  basculerVoix: (conversationId: string | null) => relayerInteraction("basculerVoix", conversationId),
  arreterTache: () => relayerInteraction("arreterTache"),
  continuerApresArret: () => relayerInteraction("continuerApresArret"),
  reessayerApresArret: () => relayerInteraction("reessayerApresArret"),
};
