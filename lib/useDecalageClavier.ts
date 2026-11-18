"use client";

import { useEffect, useState, type RefObject } from "react";

// Page bambara (18/11/2026, demande de Bourama) : le clavier du téléphone doit se poser PAR DESSUS la
// page, jamais la pousser ni la rétrécir. Selon le navigateur, le clavier peut soit redimensionner la
// page (Android classique), soit la laisser entière et seulement recouvrir le bas (iOS, Android avec
// `interactiveWidget: "overlays-content"`). Ce hook mesure l'espace réellement recouvert par le clavier,
// quel que soit le cas : c'est la différence entre le bas de la page et le bas de la zone visible.
// Si la page a déjà été rétrécie par le navigateur, la différence est nulle et rien ne bouge.
// Retourne le nombre de pixels dont il faut remonter ce qui est collé en bas pour rester au dessus du clavier.

// En dessous de ce seuil, l'écart vient des barres du navigateur et non d'un clavier : on l'ignore.
const SEUIL_CLAVIER_PX = 100;

export function useDecalageClavier(racineRef: RefObject<HTMLElement | null>): number {
  const [decalage, setDecalage] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function maj() {
      const racine = racineRef.current;
      if (!racine || !vv) return;
      const basPage = racine.getBoundingClientRect().bottom;
      const basVisible = vv.offsetTop + vv.height;
      const ecart = Math.round(basPage - basVisible);
      setDecalage(ecart > SEUIL_CLAVIER_PX ? ecart : 0);
    }

    maj();
    vv.addEventListener("resize", maj);
    vv.addEventListener("scroll", maj);
    window.addEventListener("resize", maj);
    return () => {
      vv.removeEventListener("resize", maj);
      vv.removeEventListener("scroll", maj);
      window.removeEventListener("resize", maj);
    };
  }, [racineRef]);

  return decalage;
}
