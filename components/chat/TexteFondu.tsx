"use client";

import { useEffect, useRef, useState } from "react";

// Texte sur une seule ligne qui finit en fondu quand il est trop long (27/11/2026, demande Bourama),
// à la place du retour à la ligne ou des « ... ». Le fondu ne s'applique que si le texte dépasse
// vraiment : un texte court garde sa fin nette. La boîte prend la largeur de son texte (jusqu'à la
// place disponible), pour que la flèche de dépliage se pose juste après la fin du texte.
export function TexteFondu({
  texte,
  className = "",
  onDebordement,
}: {
  texte: string;
  className?: string;
  // Dit au parent si le texte est coupé (par exemple pour n'afficher la flèche que dans ce cas).
  onDebordement?: (deborde: boolean) => void;
}) {
  const refBoite = useRef<HTMLSpanElement>(null);
  const [deborde, setDeborde] = useState(false);
  const refRappel = useRef(onDebordement);
  refRappel.current = onDebordement;

  useEffect(() => {
    const boite = refBoite.current;
    if (!boite) return;
    const mesurer = () => {
      const coupe = boite.scrollWidth > boite.clientWidth + 1;
      setDeborde(coupe);
      refRappel.current?.(coupe);
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(boite);
    return () => observateur.disconnect();
  }, [texte]);

  return (
    <span ref={refBoite} className={`block min-w-0 overflow-hidden whitespace-nowrap ${deborde ? "dj-fondu-fin" : ""} ${className}`}>
      {texte}
    </span>
  );
}
