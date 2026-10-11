"use client";

// Texte en cours de saisie dans le champ du canal en direct (11/10/2026, crayon du canal) :
// partagé pour que le bouton Envoyer du crayon puisse y reprendre la question de
// l'étudiant. Un module par fenêtre : la superposition et la fenêtre principale ont
// chacune leur champ.

import { useSyncExternalStore } from "react";

let brouillon = "";
const abonnes = new Set<() => void>();

export function lireBrouillonCanal(): string {
  return brouillon;
}

export function definirBrouillonCanal(valeur: string | ((precedent: string) => string)) {
  const suivant = typeof valeur === "function" ? valeur(brouillon) : valeur;
  if (suivant === brouillon) return;
  brouillon = suivant;
  abonnes.forEach((a) => a());
}

function abonner(sur: () => void): () => void {
  abonnes.add(sur);
  return () => {
    abonnes.delete(sur);
  };
}

export function useBrouillonCanal(): string {
  return useSyncExternalStore(abonner, lireBrouillonCanal, () => "");
}
