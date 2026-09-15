"use client";

// Sous-composant de QuestionInteractive.tsx (texte), réutilisé tel quel
// par QuestionMultiChamps.tsx pour un champ imbriqué.
export function ChampTexte({
  format,
  valeur,
  onChange,
  desactive,
}: {
  format?: "court" | "long";
  valeur: string;
  onChange: (v: string) => void;
  desactive?: boolean;
}) {
  if (format === "long") {
    return (
      <textarea
        rows={3}
        disabled={desactive}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ta réponse..."
        className="mt-3 w-full resize-none rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1 disabled:opacity-60"
      />
    );
  }

  return (
    <input
      type="text"
      disabled={desactive}
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ta réponse..."
      className="mt-3 w-full rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1 disabled:opacity-60"
    />
  );
}
