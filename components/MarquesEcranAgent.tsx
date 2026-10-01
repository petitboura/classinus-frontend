"use client";

// Marques dessinées par Clovis sur l'écran (cercle, trait dessous, surlignage).
// Montée uniquement dans la fenêtre de superposition (app/agent-superposition).
// Ne capte jamais la souris : les clics traversent vers l'application dessous.
// Chaque marque apparaît, reste le temps voulu par Clovis, puis s'efface ; le
// plugin de superposition la retire de la liste à la fin de sa durée.

import type { MarqueEcranAffichee } from "@/lib/superpositionElectron";

const COULEUR_TRAIT = "#ef4444";
const COULEUR_SURLIGNAGE = "rgba(250, 204, 21, 0.45)";

export function MarquesEcranAgent({ marques }: { marques: MarqueEcranAffichee[] }) {
  if (marques.length === 0) return null;
  return (
    <svg
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2147483000 }}
    >
      <style>{`
        @keyframes marque-vie { 0% { opacity: 0 } 8% { opacity: 1 } 88% { opacity: 1 } 100% { opacity: 0 } }
        @keyframes marque-trace { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
      `}</style>
      {marques.map((m) => {
        const vie = `marque-vie ${m.dureeMs}ms linear forwards`;
        const trace = "marque-trace 600ms ease-out forwards";
        if (m.forme === "surligner") {
          return (
            <rect
              key={m.id}
              x={m.x - 3}
              y={m.y - 2}
              width={m.largeur + 6}
              height={m.hauteur + 4}
              rx={4}
              fill={COULEUR_SURLIGNAGE}
              style={{ animation: vie }}
            />
          );
        }
        if (m.forme === "souligner") {
          const yLigne = m.y + m.hauteur + 3;
          return (
            <g key={m.id} style={{ animation: vie }}>
              <line
                x1={m.x}
                y1={yLigne}
                x2={m.x + m.largeur}
                y2={yLigne}
                pathLength={1}
                stroke={COULEUR_TRAIT}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={1}
                style={{ animation: trace }}
              />
            </g>
          );
        }
        return (
          <g key={m.id} style={{ animation: vie }}>
            <ellipse
              cx={m.x + m.largeur / 2}
              cy={m.y + m.hauteur / 2}
              rx={m.largeur / 2 * 1.15 + 8}
              ry={m.hauteur / 2 * 1.25 + 6}
              pathLength={1}
              fill="none"
              stroke={COULEUR_TRAIT}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={1}
              style={{ animation: trace }}
            />
          </g>
        );
      })}
    </svg>
  );
}
