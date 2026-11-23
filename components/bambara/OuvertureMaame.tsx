"use client";

// Maame (23/11/2026, demande de Bourama) : l'unique animation d'ouverture. Refaite le 24/11/2026 pour ressembler à
// celle de Classinus (components/SplashOuverture.tsx), en noir et blanc :
// 1. le logo apparaît en fondu, en grossissant un peu et en passant du flou au net ;
// 2. une lueur se lève derrière lui (de la couleur de l'encre de la page, donc grise sur fond blanc, claire sur fond noir) ;
// 3. un reflet traverse le logo en diagonale ;
// 4. le mot « Maame » se dévoile de gauche à droite sous le logo ;
// 5. le mot et la lueur s'effacent, puis le logo glisse et rapetisse jusqu'au bouton du haut à gauche, où il prend sa
//    place (voir BarreHautBambara.tsx), pendant que le fond s'efface.
// Elle ne joue qu'une fois par chargement de la page, et pas du tout quand la personne a demandé moins de mouvement.
// L'écran d'ouverture de Classinus est caché sur Maame (globals.css, html[data-maame]) : les deux ne se superposent jamais.

import { motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useState, type RefObject } from "react";
import { COUCHE_VOIX_PLEIN_ECRAN } from "@/lib/couchesAgent";

/** Chemin du logo carré (visage dans son cercle) : celui du bouton et celui de l'animation. */
export const LOGO_MAAME = "/maame/logo-bouton.png";

const TAILLE_LOGO = 144;
// Les temps sont en secondes. Le logo entre à 0,1 s, le reflet passe à 1 s, le mot se dévoile à 1,05 s (comme Classinus),
// puis tout se retient jusqu'au départ vers le bouton.
const DEBUT_DEPART = 2.4;
const DUREE = 3.4;

// Position d'un instant dans la durée totale, entre 0 et 1 (les images clés de framer-motion s'écrivent ainsi).
const t = (secondes: number) => secondes / DUREE;

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

  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: COUCHE_VOIX_PLEIN_ECRAN, backgroundColor: "var(--bb-fond)" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: DUREE, times: [0, t(DEBUT_DEPART), 1], ease: "easeInOut" }}
    >
      {/* Lueur derrière le logo : elle reste au milieu et s'efface avant le départ. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          width: TAILLE_LOGO + 120,
          height: TAILLE_LOGO + 120,
          background: "radial-gradient(circle, var(--bb-encre) 0%, transparent 62%)",
          filter: "blur(14px)",
        }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0, 0.45, 0.25, 0.25, 0], scale: [0.6, 0.6, 1.05, 1, 1, 1] }}
        transition={{ duration: DUREE, times: [0, t(0.1), t(0.55), t(1.9), t(DEBUT_DEPART), t(2.9)], ease: "easeOut" }}
      />

      {/* Le mot : sa place est sa place finale dès le départ, c'est le clip-path qui le révèle de gauche à droite. */}
      <motion.span
        className="absolute left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display font-bold leading-none"
        style={{ top: `calc(50% + ${TAILLE_LOGO / 2 + 26}px)`, fontSize: 44, color: "var(--bb-encre)" }}
        initial={{ clipPath: "inset(0 100% 0 0)", opacity: 1 }}
        animate={{ clipPath: "inset(0 0% 0 0)", opacity: [1, 1, 0] }}
        transition={{
          clipPath: { duration: 0.9, delay: 1.05, ease: [0.25, 0.8, 0.35, 1] },
          opacity: { duration: DUREE, times: [0, t(DEBUT_DEPART), 1], ease: "easeIn" },
        }}
      >
        Maame
      </motion.span>

      <motion.div
        className="relative"
        style={{ width: TAILLE_LOGO, height: TAILLE_LOGO }}
        initial={{ opacity: 0, scale: 0.78, filter: "blur(10px)", x: 0, y: 0 }}
        animate={{
          opacity: [0, 0, 1, 1, 1, 1],
          scale: [0.78, 0.78, 1.03, 1, 1, arrivee.echelle],
          filter: ["blur(10px)", "blur(10px)", "blur(0px)", "blur(0px)", "blur(0px)", "blur(0px)"],
          x: [0, 0, 0, 0, 0, arrivee.dx],
          y: [0, 0, 0, 0, 0, arrivee.dy],
        }}
        transition={{
          duration: DUREE,
          times: [0, t(0.1), t(0.67), t(1.05), t(DEBUT_DEPART), 1],
          ease: ["easeOut", "easeOut", "easeOut", "linear", "easeInOut"],
        }}
        onAnimationComplete={surFin}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_MAAME}
          alt=""
          draggable={false}
          width={TAILLE_LOGO}
          height={TAILLE_LOGO}
          className="bb-logo-maame h-full w-full select-none rounded-full"
        />
        {/* Reflet qui traverse le logo, coupé à la forme ronde pour ne jamais déborder. */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent)", skewX: -18 }}
            initial={{ opacity: 0, x: "-120%" }}
            animate={{ opacity: [0, 1, 0], x: ["-120%", "100%", "320%"] }}
            transition={{ duration: 0.9, delay: 1, ease: "easeInOut", times: [0, 0.15, 1] }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
