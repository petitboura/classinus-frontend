"use client";

import { ShieldAlert } from "lucide-react";

// Ajouté 08/10/2026 (garde-fou 2 du canal PC, demande Bourama). Affiché DANS la bulle de
// Clovis quand une application protégée (terminal, gestionnaire de mots de passe, paramètres
// Windows, fenêtre Exécuter) doit recevoir le clavier ou être ouverte : Clovis attend la
// réponse de l'étudiant, action par action. Sans réponse, la demande se ferme et l'action
// n'est pas faite. Même famille visuelle que BandeauReponseInterrompue.
export function BandeauAutorisationAgent({
  texte,
  onAutoriser,
  onRefuser,
}: {
  texte: string;
  onAutoriser: () => void;
  onRefuser: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Demande d'autorisation"
      className="my-1.5 flex w-fit max-w-full flex-col gap-2 rounded-lg border border-dj-accent-2/40 bg-dj-accent-2/10 px-3 py-2 text-[13px] text-dj-texte"
    >
      <span className="flex items-start gap-1.5">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-dj-accent-2" />
        <span className="whitespace-pre-wrap break-words">{texte}</span>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onAutoriser}
          className="rounded-lg border border-dj-accent-1 bg-dj-accent-1 px-3 py-1.5 text-xs font-semibold text-[#1A0D02] hover:bg-dj-accent-2"
        >
          Autoriser cette fois
        </button>
        <button
          onClick={onRefuser}
          className="rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte hover:bg-dj-surface"
        >
          Refuser
        </button>
      </div>
    </div>
  );
}
