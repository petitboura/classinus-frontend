"use client";

import { useEffect } from "react";

// Réveil + maintien en vie du backend Render (plan gratuit) -- demande
// Bourama 13/08/2026. Le service Render free spin down après 15 minutes
// d'inactivité (cold start de 30-60s au réveil, ressenti par l'étudiant
// comme un délai anormal sur sa première question). Ce composant ping
// /health (endpoint sans dépendance Supabase, voir api/main.py:health)
// dès l'ouverture de l'app, puis toutes les 14 minutes tant que l'app
// reste ouverte -- peu importe l'onglet actif/en arrière-plan ou la page
// affichée (monté une seule fois au niveau du layout racine).
//
// Volontairement silencieux : aucun état, aucun affichage, une erreur de
// ping est ignorée sans jamais remonter à l'utilisateur -- le seul but
// est d'éviter que le cold start soit ressenti, pas de signaler l'état
// du backend.
const INTERVALLE_MS = 14 * 60 * 1000;

export function ReveilBackend() {
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) return;

    function reveiller() {
      fetch(`${API_URL}/health`).catch(() => {
        // Échec ignoré volontairement : un ping raté ne doit jamais
        // impacter l'utilisateur, la prochaine vraie requête du chat
        // gérera son propre cas d'erreur normalement.
      });
    }

    reveiller();
    const intervalle = setInterval(reveiller, INTERVALLE_MS);
    return () => clearInterval(intervalle);
  }, []);

  return null;
}
