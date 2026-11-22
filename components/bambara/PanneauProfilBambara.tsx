"use client";

// Page bambara (18/11/2026, demande de Bourama) : le panneau du bouton profil. Les profils déjà créés sur ce compte : un
// toucher choisit la personne, qui retrouve alors son propre historique et ses propres éléments gardés.
// Depuis le 22/11/2026 (demande de Bourama) il n'y a plus de champs à écrire : un grand bouton « + » lance le parcours
// d'inscription vocal (components/bambara/ParcoursInscriptionBambara.tsx), fait de voix et d'images.
// Noir et blanc seulement (couleurs de .bb-page).

import { motion } from "framer-motion";
import { UserRound, UserRoundPlus } from "lucide-react";
import type { ProfilBambara } from "@/lib/bambaraEspace";

type Props = {
  profils: ProfilBambara[];
  profilId: string | null;
  choisirProfil: (id: string | null) => void;
  /** Le panneau se referme : un profil vient d'être choisi. */
  surTermine: () => void;
  /** Lance le parcours d'inscription vocal. */
  surNouveauParcours: () => void;
  libelleNouveau: string;
};

export function PanneauProfilBambara({ profils, profilId, choisirProfil, surTermine, surNouveauParcours, libelleNouveau }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={surNouveauParcours}
        aria-label={libelleNouveau}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-transform active:scale-95"
        style={{ backgroundColor: "var(--bb-encre)", color: "var(--bb-fond)", borderColor: "var(--bb-encre)" }}
      >
        <UserRoundPlus size={22} />
      </button>
      {profils.map((profil, index) => {
        const choisi = profil.id === profilId;
        return (
          <motion.button
            key={profil.id}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: Math.min(index, 8) * 0.03 }}
            onClick={() => {
              choisirProfil(profil.id);
              surTermine();
            }}
            aria-pressed={choisi}
            className="flex h-12 max-w-full items-center gap-2 rounded-full border px-4 font-lecture text-base transition-transform active:scale-95"
            style={{
              borderColor: choisi ? "var(--bb-encre)" : "var(--bb-trait-fort)",
              backgroundColor: choisi ? "var(--bb-encre)" : "var(--bb-fond)",
              color: choisi ? "var(--bb-fond)" : "var(--bb-encre)",
            }}
          >
            <UserRound size={16} className="shrink-0" />
            <span className="truncate">{`${profil.prenom} ${profil.nom}`.trim()}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
