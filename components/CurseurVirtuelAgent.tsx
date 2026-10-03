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
// Ajout du 19/09/2026 (demande Bourama) : un clic sur le curseur fait
// réapparaître la dernière réponse de Clovis (ou la referme si elle est
// affichée), voir basculerReponse dans lib/contexteCanalEnDirect.tsx.
// Le curseur reste glissable : onTap ne se déclenche que pour un vrai
// clic, jamais à la fin d'un glissement.
//
// 16/09/2026 (demande Bourama) : l'icône suivait la forme du curseur (flèche,
// main au dessus d'un élément cliquable, main qui attrape). Remplacé le
// 02/10/2026, voir ICONE_CURSEUR plus bas : toujours une flèche.

import { AnimatePresence, motion } from "framer-motion";
import { MousePointer2 } from "lucide-react";
import { useContext } from "react";
import { ContexteCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { ContexteCurseurVirtuel } from "@/lib/contexteCurseurVirtuel";
import { COUCHE_AGENT_CURSEUR } from "@/lib/couchesAgent";

// 02/10/2026, demande Bourama : le curseur reste toujours une flèche de souris,
// jamais une main (ni pointeur ni main qui attrape). La forme continue d'exister
// dans le contexte (lib/contexteCurseurVirtuel.tsx) mais n'change plus l'icône.
const ICONE_CURSEUR = MousePointer2;

export function CurseurVirtuelAgent() {
  const contexte = useContext(ContexteCurseurVirtuel);
  const canal = useContext(ContexteCanalEnDirect);
  if (!contexte) return null;
  const { x, y, echelle, visible, enAction } = contexte;
  const Icone = ICONE_CURSEUR;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-agent-superposition="true"
          role="presentation"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // Correctif (19/09/2026, decision Bourama : "l'user doit
          // pouvoir la déplacer si elle n'est pas utilisée") : glissable
          // uniquement pendant qu'aucune trajectoire n'est en cours
          // (enAction, voir lib/contexteCurseurVirtuel.tsx) -- pendant
          // une action réelle, le curseur reste purement décoratif
          // (pointerEvents "none"), pour ne jamais interférer avec le
          // clic que Clovis est en train d'exécuter.
          drag={!enAction}
          onTap={() => canal?.basculerReponse()}
          dragMomentum={false}
          dragElastic={0}
          style={{
            x,
            y,
            scale: echelle,
            position: "fixed",
            top: 0,
            left: 0,
            // Au dessus de la bulle de dialogue (voir BulleDialogueAgent.tsx)
            // ET de toutes les popups de l'application (leurs z-index vont
            // jusqu'à 999) : le curseur ne doit jamais passer derrière,
            // sinon on ne le voit plus cliquer dans une popup et on ne peut
            // plus cliquer dessus pour rouvrir ou fermer la réponse.
            zIndex: COUCHE_AGENT_CURSEUR,
            pointerEvents: enAction ? "none" : "auto",
            touchAction: "none",
            cursor: enAction ? undefined : "grab",
            translateX: "-4px",
            translateY: "-4px",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key="fleche"
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
