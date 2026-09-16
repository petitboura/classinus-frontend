"use client";

import { useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";
import { useOuvrirGuide } from "@/lib/contexteChat";

// Bouton flottant "Guide de decouverte", etape 4 du chantier (voir
// specs-guide-decouverte.md a la racine de ce depot), 16/09/2026, demande
// Bourama. Monte dans AppShell.tsx, visible sur toutes les pages SAUF
// /chat (meme condition que le reste de la nav globale masquee sur
// /chat, voir AppShell.tsx) -- le chat a deja son propre point d'entree
// du guide, dans le menu "+" (etape 5, pas ce fichier).
//
// Deplacable par glisser-deposer (souris ET tactile, via les evenements
// Pointer). Position remise a sa valeur par defaut a chaque chargement
// de page : aucune persistance demandee par Bourama, meme principe que
// les fenetres de sections deplacables (voir lib/contexteFenetres.tsx,
// "jamais restaurees apres un rafraichissement").
//
// Position par defaut : bord droit, milieu vertical de l'ecran. Evite
// la bulle du chat flottant (bottom-right, desktop uniquement, voir
// ChatFlottant.tsx ~ligne 464) et la barre d'onglets du bas sur mobile.
const TAILLE = 52;
const MARGE = 16;
// Distance de deplacement (px) au dela de laquelle un pointerdown ->
// pointerup est traite comme un glissement plutot qu'un clic -- sans ce
// seuil, le moindre tremblement de la main pendant un clic ouvrirait le
// guide alors que l'utilisateur voulait juste relacher sur place.
const SEUIL_GLISSEMENT = 4;

export function GuideFlottant() {
  const ouvrirGuide = useOuvrirGuide();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const enGlissement = useRef(false);
  const aBouge = useRef(false);
  const origine = useRef({ x: 0, y: 0, boutonX: 0, boutonY: 0 });

  useEffect(() => {
    setPosition({
      x: window.innerWidth - TAILLE - MARGE,
      y: window.innerHeight / 2 - TAILLE / 2,
    });
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!position) return;
    aBouge.current = false;
    enGlissement.current = true;
    origine.current = { x: e.clientX, y: e.clientY, boutonX: position.x, boutonY: position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!enGlissement.current) return;
    const dx = e.clientX - origine.current.x;
    const dy = e.clientY - origine.current.y;
    if (Math.abs(dx) > SEUIL_GLISSEMENT || Math.abs(dy) > SEUIL_GLISSEMENT) aBouge.current = true;
    setPosition({
      x: Math.min(Math.max(MARGE, origine.current.boutonX + dx), window.innerWidth - TAILLE - MARGE),
      y: Math.min(Math.max(MARGE, origine.current.boutonY + dy), window.innerHeight - TAILLE - MARGE),
    });
  }

  function onPointerUp() {
    enGlissement.current = false;
    // Un vrai clic (pas de glissement) ouvre le guide -- useOuvrirGuide()
    // active le mode guide cote serveur puis navigue vers /chat (voir
    // lib/contexteChat.tsx).
    if (!aBouge.current) ouvrirGuide();
  }

  if (!position) return null;

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      aria-label="Guide de découverte"
      style={{ left: position.x, top: position.y, width: TAILLE, height: TAILLE }}
      className="fixed z-40 flex touch-none select-none items-center justify-center rounded-cgpt-bouton bg-dj-accent-1 text-[#1A0D02] shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-colors hover:bg-dj-accent-2"
    >
      <Compass size={22} />
    </button>
  );
}
