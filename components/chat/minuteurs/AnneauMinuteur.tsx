"use client";

import { Check } from "lucide-react";
import { formaterTemps, type StatutMinuteur } from "@/lib/minuteurs";

const TAILLE = 56;
const EPAISSEUR = 4;
const RAYON = (TAILLE - EPAISSEUR) / 2;
const CIRCONFERENCE = 2 * Math.PI * RAYON;

// Anneau qui se vide au fil du temps, avec le temps restant au centre
// (20/09/2026, demande Bourama, minuteurs du chat). Terminé : anneau plein
// vert avec une coche. Arrêté : anneau gris figé.
export function AnneauMinuteur({
  secondesRestantes,
  dureeSecondes,
  statut,
}: {
  secondesRestantes: number;
  dureeSecondes: number;
  statut: StatutMinuteur;
}) {
  const fraction = statut === "termine" ? 1 : dureeSecondes > 0 ? Math.min(1, secondesRestantes / dureeSecondes) : 0;
  const couleur = statut === "termine" ? "var(--dj-succes)" : statut === "arrete" ? "var(--dj-inactif)" : "var(--dj-accent-1)";
  const temps = formaterTemps(secondesRestantes);

  return (
    <div className="relative flex-shrink-0" style={{ width: TAILLE, height: TAILLE }}>
      <svg width={TAILLE} height={TAILLE} viewBox={`0 0 ${TAILLE} ${TAILLE}`} className="-rotate-90" aria-hidden>
        <circle cx={TAILLE / 2} cy={TAILLE / 2} r={RAYON} fill="none" stroke="var(--dj-bordure)" strokeWidth={EPAISSEUR} />
        <circle
          cx={TAILLE / 2}
          cy={TAILLE / 2}
          r={RAYON}
          fill="none"
          stroke={couleur}
          strokeWidth={EPAISSEUR}
          strokeLinecap="round"
          strokeDasharray={CIRCONFERENCE}
          strokeDashoffset={CIRCONFERENCE * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 0.4s linear, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {statut === "termine" ? (
          <Check size={22} style={{ color: "var(--dj-succes)" }} aria-hidden />
        ) : (
          <span
            role="timer"
            className={`font-semibold tabular-nums text-dj-texte ${temps.length > 5 ? "text-[11px]" : "text-[13px]"}`}
          >
            {temps}
          </span>
        )}
      </div>
    </div>
  );
}
