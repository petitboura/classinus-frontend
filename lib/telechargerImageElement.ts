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

// Retourne true si le fichier a bien été produit et remis au téléchargement,
// false sinon (élément absent ou masqué, capture refusée par le navigateur).
// L'appelant affiche alors un retour clair au lieu d'un faux "Téléchargé".
export async function telechargerImageElement(noeud: HTMLElement | null, nomFichier: string): Promise<boolean> {
  if (!noeud) return false;
  const rect = noeud.getBoundingClientRect();
  // Élément masqué au moment du clic (ex. bloc replié) : rien à capturer.
  if (rect.width === 0 || rect.height === 0) return false;

  try {
    // Les polices doivent être chargées avant la capture, sinon le texte est
    // dessiné avec une police de secours.
    if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;

    const fond = getComputedStyle(document.documentElement).getPropertyValue("--dj-surface").trim() || undefined;

    // Un bloc large peut défiler horizontalement : on capture sa taille
    // complète (scroll incluse), pas seulement la partie visible.
    const largeur = Math.max(noeud.scrollWidth, Math.ceil(rect.width));
    const hauteur = Math.max(noeud.scrollHeight, Math.ceil(rect.height));

    const blob = await toBlob(noeud, {
      pixelRatio: 2,
      backgroundColor: fond,
      width: largeur,
      height: hauteur,
      style: { overflow: "visible", margin: "0" },
      filter: (n) => !(n instanceof HTMLElement && n.hasAttribute(ATTRIBUT_EXCLURE_EXPORT)),
    });
    if (!blob) return false;

    await telechargerContenuLocal(nomFichier, blob, "image/png");
    return true;
  } catch (e) {
    console.error("[telechargerImageElement] échec de la capture :", e);
    return false;
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
