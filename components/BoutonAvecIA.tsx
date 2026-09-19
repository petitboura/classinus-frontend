"use client";

import { Sparkles } from "lucide-react";
import { useOuvrirChatAvecTexte } from "@/lib/contexteChat";
import { incrementerCtaCatalogue, type TypeElementCataloguePublic } from "@/lib/api";

/**
 * 17/09/2026, demande Bourama : bouton "avec l'IA" commun, réutilisé
 * partout où un élément (fichier, dossier, skill, notion,
 * établissement...) peut être ouvert directement dans une conversation
 * avec Clovis -- un clic ouvre le chat sur une NOUVELLE conversation
 * préremplie avec `texte` (même mécanisme que "discuter d'un
 * signalement", voir useOuvrirChatAvecTexte, lib/contexteChat.tsx).
 * Même pattern visuel que ButtonPartager (components/ButtonPartager.tsx)
 * pour que les deux boutons s'alignent naturellement côte à côte.
 *
 * 18/09/2026, `compterCta` (optionnel) : chantier "profil contributeur
 * bibliotheque publique", étape 12 -- incrémente cta_count pour un
 * élément du catalogue PUBLIC uniquement (fichier/dossier/skill, voir
 * TypeElementCataloguePublic ; jamais pour la bibliothèque perso, les
 * notions ou les établissements, qui n'ont pas ce compteur côté
 * backend). Fire-and-forget, même pattern que compterPartage dans
 * ButtonPartager.tsx : ne doit jamais retarder ni faire échouer
 * l'ouverture du chat.
 */
export function BoutonAvecIA({
  texte,
  libelle = "Avec l'IA",
  variante = "texte",
  className = "",
  compterCta,
}: {
  /** Message pré-rempli envoyé à Clovis à l'ouverture du chat. */
  texte: string;
  /** Libellé affiché (variante "texte" uniquement). */
  libelle?: string;
  /** "texte" : bouton avec libellé (listes/panneaux). "icone" : simple icône (lignes compactes). */
  variante?: "texte" | "icone";
  className?: string;
  /** Catalogue public uniquement, voir docstring plus haut. */
  compterCta?: { typeElement: TypeElementCataloguePublic; elementId: string };
}) {
  const ouvrirChatAvecTexte = useOuvrirChatAvecTexte();

  function ouvrir(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (compterCta) {
      incrementerCtaCatalogue(compterCta.typeElement, compterCta.elementId).catch(() => {});
    }
    ouvrirChatAvecTexte(texte);
  }

  if (variante === "icone") {
    return (
      <button
        onClick={ouvrir}
        title={libelle}
        className={
          "flex-shrink-0 rounded-lg p-1.5 text-dj-texte-muet transition-colors hover:text-dj-texte " + className
        }
      >
        <Sparkles size={14} />
      </button>
    );
  }

  return (
    <button
      onClick={ouvrir}
      className={
        "flex items-center gap-1 rounded-lg border border-dj-bordure px-2 py-1 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte " +
        className
      }
    >
      <Sparkles size={12} /> {libelle}
    </button>
  );
}
