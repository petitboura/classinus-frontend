"use client";

// Editeur de code piloté par l'IA (28/09/2026, demande Bourama) : registre
// entre l'éditeur monté à l'écran (components/bureau/EditeurCode.tsx, via
// lib/usePontEditeurAgent.ts) et le canal en direct (lib/canalEditeurAgent.ts
// et lib/canalAgentApplicatif.ts). Un seul éditeur est monté à la fois.

import type { OperationEcritureEditeur } from "./operationsEditeurAgent";

export type EtatEditeurAgent = {
  langage: string;
  nom_fichier: string | null;
  plein_ecran: boolean;
};

export type LectureEditeurAgent = EtatEditeurAgent & {
  code: string;
  derniere_execution: { lignes: string[]; erreur: string | null };
};

export type PontEditeurAgent = {
  etat: () => EtatEditeurAgent;
  lire: () => LectureEditeurAgent;
  ecrire: (operation: OperationEcritureEditeur) => Promise<{ nbLignes: number }>;
  montrer: (debut: number, fin: number) => Promise<HTMLElement | null>;
};

let pontCourant: PontEditeurAgent | null = null;
const ecouteurs = new Set<() => void>();

function prevenir() {
  ecouteurs.forEach((fn) => fn());
}

export function enregistrerPontEditeur(pont: PontEditeurAgent | null) {
  pontCourant = pont;
  prevenir();
}

export function obtenirPontEditeur(): PontEditeurAgent | null {
  return pontCourant;
}

// Poussé au serveur avec la liste des éléments de l'écran : null quand
// aucun éditeur n'est monté ici.
export function obtenirEtatEditeurPourCanal(): EtatEditeurAgent | null {
  return pontCourant ? pontCourant.etat() : null;
}

// Appelé quand le langage, le fichier ou le plein écran change, pour que le
// serveur repousse l'état sans attendre un autre changement de l'écran.
export function signalerChangementEtatEditeur() {
  prevenir();
}

export function ecouterEtatEditeur(fn: () => void): () => void {
  ecouteurs.add(fn);
  return () => {
    ecouteurs.delete(fn);
  };
}
