"use client";

// Créé le 16/09/2026, Bourama : chantier "agent applicatif" (voir
// plan-agent-applicatif-clovis.md), chantier B. État et calcul de
// trajectoire du curseur virtuel de Clovis ; le rendu visuel vit dans
// components/CurseurVirtuelAgent.tsx (même séparation état/rendu que
// ContexteChat/ChatFlottant dans ce projet).
//
// Purement visuel pour l'instant : deplacerVers ne déclenche aucune
// vraie action sur l'appli. L'exécution réelle des actions (savoir QUOI
// cliquer, et cliquer réellement) viendra des chantiers A (déclaration
// d'action sur les composants) et C (outil MCP côté backend), pas
// encore posés à cette date.

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { animate, useMotionValue, type MotionValue } from "framer-motion";

export type PointEcran = { x: number; y: number };

export type ValeurCurseurVirtuel = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  echelle: MotionValue<number>;
  visible: boolean;
  // cliquer: true ajoute le petit effet de pulsation une fois la
  // trajectoire terminée, pour simuler visuellement le clic.
  deplacerVers: (cible: PointEcran | HTMLElement, options?: { cliquer?: boolean }) => Promise<void>;
  masquer: () => void;
};

export const ContexteCurseurVirtuel = createContext<ValeurCurseurVirtuel | null>(null);

export function useCurseurVirtuelAgent(): ValeurCurseurVirtuel {
  const contexte = useContext(ContexteCurseurVirtuel);
  if (!contexte) {
    throw new Error("useCurseurVirtuelAgent doit être utilisé sous AppShell (ContexteCurseurVirtuel.Provider)");
  }
  return contexte;
}

function resoudrePoint(cible: PointEcran | HTMLElement): PointEcran {
  if (cible instanceof HTMLElement) {
    const rect = cible.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return cible;
}

// Point de contrôle décalé perpendiculairement au segment départ/arrivée,
// pour obtenir une courbe de Bézier quadratique plutôt qu'une ligne
// droite. Décision explicite de Bourama (15/09/2026) : le curseur ne se
// déplace jamais en ligne droite. Le sens du décalage alterne au hasard
// pour ne pas toujours courber du même côté.
function pointDeControle(depart: PointEcran, arrivee: PointEcran): PointEcran {
  const milieu = { x: (depart.x + arrivee.x) / 2, y: (depart.y + arrivee.y) / 2 };
  const deltaX = arrivee.x - depart.x;
  const deltaY = arrivee.y - depart.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const decalage = Math.min(Math.max(distance * 0.25, 30), 160);
  const sens = Math.random() > 0.5 ? 1 : -1;
  return {
    x: milieu.x + (sens * -deltaY * decalage) / distance,
    y: milieu.y + (sens * deltaX * decalage) / distance,
  };
}

function pointSurCourbe(depart: PointEcran, controle: PointEcran, arrivee: PointEcran, t: number): PointEcran {
  const u = 1 - t;
  return {
    x: u * u * depart.x + 2 * u * t * controle.x + t * t * arrivee.x,
    y: u * u * depart.y + 2 * u * t * controle.y + t * t * arrivee.y,
  };
}

export function useFournirCurseurVirtuel(): ValeurCurseurVirtuel {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const echelle = useMotionValue(1);
  const [visible, setVisible] = useState(false);
  const positionInitialisee = useRef(false);

  const masquer = useCallback(() => setVisible(false), []);

  const deplacerVers = useCallback(
    (cible: PointEcran | HTMLElement, options?: { cliquer?: boolean }): Promise<void> => {
      const arrivee = resoudrePoint(cible);

      if (!positionInitialisee.current && typeof window !== "undefined") {
        // Première apparition : le curseur part du centre de l'écran,
        // pas d'un point (0,0) qui donnerait un grand trait visible et
        // artificiel au tout premier déplacement.
        x.set(window.innerWidth / 2);
        y.set(window.innerHeight / 2);
        positionInitialisee.current = true;
      }

      setVisible(true);
      const depart = { x: x.get(), y: y.get() };
      const controle = pointDeControle(depart, arrivee);
      const distance = Math.hypot(arrivee.x - depart.x, arrivee.y - depart.y);
      // Durée proportionnelle à la distance à parcourir, bornée pour
      // rester fluide aussi bien sur un tout petit que sur un très grand
      // trajet (règle standards frontend #5 et #6 : animation fluide,
      // vitesse perçue raisonnable).
      const duree = Math.min(Math.max(distance / 900, 0.35), 1.1);

      return animate(0, 1, {
        duration: duree,
        ease: "easeInOut",
        onUpdate: (t) => {
          const point = pointSurCourbe(depart, controle, arrivee, t);
          x.set(point.x);
          y.set(point.y);
        },
      }).then(() => {
        if (!options?.cliquer) return;
        return animate(echelle, [1, 0.72, 1], { duration: 0.28, ease: "easeOut" }).then(() => undefined);
      });
    },
    [x, y, echelle]
  );

  return { x, y, echelle, visible, deplacerVers, masquer };
}
