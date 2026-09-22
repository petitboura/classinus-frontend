// 19/09/2026, demande Bourama : Concentration fonctionne comme
// Personnaliser Clovis, la Bibliothèque et Bureau. Ses deux onglets
// (Contrôle de session, Temps d'écran) deviennent de vraies pages,
// chacune avec sa propre adresse, et la page d'accueil de la section
// devient une liste. Même principe que lib/routesBureau.ts.
//
// L'adresse de la section reste /controle-session (elle est déjà celle
// des barres du bas web et native, voir BarreOngletsWeb.tsx et
// BarreOngletsNative.tsx), seul le nom affiché est "Concentration".
export const ROUTES_CONCENTRATION = {
  accueil: "/controle-session",
  session: "/controle-session/session",
  tempsEcran: "/controle-session/temps-ecran",
} as const;

/** Les pages filles de Concentration, sans la page d'accueil. */
export const PAGES_FILLES_CONCENTRATION: readonly string[] = [
  ROUTES_CONCENTRATION.session,
  ROUTES_CONCENTRATION.tempsEcran,
];
