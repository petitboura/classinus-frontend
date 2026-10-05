"use client";

// Créé le 03/10/2026 (demande Bourama) : enveloppe animée d'un bouton du canal en direct,
// pour que chaque bouton apparaisse et disparaisse en fondu avec un léger zoom quand le
// groupe se déplie ou se replie. À poser comme enfant direct d'un AnimatePresence, avec
// une clé.

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function ApparitionBoutonCanal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="flex items-center"
    >
      {children}
    </motion.div>
  );
}
