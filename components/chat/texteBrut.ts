import { isValidElement, type ReactNode } from "react";

// Extrait le texte brut d'un enfant React, nécessaire pour récupérer le
// contenu source d'un bloc de code (```lang ... ```) tel que ReactMarkdown
// le structure : <pre><code className="language-xxx">texte brut</code></pre>.
export function texteBrut(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(texteBrut).join("");
  if (isValidElement(node)) return texteBrut((node.props as { children?: ReactNode }).children);
  return "";
}
