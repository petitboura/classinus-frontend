"use client";

import { Sigma } from "lucide-react";
import katex from "katex";
import type { FicheFormulesData } from "./FicheRevision";

// Sous-composant de FicheRevision.tsx (voir ce fichier pour le contexte
// général, le schéma JSON complet et ce qui est hors scope). Affiche une
// fiche de formules : une liste de { nom, expression, description? }.

// CORRECTIF 2026-09-14 (bug remonté par Bourama : "les formules
// s'affichent en code et non en formule") -- `expression` est un champ
// LaTeX brut (ex. "d/dx (x^n) = n \\cdot x^{n-1}"), pas du markdown avec
// délimiteurs $...$ : contrairement au texte de chat normal
// (BulleMessage.tsx, remark-math + rehype-katex sur les délimiteurs),
// ici il n'y a pas de délimiteur à détecter -- tout le champ EST la
// formule. Il était donc affiché tel quel en texte brut (font-mono),
// jamais passé à KaTeX. Même fonction katex.renderToString que
// rendreFormuleKatex (BarreDeSaisie.tsx) : throwOnError désactivé (un
// LaTeX mal formé retombe sur le texte source plutôt que de casser
// l'affichage), displayMode true (formule seule sur sa ligne, pas
// entourée de texte).
function rendreExpressionKatex(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
  } catch {
    return latex;
  }
}

export function FicheFormules({ fiche }: { fiche: FicheFormulesData }) {
  return (
    <div className="my-3 animate-dj-fade-in rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dj-accent-1-conteneur text-dj-accent-1-texte">
          <Sigma size={14} />
        </span>
        <p className="text-sm font-semibold text-dj-texte">{fiche.titre || "Fiche de formules"}</p>
      </div>
      <div className="flex flex-col gap-2">
        {fiche.items.map((item, index) => (
          <div key={index} className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface-haute p-3">
            <p className="text-xs font-medium text-dj-texte-muet">{item.nom}</p>
            <div
              className="mt-1 overflow-x-auto text-sm text-dj-texte"
              dangerouslySetInnerHTML={{ __html: rendreExpressionKatex(item.expression) }}
            />
            {item.description && <p className="mt-1.5 text-xs text-dj-texte-muet">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
