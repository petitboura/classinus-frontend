"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { SourcesBulle } from "./SourcesBulle";

// Ligne « Sources » tout en bas des outils d'un tour (28/11/2026, demande Bourama) : une seule
// ligne, dans la même colonne icône/ligne connectrice que les lignes d'outils, qui déplie la liste
// de TOUTES les sources de TOUS les outils du tour. Chaque outil garde en plus ses propres sources,
// dépliées par ses petits cercles (voir LigneOutil.tsx).
export function LigneSourcesTour({ sources }: { sources: NonNullable<ComponentProps<typeof SourcesBulle>["sources"]> }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="flex animate-dj-fade-in-rapide gap-2.5">
      <div className="flex w-4 flex-col items-center">
        <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <Link2 size={13} className="text-dj-texte" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOuvert((precedent) => !precedent)}
          aria-expanded={ouvert}
          className="flex min-w-0 items-center gap-1.5 text-left text-[13px] leading-snug text-dj-texte-muet transition-colors hover:text-dj-texte"
        >
          <span>Sources ({sources.length})</span>
          {ouvert ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            ouvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <SourcesBulle sources={sources} />
          </div>
        </div>
      </div>
    </div>
  );
}
