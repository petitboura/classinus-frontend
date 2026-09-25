"use client";

import { Loader2, X } from "lucide-react";
import type { EtatExecution } from "@/lib/executionPython";
import type { LigneSortie } from "@/lib/useExecutionPython";

// Zone de résultat sous un bloc de code exécuté (voir BlocCode.tsx).

const LIBELLE_ETAT: Partial<Record<EtatExecution, string>> = {
  attente: "En attente...",
  chargement: "Chargement de Python (quelques secondes la première fois)...",
  paquets: "Chargement des bibliothèques...",
  execution: "Exécution...",
};

export function SortieExecutionCode({
  etat,
  lignes,
  images,
  erreur,
  enCours,
  onEffacer,
}: {
  etat: EtatExecution;
  lignes: LigneSortie[];
  images: string[];
  erreur: string | null;
  enCours: boolean;
  onEffacer: () => void;
}) {
  if (etat === "inactif") return null;

  const aucunResultat = lignes.length === 0 && images.length === 0 && !erreur;

  return (
    <div className="animate-dj-fade-in border-t border-dj-bordure bg-dj-surface px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-dj-texte-muet">
          {enCours && <Loader2 size={12} className="animate-spin" />}
          {enCours ? LIBELLE_ETAT[etat] : "Résultat"}
        </span>
        {!enCours && (
          <button
            onClick={onEffacer}
            aria-label="Effacer le résultat"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <X size={12} /> Effacer
          </button>
        )}
      </div>

      {lignes.length > 0 && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
          {lignes.map((ligne, i) => (
            <span key={i} className={ligne.flux === "stderr" ? "text-[var(--dj-code-deletion)]" : "text-dj-texte"}>
              {ligne.texte + "\n"}
            </span>
          ))}
        </pre>
      )}

      {images.map((base64, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={`data:image/png;base64,${base64}`}
          alt="Graphique produit par le code"
          className="mt-2 max-w-full animate-dj-fade-in rounded-lg bg-white"
        />
      ))}

      {erreur && (
        <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-[var(--dj-code-deletion)]">
          {erreur}
        </pre>
      )}

      {!enCours && etat === "interrompu" && (
        <p className="mt-1 text-xs text-dj-texte-muet">Exécution arrêtée.</p>
      )}
      {!enCours && etat === "termine" && aucunResultat && (
        <p className="text-xs text-dj-texte-muet">Terminé, le code n'affiche rien.</p>
      )}
    </div>
  );
}
