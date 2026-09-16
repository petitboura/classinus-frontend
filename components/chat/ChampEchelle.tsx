"use client";

// Sous-composant de QuestionInteractive.tsx (echelle), réutilisé tel quel
// par QuestionMultiChamps.tsx pour un champ imbriqué.
//
// Amplitude <= 10 : boutons individuels (plus rapide à taper, un seul
// geste). Amplitude > 10 (ex. note sur 20 ou 100) : curseur natif, des
// dizaines de boutons ne tiendraient pas et casseraient le responsive
// mobile -- voir /mnt/skills/plugins/djiguigne-frontend-standards.
export function ChampEchelle({
  min,
  max,
  labelMin,
  labelMax,
  valeur,
  onChange,
  desactive,
}: {
  min: number;
  max: number;
  labelMin?: string;
  labelMax?: string;
  valeur: number | null;
  onChange: (v: number) => void;
  desactive?: boolean;
}) {
  const amplitude = max - min;

  return (
    <div className="mt-3">
      {amplitude <= 10 ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: amplitude + 1 }, (_, i) => min + i).map((n) => {
            const selectionne = valeur === n;
            return (
              <button
                key={n}
                type="button"
                disabled={desactive}
                onClick={() => onChange(n)}
                aria-pressed={selectionne}
                className={`flex h-9 min-w-9 items-center justify-center rounded-cgpt-bouton border px-2 text-sm transition-colors ${
                  selectionne
                    ? "border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02]"
                    : "border-dj-bordure bg-dj-surface-haute text-dj-texte hover:border-dj-bordure-forte"
                } ${desactive ? "cursor-default opacity-60" : "cursor-pointer"}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            disabled={desactive}
            value={valeur ?? min}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-1.5 w-full flex-1 cursor-pointer accent-[var(--dj-accent-1)] disabled:cursor-default disabled:opacity-60"
          />
          <span className="w-8 shrink-0 text-right text-sm font-medium text-dj-texte">{valeur ?? min}</span>
        </div>
      )}

      {(labelMin || labelMax) && (
        <div className="mt-1.5 flex justify-between text-xs text-dj-texte-muet">
          <span>{labelMin ?? ""}</span>
          <span>{labelMax ?? ""}</span>
        </div>
      )}
    </div>
  );
}
