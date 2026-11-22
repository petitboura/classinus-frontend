"use client";

// Page bambara (18/11/2026, demande de Bourama) : le bouton pour garder une vidéo ou une image, placé dans un coin
// de sa carte. C'est un cœur, que tout le monde comprend sans lire : vide quand l'élément n'est pas gardé, plein
// quand il l'est. Un toucher le garde ou le retire. Noir et blanc seulement (couleurs de .bb-page).

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import type { VisuelBambara } from "@/lib/pageBambaraVisuels";

export type GardeUiBambara = {
  estGarde: (url: string) => boolean;
  basculer: (visuel: VisuelBambara) => void;
  libelleGarder: string;
  libelleRetirer: string;
};

type Props = { visuel: VisuelBambara; garde: GardeUiBambara };

export function BoutonCoeurBambara({ visuel, garde }: Props) {
  const plein = garde.estGarde(visuel.url);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onClick={(e) => {
        e.stopPropagation();
        garde.basculer(visuel);
      }}
      aria-label={plein ? garde.libelleRetirer : garde.libelleGarder}
      aria-pressed={plein}
      className="absolute left-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full"
      style={{ backgroundColor: "color-mix(in srgb, var(--bb-fond) 92%, transparent)", color: "var(--bb-encre)" }}
    >
      <motion.span
        key={plein ? "plein" : "vide"}
        initial={{ scale: 0.6, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        className="flex"
      >
        <Heart size={16} fill={plein ? "currentColor" : "none"} />
      </motion.span>
    </motion.button>
  );
}
