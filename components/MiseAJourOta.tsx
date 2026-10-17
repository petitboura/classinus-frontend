"use client";

import { useEffect } from "react";
import { lancerMiseAJourOta } from "@/lib/miseAJourOta";

/**
 * Lance la vérification de mise à jour OTA à l'ouverture de l'appli
 * installée. N'affiche rien et ne fait rien sur le web (voir
 * lib/miseAJourOta.ts). Monté une seule fois dans app/layout.tsx, hors de
 * tout écran de chargement ou de connexion, pour que notifyAppReady parte
 * le plus tôt possible.
 */
export function MiseAJourOta() {
  useEffect(() => {
    void lancerMiseAJourOta();
  }, []);

  return null;
}
