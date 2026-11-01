"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type EnTeteValeur = {
  titre: string | null;
  retour: string | undefined;
  infoId: string | null;
  definir: (v: { titre: string | null; retour?: string; infoId?: string | null }) => void;
  barreSousSections: React.ReactNode | null;
  barreSousSousSections: React.ReactNode | null;
  definirBarreSousSections: (node: React.ReactNode | null) => void;
  definirBarreSousSousSections: (node: React.ReactNode | null) => void;
};

export const ContexteEnTete = createContext<EnTeteValeur>({
  titre: null,
  retour: undefined,
  infoId: null,
  definir: () => {},
  barreSousSections: null,
  barreSousSousSections: null,
  definirBarreSousSections: () => {},
  definirBarreSousSousSections: () => {},
});

export function useEnTeteApp() {
  return useContext(ContexteEnTete);
}

export function useFournirEnTete() {
  const [etat, setEtat] = useState<{ titre: string | null; retour?: string; infoId: string | null }>({
    titre: null,
    retour: undefined,
    infoId: null,
  });
  const [barreSousSections, setBarreSousSections] = useState<React.ReactNode | null>(null);
  const [barreSousSousSections, setBarreSousSousSections] = useState<React.ReactNode | null>(null);

  const definir = useCallback((v: { titre: string | null; retour?: string; infoId?: string | null }) => {
    setEtat((prev) => {
      if (prev.titre === v.titre && prev.retour === v.retour && prev.infoId === (v.infoId ?? null)) return prev;
      return { titre: v.titre, retour: v.retour, infoId: v.infoId ?? null };
    });
  }, []);
  const definirBarreSousSections = useCallback((node: React.ReactNode | null) => setBarreSousSections(node), []);
  const definirBarreSousSousSections = useCallback((node: React.ReactNode | null) => setBarreSousSousSections(node), []);

  const valeur = useMemo(() => ({ titre: etat.titre, retour: etat.retour, infoId: etat.infoId, definir, barreSousSections, barreSousSousSections, definirBarreSousSections, definirBarreSousSousSections }), [etat.titre, etat.retour, etat.infoId, definir, barreSousSections, barreSousSousSections, definirBarreSousSections, definirBarreSousSousSections]);
  return valeur;
}

// À appeler DANS la page pour dire "voilà mon titre" à la barre du haut.
export function useDefinirEnTete(titre: string | null, retour?: string, infoId?: string | null) {
  const { definir } = useContext(ContexteEnTete);
  useEffect(() => {
    if (titre) definir({ titre, retour, infoId: infoId ?? null });
  }, [titre, retour, infoId, definir]);
}

export function useDefinirBarreSousSections(node: React.ReactNode | null) {
  const { definirBarreSousSections } = useContext(ContexteEnTete);
  useEffect(() => { definirBarreSousSections(node); return () => definirBarreSousSections(null); }, [node, definirBarreSousSections]);
}
export function useDefinirBarreSousSousSections(node: React.ReactNode | null) {
  const { definirBarreSousSousSections } = useContext(ContexteEnTete);
  useEffect(() => { definirBarreSousSousSections(node); return () => definirBarreSousSousSections(null); }, [node, definirBarreSousSousSections]);
}
