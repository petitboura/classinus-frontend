"use client";

// Page bambara (19/11/2026, demande de Bourama) : le texte de la réponse de Classinus se range sous sa bulle audio,
// replié par défaut : on voit le début sur UNE seule ligne, jamais plus, sur ordinateur comme sur téléphone. Il n'est
// pas enfermé dans une case et sa mise en forme ne change pas quand il est déplié : seul le nombre de lignes change.
// La flèche pointe vers la droite quand il est replié et vers le bas quand il est déplié, comme dans Claude.
// Noir et blanc seulement : les couleurs viennent de .bb-page (bambara.css).

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  texte: string;
  libelleDeplier: string;
  libelleReplier: string;
};

export function TexteReplieBambara({ texte, libelleDeplier, libelleReplier }: Props) {
  const ligneRef = useRef<HTMLSpanElement>(null);
  const [ouvert, setOuvert] = useState(false);
  // Le texte déborde de sa ligne : seulement alors il y a quelque chose à déplier.
  const [deborde, setDeborde] = useState(false);

  useEffect(() => {
    const ligne = ligneRef.current;
    if (!ligne || ouvert) return;
    const mesurer = () => setDeborde(ligne.scrollWidth > ligne.clientWidth + 1);
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(ligne);
    return () => observateur.disconnect();
  }, [texte, ouvert]);

  const depliable = deborde || ouvert;

  return (
    <button
      type="button"
      onClick={() => setOuvert((v) => !v)}
      disabled={!depliable}
      aria-expanded={depliable ? ouvert : undefined}
      aria-label={depliable ? (ouvert ? libelleReplier : libelleDeplier) : undefined}
      className="flex w-full items-start gap-2 text-left disabled:cursor-default"
      style={{ color: "var(--bb-encre)" }}
    >
      <span
        ref={ligneRef}
        className={"min-w-0 flex-1 font-lecture text-base leading-relaxed " + (ouvert ? "whitespace-pre-line break-words" : "truncate")}
      >
        {texte}
      </span>
      {depliable && (
        <ChevronRight
          size={18}
          className="mt-1 shrink-0 transition-transform duration-200"
          style={{ transform: ouvert ? "rotate(90deg)" : "none" }}
        />
      )}
    </button>
  );
}
