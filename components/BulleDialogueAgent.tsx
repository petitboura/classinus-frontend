"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantier J. Rendu visuel de la
// bulle de dialogue de Clovis (état dans lib/contexteCanalEnDirect.tsx,
// même séparation état/rendu que CurseurVirtuelAgent.tsx pour
// ContexteCurseurVirtuel).
//
// Décision Bourama (18/09/2026) : la bulle n'est PAS persistante --
// elle s'ouvre seulement quand Clovis a un texte à dire (dernierTexte
// non null), se ferme sinon (effacement automatique après un délai,
// voir lib/contexteCanalEnDirect.tsx). Elle suit le VRAI curseur de la
// souris (mousemove), pas le curseur virtuel de Clovis (CurseurVirtuelAgent,
// qui simule les clics de l'IA) -- les deux sont indépendants et peuvent
// être visibles en même temps à des positions différentes.
//
// L'écoute mousemove n'est active que pendant qu'un texte est affiché,
// pour ne rien faire tourner inutilement le reste du temps (même souci
// de performance que le MutationObserver dans lib/canalAgentApplicatif.ts).

import { AnimatePresence, motion } from "framer-motion";
import { useContext, useEffect, useState } from "react";
import { ContexteCanalEnDirect } from "@/lib/contexteCanalEnDirect";

const DECALAGE_X = 18;
const DECALAGE_Y = 18;

export function BulleDialogueAgent() {
  const contexte = useContext(ContexteCanalEnDirect);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const texte = contexte?.dernierTexte ?? null;

  useEffect(() => {
    if (!texte) return;
    const surDeplacement = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", surDeplacement);
    return () => window.removeEventListener("mousemove", surDeplacement);
  }, [texte]);

  if (!contexte) return null;

  return (
    <AnimatePresence>
      {texte && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "fixed",
            top: position.y + DECALAGE_Y,
            left: position.x + DECALAGE_X,
            zIndex: 70,
            pointerEvents: "none",
            maxWidth: "min(320px, calc(100vw - 32px))",
          }}
          className="rounded-cgpt-bouton bg-dj-surface border border-dj-bordure px-3 py-2 text-sm text-dj-texte shadow-xl"
        >
          {texte}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
