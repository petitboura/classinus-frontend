"use client";

import { useEffect, useState } from "react";

/**
 * Renvoie l'instant courant en millisecondes (horloge de l'appareil
 * corrigée du décalage avec le serveur), rafraîchi 4 fois par seconde.
 * Volontairement local à chaque affichage de minuteur (jamais dans un
 * contexte partagé) : seul le composant qui affiche un temps se redessine,
 * jamais le chat. `actif` false : aucune horloge ne tourne (économie de
 * batterie quand il n'y a rien à afficher).
 */
export function useMaintenantMs(decalageMs: number, actif: boolean): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!actif) return;
    // 250 ms : le chiffre change au plus 0,25 s après l'instant réel, sans
    // jamais se figer même si l'appareil ralentit brièvement les timers.
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [actif]);

  return Date.now() + decalageMs;
}
