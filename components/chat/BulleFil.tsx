"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { FlottantAncre } from "@/components/FlottantAncre";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import type { CoteFlottant } from "@/lib/placementFlottant";

// Bulle de survol d'une conversation de l'historique (27/11/2026, demande
// Bourama) : nom complet, et la date complete en dessous.

// Petit delai avant ouverture : traverser la liste avec la souris ne doit pas
// faire clignoter une bulle sur chaque ligne.
const DELAI_OUVERTURE_MS = 350;
// A droite de la ligne pour ne cacher aucune autre conversation, sinon dessous
// ou dessus (liste en plein ecran sur une fenetre etroite).
const COTES: CoteFlottant[] = ["droite", "bas", "haut"];
// Passe le bouton des options et le bord de la barre.
const ECART_PX = 14;

// Souris seulement : au doigt il n'y a pas de survol, le toucher ouvre la
// conversation.
export function useBulleSurvolFil() {
  const [ouverte, setOuverte] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();

  const annuler = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
  }, []);
  useEffect(() => annuler, [annuler]);

  const fermer = useCallback(() => {
    annuler();
    if (ouverte) demarrerFermeture(() => setOuverte(false));
  }, [annuler, ouverte, demarrerFermeture]);

  const surEntree = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      annuler();
      minuteur.current = setTimeout(() => setOuverte(true), DELAI_OUVERTURE_MS);
    },
    [annuler]
  );

  return {
    ouverte,
    enSortie,
    // A poser sur la zone survolee.
    gestes: { onPointerEnter: surEntree, onPointerLeave: fermer, onPointerDown: fermer, onWheel: fermer },
  };
}

export function BulleFil({
  ancreRef,
  titre,
  date,
  enSortie,
}: {
  ancreRef: RefObject<HTMLElement | null>;
  titre: string;
  date: string;
  enSortie: boolean;
}) {
  return (
    <FlottantAncre
      ancreRef={ancreRef}
      cotes={COTES}
      alignement="centre"
      ecart={ECART_PX}
      role="tooltip"
      className={`pointer-events-none w-max max-w-72 break-words rounded-cgpt-bouton border border-dj-bordure bg-dj-surface px-3 py-2 text-left shadow-xl ${
        enSortie ? "animate-cgpt-sortie-modal" : "animate-dj-fade-in-rapide"
      }`}
    >
      <span className="block text-sm font-medium text-dj-texte">{titre}</span>
      {date && <span className="mt-1 block text-xs text-dj-texte-muet">{date}</span>}
    </FlottantAncre>
  );
}
