"use client";

import { useEffect, type ReactNode } from "react";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

// Cadre commun des panneaux de l'écran Connexions : fond qui s'estompe, feuille qui monte depuis le
// bas sur téléphone et s'ouvre au centre sur PC, fermeture animée par clic sur le fond, Échap ou la
// fonction `fermer` donnée au contenu.
export function CadrePanneau({
  titreId,
  onFermer,
  largeur = "sm:max-w-md",
  children,
}: {
  titreId: string;
  onFermer: () => void;
  largeur?: string;
  children: (fermer: () => void) => ReactNode;
}) {
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => { if (e.key === "Escape") demarrerFermeture(onFermer); };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [demarrerFermeture, onFermer]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 pb-[var(--dj-barre-onglets-web,0px)] backdrop-blur-sm sm:items-center sm:p-6 sm:pb-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        className={`flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:rounded-cgpt-carte ${largeur} ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children(fermer)}
      </div>
    </div>
  );
}
