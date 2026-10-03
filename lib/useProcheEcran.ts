"use client";

import { useEffect, useState } from "react";

// Devient vrai quand l'élément approche de l'écran, puis le reste pour de bon.
//
// Sert aux blocs lourds du chat (widget interactif, animation) : dans une
// longue conversation avec dix widgets, les lancer tous d'un coup ralentirait
// la page, surtout sur mobile. Chacun ne démarre donc que lorsqu'on s'en
// approche. Une fois démarré, il n'est jamais relancé quand on s'en éloigne,
// pour ne pas perdre l'état d'un widget (partie en cours, saisie).
//
// MARGE_APPROCHE : le démarrage commence un peu avant que le bloc soit visible,
// pour que le squelette ait déjà laissé la place au contenu à l'arrivée.
const MARGE_APPROCHE = "400px";

// `cible` est l'élément à surveiller, obtenu avec une ref en forme de fonction
// (useState + ref={setCible}) : si l'élément est remplacé (passage en plein
// écran avant le démarrage), la surveillance suit le nouvel élément.
export function useProcheEcran(cible: HTMLElement | null): boolean {
  const [proche, setProche] = useState(false);

  useEffect(() => {
    if (proche || !cible) return;
    // Navigateur sans IntersectionObserver : on démarre tout de suite plutôt
    // que de laisser le bloc vide à jamais.
    if (typeof IntersectionObserver === "undefined") {
      setProche(true);
      return;
    }
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setProche(true);
          observateur.disconnect();
        }
      },
      { rootMargin: MARGE_APPROCHE },
    );
    observateur.observe(cible);
    return () => observateur.disconnect();
  }, [cible, proche]);

  return proche;
}
