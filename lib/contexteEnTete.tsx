"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type EnTeteValeur = {
  titre: string | null;
  retour: string | undefined;
  infoId: string | null;
  definir: (v: { titre: string | null; retour?: string; infoId?: string | null }) => void;
};

export const ContexteEnTete = createContext<EnTeteValeur>({
  titre: null,
  retour: undefined,
  infoId: null,
  definir: () => {},
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

  const definir = useCallback((v: { titre: string | null; retour?: string; infoId?: string | null }) => {
    setEtat((prev) => {
      if (prev.titre === v.titre && prev.retour === v.retour && prev.infoId === (v.infoId ?? null)) return prev;
      return { titre: v.titre, retour: v.retour, infoId: v.infoId ?? null };
    });
  }, []);

  const valeur = useMemo(() => ({ titre: etat.titre, retour: etat.retour, infoId: etat.infoId, definir }), [etat.titre, etat.retour, etat.infoId, definir]);
  return valeur;
}

// À appeler DANS la page pour dire "voilà mon titre" à la barre du haut.
export function useDefinirEnTete(titre: string | null, retour?: string, infoId?: string | null) {
  const { definir } = useContext(ContexteEnTete);
  useEffect(() => {
    if (titre) definir({ titre, retour, infoId: infoId ?? null });
  }, [titre, retour, infoId, definir]);
}
