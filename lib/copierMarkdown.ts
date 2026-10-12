import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Copie "formatée" d'un texte markdown (11/10/2026, demande Bourama : deux
// boutons de copie, formaté et brut). Le presse-papiers reçoit DEUX versions :
//   - text/html  : le markdown rendu (titres, listes, gras, tableaux), pour
//     qu'un collage dans Word, Notion ou un mail garde la mise en forme ;
//   - text/plain : le markdown tel quel. Le champ de saisie de Classinus ne
//     lit que le texte brut au collage (gererCollage dans BarreDeSaisie.tsx),
//     et l'aperçu d'un long texte collé le met ensuite en forme tout seul.
// HTML sans classes ni styles : rendu markdown de base, sans les composants
// de l'appli (leurs classes Tailwind ne veulent rien dire hors de la page).
// Si le navigateur n'accepte pas l'écriture riche, repli sur le texte brut.
export async function copierMarkdownFormate(markdown: string): Promise<void> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const html = renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, markdown));
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        }),
      ]);
      return;
    }
  } catch {
    // Écriture riche refusée : repli ci-dessous.
  }
  await navigator.clipboard.writeText(markdown);
}
