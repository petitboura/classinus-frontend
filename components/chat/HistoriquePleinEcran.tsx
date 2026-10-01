"use client";

// Historique des conversations en plein ecran (01/10/2026, demande
// Bourama : "ajoute plein ecran a l'historique pour que l'on puisse
// defiler la liste en plein ecran"). Meme liste que le petit popup
// (ListeHistorique.tsx : chargement par pages au defilement, epingles,
// menu trois points), simplement sur tout l'ecran.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ListeHistorique } from "@/components/chat/ListeHistorique";
import type { FilConversation } from "@/lib/contexteChat";
import { useFermetureAuRetour } from "@/lib/contexteRetour";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

type Props = {
  ouvert: boolean;
  onFermer: () => void;
  conversationActiveId?: string | null;
  onSelectionner: (fil: FilConversation) => void;
  onSupprimee?: (fil: FilConversation) => void;
};

export function HistoriquePleinEcran({ ouvert, onFermer, conversationActiveId, onSelectionner, onSupprimee }: Props) {
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();

  const fermer = () => demarrerFermeture(onFermer);

  // Bouton retour (telephone, navigateur) : ferme cette vue au lieu de
  // quitter la page, comme les autres calques de l'appli.
  useFermetureAuRetour(ouvert, fermer);

  useEffect(() => {
    if (!ouvert) return;
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") demarrerFermeture(onFermer);
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert, onFermer, demarrerFermeture]);

  if (!monte || (!ouvert && !enSortie)) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Historique des conversations"
      className={`fixed inset-0 z-[160] flex flex-col bg-dj-fond ${
        enSortie ? "animate-cgpt-sortie-modal" : "animate-dj-fade-in"
      }`}
    >
      <div
        className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pb-3 pt-4"
        style={{ paddingTop: "max(1rem, var(--safe-top, 0px))" }}
      >
        <h2 className="font-display text-xl font-bold text-dj-texte">Historique</h2>
        <button
          onClick={fermer}
          title="Fermer"
          aria-label="Fermer l'historique"
          className="group flex h-10 w-10 items-center justify-center rounded-xl text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <X size={20} className="transition-transform duration-200 group-hover:rotate-90" />
        </button>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-3 pb-6">
        <ListeHistorique
          variante="pleinEcran"
          conversationActiveId={conversationActiveId}
          onSelectionner={(fil) => {
            demarrerFermeture(onFermer);
            onSelectionner(fil);
          }}
          onSupprimee={onSupprimee}
          className="min-h-0 flex-1 pr-1"
        />
      </div>
    </div>,
    document.body
  );
}
