"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { FlottantAncre } from "@/components/FlottantAncre";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import type { CoteFlottant } from "@/lib/placementFlottant";

// Bulle d'une conversation de l'historique (27/11/2026, demande Bourama) : nom
// complet, et la date complete en dessous. Au survol a la souris, sur appui long
// au doigt.

// Petit delai avant ouverture : traverser la liste avec la souris ne doit pas
// faire clignoter une bulle sur chaque ligne.
const DELAI_SURVOL_MS = 350;
// Duree de l'appui long au doigt, celle des menus contextuels du telephone.
const DELAI_APPUI_LONG_MS = 500;
// Au dela de ce deplacement, le doigt fait defiler : ce n'est plus un appui.
const TOLERANCE_DOIGT_PX = 10;
// A la souris : a droite de la ligne pour ne cacher aucune autre conversation,
// sinon dessous ou dessus (liste en plein ecran sur une fenetre etroite).
const COTES_SOURIS: CoteFlottant[] = ["droite", "bas", "haut"];
// Au doigt : au dessus d'abord, pour que la main ne cache pas la bulle.
const COTES_DOIGT: CoteFlottant[] = ["haut", "bas"];
// A droite, passe le bouton des options et le bord de la barre.
const ECART_SOURIS_PX = 14;
const ECART_DOIGT_PX = 8;

// A la souris, la bulle s'ouvre au survol et se ferme quand la souris part. Au
// doigt, elle s'ouvre sur un appui long et reste jusqu'a ce qu'on touche
// ailleurs ou qu'on fasse defiler ; l'appui court ouvre la conversation.
export function useBulleSurvolFil(ancreRef: RefObject<HTMLElement | null>) {
  const [ouverte, setOuverte] = useState(false);
  const [auDoigt, setAuDoigt] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const depart = useRef({ x: 0, y: 0 });
  // Vrai apres un appui long : le clic qui suit le lever du doigt ne doit pas
  // ouvrir la conversation.
  const clicARetenir = useRef(false);
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

  const programmer = useCallback(
    (delai: number, doigt: boolean) => {
      annuler();
      minuteur.current = setTimeout(() => {
        clicARetenir.current = doigt;
        setAuDoigt(doigt);
        setOuverte(true);
      }, delai);
    },
    [annuler]
  );

  // Au doigt, rien ne "quitte" la ligne : on ferme au premier appui ailleurs
  // ou au premier defilement.
  useEffect(() => {
    if (!ouverte || !auDoigt) return;
    const appuiAilleurs = (e: Event) => {
      if (!ancreRef.current?.contains(e.target as Node)) fermer();
    };
    document.addEventListener("pointerdown", appuiAilleurs, true);
    window.addEventListener("scroll", fermer, true);
    return () => {
      document.removeEventListener("pointerdown", appuiAilleurs, true);
      window.removeEventListener("scroll", fermer, true);
    };
  }, [ouverte, auDoigt, ancreRef, fermer]);

  // A poser sur la zone survolee ou appuyee.
  const gestes = {
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === "mouse") programmer(DELAI_SURVOL_MS, false);
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === "mouse") fermer();
      else annuler();
    },
    onPointerDown: (e: PointerEvent) => {
      clicARetenir.current = false;
      fermer();
      if (e.pointerType === "mouse") return;
      depart.current = { x: e.clientX, y: e.clientY };
      programmer(DELAI_APPUI_LONG_MS, true);
    },
    onPointerMove: (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      if (Math.hypot(e.clientX - depart.current.x, e.clientY - depart.current.y) > TOLERANCE_DOIGT_PX) annuler();
    },
    onPointerUp: (e: PointerEvent) => {
      if (e.pointerType !== "mouse") annuler();
    },
    onPointerCancel: annuler,
    onWheel: fermer,
    onClickCapture: (e: MouseEvent) => {
      if (!clicARetenir.current) return;
      clicARetenir.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    // L'appui long du telephone ouvrirait sinon son propre menu.
    onContextMenu: (e: MouseEvent) => {
      const type = (e.nativeEvent as unknown as { pointerType?: string }).pointerType;
      if (type !== "mouse" && (minuteur.current || ouverte)) e.preventDefault();
    },
  };

  return { ouverte, auDoigt, enSortie, gestes };
}

export function BulleFil({
  ancreRef,
  titre,
  date,
  enSortie,
  auDoigt,
}: {
  ancreRef: RefObject<HTMLElement | null>;
  titre: string;
  date: string;
  enSortie: boolean;
  auDoigt: boolean;
}) {
  return (
    <FlottantAncre
      ancreRef={ancreRef}
      cotes={auDoigt ? COTES_DOIGT : COTES_SOURIS}
      alignement="centre"
      ecart={auDoigt ? ECART_DOIGT_PX : ECART_SOURIS_PX}
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
