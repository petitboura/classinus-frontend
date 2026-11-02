"use client";

import { RefObject, useLayoutEffect } from "react";

// Garantit qu'un tableau ne depasse jamais sa boite. Par defaut les colonnes
// s'adaptent a leur contenu et les mots restent entiers. Si, meme ainsi, le
// tableau est plus large que sa place, il passe en colonnes de largeur egale
// (attribut data-serre="1", voir .dj-table-chat dans globals.css) et les mots
// trop longs sont coupes. La mesure se fait avant l'affichage, sans clignotement.
export function useTableSansDebordement(
  table: RefObject<HTMLTableElement | null>,
  boite: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const t = table.current;
    const b = boite.current;
    if (!t || !b) return;
    let enCours = false;

    function mesurer() {
      if (enCours || !t || !b) return;
      enCours = true;
      t.dataset.serre = "0";
      const trop = t.offsetWidth > b.clientWidth + 1;
      t.dataset.serre = trop ? "1" : "0";
      enCours = false;
    }

    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(b);
    observateur.observe(t);
    return () => observateur.disconnect();
  }, [table, boite]);
}
