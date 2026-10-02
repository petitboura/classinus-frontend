"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Une ligne du bouton Réglages : un titre avec son icône, qui déplie ses
 * choix juste en dessous. Ce n'est pas un bouton d'action, seulement un titre
 * qui s'ouvre, sans aucune valeur affichée (les réglages actuels se lisent
 * dans la bulle au survol du bouton Réglages). Une seule ligne est dépliée à
 * la fois (géré par le parent, BoutonReglages.tsx). Le dépliage glisse et
 * s'estompe, jamais d'affichage brut.
 */
export function LigneReglage({
  Icone,
  titre,
  ouverte,
  grand,
  onSurvol,
  onBasculer,
  children,
}: {
  Icone: LucideIcon;
  titre: string;
  ouverte: boolean;
  // Taille tactile (mobile) plutôt que compacte (PC).
  grand: boolean;
  // Appelé quand une souris survole la ligne (jamais au tactile).
  onSurvol: () => void;
  onBasculer: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        role="menuitem"
        aria-expanded={ouverte}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") onSurvol();
        }}
        onClick={onBasculer}
        className={
          "flex w-full items-center gap-2 rounded-xl text-left transition-colors hover:bg-dj-surface-haute " +
          (grand ? "px-2.5 py-2 text-[13px] " : "px-2 py-1.5 text-xs ") +
          (ouverte ? "text-dj-texte" : "text-dj-texte-muet hover:text-dj-texte")
        }
      >
        <Icone size={grand ? 15 : 14} className="flex-shrink-0" />
        <span className="flex-1 truncate">{titre}</span>
        <ChevronRight
          size={grand ? 14 : 12}
          className={"flex-shrink-0 transition-transform duration-200 " + (ouverte ? "rotate-90" : "")}
        />
      </button>
      <div
        aria-hidden={!ouverte}
        className={
          "grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-cgpt-doux " +
          (ouverte ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0")
        }
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pb-1 pl-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
