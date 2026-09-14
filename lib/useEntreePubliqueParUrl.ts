"use client";

import { useEffect, useState } from "react";
import { entreePubliqueParUrl } from "./api";

// 13/09/2026, demande Bourama : dans le chat, une carte fichier ne reçoit
// qu'un lien (href) -- ce hook vérifie si ce lien correspond à une entrée
// de la bibliothèque publique, pour proposer "Ajouter à ma bibliothèque"
// en plus du téléchargement réel (voir components/chat/FichierChip.tsx).
// `actif` évite l'appel réseau pour un lien qui n'est de toute façon pas
// dans notre stockage (lien externe écrit librement par le modèle).
export function useEntreePubliqueParUrl(href: string, actif: boolean): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(null);
    if (!actif) return;
    let annule = false;
    entreePubliqueParUrl(href)
      .then((entree) => {
        if (!annule) setId(entree?.id ?? null);
      })
      .catch(() => {
        if (!annule) setId(null);
      });
    return () => {
      annule = true;
    };
  }, [href, actif]);

  return id;
}
