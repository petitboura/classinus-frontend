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

export interface EtatSuperposition {
  curseur: { x: number; y: number; echelle: number; visible: boolean; forme: string; enAction: boolean };
  canal: {
    actif: boolean;
    modeInteraction: string;
    moteurDictee: string;
    dernierTexte: string | null;
    reponseVisible: boolean;
    derniereReponse: ValeurCanalEnDirect["derniereReponse"];
    conversationId: string | null;
    journal: ValeurCanalEnDirect["journal"];
  };
}

interface ActionSuperposition {
  fonction:
    | "basculerReponse"
    | "suspendreMasquageReponse"
    | "reprendreMasquageReponse"
    | "activer"
    | "desactiver"
    | "choisirModeInteraction"
    | "choisirMoteurDictee"
    | "envoyerMessageEtudiant";
  args: unknown[];
}

interface PluginSuperpositionAgent {
  pousserEtat(etat: { curseur?: Record<string, unknown>; [cle: string]: unknown }): Promise<void>;
  envoyerInteraction(action: ActionSuperposition): Promise<void>;
  definirCapturerSouris(parametres: { capturer: boolean }): Promise<void>;
  addListener(
    eventName: "etat" | "interaction",
    listenerFunc: (donnee: Record<string, unknown>) => void
  ): Promise<{ remove: () => void }>;
}

const SuperpositionAgent = registerPlugin<PluginSuperpositionAgent>("SuperpositionAgent");

export function surElectron(): boolean {
  return Capacitor.getPlatform() === "electron";
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
  return dansLaFenetreDeSuperposition;
}

/**
 * Monté une seule fois dans AppShell.tsx (fenêtre PRINCIPALE), juste
 * après useFournirCurseurVirtuel/useFournirCanalEnDirect. Pousse un
 * instantané à chaque changement pertinent (y compris les déplacements du
 * curseur, animés en continu par framer-motion) et écoute les
 * interactions relayées depuis la superposition.
 */
export function useEmetteurSuperposition(curseur: ValeurCurseurVirtuel, canal: ValeurCanalEnDirect) {
  const refValeurs = useRef({ curseur, canal });
  refValeurs.current = { curseur, canal };
  useJournalActionsSysteme();

  useEffect(() => {
    if (!surElectron()) return;

    const pousser = () => {
      void SuperpositionAgent.pousserEtat({
        curseur: {
          x: curseur.x.get(),
          y: curseur.y.get(),
          echelle: curseur.echelle.get(),
          visible: curseur.visible,
          forme: curseur.forme,
          enAction: curseur.enAction,
        },
        canal: {
          actif: canal.actif,
          modeInteraction: canal.modeInteraction,
          moteurDictee: canal.moteurDictee,
          dernierTexte: canal.dernierTexte,
          reponseVisible: canal.reponseVisible,
          derniereReponse: canal.derniereReponse,
          conversationId: canal.conversationId,
          journal: canal.journal,
        },
      });
    };

    pousser();
    // deplacerVers anime x/y/echelle en continu (plusieurs fois par
    // trajectoire) : écouter ces MotionValue directement plutôt que de
    // dépendre d'un re-rendu React, sinon la superposition afficherait le
    // curseur uniquement au point d'arrivée.
    const retraitX = curseur.x.on("change", pousser);
    const retraitY = curseur.y.on("change", pousser);
    const retraitEchelle = curseur.echelle.on("change", pousser);
    return () => {
      retraitX();
      retraitY();
      retraitEchelle();
    };
  }, [
    curseur,
    canal,
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
  ]);

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
        if (idJournal) mettreAJourJournalDepuisAgent(idJournal, evenement.statut ?? "succes");
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
  basculerReponse: () => relayerInteraction("basculerReponse"),
  suspendreMasquageReponse: () => relayerInteraction("suspendreMasquageReponse"),
  reprendreMasquageReponse: () => relayerInteraction("reprendreMasquageReponse"),
  activer: (conversationId?: string) => relayerInteraction("activer", conversationId),
  desactiver: () => relayerInteraction("desactiver"),
  choisirModeInteraction: (mode: "voix" | "texte") => relayerInteraction("choisirModeInteraction", mode),
  choisirMoteurDictee: (moteur: "whisper" | "navigateur") => relayerInteraction("choisirMoteurDictee", moteur),
};
