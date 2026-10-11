"use client";

// Couche de dessin du crayon (11/10/2026, demande Bourama), montée uniquement dans
// la fenêtre de superposition (app/agent-superposition), canal actif. Tant que le
// crayon est sorti, elle recouvre tout l'écran et capte la souris pour que
// l'étudiant entoure ou souligne ce qu'il veut montrer à Classinus. Crayon rangé,
// elle ne capte plus rien et les clics retraversent vers les applications dessous.
//
// L'état des traits est dans lib/crayonEcran.ts. Les traits sont dessinés en
// pixels de la page de superposition (même repère que les marques de
// MarquesEcranAgent).

import { useEffect, type PointerEvent } from "react";
import { COUCHE_VOIX_PLEIN_ECRAN } from "@/lib/couchesAgent";
import {
  DUREE_FONDU_TRAITS_MS,
  ajouterPoint,
  commencerTrait,
  terminerTrait,
  useCrayonEcran,
  type Trait,
} from "@/lib/crayonEcran";
import { definirModeCrayonSuperposition } from "@/lib/superpositionElectron";

function dessinerTrait(trait: Trait): string {
  const [premier, ...suite] = trait.points;
  if (!premier) return "";
  // Un simple clic donne un point : on le rend visible par un segment minuscule.
  if (suite.length === 0) return `M ${premier.x} ${premier.y} l 0.01 0`;
  return `M ${premier.x} ${premier.y} ${suite.map((p) => `L ${p.x} ${p.y}`).join(" ")}`;
}

export function CoucheCrayonAgent() {
  const { actif, traits, visibles } = useCrayonEcran();

  // Le processus principal d'Electron doit savoir que tout l'écran est à capter
  // tant que le crayon est sorti ; il le relâche dès que le crayon est rangé, et
  // si cette couche disparaît (canal éteint).
  useEffect(() => {
    definirModeCrayonSuperposition(actif);
    return () => definirModeCrayonSuperposition(false);
  }, [actif]);

  function surAppui(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    commencerTrait(e.clientX, e.clientY);
  }
  function surMouvement(e: PointerEvent<SVGSVGElement>) {
    if (e.buttons === 1) ajouterPoint(e.clientX, e.clientY);
  }
  function surRelache(e: PointerEvent<SVGSVGElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    terminerTrait();
  }

  return (
    <svg
      data-agent-superposition={actif ? "true" : undefined}
      aria-hidden="true"
      onPointerDown={actif ? surAppui : undefined}
      onPointerMove={actif ? surMouvement : undefined}
      onPointerUp={actif ? surRelache : undefined}
      onPointerCancel={actif ? surRelache : undefined}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: COUCHE_VOIX_PLEIN_ECRAN,
        pointerEvents: actif ? "auto" : "none",
        cursor: actif ? "crosshair" : "default",
        touchAction: "none",
      }}
    >
      <g
        style={{
          opacity: visibles ? 1 : 0,
          transition: `opacity ${DUREE_FONDU_TRAITS_MS}ms ease`,
          filter: "drop-shadow(0 0 2px rgba(0, 0, 0, 0.55))",
        }}
      >
        {traits.map((trait) => (
          <path
            key={trait.id}
            d={dessinerTrait(trait)}
            fill="none"
            stroke="var(--dj-accent-1)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}
