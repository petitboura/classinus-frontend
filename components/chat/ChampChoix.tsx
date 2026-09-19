"use client";

import { Check } from "lucide-react";
import type { ValeurChoix } from "@/lib/questionRiche";

// Sous-composant de QuestionInteractive.tsx (choix_unique/choix_multiple),
// réutilisé tel quel par QuestionMultiChamps.tsx pour un champ imbriqué.
// Le bouton "Autre" (validé par Bourama le 15/09/2026) : Classinus peut
// choisir de l'ajouter à une question à choix ; au clic il révèle un
// champ texte libre qui remplace la réponse envoyée pour cette question.
export function ChampChoix({
  choix,
  multiple,
  autre,
  valeur,
  onChange,
  desactive,
}: {
  choix: string[];
  multiple: boolean;
  autre?: boolean;
  valeur: ValeurChoix;
  onChange: (v: ValeurChoix) => void;
  desactive?: boolean;
}) {
  function basculerOption(index: number) {
    if (desactive) return;
    if (multiple) {
      const dejaCoche = valeur.indices.includes(index);
      onChange({
        ...valeur,
        indices: dejaCoche ? valeur.indices.filter((i) => i !== index) : [...valeur.indices, index],
      });
    } else {
      onChange({ indices: [index], autreActif: false, autreTexte: "" });
    }
  }

  function basculerAutre() {
    if (desactive) return;
    if (multiple) {
      onChange({ ...valeur, autreActif: !valeur.autreActif });
    } else {
      onChange({ indices: [], autreActif: true, autreTexte: valeur.autreTexte });
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {choix.map((option, index) => {
        const estCoche = valeur.indices.includes(index);
        return (
          <button
            key={index}
            type="button"
            disabled={desactive}
            onClick={() => basculerOption(index)}
            aria-pressed={estCoche}
            className={`flex items-center justify-between gap-2 rounded-cgpt-carte border px-3 py-2 text-left text-sm text-dj-texte transition-colors ${
              estCoche
                ? "border-dj-accent-1 bg-dj-accent-1/10"
                : "border-dj-bordure bg-dj-surface-haute hover:border-dj-bordure-forte"
            } ${desactive ? "cursor-default opacity-60" : "cursor-pointer"}`}
          >
            <span>{option}</span>
            {estCoche && <Check size={16} className="shrink-0 text-dj-accent-1" />}
          </button>
        );
      })}

      {autre && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={desactive}
            onClick={basculerAutre}
            aria-pressed={valeur.autreActif}
            className={`flex items-center justify-between gap-2 rounded-cgpt-carte border px-3 py-2 text-left text-sm text-dj-texte transition-colors ${
              valeur.autreActif
                ? "border-dj-accent-1 bg-dj-accent-1/10"
                : "border-dj-bordure bg-dj-surface-haute hover:border-dj-bordure-forte"
            } ${desactive ? "cursor-default opacity-60" : "cursor-pointer"}`}
          >
            <span>Autre</span>
            {valeur.autreActif && <Check size={16} className="shrink-0 text-dj-accent-1" />}
          </button>

          {valeur.autreActif && (
            <input
              type="text"
              autoFocus
              disabled={desactive}
              value={valeur.autreTexte}
              onChange={(e) => onChange({ ...valeur, autreTexte: e.target.value })}
              placeholder="Précise ta réponse..."
              className="animate-dj-fade-in-rapide rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1 disabled:opacity-60"
            />
          )}
        </div>
      )}
    </div>
  );
}
