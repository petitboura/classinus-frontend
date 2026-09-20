"use client";

import { Check, Timer } from "lucide-react";
import { textesMinuteurs } from "@/lib/textesMinuteurs";
import { formaterTemps, secondesRestantes, type Minuteur } from "@/lib/minuteurs";

// Version réduite d'un minuteur (20/09/2026, demande Bourama) : une petite
// pastille avec le temps restant, qui ne prend presque pas de place. Un
// toucher la rouvre en carte complète.
export function PastilleMinuteur({
  minuteur,
  maintenantMs,
  onAgrandir,
}: {
  minuteur: Minuteur;
  maintenantMs: number;
  onAgrandir: () => void;
}) {
  const t = textesMinuteurs();
  const termine = minuteur.statut === "termine";
  const arrete = minuteur.statut === "arrete";
  const temps = formaterTemps(minuteur.statut === "en_cours" ? secondesRestantes(minuteur, maintenantMs) : minuteur.secondes_restantes);

  return (
    <button
      type="button"
      onClick={onAgrandir}
      aria-label={`${minuteur.titre || t.titreParDefaut}, ${t.agrandir}`}
      title={t.agrandir}
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dj-bordure bg-dj-surface px-2.5 text-xs text-dj-texte shadow-sm transition-colors hover:bg-dj-surface-haute"
    >
      {termine ? (
        <Check size={13} style={{ color: "var(--dj-succes)" }} aria-hidden />
      ) : (
        <Timer size={13} className={arrete ? "text-dj-inactif" : "text-dj-accent-1"} aria-hidden />
      )}
      <span className="font-semibold tabular-nums">{termine ? t.termine : arrete ? t.arrete : temps}</span>
    </button>
  );
}
