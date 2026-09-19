"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct", chantier L.
// Le bouton d'activation est flottant en bas à gauche (décision Bourama,
// 19/09/2026). Sur ordinateur, le rail latéral d'AppSidebar occupe déjà
// tout le bord gauche (3,5 rem replié, 18 rem déplié, avec le profil en
// bas) : un élément fixed collé à gauche le recouvrirait.
//
// Ce hook renvoie donc la position du bord droit du rail (en pixels), ou
// 0 quand aucun rail n'est visible (mobile, pages sans rail). Le rail est
// repéré par l'attribut data-rail-lateral posé dans AppSidebar.tsx. Un
// ResizeObserver suit la largeur image par image, ce qui accompagne
// l'animation de dépliage du rail sans décalage.
//
// Sur /chat, le rail est monté par ChatSection après le chargement de la
// conversation : si le rail n'est pas encore là, on réessaie un nombre
// limité de fois plutôt que de surveiller tout le DOM.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SELECTEUR_RAIL = "[data-rail-lateral]";
const NB_ESSAIS_MAX = 20;
const DELAI_ESSAI_MS = 500;

export function useDecalageRailLateral(): number {
  const pathname = usePathname();
  const [decalage, setDecalage] = useState(0);

  useEffect(() => {
    let observateur: ResizeObserver | null = null;
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    let railSuivi: HTMLElement | null = null;
    let essais = 0;

    const mesurer = () => {
      if (!railSuivi) return;
      const boite = railSuivi.getBoundingClientRect();
      setDecalage(boite.width > 0 ? Math.round(boite.right) : 0);
    };

    const chercherRail = () => {
      const rail = document.querySelector<HTMLElement>(SELECTEUR_RAIL);
      if (!rail) {
        setDecalage(0);
        essais += 1;
        if (essais < NB_ESSAIS_MAX) minuteur = setTimeout(chercherRail, DELAI_ESSAI_MS);
        return;
      }
      railSuivi = rail;
      mesurer();
      observateur = new ResizeObserver(mesurer);
      observateur.observe(rail);
    };

    chercherRail();
    window.addEventListener("resize", mesurer);
    return () => {
      if (minuteur) clearTimeout(minuteur);
      observateur?.disconnect();
      window.removeEventListener("resize", mesurer);
    };
  }, [pathname]);

  return decalage;
}
