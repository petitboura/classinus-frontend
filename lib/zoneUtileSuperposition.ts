// Zone utile de l'ecran pour la superposition de l'appli PC (16/10/2026, demande de Bourama).
//
// Sous Windows, la barre des taches passe devant le curseur de Clovis et sa bulle : on ne
// les voit plus. La fenetre de superposition couvre tout l'ecran, barre des taches comprise,
// donc la page ne sait pas toute seule ou la barre commence. Le plugin Electron
// (packages/capacitor-superposition-electron) envoie dans chaque etat la zone utile de
// l'ecran ou se trouve le curseur (hors barre des taches), deja convertie dans le repere de
// la page. La page la range ici, la bulle la lit pour rester dans cette zone.
//
// Sans zone recue (site web, mobile, ancienne appli PC), la zone est la fenetre entiere :
// rien ne change.

export interface ZoneUtile {
  gauche: number;
  haut: number;
  droite: number;
  bas: number;
}

let zoneRecue: ZoneUtile | null = null;

function estZoneValide(zone: unknown): zone is ZoneUtile {
  if (!zone || typeof zone !== "object") return false;
  const { gauche, haut, droite, bas } = zone as Record<string, unknown>;
  return (
    [gauche, haut, droite, bas].every((v) => typeof v === "number" && Number.isFinite(v)) &&
    (droite as number) > (gauche as number) &&
    (bas as number) > (haut as number)
  );
}

/** Enregistre la zone recue du plugin Electron (null ou invalide : retour a la fenetre entiere). */
export function definirZoneUtile(zone: unknown): void {
  zoneRecue = estZoneValide(zone) ? zone : null;
}

/** Zone dans laquelle la bulle doit rester : zone utile recue, sinon la fenetre entiere. */
export function lireZoneUtile(): ZoneUtile {
  if (zoneRecue) return zoneRecue;
  if (typeof window === "undefined") return { gauche: 0, haut: 0, droite: 0, bas: 0 };
  return { gauche: 0, haut: 0, droite: window.innerWidth, bas: window.innerHeight };
}
