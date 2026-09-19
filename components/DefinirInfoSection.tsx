"use client";

import { useInfoSection } from "./SectionPage";

// 19/09/2026, demande Bourama (la Bibliothèque fonctionne comme
// Personnaliser Clovis). useInfoSection est un hook, donc utilisable
// seulement dans un composant client, alors que les pages de
// app/(app)/bibliotheque sont des Server Components. Ce composant, qui
// n'affiche rien, sert de pont : une page le place dans son contenu pour
// dire quelle rubrique d'aide le bouton "i" du titre doit ouvrir (voir
// lib/aideSections.tsx). id à null : pas de bouton.
export function DefinirInfoSection({ id }: { id: string | null }) {
  useInfoSection(id);
  return null;
}
