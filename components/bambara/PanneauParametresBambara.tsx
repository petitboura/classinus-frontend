"use client";

// Page bambara (23/11/2026, demande de Bourama) : le panneau du bouton paramètres. Un seul réglage : afficher ou non le
// texte de la réponse de Classinus (par défaut non). Un interrupteur dont la pastille glisse, sans changement brut.
// Noir et blanc seulement (couleurs de .bb-page).

import { motion } from "framer-motion";
import { Captions } from "lucide-react";

type Props = {
  afficherTexteReponse: boolean;
  changerAfficherTexteReponse: (valeur: boolean) => void;
  libelleAfficherTexte: string;
};

export function PanneauParametresBambara({ afficherTexteReponse, changerAfficherTexteReponse, libelleAfficherTexte }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={afficherTexteReponse}
      onClick={() => changerAfficherTexteReponse(!afficherTexteReponse)}
      className="flex w-full items-center gap-3 text-left font-lecture text-base"
      style={{ color: "var(--bb-encre)" }}
    >
      <Captions size={20} className="shrink-0" />
      <span className="min-w-0 flex-1">{libelleAfficherTexte}</span>
      <span
        aria-hidden
        className="flex h-7 w-12 shrink-0 items-center rounded-full border px-0.5 transition-colors duration-200"
        style={{
          borderColor: afficherTexteReponse ? "var(--bb-encre)" : "var(--bb-trait-fort)",
          backgroundColor: afficherTexteReponse ? "var(--bb-encre)" : "var(--bb-fond)",
          justifyContent: afficherTexteReponse ? "flex-end" : "flex-start",
        }}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className="h-5 w-5 rounded-full"
          style={{ backgroundColor: afficherTexteReponse ? "var(--bb-fond)" : "var(--bb-encre)" }}
        />
      </span>
    </button>
  );
}
