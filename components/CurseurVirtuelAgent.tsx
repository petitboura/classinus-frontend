"use client";

// Créé le 16/09/2026, Bourama : chantier "agent applicatif" (voir
// plan-agent-applicatif-clovis.md), chantier B. Rendu visuel du curseur
// virtuel de Classinus (état et trajectoire dans lib/contexteCurseurVirtuel.tsx,
// même séparation que ChatFlottant pour ContexteChat). Monté une seule
// fois dans AppShell, à côté de ChatFlottant.
//
// Purement décoratif : ce composant ne fait qu'afficher une position et
// une forme calculées ailleurs, il ne déclenche jamais lui même de clic
// réel.
//
// Ajout du 16/09/2026 (demande Bourama) : l'icône change selon la forme
// du curseur, comme un vrai curseur de souris (flèche par défaut, main
// au dessus d'un élément cliquable, main qui attrape pour un élément
// saisi).

import { AnimatePresence, motion } from "framer-motion";
import { Grab, MousePointer2, Pointer } from "lucide-react";
import { useContext } from "react";
import { ContexteCurseurVirtuel, type FormeCurseur } from "@/lib/contexteCurseurVirtuel";

const ICONE_PAR_FORME: Record<FormeCurseur, typeof MousePointer2> = {
  defaut: MousePointer2,
  main: Pointer,
  attrape: Grab,
};

export function CurseurVirtuelAgent() {
  const contexte = useContext(ContexteCurseurVirtuel);
  if (!contexte) return null;
  const { x, y, echelle, visible, forme } = contexte;
  const Icone = ICONE_PAR_FORME[forme];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="presentation"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            x,
            y,
            scale: echelle,
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 60,
            pointerEvents: "none",
            translateX: "-4px",
            translateY: "-4px",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={forme}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
            >
              <Icone
                size={28}
                className="text-dj-accent-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
                fill="currentColor"
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
