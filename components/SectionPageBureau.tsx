"use client";

import { useContext } from "react";
import { SectionPage } from "./SectionPage";
import { ContexteStatutUtilisateur } from "@/lib/contexteStatutUtilisateur";
import { SECTIONS_BUREAU } from "@/lib/sectionsBureau";
import { ROUTES_BUREAU } from "@/lib/routesBureau";
import { construireGroupe } from "@/lib/groupeSections";

// 26/09/2026, demande Bourama : les 6 pages filles de Bureau appelaient
// toutes `groupe={groupeBureau()}` directement (fonction pure, appelée
// dans le Server Component de chaque page) -- ça listait toujours les 6
// sections dans le menu des pages voisines (desktop) ET dans les
// pastilles mobile (OngletsLiens, voir SectionPage.tsx), même quand
// est_professeur est à false. Bug remonté par Bourama (capture d'écran,
// "Entrer un code" montrant Audit hebdomadaire/Programme/Signalements
// dans la liste de gauche).
//
// Correctif : ce petit wrapper Client Component remplace `groupeBureau()`
// dans les 6 pages. Il lit ContexteStatutUtilisateur (un seul fetch pour
// toute l'appli, voir ce fichier -- pas un nouvel appel réseau par page)
// et construit le groupe filtré ici, côté client, où l'info est
// disponible -- une page.tsx (Server Component) ne peut pas savoir ça.
const SECTIONS_PROF_UNIQUEMENT = new Set<string>([
  ROUTES_BUREAU.audit,
  ROUTES_BUREAU.programme,
  ROUTES_BUREAU.signalements,
]);

export function SectionPageBureau({ title, children }: { title: string; children: React.ReactNode }) {
  const { estProfesseur } = useContext(ContexteStatutUtilisateur);
  const sections =
    estProfesseur === false ? SECTIONS_BUREAU.filter((s) => !SECTIONS_PROF_UNIQUEMENT.has(s.href)) : SECTIONS_BUREAU;
  const groupe = construireGroupe("Bureau", ROUTES_BUREAU.accueil, sections);

  return (
    <SectionPage title={title} groupe={groupe}>
      {children}
    </SectionPage>
  );
}
