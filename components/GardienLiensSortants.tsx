"use client";

import { useEffect } from "react";
import { estLienExterne, estLienTelechargement, traiterLienSortant } from "@/lib/liensSortants";

// 20/09/2026, demande Bourama : une seule règle pour toute l'appli, sans
// corriger chaque lien à la main. Ce gardien écoute tous les clics (phase
// de capture, donc avant n'importe quel composant) et, pour un lien qui
// pointe hors de l'appli :
//   - fichier à télécharger (attribut download ou extension de fichier) :
//     téléchargement réel, sans quitter la page ;
//   - tout autre lien : aperçu interne, qui demande ensuite d'ouvrir le site.
//
// Deux marqueurs HTML permettent de déroger :
//   - data-lien-libre : le lien garde son comportement natif (ex. le lien
//     APK de la page /telecharger, que le navigateur télécharge lui-même) ;
//   - à l'intérieur de [data-apercu-actif] (l'aperçu lui-même), un clic sur
//     la carte ne fait rien : la seule sortie est le bouton "Ouvrir le site".
//
// Un clic avec Ctrl, Cmd, Maj ou Alt reste laissé au navigateur (choix
// explicite d'ouvrir ailleurs) ; le clic simple est toujours intercepté.
export function GardienLiensSortants() {
  useEffect(() => {
    function surClic(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      const cible = e.target instanceof Element ? e.target : null;
      const lien = cible?.closest("a[href]") as HTMLAnchorElement | null;
      if (!lien) return;
      if (lien.hasAttribute("data-lien-libre")) return;

      const href = lien.getAttribute("href") || "";
      const aAttributDownload = lien.hasAttribute("download");
      const sortant = estLienExterne(href);
      // Un lien avec attribut download vers l'appli elle même (blob:,
      // même origine) est un téléchargement interne déjà géré par son
      // auteur : seuls les liens externes sont concernés ici.
      if (!sortant) return;

      e.preventDefault();
      e.stopPropagation();

      if (lien.closest("[data-apercu-actif]") && !estLienTelechargement(href, aAttributDownload)) {
        return;
      }

      const texte = (lien.textContent || "").trim();
      traiterLienSortant(href, {
        titre: texte && texte !== href ? texte : undefined,
        nomFichier: lien.getAttribute("download") || undefined,
        aAttributDownload,
      });
    }

    document.addEventListener("click", surClic, true);
    return () => document.removeEventListener("click", surClic, true);
  }, []);

  return null;
}
