"use client";

import { Sparkles } from "lucide-react";

// Bouton de test temporaire (19/10/2026, demande Bourama) : sert uniquement
// à vérifier que la mise à jour automatique de l'appli Android s'applique
// (voir lib/miseAJourOta.ts). À retirer une fois le test validé.
export function BoutonTestMiseAJour() {
  return (
    <div className="mb-6 flex justify-center">
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-dj-bordure px-4 py-2 text-sm font-semibold text-dj-texte transition-colors duration-200 hover:bg-dj-surface"
      >
        <Sparkles size={15} />
        Test mise à jour
      </button>
    </div>
  );
}
