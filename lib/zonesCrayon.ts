// Crayon du canal PC, lot 3 (11/10/2026, demande Bourama) : le rectangle qui entoure
// chaque trait dessiné, en pixels de la page de superposition (même repère que les traits,
// voir lib/crayonEcran.ts). La conversion vers les pixels d'écran est faite côté Electron
// (packages/capacitor-pont-natif-electron, méthode lireElementsEntoures).

import type { Trait } from "@/lib/crayonEcran";

// Marge ajoutée autour de chaque trait : un simple soulignement a une hauteur presque nulle
// et ne contiendrait sinon aucun élément.
export const MARGE_ZONE_CRAYON_PX = 12;

export type ZonePage = { gauche: number; haut: number; droite: number; bas: number };

export function zonesDesTraits(traits: Trait[], marge: number = MARGE_ZONE_CRAYON_PX): ZonePage[] {
  const zones: ZonePage[] = [];
  for (const trait of traits) {
    if (trait.points.length === 0) continue;
    let gauche = Infinity;
    let haut = Infinity;
    let droite = -Infinity;
    let bas = -Infinity;
    for (const { x, y } of trait.points) {
      if (x < gauche) gauche = x;
      if (x > droite) droite = x;
      if (y < haut) haut = y;
      if (y > bas) bas = y;
    }
    zones.push({ gauche: gauche - marge, haut: haut - marge, droite: droite + marge, bas: bas + marge });
  }
  return zones;
}
