"use client";

import { Languages } from "lucide-react";
import type { FicheVocabulaireData } from "./FicheRevision";

// Sous-composant de FicheRevision.tsx (voir ce fichier pour le contexte
// général, le schéma JSON complet et ce qui est hors scope). Affiche une
// fiche de vocabulaire : une liste de { terme, definition, exemple? }.
// 02/11/2026, décision de Bourama : cet élément s'affiche sans cadre (ni bordure ni fond de carte), le contenu repose directement sur le fond du chat. Ne jamais remettre de cadre sans que Bourama le demande.
export function FicheVocabulaire({ fiche }: { fiche: FicheVocabulaireData }) {
  return (
    <div className="my-3 animate-dj-fade-in">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dj-accent-1-conteneur text-dj-accent-1-texte">
          <Languages size={14} />
        </span>
        <p className="text-sm font-semibold text-dj-texte">{fiche.titre || "Fiche de vocabulaire"}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {fiche.termes.map((terme, index) => (
          <div key={index} className="py-1">
            <p className="text-sm font-semibold text-dj-texte">{terme.terme}</p>
            <p className="mt-1 text-xs text-dj-texte-muet">{terme.definition}</p>
            {terme.exemple && <p className="mt-1.5 text-xs italic text-dj-texte-muet">« {terme.exemple} »</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
