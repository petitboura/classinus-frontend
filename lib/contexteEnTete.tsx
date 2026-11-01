"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type EnTeteValeur = {
  titre: string | null;
  retour: string | undefined;
  infoId: string | null;
  action: React.ReactNode | null;
  definir: (v: { titre: string | null; retour?: string; infoId?: string | null }) => void;
  definirAction: (node: React.ReactNode | null) => void;
};

export const ContexteEnTete = createContext<EnTeteValeur>({
  titre: null,
  retour: undefined,
  infoId: null,
  action: null,
  definir: () => {},
  definirAction: () => {},
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
  const [action, setAction] = useState<React.ReactNode | null>(null);

  const definir = useCallback((v: { titre: string | null; retour?: string; infoId?: string | null }) => {
    setEtat((prev) => {
      if (prev.titre === v.titre && prev.retour === v.retour && prev.infoId === (v.infoId ?? null)) return prev;
      return { titre: v.titre, retour: v.retour, infoId: v.infoId ?? null };
    });
  }, []);

  const definirAction = useCallback((node: React.ReactNode | null) => {
    setAction(node);
  }, []);

  const valeur = useMemo(
    () => ({ titre: etat.titre, retour: etat.retour, infoId: etat.infoId, action, definir, definirAction }),
    [etat.titre, etat.retour, etat.infoId, action, definir, definirAction],
  );
  return valeur;
}

export function useDefinirEnTete(titre: string | null, retour?: string, infoId?: string | null) {
  const { definir } = useContext(ContexteEnTete);
  useEffect(() => {
    if (titre) definir({ titre, retour, infoId: infoId ?? null });
  }, [titre, retour, infoId, definir]);
}

export function useDefinirActionEnTete(node: React.ReactNode | null) {
  const { definirAction } = useContext(ContexteEnTete);
  useEffect(() => {
    definirAction(node);
    return () => definirAction(null);
  }, [node, definirAction]);
}
