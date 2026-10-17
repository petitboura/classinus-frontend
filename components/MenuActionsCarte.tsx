"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import type { CoteFlottant } from "@/lib/placementFlottant";
import { FlottantAncre } from "./FlottantAncre";
import type { ActionSelection } from "./BarreActionsSelection";

// 13/09/2026, demande Bourama : sur mobile (et mobile installé), les
// cartes de la Bibliothèque (perso/publique, fichiers/dossiers) et de Mes
// codes entassaient jusqu'à 6 boutons icône côte à côte -- obligé de
// cacher certains, et même les noms restants perdaient en lisibilité,
// faute de place. Bourama a tranché : un seul bouton par carte. Ce
// composant remplace toute rangée de boutons d'action par un unique
// bouton "..." qui ouvre un menu déroulant listant les mêmes actions
// (même forme `ActionSelection` que BarreActionsSelection, pour rester
// cohérent). Comportement (ouverture/fermeture animée, clic extérieur,
// bascule automatique vers le haut si pas assez de place en dessous)
// calqué sur SelectPersonnalise.tsx pour rester cohérent avec le reste du
// dépôt plutôt que d'inventer un nouveau pattern.

// Côtés essayés, dans l'ordre : en dessous, puis au dessus (règle commune,
// voir lib/placementFlottant.ts). Constante pour ne pas relancer le placement
// à chaque rendu.
const COTES_MENU: CoteFlottant[] = ["bas", "haut"];

export function MenuActionsCarte({
  actions,
  ariaLabel = "Actions",
  contraste = false,
  declencheur,
  classeDeclencheur = "",
  desactive = false,
}: {
  actions: ActionSelection[];
  ariaLabel?: string;
  /** 02/10/2026, demande Bourama (panneau "quasi invisible") : bordure dorée
   * et ombre marquée, pour un menu posé sur une carte de même couleur que lui.
   * Absent : rendu inchangé pour les autres écrans. */
  contraste?: boolean;
  /** 07/10/2026 : contenu du bouton d'ouverture, a la place de l'icone "...".
   * Sert au bouton Telecharger du bloc animation (choix du format). Absent :
   * rendu inchange pour les autres ecrans. */
  declencheur?: ReactNode;
  /** Classes du bouton d'ouverture quand `declencheur` est fourni. */
  classeDeclencheur?: string;
  /** Bouton d'ouverture non cliquable. Absent : cliquable. */
  desactive?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(() => setOuvert(false));

  const ouvertRef = useRef(ouvert);
  useEffect(() => {
    ouvertRef.current = ouvert;
  }, [ouvert]);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (!ouvertRef.current) return;
      const cible = e.target as Node;
      if (ref.current && !ref.current.contains(cible) && !(menuRef.current && menuRef.current.contains(cible))) fermer();
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fermer recrée une fonction stable via demarrerFermeture (useCallback), l'état ouvert est lu via ouvertRef
  }, []);

  function ouvrirMenu() {
    setOuvert(true);
  }

  const panneau = () => (
    <FlottantAncre
      ancreRef={ref}
      innerRef={menuRef}
      role="menu"
      cotes={COTES_MENU}
      alignement="fin"
      className={`max-w-[min(16rem,85vw)] min-w-[10rem] rounded-lg border p-1 ${
        contraste
          ? "border-dj-bordure-forte bg-dj-surface shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          : "border-dj-bordure bg-dj-surface-haute shadow-lg"
      } ${enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"}`}
    >
          {actions.map((a) => (
            <button
              key={a.cle}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
                fermer();
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${contraste ? "hover:bg-dj-surface-haute" : "hover:bg-dj-surface"} ${
                a.destructif ? "text-[var(--dj-erreur)]" : "text-dj-texte"
              }`}
            >
              <span className="flex-shrink-0">{a.icone}</span>
              <span className="min-w-0 flex-1 truncate">{a.label}</span>
            </button>
          ))}
    </FlottantAncre>
  );

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        disabled={desactive}
        onClick={(e) => {
          e.stopPropagation();
          ouvert ? fermer() : ouvrirMenu();
        }}
        aria-label={ariaLabel}
        aria-haspopup={declencheur ? "menu" : undefined}
        aria-expanded={declencheur ? ouvert : undefined}
        className={
          declencheur
            ? classeDeclencheur
            : "flex flex-shrink-0 items-center rounded-full p-1.5 text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        }
      >
        {declencheur ?? <MoreVertical size={16} />}
      </button>

      {(ouvert || enSortie) && panneau()}
    </div>
  );
}
