"use client";

// Page bambara (22/11/2026, demande de Bourama) : pendant que la personne parle, un indicateur le montre et
// montre que sa voix est enregistrée, comme sur WhatsApp : un point qui bat, le temps écoulé et des barres qui
// bougent avec le son du micro. Noir et blanc seulement (couleurs de .bb-page), fond d'encre pour bien se voir.

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const NOMBRE_BARRES = 14;

type Props = {
  /** Niveau sonore actuel du micro entre 0 et 1. */
  niveau: () => number;
  /** Lu seulement par les lecteurs d'écran. */
  libelle: string;
};

function formaterDuree(secondes: number): string {
  const minutes = Math.floor(secondes / 60);
  return `${minutes}:${String(secondes % 60).padStart(2, "0")}`;
}

export function IndicateurEnregistrementBambara({ niveau, libelle }: Props) {
  const [secondes, setSecondes] = useState(0);
  const [barres, setBarres] = useState<number[]>(() => Array(NOMBRE_BARRES).fill(0.08));

  useEffect(() => {
    const debut = Date.now();
    const minuteur = setInterval(() => setSecondes(Math.floor((Date.now() - debut) / 1000)), 250);
    const onde = setInterval(() => {
      const valeur = Math.max(0.08, Math.min(1, niveau()));
      setBarres((precedentes) => [...precedentes.slice(1), valeur]);
    }, 90);
    return () => {
      clearInterval(minuteur);
      clearInterval(onde);
    };
  }, [niveau]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      role="status"
      aria-label={libelle}
      className="pointer-events-none flex items-center gap-3 rounded-full px-4 py-2"
      style={{ backgroundColor: "var(--bb-encre)", color: "var(--bb-fond)" }}
    >
      <span className="bb-point-enregistrement h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: "var(--bb-fond)" }} />
      <span className="w-10 text-base tabular-nums leading-none">{formaterDuree(secondes)}</span>
      <span className="flex h-6 items-center gap-[3px]" aria-hidden="true">
        {barres.map((hauteur, i) => (
          <span key={i} className="w-[3px] rounded-full" style={{ height: `${Math.round(hauteur * 100)}%`, backgroundColor: "var(--bb-fond)" }} />
        ))}
      </span>
    </motion.div>
  );
}
