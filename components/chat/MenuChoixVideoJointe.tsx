"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Pencil, Play } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { textesEditeurVideo } from "@/lib/textesEditeurVideo";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import type { CoteFlottant } from "@/lib/placementFlottant";
import { FlottantAncre } from "../FlottantAncre";

// Clic sur une vidéo jointe dans la barre de saisie (22/10/2026, demande
// Bourama) : au lieu d'ouvrir directement l'éditeur, un petit menu propose
// l'aperçu simple ou l'éditeur. Même mécanique que MenuActionsCarte : ancré
// via FlottantAncre, fermeture animée, clic extérieur et Échap.

// Au dessus du bouton d'abord (la barre de saisie est en bas de l'écran), puis en dessous.
const COTES_MENU: CoteFlottant[] = ["haut", "bas"];

export function MenuChoixVideoJointe({
  ancreRef,
  onApercu,
  onEditer,
  onFermer,
}: {
  /** Le carré de la vidéo cliquée. */
  ancreRef: RefObject<HTMLElement | null>;
  onApercu: () => void;
  onEditer: () => void;
  /** Appelé à la fin de l'animation de sortie : le parent démonte alors le menu. */
  onFermer: () => void;
}) {
  const t = textesEditeurVideo(useLocale());
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);
  const fermerRef = useRef(fermer);
  fermerRef.current = fermer;

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (menuRef.current?.contains(cible)) return;
      // Le clic sur la vidéo elle-même rouvre le menu : on laisse son propre gestionnaire faire.
      if (ancreRef.current?.contains(cible)) return;
      fermerRef.current();
    }
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") fermerRef.current();
    }
    document.addEventListener("mousedown", surClicExterieur);
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClicExterieur);
      document.removeEventListener("keydown", surTouche);
    };
  }, [ancreRef]);

  const classeAction =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-dj-texte transition-colors hover:bg-dj-surface";

  return (
    <FlottantAncre
      ancreRef={ancreRef}
      innerRef={menuRef}
      role="menu"
      cotes={COTES_MENU}
      alignement="debut"
      className={`min-w-[10rem] max-w-[min(16rem,85vw)] rounded-lg border border-dj-bordure bg-dj-surface-haute p-1 shadow-lg ${
        enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
      }`}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onApercu();
          fermer();
        }}
        className={classeAction}
      >
        <Play size={14} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t.menuApercu}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onEditer();
          fermer();
        }}
        className={classeAction}
      >
        <Pencil size={14} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t.menuModifier}</span>
      </button>
    </FlottantAncre>
  );
}
