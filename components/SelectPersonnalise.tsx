"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import type { CoteFlottant } from "@/lib/placementFlottant";
import { FlottantAncre } from "./FlottantAncre";

// Remplace le <select> natif partout dans le dépôt (20/08/2026, demande
// Bourama : "tes sélecteurs ou les sélecteurs dans le dépôt ne sont pas
// du tout traités" -- constat après capture d'écran montrant le menu
// natif du navigateur, non stylé, texte non tronqué débordant sur le
// reste de la page). Le popup natif d'un <select> n'est de toute façon
// pas stylable en CSS (rendu par l'OS/le navigateur, pas par le DOM) --
// ce composant en est le remplacement direct, entièrement dans notre
// contrôle visuel.

export type OptionMenu = { id: string; label: string; sousLabel?: string };

// Côtés essayés : en dessous, puis au dessus (règle commune, lib/placementFlottant.ts).
const COTES_LISTE: CoteFlottant[] = ["bas", "haut"];

export function SelectPersonnalise({
  options,
  valeur,
  onChange,
  placeholder = "Choisir…",
  maxLongueurLabel = 50,
}: {
  options: OptionMenu[];
  valeur: string;
  onChange: (id: string) => void;
  placeholder?: string;
  maxLongueurLabel?: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listeRef = useRef<HTMLDivElement | null>(null);
  // 01/09/2026 (Bourama : "plein de boutons qui se ferment et s'ouvrent
  // brut") : ce menu n'avait aucune animation, ni entrée ni sortie --
  // aligné ici sur le même mécanisme que le reste de l'app (voir
  // lib/useFermetureAnimee.ts).
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(() => setOuvert(false));

  // 04/09/2026, bug signalé par Bourama (bibliothèque publique, panneau
  // de filtre) : ce listener tournait en continu même quand le select
  // était déjà fermé, donc n'importe quel clic ailleurs dans le
  // panneau (un autre bouton, un autre select) rouvrait puis refermait
  // ce select-ci pour rien, avec son animation de sortie. Résultat :
  // plusieurs listes réapparaissaient brièvement en même temps et
  // pouvaient recouvrir celle sur laquelle on cliquait vraiment. On
  // utilise un ref (plutôt que "ouvert" dans les deps) pour garder un
  // seul enregistrement du listener tout en lisant l'état à jour.
  const ouvertRef = useRef(ouvert);
  useEffect(() => {
    ouvertRef.current = ouvert;
  }, [ouvert]);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (!ouvertRef.current) return;
      const cible = e.target as Node;
      if (ref.current && !ref.current.contains(cible) && !(listeRef.current && listeRef.current.contains(cible))) fermer();
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fermer recrée une fonction stable via demarrerFermeture (useCallback), l'état ouvert est lu via ouvertRef
  }, []);

  function tronquer(texte: string) {
    return texte.length > maxLongueurLabel ? texte.slice(0, maxLongueurLabel).trimEnd() + "…" : texte;
  }

  // 17/10/2026 : le placement (côté, hauteur disponible, défilement interne,
  // limites de la fenêtre qui porte la liste) est réglé une seule fois pour
  // toute l'app dans FlottantAncre. Ce composant ne mesure plus rien lui-même.
  function ouvrirMenu() {
    setOuvert(true);
  }

  const choisi = options.find((o) => o.id === valeur);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (ouvert ? fermer() : ouvrirMenu())}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2 text-left text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
      >
        <span className="min-w-0 truncate">{choisi ? tronquer(choisi.label) : placeholder}</span>
        <ChevronDown size={14} className="flex-shrink-0 text-dj-texte-muet" />
      </button>

      {(ouvert || enSortie) && (
        <FlottantAncre
          ancreRef={ref}
          innerRef={listeRef}
          cotes={COTES_LISTE}
          memeLargeurQueAncre
          className={`max-h-56 rounded-lg border border-dj-bordure bg-dj-surface-haute p-1 shadow-lg ${
            enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
          }`}
        >
          {options.length === 0 && <p className="px-2.5 py-1.5 text-xs text-dj-texte-muet">Aucune option.</p>}
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o.id);
                fermer();
              }}
              className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-dj-surface ${
                o.id === valeur ? "text-dj-accent-1-texte" : "text-dj-texte"
              }`}
            >
              <span className="min-w-0 truncate">{tronquer(o.label)}</span>
              {o.sousLabel && <span className="flex-shrink-0 text-[10px] text-dj-texte-muet">{o.sousLabel}</span>}
            </button>
          ))}
        </FlottantAncre>
      )}
    </div>
  );
}
