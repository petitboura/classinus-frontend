"use client";

import { telecharger } from "./telecharger";
import { ouvrirPosition } from "@/components/chat/visionneurPositionEvenement";

// 20/09/2026, demande Bourama : des boutons de téléchargement faisaient
// sortir du site. Règle unique, posée ici plutôt que corrigée endroit par
// endroit :
//   - un lien qui veut SORTIR de l'appli passe par l'aperçu interne
//     (VisionneurPositionGlobal), qui demande ensuite d'ouvrir le site ;
//   - un lien de TÉLÉCHARGEMENT télécharge vraiment (lib/telecharger.ts),
//     il ne sort jamais.
// Le seul endroit autorisé à quitter l'appli est ouvrirSiteExterieur,
// appelé uniquement par le bouton "Ouvrir le site" de l'aperçu.

// Extensions considérées comme un fichier à télécharger. Même liste que
// EXTENSIONS_FICHIER de components/chat/FichierChip.tsx (qui garde la
// sienne pour les icônes), plus apk (mise à jour de l'app). Volontairement
// dupliquée ici : importer FichierChip dans le layout racine tirerait
// pdfjs-dist côté serveur (voir visionneurPositionEvenement.ts).
const EXTENSIONS_TELECHARGEMENT = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "zip",
  "json", "xml", "png", "jpg", "jpeg", "webp", "glb", "tex", "md", "apk",
]);

function extensionDeUrl(url: URL): string | null {
  const trouve = url.pathname.match(/\.([a-zA-Z0-9]+)$/);
  const ext = trouve?.[1]?.toLowerCase();
  return ext && EXTENSIONS_TELECHARGEMENT.has(ext) ? ext : null;
}

export function resoudreUrl(href: string): URL | null {
  try {
    return new URL(href, window.location.href);
  } catch {
    return null;
  }
}

// Vrai seulement pour un lien http(s) vers une AUTRE origine que l'appli
// (le web, ou le serveur local https://localhost de l'app native, sont
// tous deux couverts par window.location.origin). mailto:, tel:, blob:
// et les liens internes ne sont jamais concernés.
export function estLienExterne(href: string): boolean {
  const url = resoudreUrl(href);
  if (!url) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return url.origin !== window.location.origin;
}

export function estLienTelechargement(href: string, aAttributDownload = false): boolean {
  if (aAttributDownload) return true;
  const url = resoudreUrl(href);
  return !!url && extensionDeUrl(url) !== null;
}

function nomDepuisUrl(href: string): string {
  const url = resoudreUrl(href);
  const dernier = url?.pathname.split("/").filter(Boolean).pop();
  if (!dernier) return "fichier";
  try {
    return decodeURIComponent(dernier);
  } catch {
    return dernier;
  }
}

// Point d'entrée unique : télécharge si c'est un fichier, sinon ouvre
// l'aperçu interne. `titre` sert de titre d'aperçu, `nomFichier` de nom
// de fichier téléchargé (sinon déduit de l'URL).
export function traiterLienSortant(
  href: string,
  options: { titre?: string; nomFichier?: string; aAttributDownload?: boolean } = {}
) {
  if (estLienTelechargement(href, options.aAttributDownload)) {
    void telecharger(href, options.nomFichier || nomDepuisUrl(href));
    return;
  }
  const url = resoudreUrl(href);
  ouvrirPosition({
    url: href,
    titre: options.titre || url?.hostname || href,
    typeMime: null,
  });
}

// Seul point de sortie réel de l'appli, réservé à l'action explicite
// "Ouvrir le site" de l'aperçu (l'utilisateur a déjà vu l'aperçu et
// choisi de sortir).
export function ouvrirSiteExterieur(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}
