"use client";

// Page bambara (23/11/2026, demande de Bourama) : les réglages de la page, gardés dans le navigateur de la personne
// (même principe que le profil choisi, lib/useBambaraEspace.ts). Deux réglages ici : afficher ou non le texte de la
// réponse de Classinus sous sa bulle audio (par défaut NON), et afficher ou non le bouton clavier à côté du micro
// (par défaut NON, le bouton est donc masqué).
// Le thème (système, clair, sombre) n'est pas gardé ici : il vient de lib/useTheme.ts, le même que dans le reste de
// l'appli, et components/bambara/bambara.css le suit déjà.

import { useCallback, useEffect, useState } from "react";

const CLE_AFFICHER_TEXTE = "bambara:afficher-texte-reponse";
const CLE_AFFICHER_BOUTON_CLAVIER = "bambara:afficher-bouton-clavier";

function lireBooleen(cle: string): boolean {
  try {
    return window.localStorage.getItem(cle) === "1";
  } catch {
    return false;
  }
}

function ecrireBooleen(cle: string, valeur: boolean) {
  try {
    window.localStorage.setItem(cle, valeur ? "1" : "0");
  } catch {
    // Stockage du navigateur indisponible (navigation privée) : le choix reste valable jusqu'au rechargement.
  }
}

export type ReglagesBambara = {
  afficherTexteReponse: boolean;
  changerAfficherTexteReponse: (valeur: boolean) => void;
  afficherBoutonClavier: boolean;
  changerAfficherBoutonClavier: (valeur: boolean) => void;
};

export function useReglagesBambara(): ReglagesBambara {
  // Premier rendu toujours « non affiché » (même rendu côté serveur et côté navigateur), puis le choix gardé est relu.
  const [afficherTexteReponse, setAfficherTexteReponse] = useState(false);
  const [afficherBoutonClavier, setAfficherBoutonClavier] = useState(false);

  useEffect(() => {
    setAfficherTexteReponse(lireBooleen(CLE_AFFICHER_TEXTE));
    setAfficherBoutonClavier(lireBooleen(CLE_AFFICHER_BOUTON_CLAVIER));
  }, []);

  const changerAfficherTexteReponse = useCallback((valeur: boolean) => {
    setAfficherTexteReponse(valeur);
    ecrireBooleen(CLE_AFFICHER_TEXTE, valeur);
  }, []);

  const changerAfficherBoutonClavier = useCallback((valeur: boolean) => {
    setAfficherBoutonClavier(valeur);
    ecrireBooleen(CLE_AFFICHER_BOUTON_CLAVIER, valeur);
  }, []);

  return { afficherTexteReponse, changerAfficherTexteReponse, afficherBoutonClavier, changerAfficherBoutonClavier };
}
