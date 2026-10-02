"use client";

import { useEffect, useState } from "react";
import {
  obtenirPersonaPedagogique,
  definirPersonaPedagogique,
  obtenirModeSource,
  definirModeSource,
} from "@/lib/api";

// Mode pédagogique (Socratique, Professeur, Tuteur, Examinateur) et mode
// ressources (Recherche, Sur pièces) d'une conversation. Deux réglages
// totalement indépendants : deux états, deux chargements, deux appels API
// distincts (core/persona_pedagogique_conversation.py et
// core/mode_source_conversation.py côté backend), choisis en même temps si
// besoin. Hook unique appelé une seule fois par BarreDeSaisie : les deux
// instances du bouton Réglages (PC et mobile) lisent donc le même état, sans
// double appel réseau.
//
// Sans conversationId (écran d'accueil avant le premier message), rien n'est
// chargé et rien n'est envoyé : les deux valeurs restent à null.
// Aucune valeur par défaut implicite : null veut dire "Aucun mode" tant que
// rien n'a été chargé ou choisi.
export function useReglagesPedagogiques(conversationId?: string) {
  const [persona, setPersona] = useState<string | null>(null);
  const [modeSource, setModeSource] = useState<string | null>(null);

  // Un remontage (nouvelle conversation) redéclenche ces chargements : pas de
  // fuite d'un réglage d'une conversation vers une autre.
  useEffect(() => {
    if (!conversationId) return;
    let annule = false;
    obtenirPersonaPedagogique(conversationId)
      .then((res) => {
        if (!annule) setPersona(res.persona);
      })
      .catch(() => {
        // Échec silencieux : reste à null ("Aucun mode").
      });
    return () => {
      annule = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    let annule = false;
    obtenirModeSource(conversationId)
      .then((res) => {
        if (!annule) setModeSource(res.mode_source);
      })
      .catch(() => {
        // Échec silencieux : reste à null ("Aucun").
      });
    return () => {
      annule = true;
    };
  }, [conversationId]);

  // Mise à jour optimiste immédiate, retour à la valeur précédente en
  // silence si l'appel réseau échoue.
  async function choisirPersona(id: string | null) {
    if (!conversationId || id === persona) return;
    const precedent = persona;
    setPersona(id);
    try {
      await definirPersonaPedagogique(conversationId, id);
    } catch {
      setPersona(precedent);
    }
  }

  async function choisirModeSource(id: string | null) {
    if (!conversationId || id === modeSource) return;
    const precedent = modeSource;
    setModeSource(id);
    try {
      await definirModeSource(conversationId, id);
    } catch {
      setModeSource(precedent);
    }
  }

  return { persona, modeSource, choisirPersona, choisirModeSource };
}

export type EtatReglagesPedagogiques = ReturnType<typeof useReglagesPedagogiques>;
