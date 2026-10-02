"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type EntreeMenuPlus = {
  cle: string;
  Icone: LucideIcon;
  libelle: string;
  onClick: () => void;
  // Entrée grisée et non cliquable (ex. chargement en cours).
  desactive?: boolean;
};

/**
 * Bouton "+" de la barre de saisie (01/10/2026, refonte de la barre), même
 * structure sur PC et mobile. Un clic ouvre le menu, dont la liste d'entrées
 * (et leur ordre) est fournie par le parent : ce composant ne s'occupe que de
 * l'affichage, de l'ouverture et de la fermeture (clic extérieur, Echap).
 *
 * Les deux instances (PC et mobile) gardent chacune leur état d'ouverture.
 */
export function MenuPlus({
  variante,
  entrees,
  enfantsAncres,
}: {
  variante: "bureau" | "mobile";
  entrees: EntreeMenuPlus[];
  // Panneaux flottants ancrés sur le "+" (ex. la liste des applications sur
  // PC), rendus dans le même repère que le menu.
  enfantsAncres?: ReactNode;
}) {
  const mobile = variante === "mobile";
  const [menuOuvert, setMenuOuvert] = useState(false);
  const racineRef = useRef<HTMLDivElement>(null);

  // Fermeture du menu au clic extérieur et à la touche Echap.
  useEffect(() => {
    if (!menuOuvert) return;
    function gererClicExterieur(e: MouseEvent) {
      if (racineRef.current?.contains(e.target as Node)) return;
      setMenuOuvert(false);
    }
    function gererTouche(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    document.addEventListener("keydown", gererTouche);
    return () => {
      document.removeEventListener("mousedown", gererClicExterieur);
      document.removeEventListener("keydown", gererTouche);
    };
  }, [menuOuvert]);

  return (
    <div ref={racineRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setMenuOuvert((v) => !v)}
        aria-label="Plus d'options"
        aria-haspopup="menu"
        aria-expanded={menuOuvert}
        className={
          "flex items-center justify-center rounded-cgpt-bouton transition-colors " +
          (mobile ? "h-11 w-11 " : "h-7 w-7 ") +
          (menuOuvert
            ? "bg-dj-surface-haute text-dj-texte"
            : mobile
              ? "text-dj-texte-muet hover:bg-dj-surface hover:text-dj-texte"
              : "text-dj-texte-muet hover:text-dj-texte")
        }
      >
        <Plus size={18} className={"transition-transform duration-200 " + (menuOuvert ? "rotate-45" : "")} />
      </button>

      <div
        role="menu"
        aria-hidden={!menuOuvert}
        className={
          "absolute bottom-full left-0 z-30 mb-2 w-56 max-w-[calc(100vw-2rem)] origin-bottom-left rounded-2xl border border-dj-bordure bg-dj-surface p-1 shadow-xl transition-all duration-150 ease-cgpt-doux " +
          (menuOuvert ? "visible translate-y-0 scale-100 opacity-100" : "invisible translate-y-1 scale-95 opacity-0")
        }
      >
        {entrees.map(({ cle, Icone, libelle, onClick, desactive }) => (
          <button
            key={cle}
            type="button"
            role="menuitem"
            disabled={desactive}
            onClick={() => {
              onClick();
              setMenuOuvert(false);
            }}
            className={
              "flex w-full items-center gap-2 rounded-xl text-left text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:cursor-not-allowed disabled:opacity-50 " +
              (mobile ? "px-3 py-2.5 text-sm" : "px-2.5 py-2 text-xs")
            }
          >
            <Icone size={mobile ? 16 : 14} /> {libelle}
          </button>
        ))}
      </div>

      {enfantsAncres}
    </div>
  );
}
