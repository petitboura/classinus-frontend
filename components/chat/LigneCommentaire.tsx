"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TexteFondu } from "./TexteFondu";

// Une note de l'IA entre deux outils (25/11/2026, demande Bourama) : une ligne de la timeline des
// outils avec un petit point à la place de l'icône, pour la distinguer d'une ligne d'outil. Même
// colonne icône/ligne connectrice que LigneOutil, donc la ligne reste continue quand une note est
// entre deux outils. Jamais un outil : le texte vient de l'IA, dans la langue de la conversation,
// et n'est donc jamais traduit par l'interface.
//
// 27/11/2026 (demande Bourama) : la note tient sur une seule ligne et finit en fondu au lieu de
// passer à la ligne. Quand elle est coupée, une flèche (posée juste après la fin du texte) permet
// de la déplier pour la lire en entier.
export function LigneCommentaire({ texte, estDerniere }: { texte: string; estDerniere: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  // Une fois vue coupée, la flèche reste, même pendant que la note est dépliée (elle sert à la replier).
  const [peutDeplier, setPeutDeplier] = useState(false);
  return (
    <div className="flex animate-dj-fade-in-rapide gap-2.5">
      <div className="flex w-4 flex-col items-center">
        <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-dj-texte-muet" aria-hidden />
        </div>
        {!estDerniere && <div className="mt-1 min-h-[6px] w-[2px] flex-1 origin-top animate-dj-ligne-trace bg-dj-bordure" />}
      </div>
      <div className={`min-w-0 flex-1 ${estDerniere ? "" : "pb-3"}`}>
        {ouvert ? (
          <button
            type="button"
            onClick={() => setOuvert(false)}
            aria-expanded
            className="flex w-full min-w-0 animate-dj-fade-in-rapide items-start gap-1.5 text-left text-[13px] leading-snug text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <span className="min-w-0 whitespace-pre-wrap break-words">{texte}</span>
            <ChevronDown size={13} className="mt-0.5 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => peutDeplier && setOuvert(true)}
            aria-expanded={false}
            className={`flex w-full min-w-0 items-center gap-1.5 text-left text-[13px] leading-snug text-dj-texte-muet ${
              peutDeplier ? "transition-colors hover:text-dj-texte" : "cursor-default"
            }`}
          >
            <TexteFondu texte={texte} onDebordement={(deborde) => deborde && setPeutDeplier(true)} />
            {peutDeplier && <ChevronRight size={13} className="shrink-0" />}
          </button>
        )}
      </div>
    </div>
  );
}
