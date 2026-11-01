"use client";

import { X, Sparkles, Upload, Clock } from "lucide-react";
import type { EffetHiggsfield } from "@/lib/effetsHiggsfield";

// Placeholder branch feature/higgsfield-catalogue-generation
// Ce panneau sera remplacé par le vrai composant upload + polling Higgsfield.
// Voir HIGGSFIELD_TODO.md à la racine du frontend pour la suite.

export function PanneauGenererHiggsfield({
  effet,
  onClose,
}: {
  effet: EffetHiggsfield;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] border border-dj-bordure bg-dj-fond shadow-2xl md:rounded-[20px]">
        <div className="flex items-center justify-between border-b border-dj-bordure px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dj-texte text-dj-fond">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none text-dj-texte">Générer — {effet.nom}</span>
              <span className="text-xs text-dj-texte-muet">{effet.type} · {effet.style}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-dj-bordure text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <p className="text-sm leading-relaxed text-dj-texte-muet">
            Génération directe Higgsfield en cours d&apos;intégration. Cette branche contient déjà le catalogue (recherche + compteur),
            le visionneur (flèches/dots/clavier) et l&apos;API backend REST. Il reste à brancher l&apos;upload et le suivi live ici.
          </p>

          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-dj-bordure bg-dj-surface p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
              <Upload className="h-4 w-4" /> Upload image / vidéo
            </div>
            <p className="text-xs leading-relaxed text-dj-texte-muet">
              À faire : zone de dépôt + validation (type/poids), prévisualisation, envoi vers <code className="rounded bg-dj-surface-haute px-1 py-0.5 text-[11px]">/api/higgsfield/video|image|genjutsu</code>.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-dj-bordure bg-dj-surface p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
              <Clock className="h-4 w-4" /> Suivi live
            </div>
            <p className="text-xs leading-relaxed text-dj-texte-muet">
              À faire : polling <code className="rounded bg-dj-surface-haute px-1 py-0.5 text-[11px]">GET /api/higgsfield/statut/{"{id}"}</code> toutes les 4-6s,
              barre de progression, gestion annulation, sauvegarde en bibliothèque quand terminé.
            </p>
          </div>

          <p className="text-xs text-dj-texte-muet">
            Détail complet dans <code className="rounded bg-dj-surface-haute px-1.5 py-0.5">HIGGSFIELD_TODO.md</code> à la racine du dépôt.
          </p>
        </div>

        <div className="flex gap-2 border-t border-dj-bordure p-4">
          <button
            onClick={onClose}
            className="flex flex-1 items-center justify-center rounded-full border border-dj-bordure bg-transparent px-4 py-3 text-sm font-semibold text-dj-texte transition-colors hover:bg-dj-surface"
          >
            Fermer
          </button>
          <button
            disabled
            className="flex flex-1 cursor-not-allowed items-center justify-center rounded-full bg-dj-texte/40 px-4 py-3 text-sm font-bold text-dj-fond"
            title="Bientôt : upload + génération"
          >
            Générer — bientôt
          </button>
        </div>
      </div>
    </div>
  );
}
