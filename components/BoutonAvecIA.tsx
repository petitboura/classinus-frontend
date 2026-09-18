"use client";

import { Sparkles } from "lucide-react";
import { useOuvrirChatAvecTexte } from "@/lib/contexteChat";

/**
 * 17/09/2026, demande Bourama : bouton "avec l'IA" commun, réutilisé
 * partout où un élément (fichier, dossier, skill, notion,
 * établissement...) peut être ouvert directement dans une conversation
 * avec Clovis -- un clic ouvre le chat sur une NOUVELLE conversation
 * préremplie avec `texte` (même mécanisme que "discuter d'un
 * signalement", voir useOuvrirChatAvecTexte, lib/contexteChat.tsx).
 * Même pattern visuel que ButtonPartager (components/ButtonPartager.tsx)
 * pour que les deux boutons s'alignent naturellement côte à côte.
 */
export function BoutonAvecIA({
  texte,
  libelle = "Avec l'IA",
  variante = "texte",
  className = "",
}: {
  /** Message pré-rempli envoyé à Clovis à l'ouverture du chat. */
  texte: string;
  /** Libellé affiché (variante "texte" uniquement). */
  libelle?: string;
  /** "texte" : bouton avec libellé (listes/panneaux). "icone" : simple icône (lignes compactes). */
  variante?: "texte" | "icone";
  className?: string;
}) {
  const ouvrirChatAvecTexte = useOuvrirChatAvecTexte();

  function ouvrir(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
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
