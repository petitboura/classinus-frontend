"use client";

import { useEffect, useState } from "react";
import { Atom, Feather, Lightbulb, Orbit, Sparkle, Waypoints, type LucideIcon } from "lucide-react";
import { DUREES_ATTENTE_MS, tirerAutre } from "@/lib/messageAttente";

// Icône de la réflexion (27/11/2026, demande Bourama, remplace le cerveau).
// Pendant que le modèle réfléchit, elle change à un rythme irrégulier parmi sept
// icônes animées. Une fois la réflexion finie, l'ampoule reste, immobile.

type Variante = { Icone: LucideIcon | null; animation: string };

// `Icone: null` désigne les trois points, qui s'animent chacun leur tour.
const VARIANTES: readonly Variante[] = [
  { Icone: Sparkle, animation: "animate-dj-icone-etincelle" },
  { Icone: Lightbulb, animation: "animate-dj-icone-lueur" },
  { Icone: Atom, animation: "animate-dj-icone-tour" },
  { Icone: Orbit, animation: "animate-dj-icone-tour" },
  { Icone: Waypoints, animation: "animate-dj-icone-tour" },
  { Icone: Feather, animation: "animate-dj-icone-plume" },
  { Icone: null, animation: "" },
];

const VARIANTE_FINIE: Variante = { Icone: Lightbulb, animation: "" };

const DELAI_POINT_MS = 150;

function TroisPoints({ taille }: { taille: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="overflow-visible">
      {[4, 12, 20].map((x, rang) => (
        <circle
          key={x}
          cx={x}
          cy={14}
          r={2.6}
          className="animate-cgpt-point-reflexion motion-reduce:animate-none"
          style={{ animationDelay: `${rang * DELAI_POINT_MS}ms` }}
        />
      ))}
    </svg>
  );
}

export function IconeReflexion({ enCours, taille = 13 }: { enCours: boolean; taille?: number }) {
  const [courante, setCourante] = useState<Variante>(() => tirerAutre(VARIANTES));

  useEffect(() => {
    if (!enCours) return;
    const minuteur = window.setTimeout(
      () => setCourante((avant) => tirerAutre(VARIANTES, avant)),
      tirerAutre<number>(DUREES_ATTENTE_MS)
    );
    return () => window.clearTimeout(minuteur);
  }, [enCours, courante]);

  const variante = enCours ? courante : VARIANTE_FINIE;
  const { Icone } = variante;

  return (
    // La clé relance le fondu à chaque changement d'icône.
    <span
      key={enCours ? VARIANTES.indexOf(variante) : "finie"}
      className="flex animate-dj-fade-in-rapide items-center justify-center text-dj-texte motion-reduce:animate-none"
    >
      <span className={`flex ${enCours ? variante.animation : ""} motion-reduce:animate-none`}>
        {Icone ? <Icone size={taille} /> : <TroisPoints taille={taille} />}
      </span>
    </span>
  );
}
