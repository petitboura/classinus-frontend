"use client";

import { MessageSquare, MessagesSquare, X } from "lucide-react";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

// 27/09/2026, chantier "éditeur de code du Bureau", pont retour éditeur
// -> chat (demande Bourama : si le code vient d'une conversation,
// proposer un choix ; sinon toujours une nouvelle -- ce dialogue ne
// s'affiche donc que dans le premier cas, voir EditeurCode.tsx).
export function DialogueRetourChat({
  onOrigine,
  onNouvelle,
  onFermer,
}: {
  onOrigine: () => void;
  onNouvelle: () => void;
  onFermer: () => void;
}) {
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        className={`flex w-full flex-col gap-2 rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:max-w-sm sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-dj-texte">Vers le chat</h4>
          <button onClick={fermer} aria-label="Fermer" className="text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>
        <button
          onClick={() => {
            onOrigine();
            fermer();
          }}
          className="flex items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2.5 text-left text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
        >
          <MessageSquare size={15} className="flex-shrink-0 text-dj-texte-muet" />
          Retourner à la conversation d&apos;origine
        </button>
        <button
          onClick={() => {
            onNouvelle();
            fermer();
          }}
          className="flex items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2.5 text-left text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
        >
          <MessagesSquare size={15} className="flex-shrink-0 text-dj-texte-muet" />
          Nouvelle conversation
        </button>
      </div>
    </div>
  );
}
