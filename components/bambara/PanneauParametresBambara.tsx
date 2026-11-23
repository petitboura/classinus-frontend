"use client";

// Page bambara (23/11/2026, demande de Bourama) : le panneau du bouton paramètres. Trois réglages : le thème (système,
// clair ou sombre, le même choix que dans le reste de l'appli, lib/useTheme.ts), afficher ou non le texte de la réponse de
// Classinus (par défaut non), et afficher ou non le bouton clavier à côté du micro (par défaut non). Les deux derniers
// sont des interrupteurs dont la pastille glisse, sans changement brut. Noir et blanc seulement (couleurs de .bb-page).

import { motion } from "framer-motion";
import { Captions, Keyboard, Monitor, Moon, Palette, Sun, type LucideIcon } from "lucide-react";
import { useTheme, type ChoixTheme } from "@/lib/useTheme";

type Props = {
  afficherTexteReponse: boolean;
  changerAfficherTexteReponse: (valeur: boolean) => void;
  libelleAfficherTexte: string;
  afficherBoutonClavier: boolean;
  changerAfficherBoutonClavier: (valeur: boolean) => void;
  libelleAfficherBoutonClavier: string;
  libelleTheme: string;
  libellesTheme: Record<ChoixTheme, string>;
};

const CHOIX_THEME: Array<{ valeur: ChoixTheme; Icone: LucideIcon }> = [
  { valeur: "systeme", Icone: Monitor },
  { valeur: "clair", Icone: Sun },
  { valeur: "sombre", Icone: Moon },
];

function Interrupteur({ Icone, libelle, actif, surChangement }: { Icone: LucideIcon; libelle: string; actif: boolean; surChangement: (valeur: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      onClick={() => surChangement(!actif)}
      className="flex w-full items-center gap-3 text-left font-lecture text-base"
      style={{ color: "var(--bb-encre)" }}
    >
      <Icone size={20} className="shrink-0" />
      <span className="min-w-0 flex-1">{libelle}</span>
      <span
        aria-hidden
        className="flex h-7 w-12 shrink-0 items-center rounded-full border px-0.5 transition-colors duration-200"
        style={{
          borderColor: actif ? "var(--bb-encre)" : "var(--bb-trait-fort)",
          backgroundColor: actif ? "var(--bb-encre)" : "var(--bb-fond)",
          justifyContent: actif ? "flex-end" : "flex-start",
        }}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className="h-5 w-5 rounded-full"
          style={{ backgroundColor: actif ? "var(--bb-fond)" : "var(--bb-encre)" }}
        />
      </span>
    </button>
  );
}

export function PanneauParametresBambara({
  afficherTexteReponse,
  changerAfficherTexteReponse,
  libelleAfficherTexte,
  afficherBoutonClavier,
  changerAfficherBoutonClavier,
  libelleAfficherBoutonClavier,
  libelleTheme,
  libellesTheme,
}: Props) {
  const { choix, changerTheme } = useTheme();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 font-lecture text-base" style={{ color: "var(--bb-encre)" }}>
          <Palette size={20} className="shrink-0" />
          <span className="min-w-0 flex-1">{libelleTheme}</span>
        </div>
        <div role="radiogroup" aria-label={libelleTheme} className="grid grid-cols-3 gap-2">
          {CHOIX_THEME.map(({ valeur, Icone }) => {
            const actif = choix === valeur;
            return (
              <button
                key={valeur}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => changerTheme(valeur)}
                className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border px-2 font-lecture text-sm transition-[background-color,color,border-color,transform] duration-200 active:scale-95"
                style={{
                  borderColor: actif ? "var(--bb-encre)" : "var(--bb-trait-fort)",
                  backgroundColor: actif ? "var(--bb-encre)" : "var(--bb-fond)",
                  color: actif ? "var(--bb-fond)" : "var(--bb-encre)",
                }}
              >
                <Icone size={18} className="shrink-0" />
                <span className="truncate">{libellesTheme[valeur]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <Interrupteur Icone={Captions} libelle={libelleAfficherTexte} actif={afficherTexteReponse} surChangement={changerAfficherTexteReponse} />
      <Interrupteur Icone={Keyboard} libelle={libelleAfficherBoutonClavier} actif={afficherBoutonClavier} surChangement={changerAfficherBoutonClavier} />
    </div>
  );
}
