"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Groupe de modèles d'un fournisseur dans les listes de choix du modèle (sélecteur du haut du chat
 * et ligne Modèle du bouton Réglages). Demande Bourama (04/11/2026) : chaque fournisseur est une
 * liste dépliable, dépliée par défaut. La flèche est placée après le nom, vers la droite quand le groupe est replié,
 * vers le bas quand il est déplié. L'ouverture et la fermeture glissent et s'estompent, jamais d'affichage brut.
 *
 * L'état replié/déplié est local au groupe : il repart de "déplié" à chaque ouverture du panneau.
 */
export function GroupeFournisseur({ libelle, children }: { libelle: string; children: ReactNode }) {
  const [deplie, setDeplie] = useState(true);
  const idContenu = useId();

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setDeplie((v) => !v)}
        aria-expanded={deplie}
        aria-controls={idContenu}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 pb-0.5 pt-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        <span className="min-w-0 truncate">{libelle}</span>
        {deplie ? (
          <ChevronDown size={12} className="flex-shrink-0" aria-hidden />
        ) : (
          <ChevronRight size={12} className="flex-shrink-0" aria-hidden />
        )}
      </button>
      <AnimatePresence initial={false}>
        {deplie && (
          <motion.div
            id={idContenu}
            key="contenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
