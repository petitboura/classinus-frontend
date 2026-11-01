"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Remonte le titre de la page vers la barre fixe du haut (AppShell).
// Sans ça le titre vivait DANS le contenu qui défile (sticky) -> les
// cartes passaient dessous avec leur bord carré visible, c'était le bug.

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
  return {
    titre: etat.titre,
    retour: etat.retour,
    infoId: etat.infoId,
    definir: (v: { titre: string | null; retour?: string; infoId?: string | null }) =>
      setEtat({ titre: v.titre, retour: v.retour, infoId: v.infoId ?? null }),
  };
}

// À appeler DANS la page pour dire "voilà mon titre" à la barre du haut.
export function useDefinirEnTete(titre: string | null, retour?: string, infoId?: string | null) {
  const { definir } = useContext(ContexteEnTete);
  useEffect(() => {
    definir({ titre, retour, infoId: infoId ?? null });
    return () => definir({ titre: null, retour: undefined, infoId: null });
  }, [titre, retour, infoId, definir]);
}
