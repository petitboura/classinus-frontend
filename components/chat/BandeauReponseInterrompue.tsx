"use client";

import { RotateCw, ArrowRight, AlertCircle, Pencil } from "lucide-react";

// Ajouté 20/09/2026 (demande Bourama : bouton arrêter). Bandeau affiché
// SOUS le message précis coupé en plein streaming par arreterGeneration
// (ChatIA.tsx), le texte déjà écrit reste affiché tel quel juste
// au-dessus (décision Bourama : "il fait partie de la conversation"),
// ce bandeau prévient juste que la réponse est incomplète et propose de
// quoi continuer. Inspiré de BoutonRepriseAgent (même famille visuelle),
// mais trois boutons au lieu d'un puisque le point de départ est
// différent : là où BoutonRepriseAgent reprend un état précis fourni par
// le backend (etat_reprise), ici il n'y en a pas (l'étudiant a coupé de
// son propre chef), "Continuer" relance donc une génération neuve,
// avec pour seul contexte l'historique déjà accumulé (le message coupé
// y est inclus tel quel). "Modifier" (choix Bourama parmi deux lectures
// possibles) ouvre le mode édition du message UTILISATEUR précédent,
// pas du texte déjà écrit par Clovis.
export function BandeauReponseInterrompue({
  enAttente,
  onModifier,
  onContinuer,
  onReessayer,
}: {
  enAttente: boolean;
  onModifier: () => void;
  onContinuer: () => void;
  onReessayer: () => void;
}) {
  return (
    <div className="my-1.5 flex w-fit flex-wrap items-center gap-2 rounded-lg border border-dj-accent-2/40 bg-dj-accent-2/10 px-3 py-2 text-[13px] text-dj-texte">
      <span className="flex items-center gap-1.5">
        <AlertCircle size={16} className="shrink-0 text-dj-accent-2" />
        Réponse interrompue
      </span>
      <button
        onClick={onModifier}
        disabled={enAttente}
        className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte hover:bg-dj-surface disabled:opacity-50"
      >
        <Pencil size={13} />
        Modifier
      </button>
      <button
        onClick={onContinuer}
        disabled={enAttente}
        className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte hover:bg-dj-surface disabled:opacity-50"
      >
        <ArrowRight size={13} />
        Continuer
      </button>
      <button
        onClick={onReessayer}
        disabled={enAttente}
        className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte hover:bg-dj-surface disabled:opacity-50"
      >
        <RotateCw size={13} />
        Réessayer
      </button>
    </div>
  );
}
