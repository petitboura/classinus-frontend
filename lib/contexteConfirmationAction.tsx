"use client";

// Chantier E (agent applicatif, voir plan-agent-applicatif-clovis.md).
// Dépend du chantier A (obtenirActionsDisponibles renvoie déjà le champ
// `sensible` par action). Même séparation état/rendu que
// lib/contexteCurseurVirtuel.tsx : l'état de la demande en cours vit
// ici, le rendu de la fenêtre vit dans
// components/ConfirmationActionAgentModal.tsx.
//
// Décision Bourama : la confirmation d'une action sensible se fait
// TOUJOURS par une fenêtre avec un bouton, jamais par une question posée
// en texte libre dans le chat. `demanderConfirmation` est le seul point
// d'entrée pour ça -- les chantiers C (outil MCP) et F (mode générique)
// l'appelleront avant d'exécuter toute action sensible ou non qualifiée
// (sensible par défaut, voir lib/actionsApplicatives.ts).

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

export function useFournirConfirmationAction(): ValeurConfirmationAction {
  const [demandeEnCours, setDemandeEnCours] = useState<DemandeConfirmation | null>(null);
  // Une seule demande à la fois (décision implicite du plan : aucune
  // mention d'empilement de confirmations) -- une nouvelle demande alors
  // qu'une autre est déjà affichée annule silencieusement la précédente
  // (refuse) plutôt que de les empiler ou de perdre la référence de
  // résolution.
  const resolveRef = useRef<((accepte: boolean) => void) | null>(null);

  const demanderConfirmation = useCallback((description: string): Promise<boolean> => {
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
