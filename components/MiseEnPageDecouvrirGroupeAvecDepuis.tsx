"use client";

import type { ReactNode } from "react";
import { MiseEnPageDecouvrirGroupe } from "@/components/MiseEnPageDecouvrirGroupe";
import { useDepuisDecouvrir } from "@/lib/depuisDecouvrir";
import type { CarteDecouvrir } from "@/lib/sectionsDecouvrir";

// Chantier SEO/AEO de Classinus (26/09/2026). Sépare la lecture de
// ?depuis= (useSearchParams, doit être entourée d'un <Suspense>, voir
// components/SectionPageRetourDepuis.tsx pour le précédent) de
// MiseEnPageDecouvrirGroupe elle même, pour que le contenu réel de la
// page (children) reste identique dans le repli du <Suspense> ET une
// fois hydraté : seule la présence de ?depuis= change, jamais le texte
// affiché.
export function MiseEnPageDecouvrirGroupeAvecDepuis(props: {
  retourHref: string;
  retourLabel: string;
  sousPages: CarteDecouvrir[];
  children: ReactNode;
}) {
  const { depuis } = useDepuisDecouvrir();
  return <MiseEnPageDecouvrirGroupe {...props} depuis={depuis} />;
}
