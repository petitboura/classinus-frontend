"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// Au delà de ce nombre d'effets, les points deviendraient trop serrés pour être
// lisibles : on ne garde alors que la ligne et le curseur.
const MAX_POINTS_VISIBLES = 24;

/**
 * Colonne verticale de la visionneuse plein écran : flèche haut, rail avec un
 * point par effet et un curseur, flèche bas. Le défilement de la visionneuse
 * est vertical, la colonne suit donc le même sens. On peut cliquer sur le rail
 * ou faire glisser le curseur (doigt ou souris) pour avancer.
 */
export function RailVisionneur({
  total,
  index,
  onAller,
}: {
  total: number;
  index: number;
  onAller: (i: number, instantane?: boolean) => void;
}) {
  const pisteRef = useRef<HTMLDivElement>(null);
  const [glisse, setGlisse] = useState(false);
  if (total < 2) return null;

  const ratio = index / (total - 1);
  const afficherPoints = total <= MAX_POINTS_VISIBLES;

  function indexDepuisY(clientY: number): number {
    const piste = pisteRef.current;
    if (!piste) return index;
    const r = piste.getBoundingClientRect();
    if (r.height === 0) return index;
    const rel = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    return Math.round(rel * (total - 1));
  }

  function aller(clientY: number) {
    const i = indexDepuisY(clientY);
    if (i !== index) onAller(i, true);
  }

  return (
    <div className="pointer-events-none absolute right-1.5 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2 sm:right-2">
      <button
        type="button"
        onClick={() => onAller(index - 1)}
        disabled={index <= 0}
        aria-label="Effet précédent"
        className="pointer-events-auto hidden h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-all duration-200 hover:bg-black/70 active:scale-90 disabled:pointer-events-none disabled:opacity-30 md:flex"
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      <div
        ref={pisteRef}
        role="slider"
        aria-orientation="vertical"
        aria-label="Position dans les effets"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setGlisse(true);
          aller(e.clientY);
        }}
        onPointerMove={(e) => {
          if (glisse) aller(e.clientY);
        }}
        onPointerUp={() => setGlisse(false)}
        onPointerCancel={() => setGlisse(false)}
        className={`pointer-events-auto relative h-[min(45dvh,20rem)] w-9 touch-none select-none ${
          glisse ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-white/25" />
        {afficherPoints
          ? Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300 ${
                  i <= index ? "bg-white/80" : "bg-white/40"
                }`}
                style={{ top: `${(i / (total - 1)) * 100}%` }}
              />
            ))
          : null}
        <span
          className={`absolute left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg ring-4 ring-black/30 ${
            glisse ? "scale-110" : "transition-[top,transform] duration-300"
          }`}
          style={{ top: `${ratio * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => onAller(index + 1)}
        disabled={index >= total - 1}
        aria-label="Effet suivant"
        className="pointer-events-auto hidden h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-all duration-200 hover:bg-black/70 active:scale-90 disabled:pointer-events-none disabled:opacity-30 md:flex"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}
