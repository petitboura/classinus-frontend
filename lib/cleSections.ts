import { ROUTES_BUREAU } from "./routesBureau";
import { ROUTES_BIBLIOTHEQUE } from "./routesBibliotheque";
import { ROUTES_CONCENTRATION } from "./routesConcentration";
import { ROUTES_PERSONNALISER } from "./routesPersonnaliser";

// Les adresses des sous-sections (Bureau, Bibliothèque, Concentration,
// Personnaliser Classinus), sans leur page d'accueil. Module volontairement
// léger (aucun composant d'écran importé) pour pouvoir être lu partout, y
// compris par le rail, sans alourdir le chargement de l'appli. Le contenu
// de chaque sous-section vit dans lib/contenuSections.tsx.
type RoutesFilles<T extends Record<string, string>> = Exclude<T[keyof T], T["accueil"]>;

export type CleSection =
  | RoutesFilles<typeof ROUTES_BUREAU>
  | RoutesFilles<typeof ROUTES_BIBLIOTHEQUE>
  | RoutesFilles<typeof ROUTES_CONCENTRATION>
  | RoutesFilles<typeof ROUTES_PERSONNALISER>;

function filles<T extends Record<string, string>>(routes: T): string[] {
  return Object.values(routes).filter((href) => href !== routes.accueil);
}

const CLES_SECTIONS: ReadonlySet<string> = new Set([
  ...filles(ROUTES_BUREAU),
  ...filles(ROUTES_BIBLIOTHEQUE),
  ...filles(ROUTES_CONCENTRATION),
  ...filles(ROUTES_PERSONNALISER),
]);

/** Vrai si cette adresse est une sous-section qui a un contenu (donc une fenêtre possible). */
export function estCleSection(href: string): href is CleSection {
  return CLES_SECTIONS.has(href);
}
