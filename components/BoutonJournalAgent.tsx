"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantier K. Petit bouton
// permanent et discret, distinct de la bulle de dialogue
// (BulleDialogueAgent.tsx, chantier J) : ouvre un panneau listant les
// actions/outils exécutés par Clovis pendant la session en cours,
// lu depuis lib/contexteCanalEnDirect.tsx (chantier I).
//
// Positionné fixed bottom-right (le haut de l'écran est déjà pris par
// BoutonNotifications en top-right et le hamburger en top-left, voir
// leurs commentaires respectifs) -- reste visible même quand aucune
// action n'a encore eu lieu (journal vide affiché comme tel), pour
// rester repérable une fois qu'il y a quelque chose à voir.
//
// Fermeture au clic extérieur et à Echap, même convention que les
// autres panneaux/modales de l'app.

import { AnimatePresence, motion } from "framer-motion";
import { ListChecks, X } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { ContexteCanalEnDirect, type StatutEntreeJournal } from "@/lib/contexteCanalEnDirect";

const LABEL_PAR_STATUT: Record<StatutEntreeJournal, string> = {
  en_cours: "En cours...",
  succes: "Réussi",
  erreur: "Échec",
};

const COULEUR_PAR_STATUT: Record<StatutEntreeJournal, string> = {
  en_cours: "text-dj-texte-muet",
  succes: "text-dj-accent-1-texte",
  erreur: "text-[var(--dj-erreur)]",
};

export function BoutonJournalAgent() {
  const contexte = useContext(ContexteCanalEnDirect);
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      setOuvert(false);
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

  if (!contexte) return null;
  const { journal } = contexte;

  return (
    <div ref={ref} data-agent-superposition="true" className="fixed bottom-4 right-4 z-[65]">
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-label="Journal des actions de Classinus"
        aria-expanded={ouvert}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface text-dj-texte-muet shadow-lg transition-colors hover:text-dj-texte"
      >
        <ListChecks size={18} />
      </button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-12 right-0 flex max-h-80 w-72 flex-col overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-dj-bordure px-3 py-2">
              <p className="text-xs font-semibold text-dj-texte">Actions de Classinus</p>
              <button onClick={() => setOuvert(false)} aria-label="Fermer" className="text-dj-texte-muet hover:text-dj-texte">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {journal.length === 0 ? (
                <p className="px-1 py-2 text-xs text-dj-texte-muet">Aucune action pour l&apos;instant.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {[...journal].reverse().map((entree) => (
                    <li key={entree.id} className="rounded-lg bg-dj-surface-haute px-2.5 py-1.5 text-xs">
                      <p className="text-dj-texte">{entree.description}</p>
                      <p className={COULEUR_PAR_STATUT[entree.statut]}>{LABEL_PAR_STATUT[entree.statut]}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
