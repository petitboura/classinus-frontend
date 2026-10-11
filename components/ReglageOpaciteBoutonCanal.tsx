"use client";

// Créé le 01/10/2026, demande Bourama : réglage de l'opacité au repos du
// bouton permanent du canal en direct, directement depuis le bouton. Visible
// seulement une fois le canal activé (monté par CanalEnDirectFlottant), petit
// et discret : une pastille qui déploie un curseur à côté d'elle.
//
// Ne décide ni de la valeur ni de sa mémorisation : le parent la possède (voir
// lib/opaciteBoutonCanal.ts pour les bornes, dont le minimum jamais franchi).
// Pendant que le curseur est déployé, le parent applique la valeur au bouton
// lui-même (aperçu), car le canal étant actif le bouton serait sinon à 100 %
// et l'étudiant ne verrait pas l'effet de son réglage.

import { AnimatePresence, motion } from "framer-motion";
import { Contrast } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { OPACITE_REPOS_MAX, OPACITE_REPOS_MIN } from "@/lib/opaciteBoutonCanal";

const LIBELLE = "Régler la transparence du bouton quand il est au repos";

export function ReglageOpaciteBoutonCanal({
  valeur,
  surChangement,
  surOuverture,
}: {
  valeur: number;
  surChangement: (valeur: number) => void;
  surOuverture: (ouvert: boolean) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    surOuverture(ouvert);
    return () => surOuverture(false);
  }, [ouvert, surOuverture]);
  const racineRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur et à Echap, même convention que les autres
  // panneaux de l'app (voir BoutonJournalAgent.tsx).
  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (racineRef.current && !racineRef.current.contains(e.target as Node)) setOuvert(false);
    }
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", surClicExterieur);
    window.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClicExterieur);
      window.removeEventListener("keydown", surTouche);
    };
  }, [ouvert]);

  const pourcentage = Math.round(valeur * 100);

  return (
    <div ref={racineRef} className="flex items-center gap-1.5">
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-pressed={ouvert}
        aria-label={LIBELLE}
        title={LIBELLE}
        className={`flex h-7 w-7 items-center justify-center rounded-full border bg-dj-surface shadow-md transition-colors ${
          ouvert ? "border-dj-accent-1 text-dj-texte" : "border-dj-bordure text-dj-texte-muet hover:text-dj-texte"
        }`}
      >
        <Contrast size={14} />
      </button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            key="curseur"
            data-pas-deplacement="true"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "6.5rem" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="flex h-7 items-center overflow-hidden rounded-full border border-dj-bordure bg-dj-surface px-2.5 shadow-md"
          >
            <input
              type="range"
              min={Math.round(OPACITE_REPOS_MIN * 100)}
              max={Math.round(OPACITE_REPOS_MAX * 100)}
              step={1}
              value={pourcentage}
              onChange={(e) => surChangement(Number(e.target.value) / 100)}
              aria-label={LIBELLE}
              aria-valuetext={`${pourcentage} pour cent`}
              className="h-1 w-full cursor-pointer accent-dj-accent-1"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
