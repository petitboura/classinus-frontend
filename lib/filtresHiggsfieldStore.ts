"use client";

import { useSyncExternalStore } from "react";

// Etat des filtres Higgsfield partage avec le bouton Filtres de l'en-tete.
// Le bouton ecoute ce magasin au lieu d'etre recree a chaque changement.

export type EtatFiltresHiggsfield = {
  ouvert: boolean;
  actif: boolean;
  badge: number;
  basculer: () => void;
};

const etatInitial: EtatFiltresHiggsfield = {
  ouvert: false,
  actif: false,
  badge: 0,
  basculer: () => {},
};

let etat: EtatFiltresHiggsfield = etatInitial;
const ecouteurs = new Set<() => void>();

function lire() {
  return etat;
}

function abonner(ecouteur: () => void) {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}

export function ecrireEtatFiltres(nouvel: EtatFiltresHiggsfield) {
  const egal =
    etat.ouvert === nouvel.ouvert &&
    etat.actif === nouvel.actif &&
    etat.badge === nouvel.badge &&
    etat.basculer === nouvel.basculer;
  if (egal) return;
  etat = nouvel;
  ecouteurs.forEach((ecouteur) => ecouteur());
}

export function useEtatFiltresHiggsfield(): EtatFiltresHiggsfield {
  return useSyncExternalStore(abonner, lire, lire);
}
