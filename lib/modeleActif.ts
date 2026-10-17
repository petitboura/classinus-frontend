"use client";

// 15/10/2026, demande Bourama (bouton du modèle en haut du chat) : plus de choix « Auto ».
// Le modèle actif est toujours un vrai modèle de la liste de l'agent :
//   1. le dernier choix de l'élève, tant que ce modèle est encore dans la liste ;
//   2. sinon DeepSeek Flash ;
//   3. si DeepSeek Flash n'est pas dans la liste, le premier modèle de la liste.
// Un ancien choix « Auto » (aucun modèle enregistré) tombe donc sur DeepSeek Flash.
//
// Le choix de l'élève est gardé sur son compte (profiles.modele_prefere, voir
// api/profiles.py) pour le retrouver sur n'importe quel appareil. Le module
// lib/reglagesProchainMessage.ts reste la source locale partagée avec le canal en direct.

import { useEffect } from "react";
import { enregistrerMonProfil } from "@/lib/api";
import { definirModeleProchainMessage, lireReglagesProchainMessage } from "@/lib/reglagesProchainMessage";
import { useReglagesProchainMessage } from "@/lib/useReglagesProchainMessage";

type ModeleListe = { modele_id: string };

// Identifiant de DeepSeek Flash tel que le renvoie le backend (core/fournisseurs_llm.py,
// HIERARCHIE_MODELES). Seul endroit du frontend où il est écrit.
export const MODELE_PAR_DEFAUT_ID = "deepseek-v4-flash";

/** Modèle réellement utilisé : voir les trois règles en tête de fichier. null seulement si la liste est vide. */
export function resoudreModeleActif(liste: ModeleListe[], choisi: string | null): string | null {
  if (liste.length === 0) return null;
  if (choisi && liste.some((m) => m.modele_id === choisi)) return choisi;
  if (liste.some((m) => m.modele_id === MODELE_PAR_DEFAUT_ID)) return MODELE_PAR_DEFAUT_ID;
  return liste[0].modele_id;
}

// Dernière liste connue, pour l'envoi du canal en direct (hors React, voir
// lib/canalAgentApplicatif.ts) qui n'a pas accès au contexte du chat.
let listeConnue: ModeleListe[] = [];

/** Modèle à envoyer avec le prochain message, hors composants React (canal en direct). */
export function modeleActifProchainMessage(): string | null {
  const choisi = lireReglagesProchainMessage().modeleId;
  if (listeConnue.length === 0) return choisi ?? MODELE_PAR_DEFAUT_ID;
  return resoudreModeleActif(listeConnue, choisi);
}

/** Modèle actif pour l'affichage et l'envoi, réactif au choix de l'élève. */
export function useModeleActif(liste: ModeleListe[]): string | null {
  const { modeleId } = useReglagesProchainMessage();
  useEffect(() => {
    if (liste.length > 0) listeConnue = liste;
  }, [liste]);
  return resoudreModeleActif(liste, modeleId);
}

/** L'élève choisit un modèle : appliqué tout de suite, puis gardé sur son compte. */
export function choisirModele(modeleId: string) {
  definirModeleProchainMessage(modeleId);
  // Sans compte (visiteur) ou hors ligne, l'écriture échoue : le choix reste valable pour la session.
  enregistrerMonProfil({ modele_prefere: modeleId }).catch(() => {});
}

/** Reprend le choix gardé sur le compte, sauf si l'élève a déjà choisi pendant cette session. */
export function hydraterModelePrefere(modeleId: string | null) {
  if (!modeleId) return;
  if (lireReglagesProchainMessage().modeleId !== null) return;
  definirModeleProchainMessage(modeleId);
}
