// 19/09/2026, demande Bourama : Personnaliser Classinus a maintenant 3
// pages filles (Mes skills, Skills publics, Ma mémoire) au lieu de 2 --
// l'onglet "Public" de Mes skills devient sa propre page. Même principe
// que lib/routesBureau.ts.
//
// "Mes skills" (/comportements) et "Ma mémoire" (/memoire) gardent leurs
// adresses existantes (pas de route imbriquée sous /personnaliser) pour
// ne rien casser de ce qui pointe déjà vers elles.
export const ROUTES_PERSONNALISER = {
  accueil: "/personnaliser",
  comportements: "/comportements",
  skillsPublics: "/skills-publics",
  memoire: "/memoire",
  connexions: "/applications-connectees",
  // 28/10/2026, demande Bourama : la Configuration quitte Bureau et rejoint Personnaliser.
  // Adresse à la racine, comme /comportements et /memoire.
  configuration: "/configuration",
} as const;
