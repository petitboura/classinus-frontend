"use client";

import { Check } from "lucide-react";

// Sous-composant de QuestionInteractive.tsx (oui_non), réutilisé tel quel
// par QuestionMultiChamps.tsx pour un champ imbriqué. "Un clic suffit" en
// usage standalone (aucun bouton Valider ne l'entoure, voir
// QuestionInteractive.tsx) ; en usage imbriqué dans multi_champs, le
// clic se contente de fixer la valeur du champ, la validation globale
// reste au niveau du formulaire.
export function ChampOuiNon({
  valeur,
  onChange,
  desactive,
}: {
  valeur: "oui" | "non" | null;
  onChange: (v: "oui" | "non") => void;
  desactive?: boolean;
}) {
  return (
    <div className="mt-3 flex gap-2">
      {(["oui", "non"] as const).map((option) => {
        const selectionne = valeur === option;
        return (
          <button
            key={option}
            type="button"
            disabled={desactive}
            onClick={() => onChange(option)}
            aria-pressed={selectionne}
            className={`flex items-center gap-1.5 rounded-cgpt-bouton border px-4 py-2 text-sm capitalize transition-colors ${
              selectionne
                ? "border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02]"
                : "border-dj-bordure bg-dj-surface-haute text-dj-texte hover:border-dj-bordure-forte"
            } ${desactive ? "cursor-default opacity-60" : "cursor-pointer"}`}
          >
            {selectionne && <Check size={14} />}
            {option}
          </button>
        );
      })}
    </div>
  );
}
