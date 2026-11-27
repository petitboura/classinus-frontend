"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { IconeReflexion } from "./IconeReflexion";
import { TexteFondu } from "./TexteFondu";

// Une réflexion du modèle dans la liste dépliée des outils (26/11/2026, demande Bourama), à la même
// place que les outils et les notes, dans l'ordre réel. La ligne montre son titre ; un clic la déplie
// pour lire le texte brut de la réflexion, comme le résultat d'un outil. Pendant que le modèle
// réfléchit, le titre scintille. Le titre tient sur une seule ligne et finit en fondu au lieu de
// passer à la ligne (27/11/2026, demande Bourama) ; la flèche suit la fin du titre. Le texte complet
// ne se lit qu'une fois la ligne dépliée.
export function LigneReflexion({
  titre,
  brut,
  enCours,
  estDerniere,
}: {
  titre: string;
  brut: string;
  enCours: boolean;
  estDerniere: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="flex animate-dj-fade-in-rapide gap-2.5">
      <div className="flex w-4 flex-col items-center">
        <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <IconeReflexion enCours={enCours} />
        </div>
        {!estDerniere && <div className="mt-1 min-h-[6px] w-[2px] flex-1 origin-top animate-dj-ligne-trace bg-dj-bordure" />}
      </div>
      <div className={`min-w-0 flex-1 ${estDerniere ? "" : "pb-3"}`}>
        <button
          type="button"
          onClick={() => setOuvert((precedent) => !precedent)}
          aria-expanded={ouvert}
          className="flex w-full min-w-0 items-center gap-1.5 text-left text-[13px] leading-snug text-dj-texte-muet transition-colors hover:text-dj-texte"
        >
          <TexteFondu
            texte={titre}
            className={enCours ? "animate-dj-shimmer bg-dj-shimmer-texte bg-[length:200%_100%] bg-clip-text text-transparent" : ""}
          />
          {ouvert ? (
            <ChevronDown size={13} className="shrink-0" />
          ) : (
            <ChevronRight size={13} className="shrink-0" />
          )}
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            ouvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mt-1.5 whitespace-pre-wrap break-words border-l-2 border-dj-bordure pl-3 text-[13px] italic leading-relaxed text-dj-texte-muet">
              {brut}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
