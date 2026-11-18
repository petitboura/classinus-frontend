"use client";

// Page bambara (16/11/2026, demande de Bourama) : effet visuel montré pendant qu'un outil travaille.
// « Une ligne avec icône et libellé ne fera pas l'affaire, il faut un effet de construire sous tes
// yeux. » Aucun texte, et rien qui ressemble à du texte (pas de fausses lignes d'écriture) : l'utilisateur
// ne sait pas lire.
// Refonte du 18/11/2026 : un cadre de photo (coins de repérage, trame de points qui se développe, fine
// ligne de balayage) pour créer une image ou chercher une vidéo ; trois petits cadres de photo pour les
// images ; trois cadres vides qui s'allument l'un après l'autre pour la recherche. Styles : bambara.css.

import type { CSSProperties } from "react";
import type { EffetConstruction as Effet } from "@/lib/pageBambaraVisuels";

type StyleVariables = CSSProperties & Record<`--${string}`, string | number>;

// Taille et retard de chaque point de la trame : suite fixe (jamais de hasard). Le retard suit la
// diagonale, donc la trame se développe en vague d'un coin à l'autre ; la taille varie doucement, ce qui
// dessine des formes sans jamais montrer de texte.
function points(colonnes: number, lignes: number, etalement: number, decalage: number) {
  return Array.from({ length: colonnes * lignes }, (_, i) => {
    const x = i % colonnes;
    const y = Math.floor(i / colonnes);
    const retard = ((x + y) / (colonnes + lignes - 2)) * etalement;
    const relief = 0.5 + 0.5 * Math.sin(x * 0.55 + decalage) * Math.cos(y * 0.7 + decalage * 0.8);
    const style: StyleVariables = { "--d": `${retard.toFixed(2)}s`, "--s": (0.18 + 0.82 * relief).toFixed(2) };
    return <span key={i} className="bb-point" style={style} />;
  });
}

function Cadre({ colonnes, lignes, etalement = 1.5, decalage = 0, lecture = false, className }: {
  colonnes: number;
  lignes: number;
  etalement?: number;
  decalage?: number;
  lecture?: boolean;
  className?: string;
}) {
  return (
    <div className={`bb-cadre ${className ?? ""}`} style={{ aspectRatio: `${colonnes} / ${lignes}` }}>
      <div className="bb-grille" style={{ gridTemplateColumns: `repeat(${colonnes}, 1fr)`, gridTemplateRows: `repeat(${lignes}, 1fr)` }}>
        {points(colonnes, lignes, etalement, decalage)}
      </div>
      <span className="bb-balayage" />
      <span className="bb-coin bb-coin-hg" />
      <span className="bb-coin bb-coin-hd" />
      <span className="bb-coin bb-coin-bg" />
      <span className="bb-coin bb-coin-bd" />
      {lecture && <span className="bb-lecture" />}
    </div>
  );
}

function Sondes() {
  return (
    <div className="grid w-full grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => {
        const style: StyleVariables = { "--d": `${(i * 0.55).toFixed(2)}s` };
        return <span key={i} className="bb-sonde" style={style} />;
      })}
    </div>
  );
}

export function EffetConstruction({ effet }: { effet: Effet }) {
  switch (effet) {
    case "creation":
      return <Cadre colonnes={24} lignes={14} className="w-full" />;
    case "videos":
      return <Cadre colonnes={24} lignes={14} lecture className="w-full" />;
    case "images":
      return (
        <div className="grid w-full grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Cadre key={i} colonnes={10} lignes={10} etalement={1.3} decalage={i * 2.3} />
          ))}
        </div>
      );
    case "recherche":
      return <Sondes />;
  }
}
