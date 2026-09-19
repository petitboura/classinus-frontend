"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { incrementerPartageCatalogue, type TypeElementCataloguePublic } from "@/lib/api";

/**
 * 11/09/2026, demande Bourama : bouton "Partager" commun, réutilisé
 * partout où un élément (skill perso/publique, document perso/publique,
 * dossier/sous-dossier) a désormais son propre lien direct -- un clic
 * copie/partage directement le lien, pas de menu ni d'étape
 * intermédiaire ("tous vrai bouton le fait déjà"). Même pattern que
 * AppSidebar.tsx::partager (navigator.share natif si dispo, sinon
 * copie presse-papier avec confirmation "Copié !").
 *
 * Reste séparé du système de codes de partage existant (MesCodes.tsx,
 * EspaceEntrerCode.tsx) -- volontairement inchangé.
 *
 * 13/09/2026, `partagerOuCopierLien` ci-dessous : même comportement que
 * `partager` un peu plus bas (chantier "un seul bouton par carte",
 * demande Bourama), utilisée par MenuActionsCarte pour l'action
 * "Partager" des menus de cartes (bibliothèque perso/publique).
 * Volontairement dupliquée plutôt qu'appelée par `partager` -- délégué
 * à travers un helper faisait perdre à TypeScript la trace de l'appel
 * réel à `navigator.share(...)` dans le bloc `if`, et casse le build
 * Vercel (TS2774 : "This condition will always return true [...] Did
 * you mean to call it instead?", suivi d'un TS2339 en cascade sur
 * `navigator.clipboard`). Constaté et corrigé le jour même après un
 * premier échec de build.
 *
 * 18/09/2026, `compterPartage` (optionnel, sur les deux fonctions
 * ci-dessous) : chantier "profil contributeur bibliotheque publique",
 * demande Bourama ("ces boutons ne servent qu'à partager rien d'autre,
 * donc il doit les compter rien d'autre") -- incrémente partages_count
 * pour un élément du catalogue PUBLIC uniquement (jamais pour la
 * bibliothèque perso, qui n'a pas ce compteur). Fire-and-forget : ne
 * doit jamais retarder ni faire échouer le partage lui-même.
 */
export async function partagerOuCopierLien(
  lien: string,
  titre?: string,
  compterPartage?: { typeElement: TypeElementCataloguePublic; elementId: string }
) {
  if (compterPartage) {
    incrementerPartageCatalogue(compterPartage.typeElement, compterPartage.elementId).catch(() => {});
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: titre, url: lien });
    } catch {
      // Annulé par la personne.
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(lien);
  } catch {
    window.prompt("Copie ce lien :", lien);
  }
}

export function ButtonPartager({
  lien,
  titre,
  variante = "texte",
  className = "",
  compterPartage,
}: {
  lien: string;
  titre?: string;
  /** "texte" : bouton avec libellé (listes/panneaux). "icone" : simple icône (lignes compactes). */
  variante?: "texte" | "icone";
  className?: string;
  /** Catalogue public uniquement, voir docstring plus haut. */
  compterPartage?: { typeElement: TypeElementCataloguePublic; elementId: string };
}) {
  const [copie, setCopie] = useState(false);

  async function partager(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (compterPartage) {
      incrementerPartageCatalogue(compterPartage.typeElement, compterPartage.elementId).catch(() => {});
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: titre, url: lien });
      } catch {
        // Annulé par la personne.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      window.prompt("Copie ce lien :", lien);
    }
  }

  if (variante === "icone") {
    return (
      <button
        onClick={partager}
        title="Partager le lien"
        className={
          "flex-shrink-0 rounded-lg p-1.5 text-dj-texte-muet transition-colors hover:text-dj-texte " + className
        }
      >
        <Share2 size={14} />
      </button>
    );
  }

  return (
    <button
      onClick={partager}
      className={
        "flex items-center gap-1 rounded-lg border border-dj-bordure px-2 py-1 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte " +
        className
      }
    >
      <Share2 size={12} /> {copie ? "Copié !" : "Partager"}
    </button>
  );
}

/** Construit le lien public d'un élément à partir de son type et de son id. */
export function lienPartage(
  type: "fichier-perso" | "dossier-perso" | "skill-perso" | "fichier-public" | "dossier-public" | "skill-public",
  id: string
): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  switch (type) {
    case "fichier-perso":
      return `${base}/bibliotheque/perso/${id}`;
    case "dossier-perso":
      return `${base}/dossiers/perso/${id}`;
    case "skill-perso":
      return `${base}/skills/perso/${id}`;
    case "fichier-public":
      return `${base}/bibliotheque/${id}`;
    case "dossier-public":
      return `${base}/dossiers/${id}`;
    case "skill-public":
      return `${base}/skills/${id}`;
  }
}
