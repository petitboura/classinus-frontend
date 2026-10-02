import { toBlob } from "html-to-image";
import { telechargerContenuLocal } from "@/lib/telecharger";

// Export PNG des éléments riches du chat qui sont faits en HTML (fiches de
// révision, diagrammes Mermaid) et non en SVG pur. Pour un SVG seul
// (graphiques, figures géométriques), voir telechargerImageGraphique.ts qui
// reste en place et n'a pas besoin de librairie.
//
// Toute la capture se fait dans le navigateur, rien n'est envoyé au serveur.
// Le vrai téléchargement (dont Android) passe par telechargerContenuLocal.

// Un élément portant cet attribut est retiré de l'image (ex. le bouton
// Télécharger lui-même s'il se trouve à l'intérieur de la zone capturée).
export const ATTRIBUT_EXCLURE_EXPORT = "data-exclure-export";

// Nom de fichier lisible : accents retirés, caractères spéciaux remplacés.
export function nomFichierImage(titre: string | undefined, parDefaut: string): string {
  const base = (titre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-_]+/gi, "_");
  const propre = base.replace(/^_+|_+$/g, "");
  return `${propre || parDefaut}.png`;
}

// Largeur réelle qu'il faut pour tout montrer. Un tableau large défile
// horizontalement dans son cadre : à l'écran on n'en voit qu'une partie, mais
// l'image doit montrer le tableau entier. On mesure donc le débordement le plus
// grand parmi tous les éléments à l'intérieur et on l'ajoute à la largeur
// visible.
function largeurNecessaire(noeud: HTMLElement, largeurVisible: number): number {
  let debordMax = 0;
  const tous: HTMLElement[] = [noeud, ...Array.from(noeud.querySelectorAll<HTMLElement>("*"))];
  for (const el of tous) {
    const debord = el.scrollWidth - el.clientWidth;
    if (debord > debordMax) debordMax = debord;
  }
  return Math.ceil(largeurVisible + debordMax);
}

// On ne capture jamais l'élément vivant : on en fait une copie hors écran, où
// l'on retire tout ce qui rogne ou anime (barres de défilement, hauteurs
// limitées, fondu d'apparition). La copie est placée dans le même parent que
// l'original pour hériter des mêmes polices et couleurs, puis retirée aussitôt.
function preparerCopieHorsEcran(noeud: HTMLElement, largeur: number): { hote: HTMLElement; copie: HTMLElement } {
  const hote = document.createElement("div");
  hote.setAttribute("aria-hidden", "true");
  hote.style.cssText = `position:fixed;top:0;left:-100000px;width:${largeur}px;pointer-events:none;`;

  const copie = noeud.cloneNode(true) as HTMLElement;
  copie.style.margin = "0";
  copie.style.width = `${largeur}px`;
  copie.style.minWidth = "0";
  copie.style.maxWidth = "none";
  copie.style.transform = "none";

  hote.appendChild(copie);
  (noeud.parentElement ?? document.body).appendChild(hote);

  const tous: HTMLElement[] = [copie, ...Array.from(copie.querySelectorAll<HTMLElement>("*"))];
  for (const el of tous) {
    el.style.animation = "none";
    el.style.transition = "none";
  }
  for (const el of tous) {
    // Les <svg> gardent leur propre logique de découpe, on n'y touche pas.
    if (el instanceof SVGElement) continue;
    const style = getComputedStyle(el);
    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
    const coupeEnHauteur = el.scrollHeight > el.clientHeight + 1;
    el.style.overflow = "visible";
    el.style.maxHeight = "none";
    if (coupeEnHauteur) el.style.height = "auto";
  }
  return { hote, copie };
}

// Retourne true si le fichier a bien été produit et remis au téléchargement,
// false sinon (élément absent ou masqué, capture refusée par le navigateur).
// L'appelant affiche alors un retour clair au lieu d'un faux "Téléchargé".
export async function telechargerImageElement(noeud: HTMLElement | null, nomFichier: string): Promise<boolean> {
  if (!noeud) return false;
  const rect = noeud.getBoundingClientRect();
  // Élément masqué au moment du clic (ex. bloc replié) : rien à capturer.
  if (rect.width === 0 || rect.height === 0) return false;

  let hote: HTMLElement | null = null;
  try {
    // Les polices doivent être chargées avant la capture, sinon le texte est
    // dessiné avec une police de secours.
    if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;

    const fond = getComputedStyle(document.documentElement).getPropertyValue("--dj-surface").trim() || undefined;

    const prepare = preparerCopieHorsEcran(noeud, largeurNecessaire(noeud, Math.ceil(rect.width)));
    hote = prepare.hote;
    const { copie } = prepare;

    const blob = await toBlob(copie, {
      pixelRatio: 2,
      backgroundColor: fond,
      width: copie.offsetWidth,
      height: copie.offsetHeight,
      filter: (n) => !(n instanceof HTMLElement && n.hasAttribute(ATTRIBUT_EXCLURE_EXPORT)),
    });
    if (!blob) return false;

    await telechargerContenuLocal(nomFichier, blob, "image/png");
    return true;
  } catch (e) {
    console.error("[telechargerImageElement] échec de la capture :", e);
    return false;
  } finally {
    hote?.remove();
  }
}

// Pour une image déjà produite en base64 (ex. graphique matplotlib renvoyé
// par l'exécution de code) : aucune capture nécessaire, on remet directement
// le PNG au téléchargement.
export async function telechargerImageBase64(base64: string, nomFichier: string): Promise<boolean> {
  try {
    const octets = atob(base64);
    const tableau = new Uint8Array(octets.length);
    for (let i = 0; i < octets.length; i++) tableau[i] = octets.charCodeAt(i);
    await telechargerContenuLocal(nomFichier, new Blob([tableau], { type: "image/png" }), "image/png");
    return true;
  } catch (e) {
    console.error("[telechargerImageBase64] échec :", e);
    return false;
  }
}
