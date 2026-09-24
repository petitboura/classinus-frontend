"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clesRequetes } from "@/lib/clesRequetes";
import { listerMesCodes, type CodePartage } from "@/lib/api";
import { OngletsSegment } from "@/components/OngletsSegment";
import { ProgrammeNotions } from "@/components/ProgrammeNotions";
import { ProgrammesCataloguePublic } from "@/components/ProgrammesCataloguePublic";

// 22/09/2026, demande Bourama : "un moyen de partager et de trouver des
// programmes publics" -- même principe que MesComportements.tsx (onglet
// "Mes comportements" / "Public"), transposé au Programme. `codes`
// partage sa clé de cache React Query avec ProgrammeNotions.tsx et
// MesCodes.tsx (clesRequetes.codes), pas de requête en double.
export function ProgrammeAvecCatalogue() {
  const [vue, setVue] = useState<"mon-programme" | "public">("mon-programme");
  const { data: codes } = useQuery({
    queryKey: clesRequetes.codes,
    queryFn: () => listerMesCodes().catch(() => [] as CodePartage[]),
  });

  return (
    <>
      <OngletsSegment
        ariaLabel="Section du Programme"
        valeur={vue}
        onChange={(v) => setVue(v as typeof vue)}
        onglets={[
          { valeur: "mon-programme", libelle: "Mon Programme" },
          { valeur: "public", libelle: "Catalogue public" },
        ]}
      />
      {vue === "public" ? <ProgrammesCataloguePublic mesCodes={codes} /> : <ProgrammeNotions />}
    </>
  );
}
