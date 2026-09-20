"use client";

import type { HeuresPointe } from "@/lib/api";

// Grille de chaleur jour x heure (20/09/2026, demande Bourama), façon
// carte de contributions -- une case par heure de la journée (0-23),
// une ligne par jour de la semaine. L'intensité de couleur est relative
// au maximum de LA GRILLE ENTIÈRE, pas ligne par ligne, pour que les
// jours se comparent visuellement entre eux (sinon un jour avec 1 seul
// message ressemblerait au jour le plus actif).
//
// Pas de recharts ici : recharts n'a pas de type "heatmap" intégré, une
// vraie grille CSS est plus simple et plus légère qu'un composant
// recharts détourné pour l'occasion (standards-dev #5, simplicité).

const LABELS_JOURS: Record<string, string> = {
  lundi: "Lun",
  mardi: "Mar",
  mercredi: "Mer",
  jeudi: "Jeu",
  vendredi: "Ven",
  samedi: "Sam",
  dimanche: "Dim",
};

function intensite(valeur: number, max: number): string {
  if (max === 0 || valeur === 0) return "var(--dj-surface-haute)";
  const ratio = valeur / max;
  // Palette à 4 paliers plutôt qu'un dégradé continu calculé : plus
  // lisible d'un coup d'œil, et évite une case "presque invisible" pour
  // une petite valeur non nulle (mauvais signal : on veut voir qu'il
  // s'est passé quelque chose, même peu).
  if (ratio > 0.75) return "var(--dj-accent-1)";
  if (ratio > 0.45) return "color-mix(in srgb, var(--dj-accent-1) 65%, var(--dj-surface-haute))";
  if (ratio > 0.15) return "color-mix(in srgb, var(--dj-accent-1) 35%, var(--dj-surface-haute))";
  return "color-mix(in srgb, var(--dj-accent-1) 15%, var(--dj-surface-haute))";
}

export function CarteChaleurHeures({ donnees }: { donnees: HeuresPointe }) {
  const max = Math.max(0, ...donnees.grille.flat());
  const totalMessages = donnees.grille.flat().reduce((a, b) => a + b, 0);

  if (totalMessages === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
        Pas encore assez d&apos;activité pour repérer des heures de pointe.
      </div>
    );
  }

  return (
    <div className="animate-dj-fade-in-rapide rounded-xl border border-dj-bordure bg-dj-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-dj-texte">Heures de pointe</p>
        {donnees.jour_plus_frequente && (
          <span className="rounded-full bg-dj-accent-1-conteneur px-2.5 py-1 text-[11px] font-medium text-dj-accent-1-texte">
            Jour le plus actif : {LABELS_JOURS[donnees.jour_plus_frequente] ?? donnees.jour_plus_frequente}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[560px] flex-col gap-1">
          <div className="flex gap-1 pl-9">
            {Array.from({ length: 24 }, (_, heure) => (
              <div key={heure} className="w-4 flex-shrink-0 text-center text-[9px] text-dj-texte-muet">
                {heure % 3 === 0 ? heure : ""}
              </div>
            ))}
          </div>
          {donnees.jours.map((jour, indexJour) => (
            <div key={jour} className="flex items-center gap-1">
              <span className="w-8 flex-shrink-0 text-[10px] text-dj-texte-muet">{LABELS_JOURS[jour] ?? jour}</span>
              {donnees.grille[indexJour].map((valeur, heure) => (
                <div
                  key={heure}
                  title={`${LABELS_JOURS[jour] ?? jour} ${heure}h : ${valeur} question${valeur > 1 ? "s" : ""}`}
                  className="h-4 w-4 flex-shrink-0 rounded-[3px] transition-colors"
                  style={{ background: intensite(valeur, max) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
