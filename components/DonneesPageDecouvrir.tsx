"use client";

import { usePathname } from "next/navigation";
import { DonneesStructurees } from "@/components/DonneesStructurees";
import { donneesPageDecouvrir } from "@/lib/donneesPageDecouvrir";

// Chantier données structurées (12/10/2026, demande Bourama). Pose le fil
// d'ariane et la fiche de la page pour toute page /decouvrir, depuis
// app/decouvrir/layout.tsx : une seule fois, au lieu de l'ajouter dans chacune
// des ~30 pages. Composant client UNIQUEMENT parce qu'un layout ne connaît pas
// l'adresse de la page affichée ; il est tout de même rendu dans le HTML du
// serveur, donc lu par un robot qui n'exécute pas de JavaScript. usePathname
// n'a pas besoin de <Suspense> (contrairement à useSearchParams) et reste
// compatible avec l'export statique de l'appli mobile.
export function DonneesPageDecouvrir() {
  const chemin = usePathname();
  const donnees = chemin ? donneesPageDecouvrir(chemin) : null;
  if (!donnees) return null;
  return <DonneesStructurees donnees={donnees} />;
}
