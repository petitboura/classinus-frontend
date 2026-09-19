"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantier I. État global du canal
// en direct de l'agent applicatif -- monté une seule fois au niveau
// du layout racine (voir AppShell.tsx), au dessus du router, jamais
// démonté en changeant de section. Même séparation état/rendu que le
// reste du chantier agent applicatif (ContexteCurseurVirtuel) :
// l'état vit ici, le rendu de la bulle de dialogue (chantier J) et du
// bouton journal (chantier K) vit dans des composants séparés qui
// consomment ce contexte.
//
// Porte trois choses, toutes indépendantes les unes des autres :
// - actif : le canal en direct est-il activé pour cette session
//   (chantier L, bouton d'activation) ;
// - dernierTexte : le texte que Clovis a le plus récemment à dire à
//   l'user (chantier J, bulle qui suit le curseur) -- null quand il
//   n'y a rien à afficher, la bulle reste alors fermée ;
// - journal : historique des actions/outils exécutés pendant la
//   session en cours (chantier K, bouton dédié).
//
// Décision Bourama (19/09/2026) : pas de persistance à travers un
// rechargement complet de page pour la v1 -- tout ce state repart de
// zéro à chaque ouverture de l'app, cohérent avec le reste du
// chantier.

import { createContext, useCallback, useContext, useRef, useState } from "react";

// "refuse" retiré (19/09/2026) : plus aucune confirmation ne peut
// produire cet état, voir lib/canalAgentApplicatif.ts.
export type StatutEntreeJournal = "en_cours" | "succes" | "erreur";

export type EntreeJournalCanal = {
  id: string;
  description: string;
  statut: StatutEntreeJournal;
  horodatage: number;
};

export type ValeurCanalEnDirect = {
  actif: boolean;
  activer: () => void;
  desactiver: () => void;

  dernierTexte: string | null;
  // Remplace le texte affiché ; horodatage inclus pour que la bulle
  // (chantier J) puisse redémarrer une animation même si le nouveau
  // texte est identique au précédent.
  afficherTexte: (texte: string) => void;
  effacerTexte: () => void;

  journal: EntreeJournalCanal[];
  // Renvoie l'id généré, pour permettre un appel ultérieur à
  // mettreAJourEntreeJournal (ex: "en_cours" -> "succes" une fois
  // l'action terminée), sans que l'appelant ait à générer l'id lui
  // même.
  ajouterEntreeJournal: (description: string, statut?: StatutEntreeJournal) => string;
  mettreAJourEntreeJournal: (id: string, statut: StatutEntreeJournal) => void;
};

export const ContexteCanalEnDirect = createContext<ValeurCanalEnDirect | null>(null);

export function useCanalEnDirect(): ValeurCanalEnDirect {
  const contexte = useContext(ContexteCanalEnDirect);
  if (!contexte) {
    throw new Error("useCanalEnDirect doit être utilisé sous AppShell (ContexteCanalEnDirect.Provider)");
  }
  return contexte;
}

// Pont vers les modules hors React (lib/canalAgentApplicatif.ts et,
// plus tard, chantiers O/P) -- même principe que
// enregistrerDeplacementCurseur dans lib/contexteCurseurVirtuel.tsx.
// AppShell.tsx enregistre la vraie valeur dès que le Provider est monté.
let canalGlobal: ValeurCanalEnDirect | null = null;

export function enregistrerCanalEnDirect(valeur: ValeurCanalEnDirect) {
  canalGlobal = valeur;
}

/**
 * Si aucun Provider n'est encore monté (cas très rare), no-op silencieux
 * plutôt que de faire planter l'appelant -- même défaut prudent que les
 * autres ponts de ce chantier.
 */
export function pousserJournalDepuisAgent(description: string, statut?: StatutEntreeJournal): string | null {
  if (!canalGlobal) return null;
  return canalGlobal.ajouterEntreeJournal(description, statut);
}

export function mettreAJourJournalDepuisAgent(id: string, statut: StatutEntreeJournal) {
  canalGlobal?.mettreAJourEntreeJournal(id, statut);
}

export function afficherTexteDepuisAgent(texte: string) {
  canalGlobal?.afficherTexte(texte);
}

let compteurEntreeJournal = 0;

export function useFournirCanalEnDirect(): ValeurCanalEnDirect {
  const [actif, setActif] = useState(false);
  const [dernierTexte, setDernierTexte] = useState<string | null>(null);
  const [journal, setJournal] = useState<EntreeJournalCanal[]>([]);
  // Ref plutôt que de dépendre de `journal` dans les callbacks : évite
  // de recréer ajouterEntreeJournal/mettreAJourEntreeJournal à chaque
  // changement de journal.
  const journalRef = useRef<EntreeJournalCanal[]>([]);
  // Délai avant effacement automatique du texte affiché : la bulle
  // (chantier J) n'est pas persistante par nature -- personne ne
  // l'appelle explicitement pour la refermer, donc c'est ici que ça se
  // passe. Un nouveau texte reporte le délai plutôt que de s'ajouter au
  // précédent.
  const minuteurEffacement = useRef<ReturnType<typeof setTimeout> | null>(null);
  const DUREE_AFFICHAGE_MS = 5000;

  const activer = useCallback(() => setActif(true), []);
  const desactiver = useCallback(() => setActif(false), []);

  const effacerTexte = useCallback(() => {
    if (minuteurEffacement.current) clearTimeout(minuteurEffacement.current);
    minuteurEffacement.current = null;
    setDernierTexte(null);
  }, []);

  const afficherTexte = useCallback((texte: string) => {
    if (minuteurEffacement.current) clearTimeout(minuteurEffacement.current);
    setDernierTexte(texte);
    minuteurEffacement.current = setTimeout(() => {
      minuteurEffacement.current = null;
      setDernierTexte(null);
    }, DUREE_AFFICHAGE_MS);
  }, []);

  const ajouterEntreeJournal = useCallback((description: string, statut: StatutEntreeJournal = "en_cours"): string => {
    compteurEntreeJournal += 1;
    const id = `journal-${compteurEntreeJournal}`;
    const entree: EntreeJournalCanal = { id, description, statut, horodatage: Date.now() };
    journalRef.current = [...journalRef.current, entree];
    setJournal(journalRef.current);
    return id;
  }, []);

  const mettreAJourEntreeJournal = useCallback((id: string, statut: StatutEntreeJournal) => {
    journalRef.current = journalRef.current.map((e) => (e.id === id ? { ...e, statut } : e));
    setJournal(journalRef.current);
  }, []);

  return {
    actif,
    activer,
    desactiver,
    dernierTexte,
    afficherTexte,
    effacerTexte,
    journal,
    ajouterEntreeJournal,
    mettreAJourEntreeJournal,
  };
}
