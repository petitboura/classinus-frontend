// Crayon du canal PC, lot 3 (11/10/2026, demande Bourama) : retrouver ce que l'etudiant
// a entoure. Module pur (aucun import Electron) : la conversion d'ecran est fournie par
// l'appelant, ce qui permet de le tester sur n'importe quel systeme.
//
// Les traits sont dessines en pixels de la page de superposition ; lire_ecran donne la
// position des elements en pixels reels de l'ecran. Ces deux reperes different des que
// l'ecran est mis a l'echelle (125 %, 150 %...), d'ou la conversion ci dessous.

export interface ZoneRectangle {
  gauche: number;
  haut: number;
  droite: number;
  bas: number;
}

export interface PointEcran {
  x: number;
  y: number;
}

function estZoneValide(z: unknown): z is ZoneRectangle {
  if (typeof z !== "object" || z === null) return false;
  const { gauche, haut, droite, bas } = z as Record<string, unknown>;
  return [gauche, haut, droite, bas].every((v) => typeof v === "number" && Number.isFinite(v));
}

/**
 * Passe des zones en pixels de la page de superposition aux zones en pixels d'ecran.
 * origine : coin haut gauche du contenu de la fenetre de superposition (en dip),
 * zoom : facteur de zoom de la page, versEcran : conversion d'un point dip vers l'ecran.
 * Les zones invalides sont ecartees.
 */
export function convertirZonesPageEnEcran(
  zones: unknown[],
  origine: PointEcran,
  zoom: number,
  versEcran: (point: PointEcran) => PointEcran
): ZoneRectangle[] {
  if (!Number.isFinite(origine.x) || !Number.isFinite(origine.y) || !Number.isFinite(zoom) || zoom <= 0) return [];
  return zones.filter(estZoneValide).map((z) => {
    const a = versEcran({ x: origine.x + z.gauche * zoom, y: origine.y + z.haut * zoom });
    const b = versEcran({ x: origine.x + z.droite * zoom, y: origine.y + z.bas * zoom });
    return {
      gauche: Math.min(a.x, b.x),
      haut: Math.min(a.y, b.y),
      droite: Math.max(a.x, b.x),
      bas: Math.max(a.y, b.y),
    };
  });
}

/** Garde les elements dont la position (x, y de lire_ecran) tombe dans au moins une zone. */
export function elementsDansZones<T extends { x: number; y: number }>(elements: T[], zones: ZoneRectangle[]): T[] {
  if (zones.length === 0) return [];
  return elements.filter((e) =>
    zones.some((z) => e.x >= z.gauche && e.x <= z.droite && e.y >= z.haut && e.y <= z.bas)
  );
}
