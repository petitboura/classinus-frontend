"use client";

// Page bambara (23/11/2026, demande de Bourama) : les réglages de la page. Un seul pour l'instant : afficher ou non le
// texte de la réponse de Classinus sous sa bulle audio. Par défaut il n'est PAS affiché. Le choix est gardé dans le
// navigateur de la personne (même principe que le profil choisi, lib/useBambaraEspace.ts).

import { useCallback, useEffect, useState } from "react";

const CLE_AFFICHER_TEXTE = "bambara:afficher-texte-reponse";

function lireAfficherTexte(): boolean {
  try {
    return window.localStorage.getItem(CLE_AFFICHER_TEXTE) === "1";
  } catch {
    return false;
  }
}

function ecrireAfficherTexte(valeur: boolean) {
  try {
    window.localStorage.setItem(CLE_AFFICHER_TEXTE, valeur ? "1" : "0");
  } catch {
    // Stockage du navigateur indisponible (navigation privée) : le choix reste valable jusqu'au rechargement.
  }
}

export type ReglagesBambara = {
  afficherTexteReponse: boolean;
  changerAfficherTexteReponse: (valeur: boolean) => void;
};

export function useReglagesBambara(): ReglagesBambara {
  // Premier rendu toujours « non affiché » (même rendu côté serveur et côté navigateur), puis le choix gardé est relu.
  const [afficherTexteReponse, setAfficherTexteReponse] = useState(false);

  useEffect(() => {
    setAfficherTexteReponse(lireAfficherTexte());
  }, []);

  const changerAfficherTexteReponse = useCallback((valeur: boolean) => {
    setAfficherTexteReponse(valeur);
    ecrireAfficherTexte(valeur);
  }, []);

  return { afficherTexteReponse, changerAfficherTexteReponse };
}
