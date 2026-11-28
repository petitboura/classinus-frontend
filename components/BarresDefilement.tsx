"use client";

import { useEffect } from "react";
import { activerBarresDefilement } from "@/lib/barresDefilement";

// Monte les barres de défilement maison (lib/barresDefilement.ts) une seule
// fois pour toute l'application. Rien n'est rendu dans l'arbre React : les
// barres vivent dans une couche fixe ajoutée à la page.
// Exception : la fenêtre de superposition Electron (canal en direct sur PC),
// transparente, ne doit rien dessiner de plus.
export function BarresDefilement() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/agent-superposition")) return;
    try {
      return activerBarresDefilement();
    } catch (erreur) {
      console.error("[barres de défilement]", erreur);
    }
  }, []);
  return null;
}
