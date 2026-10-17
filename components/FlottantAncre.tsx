"use client";

import { MouseEvent, MutableRefObject, ReactNode, RefObject, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { COUCHE_MAX_APPLICATION } from "@/lib/couchesAgent";
import {
  AlignementFlottant,
  CoteFlottant,
  calculerPlacement,
  limitesDe,
} from "@/lib/placementFlottant";

// Composant commun à tous les éléments flottants ancrés à un bouton (menus,
// listes déroulantes, volets). Demande Bourama du 17/10/2026 : plus jamais de
// correction au cas par cas. Tout se règle ici, une seule fois :
//  - rendu dans le corps de la page (portail) : aucun parent en overflow-hidden,
//    en transform ou en défilement ne peut le rogner ni le pousser à déborder ;
//  - placement mesuré sur la taille réelle (pas une hauteur estimée) : du côté
//    voulu s'il y a la place, sinon de l'autre côté, sinon réduit et défilant
//    à l'intérieur de lui-même ;
//  - borné au contenant le plus proche (fenêtre ou panneau marqué
//    data-contenant-flottant), sinon à l'écran réellement visible ;
//  - replacé tout seul au redimensionnement, au défilement, à l'apparition du
//    clavier du téléphone et quand son contenu change.
// Un clic à l'extérieur doit aussi tenir compte de ce panneau, qui n'est plus
// un descendant DOM de son bouton : passer innerRef et vérifier contains().
// Calcul pur dans lib/placementFlottant.ts.

export function FlottantAncre({
  ancreRef,
  children,
  className = "",
  cotes,
  alignement,
  ecart,
  marge,
  // Au dessus de toutes les fenêtres et pleins écrans, sous la couche de l'agent.
  zIndex = COUCHE_MAX_APPLICATION - 2,
  role,
  innerRef,
  onClick,
  memeLargeurQueAncre = false,
}: {
  /** Élément à côté duquel le panneau s'ouvre (le bouton, ou son conteneur). */
  ancreRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  /** Apparence seulement (fond, bordure, animation). Pas de position. */
  className?: string;
  /** Côtés essayés dans l'ordre. Par défaut : en dessous, puis au dessus. */
  cotes?: CoteFlottant[];
  alignement?: AlignementFlottant;
  ecart?: number;
  marge?: number;
  /** Doit rester sous la couche de l'agent (voir lib/couchesAgent.ts). */
  zIndex?: number;
  role?: string;
  innerRef?: MutableRefObject<HTMLDivElement | null>;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  /** Liste déroulante : le panneau a exactement la largeur du bouton. */
  memeLargeurQueAncre?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const definirRef = useCallback(
    (el: HTMLDivElement | null) => {
      ref.current = el;
      if (innerRef) innerRef.current = el;
    },
    [innerRef]
  );

  const placer = useCallback(() => {
    const el = ref.current;
    const ancre = ancreRef.current;
    if (!el || !ancre) return;
    // Mesure de la taille naturelle : on retire les plafonds, on se met en
    // haut à gauche (le plus de place possible), puis on mesure.
    el.style.maxHeight = "";
    el.style.maxWidth = "";
    const rectAncre = ancre.getBoundingClientRect();
    el.style.width = memeLargeurQueAncre ? `${rectAncre.width}px` : "";
    el.style.left = "0px";
    el.style.top = "0px";
    // Plafonds de design posés par les classes du panneau (max-h-56, max-w-...) :
    // le plafond calculé ne doit jamais les dépasser.
    const styleCalcule = getComputedStyle(el);
    const plafondH = parseFloat(styleCalcule.maxHeight);
    const plafondL = parseFloat(styleCalcule.maxWidth);
    // offsetWidth et offsetHeight : taille réelle, insensible au zoom de
    // l'animation d'apparition (getBoundingClientRect la rétrécirait).
    const naturel = { width: el.offsetWidth, height: el.offsetHeight };
    const res = calculerPlacement({
      ancre: rectAncre,
      largeur: naturel.width,
      hauteur: naturel.height,
      limites: limitesDe(ancre),
      cotes,
      alignement,
      ecart,
      marge,
    });
    el.style.width = `${Math.min(naturel.width, res.maxLargeur)}px`;
    el.style.maxWidth = `${Number.isNaN(plafondL) ? res.maxLargeur : Math.min(res.maxLargeur, plafondL)}px`;
    el.style.maxHeight = `${Number.isNaN(plafondH) ? res.maxHauteur : Math.min(res.maxHauteur, plafondH)}px`;
    el.style.left = `${res.gauche}px`;
    el.style.top = `${res.haut}px`;
    el.style.visibility = "visible";
  }, [ancreRef, cotes, alignement, ecart, marge, memeLargeurQueAncre]);

  useLayoutEffect(() => {
    placer();
  }, [placer]);

  useEffect(() => {
    let image = 0;
    const planifier = () => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(placer);
    };
    const surDefilement = (e: Event) => {
      // Le défilement du panneau lui-même ne le déplace pas.
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      planifier();
    };
    window.addEventListener("resize", planifier);
    window.addEventListener("scroll", surDefilement, true);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", planifier);
    vv?.addEventListener("scroll", planifier);
    let observateur: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observateur = new ResizeObserver(planifier);
      if (ref.current) observateur.observe(ref.current);
      if (ancreRef.current) observateur.observe(ancreRef.current);
    }
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("resize", planifier);
      window.removeEventListener("scroll", surDefilement, true);
      vv?.removeEventListener("resize", planifier);
      vv?.removeEventListener("scroll", planifier);
      observateur?.disconnect();
    };
  }, [placer, ancreRef]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={definirRef}
      role={role}
      onClick={onClick}
      // Invisible jusqu'au premier placement : jamais de saut visible.
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        visibility: "hidden",
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehavior: "contain",
        zIndex,
      }}
      className={className}
    >
      {children}
    </div>,
    document.body
  );
}
