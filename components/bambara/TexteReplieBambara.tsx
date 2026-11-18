"use client";

// Page bambara (19/11/2026, demande de Bourama) : le texte d'un message (ce que la personne a dit, ce que
// Classinus a répondu) se range sous la bulle audio, replié par défaut : on voit le début sur UNE seule ligne,
// jamais plus, sur ordinateur comme sur téléphone. Un toucher le déplie, un second le replie.
// Noir et blanc seulement : les couleurs viennent de .bb-page (bambara.css).

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  texte: string;
  cote: "droite" | "gauche";
  libelleDeplier: string;
  libelleReplier: string;
};

export function TexteReplieBambara({ texte, cote, libelleDeplier, libelleReplier }: Props) {
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
      className={"flex w-72 max-w-[85%] items-start gap-2 rounded-2xl border px-3 py-2 text-left font-lecture text-sm leading-snug disabled:cursor-default " + (cote === "droite" ? "self-end" : "self-start")}
      style={{ borderColor: "var(--bb-trait)", backgroundColor: cote === "droite" ? "var(--bb-voile)" : "var(--bb-fond)", color: "var(--bb-encre)" }}
    >
      <span
        ref={ligneRef}
        className={"min-w-0 flex-1 " + (ouvert ? "whitespace-pre-line break-words" : "truncate")}
      >
        {texte}
      </span>
      {depliable && (
        <ChevronDown
          size={16}
          className="mt-0.5 shrink-0 transition-transform duration-200"
          style={{ transform: ouvert ? "rotate(180deg)" : "none" }}
        />
      )}
    </button>
  );
}
