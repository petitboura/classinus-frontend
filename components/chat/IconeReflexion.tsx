"use client";

import { useEffect, useState } from "react";
import { Atom, Feather, Lightbulb, Sparkle, Waypoints, type LucideIcon } from "lucide-react";
import { DUREES_ATTENTE_MS, tirerAutre } from "@/lib/messageAttente";

// Icône de la réflexion (27/11/2026, demande Bourama, remplace le cerveau).
// Pendant que le modèle réfléchit, elle change à un rythme irrégulier parmi six
// icônes animées. Une fois la réflexion finie, elle reste immobile.

type Variante = { Icone: LucideIcon | null; animation: string };

// `Icone: null` désigne les trois points, qui s'animent chacun leur tour.
const VARIANTES: readonly Variante[] = [
  { Icone: Sparkle, animation: "animate-dj-icone-etincelle" },
  { Icone: Lightbulb, animation: "animate-dj-icone-lueur" },
  { Icone: Atom, animation: "animate-dj-icone-tour" },
  { Icone: Waypoints, animation: "animate-dj-icone-tour" },
  { Icone: Feather, animation: "animate-dj-icone-plume" },
  { Icone: null, animation: "" },
];

// Trois points immobiles ressembleraient à un chargement resté bloqué : ils ne
// servent que pendant la réflexion.
const VARIANTES_FINIES = VARIANTES.filter((variante) => variante.Icone !== null);

const DELAI_POINT_MS = 150;

// Même icône à chaque affichage d'une réflexion finie, différente d'une
// réflexion à l'autre : le choix vient de son texte.
function varianteFinie(graine: string): Variante {
  let somme = 0;
  for (let i = 0; i < graine.length; i++) somme = (somme * 31 + graine.charCodeAt(i)) >>> 0;
  return VARIANTES_FINIES[somme % VARIANTES_FINIES.length];
}

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

export function IconeReflexion({ enCours, graine, taille = 13 }: { enCours: boolean; graine: string; taille?: number }) {
  const [courante, setCourante] = useState<Variante>(() => tirerAutre(VARIANTES));

  useEffect(() => {
    if (!enCours) return;
    const minuteur = window.setTimeout(
      () => setCourante((avant) => tirerAutre(VARIANTES, avant)),
      tirerAutre<number>(DUREES_ATTENTE_MS)
    );
    return () => window.clearTimeout(minuteur);
  }, [enCours, courante]);

  const variante = enCours ? courante : varianteFinie(graine);
  const { Icone } = variante;

  return (
    // La clé relance le fondu à chaque changement d'icône.
    <span
      key={VARIANTES.indexOf(variante)}
      className="flex animate-dj-fade-in-rapide items-center justify-center text-dj-texte motion-reduce:animate-none"
    >
      <span className={`flex ${enCours ? variante.animation : ""} motion-reduce:animate-none`}>
        {Icone ? <Icone size={taille} /> : <TroisPoints taille={taille} />}
      </span>
    </span>
  );
}
