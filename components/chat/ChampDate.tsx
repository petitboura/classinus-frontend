"use client";

// Sous-composant de QuestionInteractive.tsx (date), réutilisé tel quel
// par QuestionMultiChamps.tsx pour un champ imbriqué. Types natifs du
// navigateur (date/time/datetime-local) -- pas de librairie de
// calendrier dans le projet, et ces types natifs gèrent déjà mobile/pc
// correctement (clavier adapté, sélecteur natif).
export function ChampDate({
  granularite,
  valeur,
  onChange,
  desactive,
}: {
  granularite: "date" | "heure" | "date_heure";
  valeur: string;
  onChange: (v: string) => void;
  desactive?: boolean;
}) {
  const typeInput = granularite === "heure" ? "time" : granularite === "date_heure" ? "datetime-local" : "date";

  return (
    <input
      type={typeInput}
      disabled={desactive}
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      className="mt-3 w-full rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1 disabled:opacity-60 sm:w-auto"
    />
  );
}
