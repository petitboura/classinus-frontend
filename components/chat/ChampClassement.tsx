"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

// Sous-composant de QuestionInteractive.tsx (classement), réutilisé tel
// quel par QuestionMultiChamps.tsx pour un champ imbriqué.
//
// Choix délibéré : boutons monter/descendre plutôt qu'un vrai
// glisser-déposer. Aucune librairie de drag-and-drop n'est présente dans
// clovis-frontend (package.json vérifié) ; le drag HTML5 natif fonctionne
// mal au toucher sur mobile sans librairie dédiée, ce qui contredirait
// l'exigence mobile/pc identique des standards frontend. Signalé à
// Bourama -- à remplacer par un vrai drag-and-drop si souhaité plus tard
// (ajout de dépendance, décision à valider séparément).
export function ChampClassement({
  elements,
  ordre,
  onChange,
  desactive,
}: {
  elements: string[];
  ordre: number[];
  onChange: (ordre: number[]) => void;
  desactive?: boolean;
}) {
  function deplacer(position: number, direction: -1 | 1) {
    if (desactive) return;
    const cible = position + direction;
    if (cible < 0 || cible >= ordre.length) return;
    const copie = [...ordre];
    [copie[position], copie[cible]] = [copie[cible], copie[position]];
    onChange(copie);
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {ordre.map((indexElement, position) => (
        <div
          key={indexElement}
          className="flex items-center justify-between gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dj-accent-1/15 text-xs font-medium text-dj-accent-1-texte">
              {position + 1}
            </span>
            {elements[indexElement]}
          </span>
          <span className="flex shrink-0 gap-1">
            <button
              type="button"
              disabled={desactive || position === 0}
              onClick={() => deplacer(position, -1)}
              aria-label="Monter"
              className="flex h-7 w-7 items-center justify-center rounded-cgpt-bouton text-dj-texte-muet transition-colors hover:bg-dj-surface hover:text-dj-texte disabled:opacity-30"
            >
              <ChevronUp size={15} />
            </button>
            <button
              type="button"
              disabled={desactive || position === ordre.length - 1}
              onClick={() => deplacer(position, 1)}
              aria-label="Descendre"
              className="flex h-7 w-7 items-center justify-center rounded-cgpt-bouton text-dj-texte-muet transition-colors hover:bg-dj-surface hover:text-dj-texte disabled:opacity-30"
            >
              <ChevronDown size={15} />
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
