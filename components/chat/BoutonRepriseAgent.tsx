"use client";

import { ArrowRight, RotateCw } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { textesLimitesChat } from "@/lib/textesLimitesChat";

// Ajouté le 02/09/2026 (demande Bourama, gestion du plafond d'appels
// d'outils, voir core/main.py:_agent_groq). Bouton attaché sous le message
// précis qui s'est terminé sur "limite_outils_atteinte" ou
// "repetition_detectee". Ce n'est pas une popup comme ConfirmationOutil :
// une courte phrase explique pourquoi l'agent s'est arrêté, et le bouton
// reprend exactement où tout s'est arrêté (voir ChatIA.tsx:reprendreAgent).
// Ignorer ce bouton est un choix valide : taper un autre message rend
// simplement cet état obsolète.
export function BoutonRepriseAgent({
  type,
  enAttente,
  onReprendre,
}: {
  type: "limite" | "repetition";
  enAttente: boolean;
  onReprendre: () => void;
}) {
  const estRepetition = type === "repetition";
  const t = textesLimitesChat(useLocale());

  return (
    <div className="mt-2">
      <p className="mb-2 animate-dj-fade-in-rapide text-xs text-dj-texte-muet" role="status">
        {estRepetition ? t.repriseRepetition : t.repriseLimite(t.continuer)}
      </p>
      <button
        onClick={onReprendre}
        disabled={enAttente}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-dj-texte hover:bg-dj-surface disabled:opacity-50"
      >
        {estRepetition ? <RotateCw size={13} /> : <ArrowRight size={13} />}
        {estRepetition ? t.reessayer : t.continuer}
      </button>
    </div>
  );
}
