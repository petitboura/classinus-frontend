"use client";

import { useCallback, useRef, useState } from "react";
import { telecharger } from "@/lib/telecharger";

// Durée minimale d'affichage de l'animation, pour qu'elle ne clignote pas
// quand le téléchargement démarre presque tout de suite.
const DUREE_MINIMALE_MS = 700;

// Bouton Télécharger du chat : montre tout de suite que le clic est pris en
// compte (enCours passe à vrai au clic, avant toute attente réseau) et
// ignore les clics suivants tant que le premier n'est pas terminé, pour ne
// jamais lancer le même téléchargement plusieurs fois. Le verrou est un ref
// (et non seulement l'état) : deux clics très rapprochés dans le même rendu
// sont bloqués aussi.
export function useTelechargement() {
  const [enCours, setEnCours] = useState(false);
  const verrou = useRef(false);

  const lancer = useCallback(async (href: string, nom: string) => {
    if (verrou.current) return;
    verrou.current = true;
    setEnCours(true);
    const debut = Date.now();
    try {
      await telecharger(href, nom);
    } finally {
      const reste = DUREE_MINIMALE_MS - (Date.now() - debut);
      if (reste > 0) await new Promise((resoudre) => setTimeout(resoudre, reste));
      verrou.current = false;
      setEnCours(false);
    }
  }, []);

  return { enCours, lancer };
}
