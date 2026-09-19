"use client";

import { useQueryClient } from "@tanstack/react-query";
import { clesRequetes } from "@/lib/clesRequetes";
import { ComportementsPublics } from "@/components/ComportementsPublics";

// 19/09/2026, demande Bourama : sortie de l'onglet "Public" de Mes skills
// (MesComportements.tsx) en page à part entière. Ce petit pont invalide
// le cache partagé de Mes skills (même clé que MesComportements.tsx et
// MesCodes.tsx) quand un skill public est activé, pour que la liste soit
// à jour au prochain passage sur /comportements -- reprend exactement ce
// que faisait charger() dans MesComportements.tsx.
const AGENT_ID = "clovis";

export function SkillsPublics() {
  const queryClient = useQueryClient();
  return (
    <ComportementsPublics
      onActive={() => queryClient.invalidateQueries({ queryKey: clesRequetes.comportements(AGENT_ID) })}
    />
  );
}
