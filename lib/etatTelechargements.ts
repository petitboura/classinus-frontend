"use client";

import { useEffect, useSyncExternalStore } from "react";

// Suivi central des téléchargements (10/10/2026, demande Bourama : afficher
// l'avancement en pourcentage partout et informer quand un téléchargement
// échoue). lib/telecharger.ts écrit ici, chaque bouton lit ici par l'adresse
// du fichier : un seul endroit à tenir à jour, quel que soit le bouton qui
// déclenche le téléchargement.

export type StatutTelechargement = "encours" | "reussi" | "echec";

export type EtatTelechargement = {
  statut: StatutTelechargement;
  // null tant que la taille totale est inconnue (barre indéterminée).
  pourcentage: number | null;
  // Message prêt à afficher, renseigné seulement quand statut === "echec".
  erreur: string | null;
  // Nom du fichier et action de relance, pour la carte globale (voir
  // components/IndicateurTelechargements.tsx) quand aucun bouton ne suit ce
  // téléchargement (clic sur un lien du chat, téléchargement d'une sélection).
  nom?: string;
  relancer?: () => void;
};

export type EntreeTelechargement = EtatTelechargement & { cle: string };

// Une réussite reste visible un court instant (coche), puis le bouton
// retrouve son état normal. Un échec reste affiché jusqu'au prochain essai.
const DUREE_REUSSITE_MS = 2500;

const etats = new Map<string, EtatTelechargement>();
const ecouteurs = new Set<() => void>();
const minuteurs = new Map<string, ReturnType<typeof setTimeout>>();

// Boutons actuellement affichés qui suivent un téléchargement donné : tant
// qu'il y en a un, la carte globale n'affiche pas ce téléchargement (le bouton
// montre déjà le pourcentage et l'échec), pour ne pas dire deux fois la même chose.
const suivisParBouton = new Map<string, number>();

let liste: EntreeTelechargement[] = [];

function recalculerListe() {
  liste = [];
  etats.forEach((etat, cle) => {
    if (!suivisParBouton.get(cle)) liste.push({ ...etat, cle });
  });
}

function notifier() {
  recalculerListe();
  ecouteurs.forEach((ecouteur) => ecouteur());
}

function annulerMinuteur(cle: string) {
  const minuteur = minuteurs.get(cle);
  if (minuteur) {
    clearTimeout(minuteur);
    minuteurs.delete(cle);
  }
}

export function lireEtatTelechargement(cle: string): EtatTelechargement | undefined {
  return etats.get(cle);
}

export function definirEtatTelechargement(cle: string, etat: EtatTelechargement | undefined) {
  const actuel = etats.get(cle);
  if (
    actuel &&
    etat &&
    actuel.statut === etat.statut &&
    actuel.pourcentage === etat.pourcentage &&
    actuel.erreur === etat.erreur &&
    actuel.nom === etat.nom
  ) {
    return;
  }
  annulerMinuteur(cle);
  if (etat) etats.set(cle, etat);
  else etats.delete(cle);

  if (etat?.statut === "reussi") {
    minuteurs.set(
      cle,
      setTimeout(() => {
        minuteurs.delete(cle);
        if (etats.get(cle)?.statut === "reussi") {
          etats.delete(cle);
          notifier();
        }
      }, DUREE_REUSSITE_MS)
    );
  }
  notifier();
}

function abonner(ecouteur: () => void) {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}

// Lit l'état d'un téléchargement par son adresse. `undefined` : rien en cours
// pour ce fichier, le bouton garde son apparence normale.
export function useEtatTelechargement(cle: string | null | undefined): EtatTelechargement | undefined {
  return useSyncExternalStore(
    abonner,
    () => (cle ? etats.get(cle) : undefined),
    () => undefined
  );
}

// À appeler par tout bouton qui affiche l'état d'un téléchargement : signale à
// la carte globale qu'elle n'a pas à le répéter tant que ce bouton est à l'écran.
export function useSuiviParBouton(cle: string | null | undefined) {
  useEffect(() => {
    if (!cle) return;
    suivisParBouton.set(cle, (suivisParBouton.get(cle) ?? 0) + 1);
    notifier();
    return () => {
      const restant = (suivisParBouton.get(cle) ?? 1) - 1;
      if (restant <= 0) suivisParBouton.delete(cle);
      else suivisParBouton.set(cle, restant);
      notifier();
    };
  }, [cle]);
}

// Téléchargements en cours ou échoués que la carte globale doit montrer.
export function useTelechargementsSansBouton(): EntreeTelechargement[] {
  return useSyncExternalStore(
    abonner,
    () => liste,
    () => []
  );
}

// Retire un téléchargement de la liste (fermeture manuelle d'un échec).
export function oublierTelechargement(cle: string) {
  definirEtatTelechargement(cle, undefined);
}
