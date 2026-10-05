// Créé le 02/10/2026, Bourama : bouton « arrêter » du canal en direct. Garde, hors
// de React, l'état de la tâche en cours pour que le canal puisse la couper comme
// le fait le chat, et proposer Continuer ou Réessayer dans la bulle quand elle a
// été interrompue.
//
// Deux sources peuvent alimenter cet état :
// - "tour_direct" : un message envoyé depuis le canal sans chat à l'écran
//   (lib/canalAgentApplicatif.ts, envoyerTourCanalDirect) ;
// - "chat" : la génération du chat quand il est à l'écran (components/chat/ChatIA.tsx).
// Le canal n'a pas à savoir laquelle tourne : arreterTacheCanal coupe celle qui est
// en cours, continuer et réessayer relancent celle qui a été interrompue.

export type SourceTache = "tour_direct" | "chat";

type EtatSource = {
  enCours: boolean;
  interrompue: boolean;
  arreter?: () => void;
  continuer?: () => void;
  reessayer?: () => void;
};

export type EtatTacheCanal = { enCours: boolean; interrompue: boolean };

const ETAT_REPOS: EtatTacheCanal = { enCours: false, interrompue: false };

const sources = new Map<SourceTache, EtatSource>();
const ecouteurs = new Set<() => void>();
// Même objet tant que rien ne change : useSyncExternalStore compare par référence.
let instantane: EtatTacheCanal = ETAT_REPOS;

function recalculer() {
  const valeurs = [...sources.values()];
  const enCours = valeurs.some((v) => v.enCours);
  // Une tâche en cours masque toujours l'interruption précédente.
  const interrompue = !enCours && valeurs.some((v) => v.interrompue);
  if (enCours === instantane.enCours && interrompue === instantane.interrompue) return;
  instantane = enCours || interrompue ? { enCours, interrompue } : ETAT_REPOS;
  ecouteurs.forEach((ecouteur) => ecouteur());
}

export function mettreAJourSourceTache(source: SourceTache, etat: EtatSource) {
  sources.set(source, etat);
  recalculer();
}

export function retirerSourceTache(source: SourceTache) {
  if (sources.delete(source)) recalculer();
}

export function lireEtatTacheCanal(): EtatTacheCanal {
  return instantane;
}

export function etatTacheCanalRepos(): EtatTacheCanal {
  return ETAT_REPOS;
}

export function abonnerEtatTacheCanal(ecouteur: () => void): () => void {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}

export function arreterTacheCanal() {
  for (const v of [...sources.values()]) if (v.enCours) v.arreter?.();
}

export function continuerTacheInterrompue() {
  for (const v of [...sources.values()]) {
    if (v.interrompue) {
      v.continuer?.();
      return;
    }
  }
}

export function reessayerTacheInterrompue() {
  for (const v of [...sources.values()]) {
    if (v.interrompue) {
      v.reessayer?.();
      return;
    }
  }
}
