// 19/09/2026, demande Bourama : Bureau fonctionne comme Personnaliser
// Clovis et la Bibliothèque. Ses six onglets deviennent de vraies pages,
// chacune avec sa propre adresse, et /bureau devient une page d'accueil
// en liste. Même principe que lib/routesBibliotheque.ts.
//
// Ce fichier est la seule source de ces adresses. Il est lu par les pages
// (app/(app)/bureau) et par la sidebar (pour garder Bureau en surbrillance
// sur ses pages filles).
export const ROUTES_BUREAU = {
  accueil: "/bureau",
  audit: "/bureau/audit",
  codes: "/bureau/codes",
  programme: "/bureau/programme",
  entrerCode: "/bureau/entrer-code",
  etablissements: "/bureau/etablissements",
  signalements: "/bureau/signalements",
} as const;

/** Les pages filles de Bureau, sans la page d'accueil. */
export const PAGES_FILLES_BUREAU: readonly string[] = [
  ROUTES_BUREAU.audit,
  ROUTES_BUREAU.codes,
  ROUTES_BUREAU.programme,
  ROUTES_BUREAU.entrerCode,
  ROUTES_BUREAU.etablissements,
  ROUTES_BUREAU.signalements,
];
