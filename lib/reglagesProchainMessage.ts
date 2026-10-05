"use client";

// Créé le 03/10/2026 (demande Bourama : Réglages et Utilitaires dans le canal en
// direct, partagés avec la barre de saisie du chat). Réglages qui s'appliquent au
// PROCHAIN message envoyé, qu'il parte de la barre de saisie du chat ou du canal :
// une seule source de vérité, lue et modifiée par les deux (components/chat/
// BarreDeSaisie.tsx, components/chat/ChatIA.tsx, components/ControlesInteractionCanal.tsx)
// et lue par l'envoi direct du canal (lib/canalAgentApplicatif.ts).
//
// - longueur : "courte" | "moyenne" | "longue", durable (reste d'un message à l'autre).
// - modeleId : modèle premium choisi, null = choix automatique de l'agent. Durable.
// - effort : effort de réflexion de DeepSeek (04/10/2026), "none" | "low" | "high" | "max", durable.
//   Même défaut que le backend (DEEPSEEK_REASONING_EFFORT = "low").
// - sansEnseignant : ne vaut que pour le prochain message, remis à faux à l'envoi.
//
// Le mode pédagogique, les modes ressources et le code enseignant ne sont pas ici :
// ils sont enregistrés côté serveur pour la conversation (voir
// components/chat/barre/useReglagesPedagogiques.ts), donc déjà communs au chat et au
// canal qui partagent la même conversation.

import type { EffortReflexion, LongueurReponse } from "@/components/chat/barre/reglagesReponse";

export type ReglagesProchainMessage = {
  longueur: LongueurReponse;
  modeleId: string | null;
  effort: EffortReflexion;
  sansEnseignant: boolean;
};

const PAR_DEFAUT: ReglagesProchainMessage = { longueur: "moyenne", modeleId: null, effort: "low", sansEnseignant: false };

let etat: ReglagesProchainMessage = PAR_DEFAUT;
const ecouteurs = new Set<() => void>();

function changer(partiel: Partial<ReglagesProchainMessage>) {
  const suivant = { ...etat, ...partiel };
  if (suivant.longueur === etat.longueur && suivant.modeleId === etat.modeleId && suivant.effort === etat.effort && suivant.sansEnseignant === etat.sansEnseignant) return;
  // Nouvel objet seulement quand quelque chose change : useSyncExternalStore compare par référence.
  etat = suivant;
  ecouteurs.forEach((ecouteur) => ecouteur());
}

export function lireReglagesProchainMessage(): ReglagesProchainMessage {
  return etat;
}

export function reglagesProchainMessageParDefaut(): ReglagesProchainMessage {
  return PAR_DEFAUT;
}

export function abonnerReglagesProchainMessage(ecouteur: () => void): () => void {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}

export function definirLongueurProchainMessage(longueur: LongueurReponse) {
  changer({ longueur });
}

export function definirModeleProchainMessage(modeleId: string | null) {
  changer({ modeleId });
}

export function definirEffortProchainMessage(effort: EffortReflexion) {
  changer({ effort });
}

export function definirSansEnseignantProchainMessage(sansEnseignant: boolean) {
  changer({ sansEnseignant });
}

// Appelé après chaque envoi : seul « sans enseignant » ne vaut que pour un message.
export function consommerReglagesUniquesProchainMessage() {
  changer({ sansEnseignant: false });
}
