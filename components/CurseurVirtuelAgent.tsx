"use client";

// Créé le 16/09/2026, Bourama : chantier "agent applicatif" (voir
// plan-agent-applicatif-clovis.md), chantier B. Rendu visuel du curseur
// virtuel de Clovis (état et trajectoire dans lib/contexteCurseurVirtuel.tsx,
// même séparation que ChatFlottant pour ContexteChat). Monté une seule
// fois dans AppShell, à côté de ChatFlottant.
//
// Purement décoratif : ce composant ne fait qu'afficher une position
// calculée ailleurs, il ne déclenche jamais lui même de clic réel.

import { AnimatePresence, motion } from "framer-motion";
import { MousePointer2 } from "lucide-react";
import { useContext } from "react";
import { ContexteCurseurVirtuel } from "@/lib/contexteCurseurVirtuel";

export function CurseurVirtuelAgent() {
  const contexte = useContext(ContexteCurseurVirtuel);
  if (!contexte) return null;
  const { x, y, echelle, visible } = contexte;

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
          <MousePointer2
            size={28}
            className="text-dj-accent-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
            fill="currentColor"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
