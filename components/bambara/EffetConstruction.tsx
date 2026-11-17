"use client";

// Page bambara (16/11/2026, demande de Bourama) : effet visuel montré pendant qu'un outil travaille.
// « Une ligne avec icône et libellé ne fera pas l'affaire, il faut un effet de construire sous tes
// yeux. » Aucun texte : des tuiles qui se posent une à une pour dessiner une image ou une vidéo, des
// cartes de résultats qui se montent pour une recherche. Les styles sont dans bambara.css.

import type { CSSProperties } from "react";
import type { EffetConstruction as Effet } from "@/lib/pageBambaraVisuels";

type StyleVariables = CSSProperties & Record<`--${string}`, string | number>;

// Retard et teinte de chaque tuile : suite fixe (jamais de hasard), les tuiles se posent en désordre
// d'apparence mais toujours de la même façon.
function tuiles(colonnes: number, lignes: number, etalement: number, decalage = 0) {
  const total = colonnes * lignes;
  return Array.from({ length: total }, (_, i) => {
    const retard = (((i * 37 + decalage * 11) % 101) / 101) * etalement;
    const teinte = 25 + ((i * 53 + decalage * 17) % 70);
    const style: StyleVariables = { "--d": `${retard.toFixed(2)}s`, "--m": teinte };
    return <span key={i} className="bb-tuile" style={style} />;
  });
}

function Cadre({ ratio, colonnes, lignes, etalement = 2.1, decalage = 0, lecture = false, className }: {
  ratio: string;
  colonnes: number;
  lignes: number;
  etalement?: number;
  decalage?: number;
  lecture?: boolean;
  className?: string;
}) {
  return (
    <div className={`bb-cadre ${className ?? ""}`} style={{ aspectRatio: ratio }}>
      <div className="bb-grille" style={{ gridTemplateColumns: `repeat(${colonnes}, 1fr)`, gridTemplateRows: `repeat(${lignes}, 1fr)` }}>
        {tuiles(colonnes, lignes, etalement, decalage)}
      </div>
      <span className="bb-balayage" />
      {lecture && <span className="bb-lecture" />}
    </div>
  );
}

function Cartes() {
  return (
    <div className="flex w-full flex-col gap-3">
      {[0, 1, 2].map((i) => {
        const style: StyleVariables = { "--d": `${(i * 0.55).toFixed(2)}s` };
        return (
          <div key={i} className="bb-carte" style={style}>
            <span className="bb-carte-vignette" />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <span className="bb-carte-ligne" style={{ width: "92%", "--l": "0.15s" } as StyleVariables} />
              <span className="bb-carte-ligne" style={{ width: "70%", "--l": "0.3s" } as StyleVariables} />
              <span className="bb-carte-ligne" style={{ width: "46%", "--l": "0.45s" } as StyleVariables} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EffetConstruction({ effet }: { effet: Effet }) {
  switch (effet) {
    case "creation":
      return <Cadre ratio="16 / 9" colonnes={16} lignes={9} className="w-full" />;
    case "videos":
      return <Cadre ratio="16 / 9" colonnes={16} lignes={9} lecture className="w-full" />;
    case "images":
      return (
        <div className="grid w-full grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Cadre key={i} ratio="1 / 1" colonnes={7} lignes={7} etalement={1.8} decalage={i * 3} />
          ))}
        </div>
      );
    case "recherche":
      return <Cartes />;
  }
}
