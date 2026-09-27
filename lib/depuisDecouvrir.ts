"use client";

import { useSearchParams } from "next/navigation";

// Chantier SEO/AEO de Classinus (26/09/2026, retour de Bourama : "ce
// retour là il doit te ramener de là où tu viens de l'appli, pas dans
// le découvrir"). Même principe que le ?depuis= déjà utilisé pour le
// bouton retour d'un fichier partagé (components/SectionPageRetourDepuis.tsx,
// 18/09/2026), étendu pour survivre à plusieurs pages /decouvrir
// visitées d'affilée : chaque lien interne à /decouvrir doit reporter le
// même ?depuis= sur sa propre adresse, pas seulement le lire une fois.
//
// useSearchParams côté client (jamais searchParams côté Server
// Component) : lire l'URL côté serveur a déjà cassé l'export statique
// mobile ailleurs dans ce dépôt (voir le commentaire de
// SectionPageRetourDepuis.tsx). Chaque appelant (BoutonRetourDecouvrir,
// MiseEnPageDecouvrirGroupeAvecDepuis) s'entoure de son propre
// <Suspense> ciblé, avec un repli identique mais sans ?depuis=, pour que
// le vrai contenu de la page ne soit jamais caché derrière un repli.
export function useDepuisDecouvrir() {
  const searchParams = useSearchParams();
  const depuis = searchParams.get("depuis");

  /** Ajoute ?depuis=... à une adresse interne à /decouvrir, seulement
   * si on a nous même reçu un ?depuis= (sinon on laisse l'adresse
   * telle quelle : visiteur arrivé directement depuis Google par
   * exemple, rien à reporter). */
  function avecDepuis(href: string): string {
    return depuis ? `${href}?depuis=${encodeURIComponent(depuis)}` : href;
  }

  return { depuis, avecDepuis };
}
