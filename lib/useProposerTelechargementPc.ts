"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { detecterAppareil } from "@/lib/telechargementPc";

// Créé le 19/10/2026, demande Bourama : le bouton "Télécharger pour PC" de
// la barre latérale ne doit apparaître que là où il a un sens, c'est à dire
// dans un navigateur sur Windows. Jamais :
// - sur mobile (téléphone ou tablette) ;
// - dans l'appli PC déjà installée (plateforme Capacitor "electron") ;
// - dans l'appli mobile native ;
// - dans un site installé comme appli depuis le navigateur (mode standalone) ;
// - sur Mac ou Linux, où l'installeur n'existe pas (la page /telecharger
//   l'explique à qui y arrive d'ailleurs, mais on ne propose pas un bouton
//   qui mène à un message d'indisponibilité).
//
// Faux au premier rendu, y compris côté serveur : le bouton n'apparaît donc
// qu'après l'hydratation, avec une transition douce, sans décalage ni écart
// entre le rendu serveur et le rendu client.
export function useProposerTelechargementPc(): boolean {
  const [propose, setPropose] = useState(false);

  useEffect(() => {
    const dansUnNavigateur = Capacitor.getPlatform() === "web";
    const installeCommeAppli = window.matchMedia("(display-mode: standalone)").matches;
    const surWindows = detecterAppareil(navigator.userAgent) === "windows";
    setPropose(dansUnNavigateur && !installeCommeAppli && surWindows);
  }, []);

  return propose;
}
