"use client";

// Maame (23/11/2026, demande de Bourama) : l'unique animation d'ouverture. Le logo apparaît au milieu d'un écran
// uni, puis glisse et rapetisse jusqu'au bouton du haut à gauche, où il prend sa place (voir BarreHautBambara.tsx).
// Elle ne joue qu'une fois par chargement de la page, et pas du tout quand la personne a demandé moins de mouvement.
// Aucun texte : la personne ne lit pas.

import { motion, useReducedMotion, type Transition } from "framer-motion";
import { useLayoutEffect, useState, type RefObject } from "react";
import { COUCHE_VOIX_PLEIN_ECRAN } from "@/lib/couchesAgent";

/** Chemin du logo carré (visage dans son cercle) : celui du bouton et celui de l'animation. */
export const LOGO_MAAME = "/maame/logo-bouton.png";

const DUREE = 2.2;
const TAILLE_LOGO = 144;

type Arrivee = { dx: number; dy: number; echelle: number };

type Props = {
  /** Le bouton où le logo vient se poser. */
  cible: RefObject<HTMLElement>;
  /** L'animation est finie (ou n'a pas lieu) : le bouton montre son propre logo. */
  surFin: () => void;
};

export function OuvertureMaame({ cible, surFin }: Props) {
  const reduit = useReducedMotion();
  const [arrivee, setArrivee] = useState<Arrivee | null>(null);

  // La place du bouton est mesurée avant le premier affichage, pour que le logo parte du bon endroit sans saut.
  useLayoutEffect(() => {
    const bouton = cible.current;
    if (reduit || !bouton) {
      surFin();
      return;
    }
    const r = bouton.getBoundingClientRect();
    setArrivee({
      dx: r.left + r.width / 2 - window.innerWidth / 2,
      dy: r.top + r.height / 2 - window.innerHeight / 2,
      echelle: r.width / TAILLE_LOGO,
    });
  }, [cible, reduit, surFin]);

  if (!arrivee) return null;

  // Le logo apparaît (0 à 30 %), reste un instant (jusqu'à 55 %), puis part vers le bouton ; le fond s'efface pendant ce trajet.
  const temps: Transition = { duration: DUREE, times: [0, 0.3, 0.55, 1], ease: "easeInOut" };

  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: COUCHE_VOIX_PLEIN_ECRAN, backgroundColor: "var(--bb-fond)" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 1, 0] }}
      transition={temps}
    >
      <motion.img
        src={LOGO_MAAME}
        alt=""
        draggable={false}
        width={TAILLE_LOGO}
        height={TAILLE_LOGO}
        className="bb-logo-maame select-none rounded-full"
        initial={{ opacity: 0, scale: 0.7, x: 0, y: 0 }}
        animate={{
          opacity: [0, 1, 1, 1],
          scale: [0.7, 1, 1, arrivee.echelle],
          x: [0, 0, 0, arrivee.dx],
          y: [0, 0, 0, arrivee.dy],
        }}
        transition={temps}
        onAnimationComplete={surFin}
      />
    </motion.div>
  );
}
