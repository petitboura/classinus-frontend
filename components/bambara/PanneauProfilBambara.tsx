"use client";

// Page bambara (18/11/2026, demande de Bourama) : le panneau du bouton profil. Un champ pour le nom, un pour le
// prénom, une coche pour valider (ou la touche Entrée). Dessous, les profils déjà créés sur ce compte : un
// toucher choisit la personne, qui retrouve alors son propre historique et ses propres éléments gardés.
// Noir et blanc seulement (couleurs de .bb-page).

import { motion } from "framer-motion";
import { Check, Loader2, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ProfilBambara } from "@/lib/bambaraEspace";

type Props = {
  profils: ProfilBambara[];
  profilId: string | null;
  creerProfil: (nom: string, prenom: string) => Promise<boolean>;
  choisirProfil: (id: string | null) => void;
  /** Le panneau se referme : un profil vient d'être créé ou choisi. */
  surTermine: () => void;
  libelleNom: string;
  libellePrenom: string;
  libelleValider: string;
};

const CLASSE_CHAMP = "h-11 min-w-0 flex-1 rounded-full border bg-transparent px-4 font-lecture text-base outline-none";

export function PanneauProfilBambara({ profils, profilId, creerProfil, choisirProfil, surTermine, libelleNom, libellePrenom, libelleValider }: Props) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [echec, setEchec] = useState(false);
  const pret = nom.trim().length > 0 && prenom.trim().length > 0 && !occupe;

  const valider = async (e: FormEvent) => {
    e.preventDefault();
    if (!pret) return;
    setOccupe(true);
    setEchec(false);
    const reussi = await creerProfil(nom, prenom);
    setOccupe(false);
    if (reussi) surTermine();
    else setEchec(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={valider} className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <input
            autoFocus
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={60}
            placeholder={libelleNom}
            aria-label={libelleNom}
            autoComplete="family-name"
            className={CLASSE_CHAMP}
            style={{ borderColor: echec ? "var(--bb-encre)" : "var(--bb-trait-fort)", color: "var(--bb-encre)" }}
          />
          <input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            maxLength={60}
            placeholder={libellePrenom}
            aria-label={libellePrenom}
            autoComplete="given-name"
            className={CLASSE_CHAMP}
            style={{ borderColor: echec ? "var(--bb-encre)" : "var(--bb-trait-fort)", color: "var(--bb-encre)" }}
          />
        </div>
        <button
          type="submit"
          disabled={!pret}
          aria-label={libelleValider}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-[transform,opacity] active:scale-95 disabled:opacity-30"
          style={{ backgroundColor: "var(--bb-encre)", color: "var(--bb-fond)", borderColor: "var(--bb-encre)" }}
        >
          {occupe ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
        </button>
      </form>

      {profils.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
                className="flex h-10 max-w-full items-center gap-2 rounded-full border px-3 font-lecture text-sm transition-transform active:scale-95"
                style={{
                  borderColor: choisi ? "var(--bb-encre)" : "var(--bb-trait-fort)",
                  backgroundColor: choisi ? "var(--bb-encre)" : "var(--bb-fond)",
                  color: choisi ? "var(--bb-fond)" : "var(--bb-encre)",
                }}
              >
                <UserRound size={16} className="shrink-0" />
                <span className="truncate">{profil.prenom} {profil.nom}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
