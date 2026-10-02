"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type EntreeMenuPlus = {
  cle: string;
  Icone: LucideIcon;
  libelle: string;
  onClick: () => void;
};

// Durée d'appui avant que l'appui long déplie la rangée de raccourcis
// (mobile). Même ordre de grandeur que l'appui long natif iOS et Android.
const DELAI_APPUI_LONG_MS = 450;

/**
 * Bouton "+" de la barre de saisie (01/10/2026, refonte de la barre), même
 * structure sur PC et mobile.
 *
 * Un clic ouvre le menu (liste d'entrées fournie par le parent, dans l'ordre
 * voulu). Une rangée de raccourcis (les derniers utilitaires utilisés et
 * l'application) s'ouvre en plus :
 * - sur PC, en glissant à droite du "+" dès que la souris entre dans la ligne
 *   du "+" (`survolLigne`, piloté par le parent qui connaît cette ligne) ;
 * - sur mobile, en glissant au-dessus de la barre après un appui long sur le
 *   "+" (le survol n'existe pas au tactile).
 *
 * Le parent décide du contenu (entrées du menu, raccourcis, règle de doublon
 * entre les deux), ce composant ne s'occupe que de l'affichage et des
 * ouvertures. Les deux instances (PC et mobile) gardent chacune leur état
 * d'ouverture.
 */
export function MenuPlus({
  variante,
  entrees,
  raccourcis,
  survolLigne = false,
  garderRangee = false,
  enfantsAncres,
}: {
  variante: "bureau" | "mobile";
  entrees: EntreeMenuPlus[];
  // null quand il n'y a aucun raccourci à proposer : pas de rangée du tout.
  raccourcis: ReactNode | null;
  // PC : la souris est dans la ligne du "+".
  survolLigne?: boolean;
  // PC : garde la rangée visible tant qu'un panneau ancré dessus est ouvert
  // (ex. le sélecteur de pages Notion), même si la souris en est sortie.
  garderRangee?: boolean;
  // Panneaux flottants ancrés sur le "+" (ex. la liste des applications sur
  // PC), rendus dans le même repère que le menu.
  enfantsAncres?: ReactNode;
}) {
  const mobile = variante === "mobile";
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [rangeeLongAppui, setRangeeLongAppui] = useState(false);
  const racineRef = useRef<HTMLDivElement>(null);
  const minuterieRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appuiLongFaitRef = useRef(false);

  const rangeeVisible = !!raccourcis && (survolLigne || garderRangee || rangeeLongAppui);

  function annulerMinuterie() {
    if (minuterieRef.current) {
      clearTimeout(minuterieRef.current);
      minuterieRef.current = null;
    }
  }

  useEffect(() => annulerMinuterie, []);

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

  // Rangée ouverte par appui long : se referme au prochain toucher ailleurs.
  useEffect(() => {
    if (!rangeeLongAppui) return;
    function gererToucherExterieur(e: PointerEvent) {
      if (racineRef.current?.contains(e.target as Node)) return;
      setRangeeLongAppui(false);
    }
    document.addEventListener("pointerdown", gererToucherExterieur);
    return () => document.removeEventListener("pointerdown", gererToucherExterieur);
  }, [rangeeLongAppui]);

  function debutAppui(e: React.PointerEvent) {
    // La souris ouvre la rangée au survol, l'appui long ne concerne que le
    // tactile et le stylet.
    if (e.pointerType === "mouse" || !raccourcis) return;
    appuiLongFaitRef.current = false;
    annulerMinuterie();
    minuterieRef.current = setTimeout(() => {
      appuiLongFaitRef.current = true;
      setMenuOuvert(false);
      setRangeeLongAppui(true);
    }, DELAI_APPUI_LONG_MS);
  }

  function clic() {
    // Le relâchement qui termine un appui long ne doit pas ouvrir le menu.
    if (appuiLongFaitRef.current) {
      appuiLongFaitRef.current = false;
      return;
    }
    setRangeeLongAppui(false);
    setMenuOuvert((v) => !v);
  }

  return (
    <div ref={racineRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={clic}
        onPointerDown={debutAppui}
        onPointerUp={annulerMinuterie}
        onPointerLeave={annulerMinuterie}
        onPointerCancel={annulerMinuterie}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Plus d'options"
        aria-haspopup="menu"
        aria-expanded={menuOuvert}
        className={
          "flex select-none items-center justify-center rounded-cgpt-bouton transition-colors [-webkit-touch-callout:none] " +
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

      {/* Menu du "+" */}
      <div
        role="menu"
        aria-hidden={!menuOuvert}
        className={
          "absolute bottom-full left-0 z-30 mb-2 w-56 max-w-[calc(100vw-2rem)] origin-bottom-left rounded-2xl border border-dj-bordure bg-dj-surface p-1 shadow-xl transition-all duration-150 ease-cgpt-doux " +
          (menuOuvert ? "visible translate-y-0 scale-100 opacity-100" : "invisible translate-y-1 scale-95 opacity-0")
        }
      >
        {entrees.map(({ cle, Icone, libelle, onClick }) => (
          <button
            key={cle}
            type="button"
            role="menuitem"
            onClick={() => {
              onClick();
              setMenuOuvert(false);
            }}
            className={
              "flex w-full items-center gap-2 rounded-xl text-left text-dj-texte transition-colors hover:bg-dj-surface-haute " +
              (mobile ? "px-3 py-2.5 text-sm" : "px-2.5 py-2 text-xs")
            }
          >
            <Icone size={mobile ? 16 : 14} /> {libelle}
          </button>
        ))}
      </div>

      {/* Rangée de raccourcis : à droite du "+" sur PC, au-dessus sur mobile
          (la place à droite est occupée par les boutons de la barre). */}
      {raccourcis && (
        <div
          aria-hidden={!rangeeVisible}
          onClick={() => setRangeeLongAppui(false)}
          className={
            "absolute z-30 " + (mobile ? "bottom-full left-0 mb-2" : "left-full top-1/2 ml-3 -translate-y-1/2")
          }
        >
          <div
            className={
              "flex items-center transition-all duration-200 ease-cgpt-doux " +
              (mobile
                ? "gap-1 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-1 shadow-lg "
                : "gap-3 ") +
              (rangeeVisible
                ? "visible translate-x-0 translate-y-0 opacity-100"
                : mobile
                  ? "invisible translate-y-1 opacity-0"
                  : "invisible -translate-x-2 opacity-0")
            }
          >
            {raccourcis}
          </div>
        </div>
      )}

      {enfantsAncres}
    </div>
  );
}
