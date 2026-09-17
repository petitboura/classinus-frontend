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
//
// Ajout du 16/09/2026 (demande Bourama) : la forme du curseur change
// comme un vrai curseur de souris, pas seulement sa position. "defaut"
// (flèche) pendant le trajet, "main" au dessus d'un élément cliquable
// (équivalent visuel de cursor: pointer), "attrape" pour un élément en
// train d'être saisi/déplacé (équivalent visuel de cursor: grabbing,
// pour un futur glisser déposer, pas encore construit).

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { animate, useMotionValue, type MotionValue } from "framer-motion";

export type PointEcran = { x: number; y: number };

export type FormeCurseur = "defaut" | "main" | "attrape";

export type ValeurCurseurVirtuel = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  echelle: MotionValue<number>;
  visible: boolean;
  forme: FormeCurseur;
  // Change la forme du curseur indépendamment d'un déplacement, par
  // exemple pour tenir "attrape" pendant toute la durée d'un glisser
  // (pas encore utilisé, prêt pour un futur chantier de glisser déposer).
  definirForme: (forme: FormeCurseur) => void;
  // cliquer: true ajoute le petit effet de pulsation une fois la
  // trajectoire terminée, pour simuler visuellement le clic.
  // forme: si fournie, s'applique à l'arrivée (par défaut "main" si
  // cliquer est vrai, sinon "defaut"), comme un vrai curseur qui prend
  // la forme de la zone qu'il survole une fois arrivé.
  deplacerVers: (
    cible: PointEcran | HTMLElement,
    options?: { cliquer?: boolean; forme?: FormeCurseur }
  ) => Promise<void>;
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

// Pont vers lib/canalAgentApplicatif.ts (chantiers C et F), qui n'est
// pas un composant React et ne peut donc pas appeler
// useCurseurVirtuelAgent() directement -- même principe que
// enregistrerDemandeurConfirmation dans lib/contexteConfirmationAction.tsx.
// AppShell.tsx enregistre la vraie fonction dès que le Provider est
// monté.
let deplacementGlobal: ValeurCurseurVirtuel["deplacerVers"] | null = null;

export function enregistrerDeplacementCurseur(fn: ValeurCurseurVirtuel["deplacerVers"]) {
  deplacementGlobal = fn;
}

/**
 * Si aucun Provider n'est encore monté (cas très rare), résout
 * immédiatement sans animer -- l'absence de curseur visible ne doit
 * jamais bloquer l'exécution réelle de l'action.
 */
export function deplacerCurseurDepuisAgent(
  cible: PointEcran | HTMLElement,
  options?: { cliquer?: boolean; forme?: FormeCurseur }
): Promise<void> {
  if (!deplacementGlobal) return Promise.resolve();
  return deplacementGlobal(cible, options);
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
  const [forme, setForme] = useState<FormeCurseur>("defaut");
  const positionInitialisee = useRef(false);

  const masquer = useCallback(() => setVisible(false), []);
  const definirForme = useCallback((f: FormeCurseur) => setForme(f), []);

  const deplacerVers = useCallback(
    (cible: PointEcran | HTMLElement, options?: { cliquer?: boolean; forme?: FormeCurseur }): Promise<void> => {
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
      // Repasse en flèche par défaut pendant le trajet, comme un vrai
      // curseur qui quitte la forme de la zone qu'il vient de survoler.
      setForme("defaut");
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
        // À l'arrivée, la forme se met à jour comme un vrai curseur qui
        // vient de passer au dessus d'une zone : "main" par défaut si
        // l'action va cliquer, sinon reste en flèche, sauf forme
        // explicitement demandée (utile plus tard pour "attrape").
        setForme(options?.forme ?? (options?.cliquer ? "main" : "defaut"));
        if (!options?.cliquer) return;
        return animate(echelle, [1, 0.72, 1], { duration: 0.28, ease: "easeOut" }).then(() => undefined);
      });
    },
    [x, y, echelle]
  );

  return { x, y, echelle, visible, forme, definirForme, deplacerVers, masquer };
}
