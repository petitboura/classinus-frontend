"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Largeur du volet latéral des choix (PC), en rem. Source unique : le parent
// (BoutonReglages.tsx) s'en sert aussi pour décider de quel côté l'ouvrir.
export const LARGEUR_VOLET_REM = 14;

// Marge minimale gardée entre le volet et le bord de l'écran, en pixels.
const MARGE_ECRAN_PX = 8;

/**
 * Une ligne du bouton Réglages : un titre avec son icône, qui montre ses
 * choix. Ce n'est pas un bouton d'action, seulement un titre qui s'ouvre,
 * sans aucune valeur affichée (les réglages actuels se lisent dans la bulle
 * au survol du bouton Réglages). Une seule ligne est ouverte à la fois (géré
 * par le parent, BoutonReglages.tsx).
 *
 * Mobile : les choix se déplient juste en dessous du titre, dans le même
 * panneau, la flèche passe de la droite vers le bas.
 *
 * PC (lateral) : les choix s'affichent dans un volet à part, collé au panneau,
 * à droite ou à gauche selon la place à l'écran (côté décidé par le parent).
 * La flèche pointe vers le bas quand la ligne est repliée, puis vers le côté
 * où le volet s'ouvre. Le volet est aligné sur la ligne et remonte ou descend
 * au besoin pour ne jamais dépasser de l'écran ; il défile s'il est trop haut.
 *
 * Dans les deux cas l'apparition glisse et s'estompe, jamais d'affichage brut.
 */
export function LigneReglage({
  Icone,
  titre,
  ouverte,
  grand,
  lateral = false,
  cote = "droite",
  onSurvol,
  onBasculer,
  children,
}: {
  Icone: LucideIcon;
  titre: string;
  ouverte: boolean;
  // Taille tactile (mobile) plutôt que compacte (PC).
  grand: boolean;
  // Vrai sur PC : les choix s'ouvrent dans un volet à côté du panneau.
  lateral?: boolean;
  // Côté du volet quand lateral est vrai.
  cote?: "droite" | "gauche";
  // Appelé quand une souris survole la ligne (jamais au tactile).
  onSurvol: () => void;
  onBasculer: () => void;
  children: ReactNode;
}) {
  const ligneRef = useRef<HTMLDivElement>(null);
  const voletRef = useRef<HTMLDivElement>(null);
  // Décalage vertical (px) appliqué au volet pour qu'il reste dans l'écran.
  const [decalage, setDecalage] = useState(0);

  useLayoutEffect(() => {
    if (!lateral || !ouverte) return;
    const ligne = ligneRef.current;
    const volet = voletRef.current;
    if (!ligne || !volet) return;
    const haut = ligne.getBoundingClientRect().top;
    const bas = haut + volet.offsetHeight;
    const limiteBas = window.innerHeight - MARGE_ECRAN_PX;
    let valeur = 0;
    if (bas > limiteBas) valeur = limiteBas - bas;
    if (haut + valeur < MARGE_ECRAN_PX) valeur = MARGE_ECRAN_PX - haut;
    setDecalage(valeur);
  }, [lateral, ouverte, children]);

  const tailleFleche = grand ? 14 : 12;
  const classeFleche = "flex-shrink-0 transition-transform duration-200 ";

  return (
    <div ref={ligneRef} className={lateral ? "relative" : undefined}>
      <button
        type="button"
        role="menuitem"
        aria-expanded={ouverte}
        aria-haspopup={lateral ? "menu" : undefined}
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
        {lateral ? (
          <ChevronDown
            size={tailleFleche}
            className={classeFleche + (ouverte ? (cote === "droite" ? "-rotate-90" : "rotate-90") : "")}
          />
        ) : (
          <ChevronRight size={tailleFleche} className={classeFleche + (ouverte ? "rotate-90" : "")} />
        )}
      </button>

      {lateral ? (
        <div
          ref={voletRef}
          role="menu"
          aria-hidden={!ouverte}
          style={{ width: `${LARGEUR_VOLET_REM}rem`, top: decalage }}
          className={
            "absolute z-10 max-h-[min(60vh,22rem)] overflow-y-auto rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-1 shadow-lg transition-[opacity,transform,visibility] duration-150 ease-cgpt-doux " +
            (cote === "droite"
              ? "left-[calc(100%+0.5rem)] origin-left "
              : "right-[calc(100%+0.5rem)] origin-right ") +
            (ouverte
              ? "visible translate-x-0 scale-100 opacity-100"
              : "invisible scale-95 opacity-0 " + (cote === "droite" ? "-translate-x-1" : "translate-x-1"))
          }
        >
          {children}
        </div>
      ) : (
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
      )}
    </div>
  );
}
