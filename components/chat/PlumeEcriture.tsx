"use client";

import { useEffect, useRef, useState } from "react";

// Plume d'écriture (16/10/2026, demande de Bourama).
// Pendant que la réponse du LLM se génère, la vraie plume du logo danse et
// trace un zigzag doux, de la gauche vers la droite, TOUJOURS sous la
// dernière ligne de la réponse. Ce composant s'ajoute PAR DESSUS : il ne
// touche ni à l'apparition du texte ni au rendu des lignes, il est rendu
// juste après le bloc de texte et se retrouve donc naturellement sous la
// dernière ligne, quelle que soit la longueur de la réponse.
// Aucun texte affiché (décoratif, aria-hidden), donc rien à traduire. La
// couleur vient du thème (--dj-logo-2), claire ou sombre.

// Valeurs de réglage uniques, à ajuster ici après test.
const AMPLITUDE_PX = 1.5; // hauteur de la courbe (plus petit = plus plat)
const LONGUEUR_ONDE_PX = 20; // distance entre deux creux
const PART_LARGEUR = 0.72; // le zigzag ne va jamais jusqu'au bord
const TAILLE_PLUME_PX = 26;
const HAUTEUR_VOIE_PX = 30; // place réservée sous la dernière ligne
const EPAISSEUR_TRAIT_PX = 1.6;
const DUREE_CYCLE_MS = 1800; // un aller de gauche à droite
const DUREE_SORTIE_MS = 450; // fondu de sortie une fois la réponse finie
// Position verticale du zigzag dans la voie (pointe de la plume dessus).
const Y_BASE_PX = HAUTEUR_VOIE_PX - 4;
// Position de la pointe dans l'image de la plume (mesurée sur le logo, la
// plume est retournée pour que sa pointe soit à droite, côté mouvement).
const POINTE_X = 0.85;
const POINTE_Y = 0.94;

function adoucir(x: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

export function PlumeEcriture({ actif }: { actif: boolean }) {
  const [monte, setMonte] = useState(false);
  const [affiche, setAffiche] = useState(false);
  const conteneurRef = useRef<HTMLDivElement | null>(null);
  const traitRef = useRef<SVGPathElement | null>(null);
  const plumeRef = useRef<HTMLDivElement | null>(null);

  // Apparition et sortie en fondu (jamais d'affichage brut) : la voie est
  // montée dès que la génération démarre, puis retirée une fois le fondu
  // de sortie terminé.
  useEffect(() => {
    if (actif) {
      setMonte(true);
      const id = requestAnimationFrame(() => setAffiche(true));
      return () => cancelAnimationFrame(id);
    }
    setAffiche(false);
    const id = setTimeout(() => setMonte(false), DUREE_SORTIE_MS + 50);
    return () => clearTimeout(id);
  }, [actif]);

  useEffect(() => {
    const conteneur = conteneurRef.current;
    const trait = traitRef.current;
    const plume = plumeRef.current;
    if (!monte || !conteneur || !trait || !plume) return;

    let longueur = 1;
    const construire = () => {
      const largeur = conteneur.clientWidth;
      const xDebut = 4;
      const xFin = Math.max(xDebut + 40, largeur * PART_LARGEUR);
      let d = "";
      for (let x = xDebut; x <= xFin; x += 3) {
        const y = Y_BASE_PX + AMPLITUDE_PX * Math.sin(((x - xDebut) / LONGUEUR_ONDE_PX) * 2 * Math.PI);
        d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      trait.setAttribute("d", d);
      longueur = trait.getTotalLength();
    };
    construire();
    const observateur = new ResizeObserver(construire);
    observateur.observe(conteneur);

    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) {
      // Mouvement réduit : zigzag fixe et plume posée à son bout, sans danse.
      trait.style.strokeDasharray = "none";
      const p = trait.getPointAtLength(longueur);
      plume.style.transform = `translate(${p.x}px, ${p.y}px) rotate(12deg)`;
      plume.style.opacity = "1";
      return () => observateur.disconnect();
    }

    const debut = performance.now();
    let image = 0;
    const boucle = (maintenant: number) => {
      const t = maintenant - debut;
      const u = (t % DUREE_CYCLE_MS) / DUREE_CYCLE_MS;
      const tete = longueur * adoucir(Math.min(u / 0.65, 1));
      const queue = longueur * adoucir(Math.max((u - 0.35) / 0.65, 0));
      trait.style.strokeDasharray = `${Math.max(tete - queue, 0.01)} ${longueur * 2}`;
      trait.style.strokeDashoffset = String(-queue);
      const p = trait.getPointAtLength(tete);
      const rotation = 12 + 9 * Math.sin(t / 140) + 3 * Math.sin(t / 57);
      const rebond = 2 * Math.sin(t / 95);
      plume.style.transform = `translate(${p.x}px, ${p.y + rebond}px) rotate(${rotation}deg)`;
      plume.style.opacity = String(u < 0.08 ? u / 0.08 : u > 0.92 ? (1 - u) / 0.08 : 1);
      image = requestAnimationFrame(boucle);
    };
    image = requestAnimationFrame(boucle);
    return () => {
      cancelAnimationFrame(image);
      observateur.disconnect();
    };
  }, [monte]);

  if (!monte) return null;

  return (
    <div
      ref={conteneurRef}
      aria-hidden="true"
      className="pointer-events-none relative w-full select-none"
      style={{
        height: affiche ? HAUTEUR_VOIE_PX : 0,
        opacity: affiche ? 1 : 0,
        transition: `height 300ms ease, opacity ${DUREE_SORTIE_MS}ms ease`,
      }}
    >
      <svg className="absolute left-0 top-0 h-full w-full overflow-visible">
        <path
          ref={traitRef}
          d=""
          fill="none"
          stroke="var(--dj-logo-2)"
          strokeWidth={EPAISSEUR_TRAIT_PX}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div ref={plumeRef} className="absolute left-0 top-0 h-0 w-0 will-change-transform" style={{ opacity: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-classinus-sans-fond.webp"
          alt=""
          draggable={false}
          width={TAILLE_PLUME_PX}
          height={TAILLE_PLUME_PX}
          style={{
            position: "absolute",
            left: -POINTE_X * TAILLE_PLUME_PX,
            top: -POINTE_Y * TAILLE_PLUME_PX,
            width: TAILLE_PLUME_PX,
            height: TAILLE_PLUME_PX,
            transform: "scaleX(-1)",
          }}
        />
      </div>
    </div>
  );
}
