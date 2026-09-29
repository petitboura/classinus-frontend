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

// CORRECTIF (29/09/2026, bug réel signalé par Bourama -- le canal en
// direct répondait "éditeur fermé" alors que l'étudiant l'avait sous les
// yeux, code affiché) : lib/canalAgentApplicatif.ts est chargé par
// `import("./canalAgentApplicatif")` (import dynamique, depuis
// lib/supabase.ts), alors que ce fichier-ci est importé aussi bien depuis
// ce chunk dynamique (via canalEditeurAgent.ts) que depuis le chunk
// statique de la page /bureau/editeur (via usePontEditeurAgent.ts). Next.js
// a fini par générer DEUX exemplaires de ce module, chacun avec son propre
// `let pontCourant` -- l'éditeur enregistrait le pont dans un exemplaire,
// le canal lisait l'autre, resté vide pour toujours. `window` est le seul
// objet garanti partagé entre tous les chunks d'une même page : l'état vit
// donc ici, jamais dans une variable de module.
type RegistrePontEditeurAgent = {
  pont: PontEditeurAgent | null;
  ecouteurs: Set<() => void>;
};

function registre(): RegistrePontEditeurAgent {
  const w = window as unknown as { __pontEditeurAgent?: RegistrePontEditeurAgent };
  if (!w.__pontEditeurAgent) {
    w.__pontEditeurAgent = { pont: null, ecouteurs: new Set() };
  }
  return w.__pontEditeurAgent;
}

function prevenir() {
  registre().ecouteurs.forEach((fn) => fn());
}

export function enregistrerPontEditeur(pont: PontEditeurAgent | null) {
  registre().pont = pont;
  prevenir();
}

export function obtenirPontEditeur(): PontEditeurAgent | null {
  return registre().pont;
}

// Poussé au serveur avec la liste des éléments de l'écran : null quand
// aucun éditeur n'est monté ici.
export function obtenirEtatEditeurPourCanal(): EtatEditeurAgent | null {
  const pont = registre().pont;
  return pont ? pont.etat() : null;
}

// Appelé quand le langage, le fichier ou le plein écran change, pour que le
// serveur repousse l'état sans attendre un autre changement de l'écran.
export function signalerChangementEtatEditeur() {
  prevenir();
}

export function ecouterEtatEditeur(fn: () => void): () => void {
  registre().ecouteurs.add(fn);
  return () => {
    registre().ecouteurs.delete(fn);
  };
}
