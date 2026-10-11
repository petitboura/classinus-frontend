"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

// Bouton qui copie l'adresse d'un lien (11/10/2026, demande Bourama : aucun
// moyen de copier un lien depuis une carte ni depuis l'aperçu).
//
// Deux variantes :
//   - "survol" : petite pastille posée sur une carte de lien (LinkPreview).
//     Visible seulement au survol de la carte (parent portant la classe
//     `group`) et uniquement sur les appareils qui ont un vrai survol
//     (souris). Sur téléphone elle reste cachée : la copie se fait depuis
//     l'aperçu. Toujours posée À CÔTÉ du lien, jamais dedans : un bouton
//     dans un <a> serait avalé par GardienLiensSortants (clic intercepté en
//     phase de capture).
//   - "texte" : bouton avec libellé, pour l'aperçu (VisionneurPositionGlobal),
//     à côté de "Ouvrir le site".
//
// Même repli que ButtonPartager.tsx si le presse-papiers est refusé : une
// invite avec l'adresse à copier à la main.
export function BoutonCopierLien({
  href,
  variante,
  className = "",
}: {
  href: string;
  variante: "survol" | "texte";
  className?: string;
}) {
  const [copie, setCopie] = useState(false);
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (minuteurRef.current) clearTimeout(minuteurRef.current);
    };
  }, []);

  async function copier(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      window.prompt("Copie ce lien :", href);
      return;
    }
    setCopie(true);
    if (minuteurRef.current) clearTimeout(minuteurRef.current);
    minuteurRef.current = setTimeout(() => setCopie(false), 1500);
  }

  const libelle = copie ? "Lien copié" : "Copier le lien";
  const icone = (
    <span key={copie ? "copie" : "normal"} className="flex animate-dj-fade-in-rapide items-center justify-center">
      {copie ? <Check size={variante === "texte" ? 13 : 14} /> : <Copy size={variante === "texte" ? 13 : 14} />}
    </span>
  );

  if (variante === "texte") {
    return (
      <button
        onClick={copier}
        aria-label="Copier le lien"
        className={
          "flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte " +
          className
        }
      >
        {icone}
        {libelle}
      </button>
    );
  }

  return (
    <button
      onClick={copier}
      aria-label={libelle}
      className={
        "pointer-events-none absolute flex h-7 w-7 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface text-dj-texte-muet opacity-0 shadow-sm transition-all duration-150 hover:border-dj-bordure-forte hover:text-dj-texte focus-visible:pointer-events-auto focus-visible:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100 " +
        className
      }
    >
      {icone}
    </button>
  );
}
