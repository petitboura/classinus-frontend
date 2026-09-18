"use client";

// Chantier E (agent applicatif, voir plan-agent-applicatif-clovis.md).
// Dépend du chantier A (obtenirActionsDisponibles renvoie déjà le champ
// `sensible` par action). Même séparation état/rendu que
// lib/contexteCurseurVirtuel.tsx : l'état de la demande en cours vit
// ici, le rendu de la fenêtre vit dans
// components/ConfirmationActionAgentModal.tsx.
//
// Décision Bourama : la confirmation d'une action se fait TOUJOURS par
// une fenêtre avec un bouton, jamais par une question posée en texte
// libre dans le chat. `demanderConfirmation` est le seul point d'entrée
// pour ça -- lib/canalAgentApplicatif.ts l'appelle avant d'exécuter tout
// élément détecté par le scan générique (lib/scanElementsInteractifs.ts),
// systématiquement sensible par défaut, sans exception.

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type DemandeConfirmation = { description: string };

export type ValeurConfirmationAction = {
  demandeEnCours: DemandeConfirmation | null;
  demanderConfirmation: (description: string) => Promise<boolean>;
  repondre: (accepte: boolean) => void;
};

export const ContexteConfirmationAction = createContext<ValeurConfirmationAction | null>(null);

export function useConfirmationAction(): ValeurConfirmationAction {
  const contexte = useContext(ContexteConfirmationAction);
  if (!contexte) {
    throw new Error("useConfirmationAction doit être utilisé sous AppShell (ContexteConfirmationAction.Provider)");
  }
  return contexte;
}

// Pont vers lib/canalAgentApplicatif.ts (chantier C), qui n'est pas un
// composant React et ne peut donc pas appeler useConfirmationAction()
// directement -- même principe que enregistrerPluginDossiers dans
// lib/canalTempsReel.ts. AppShell.tsx enregistre la vraie fonction dès
// que le Provider est monté (voir useEffect dans AppShell.tsx).
// Interrupteur central : false = confirmation désactivée, true = modal active.
// Le système de confirmation, son contexte et sa fenêtre restent présents.
// Pour réactiver la confirmation, passer simplement cette valeur à true.
export const CONFIRMATION_ACTION_ACTIVE = false;

let demandeurGlobal: ((description: string) => Promise<boolean>) | null = null;

export function enregistrerDemandeurConfirmation(fn: (description: string) => Promise<boolean>) {
  demandeurGlobal = fn;
}

/**
 * Point d'entrée unique utilisé par l'agent applicatif avant une exécution.
 * Quand la confirmation est désactivée, l'action est autorisée directement.
 * Quand elle est activée, le comportement existant (Provider + modal) reste
 * inchangé, y compris le refus sécurisé si le Provider n'est pas monté.
 */
export function demanderConfirmationDepuisAgent(description: string): Promise<boolean> {
  if (!CONFIRMATION_ACTION_ACTIVE) return Promise.resolve(true);
  if (!demandeurGlobal) return Promise.resolve(false);
  return demandeurGlobal(description);
}

export function useFournirConfirmationAction(): ValeurConfirmationAction {
  const [demandeEnCours, setDemandeEnCours] = useState<DemandeConfirmation | null>(null);
  // Une seule demande à la fois quand la confirmation est active (décision implicite du plan : aucune
  // mention d'empilement de confirmations) -- une nouvelle demande alors
  // qu'une autre est déjà affichée annule silencieusement la précédente
  // (refuse) plutôt que de les empiler ou de perdre la référence de
  // résolution.
  const resolveRef = useRef<((accepte: boolean) => void) | null>(null);

  const demanderConfirmation = useCallback((description: string): Promise<boolean> => {
    if (!CONFIRMATION_ACTION_ACTIVE) return Promise.resolve(true);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDemandeEnCours({ description });
    });
  }, []);

  const repondre = useCallback((accepte: boolean) => {
    resolveRef.current?.(accepte);
    resolveRef.current = null;
    setDemandeEnCours(null);
  }, []);

  return { demandeEnCours, demanderConfirmation, repondre };
}
