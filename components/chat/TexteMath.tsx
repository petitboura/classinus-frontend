"use client";

// Texte court avec formules LaTeX rendues (KaTeX), en ligne : même rendu des
// formules que les messages du chat (remark-math + rehype-katex, mêmes
// délimiteurs $...$, $$...$$, \(...\), \[...\]) mais sans mise en page de
// paragraphe, pour pouvoir l'utiliser dans un bouton, un titre ou une
// explication (QCMInteractif). Créé le 18/10/2026, demande Bourama : les QCM
// affichaient le LaTeX brut. La normalisation des délimiteurs reprend celle de
// BulleMessage.tsx:normaliserLatex, recopiée ici pour ne pas importer
// BulleMessage (qui importe déjà QCMInteractif) et éviter une dépendance
// circulaire. Pas de HTML brut accepté (pas de rehype-raw) : seul le texte et
// les formules sont rendus.

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const PLUGINS_REMARK = [remarkMath];
const PLUGINS_REHYPE = [rehypeKatex];
const COMPOSANTS = {
  p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
};

function normaliserDelimiteurs(texte: string): string {
  return texte
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formule) => `$$${formule}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, formule) => `$${formule}$`);
}

function TexteMathBrut({ texte }: { texte: string }) {
  return (
    <ReactMarkdown remarkPlugins={PLUGINS_REMARK} rehypePlugins={PLUGINS_REHYPE} components={COMPOSANTS}>
      {normaliserDelimiteurs(texte)}
    </ReactMarkdown>
  );
}

export const TexteMath = memo(TexteMathBrut);
