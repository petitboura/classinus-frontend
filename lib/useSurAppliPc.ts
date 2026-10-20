"use client";

import { useEffect, useState } from "react";

// Vrai seulement dans l'appli PC installée (Electron). Faux au premier rendu et côté
// serveur, puis mis à jour après le montage : le premier rendu reste identique à celui
// du serveur, sans écart d'hydratation. Sert à masquer ce qui n'existe que sur téléphone.
export function useSurAppliPc(): boolean {
  const [surPc, setSurPc] = useState(false);

  useEffect(() => {
    let annule = false;
    import("@capacitor/core").then(({ Capacitor }) => {
      if (!annule) setSurPc(Capacitor.getPlatform() === "electron");
    });
    return () => {
      annule = true;
    };
  }, []);

  return surPc;
}
