"use client";

// Page bambara (16/11/2026, demande de Bourama) : effet visuel montré pendant qu'un outil travaille.
// « Une ligne avec icône et libellé ne fera pas l'affaire. » Aucun texte, et rien qui ressemble à du texte :
// l'utilisateur ne sait pas lire.
// Refonte du 22/11/2026 (demande de Bourama : « les effets sont nuls, fais comme chez Google ») : des cases
// grises dont une lueur douce traverse la surface, comme l'attente de Google Images. Les cases ont la forme
// et la disposition exactes des résultats qui vont arriver (RangeesVisuelsBambara.tsx : rangées de hauteur
// égale pour les images, format vidéo pour les vidéos), donc rien ne saute quand les vraies vignettes apparaissent.
// Styles : bambara.css (.bb-case).

import type { CSSProperties } from "react";
import type { EffetConstruction as Effet } from "@/lib/pageBambaraVisuels";
import { styleHauteur, styleRangee } from "./rangeesImages";

// Ratios (largeur divisée par hauteur) des cases d'images : suite fixe (jamais de hasard), variée comme de vraies rangées.
const RATIOS_IMAGES = [1.5, 0.8, 1.33, 1, 1.78, 0.75];
const VIDEOS = [0, 1, 2, 3];
const SONDES = [0, 1, 2];

// Retard de la lueur de chaque case : elles ne brillent pas toutes au même instant, ce qui donne la vague.
function retard(i: number): CSSProperties {
  return { "--d": `${(i * 0.18).toFixed(2)}s` } as CSSProperties;
}

function Case({ proportion, i, className, lecture = false }: { proportion?: string; i: number; className?: string; lecture?: boolean }) {
  return (
    <div className={`bb-case ${className ?? ""}`} style={{ ...retard(i), ...(proportion ? { aspectRatio: proportion } : {}) }}>
      {lecture && <span className="bb-case-lecture" />}
    </div>
  );
}

export function EffetConstruction({ effet }: { effet: Effet }) {
  switch (effet) {
    case "creation":
      return (
        <div aria-hidden="true" className="w-full">
          <Case proportion="4 / 3" i={0} className="w-full" />
        </div>
      );
    case "videos":
      return (
        <div aria-hidden="true" className="grid w-full grid-cols-2 gap-2 lg:grid-cols-3">
          {VIDEOS.map((i) => (
            <Case key={i} proportion="16 / 9" i={i} lecture className={i === 3 ? "lg:hidden" : ""} />
          ))}
        </div>
      );
    case "images":
      return (
        <div aria-hidden="true" className="bb-rangees-images w-full">
          {RATIOS_IMAGES.map((ratio, i) => (
            <div key={i} className="bb-case" style={{ ...retard(i), ...styleRangee(ratio) }}>
              <span style={styleHauteur(ratio)} />
            </div>
          ))}
        </div>
      );
    case "recherche":
      return (
        <div aria-hidden="true" className="grid w-full grid-cols-3 gap-2">
          {SONDES.map((i) => (
            <Case key={i} proportion="1 / 1" i={i} />
          ))}
        </div>
      );
  }
}
