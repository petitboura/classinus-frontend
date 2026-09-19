// 19/09/2026, demande Bourama : la Bibliothèque fonctionne comme
// Personnaliser Clovis. Ses trois onglets (Perso, Publique, Dossiers du
// téléphone) deviennent de vraies pages, chacune avec sa propre adresse,
// et /bibliotheque devient une page d'accueil en liste.
//
// Ce fichier est la seule source de ces adresses. Il est lu par les pages
// (app/(app)/bibliotheque), par la sidebar (pour garder Bibliothèque en
// surbrillance sur ses pages filles) et par lib/routesPubliques.ts (pour
// que ces trois mots ne soient jamais pris pour l'identifiant d'un
// élément partagé, donc restent réservés aux comptes).
//
// Les mots "perso", "publique" et "telephone" sont donc réservés : aucun
// identifiant réel ne peut leur ressembler, ce sont tous des UUID.
export const ROUTES_BIBLIOTHEQUE = {
  accueil: "/bibliotheque",
  perso: "/bibliotheque/perso",
  publique: "/bibliotheque/publique",
  telephone: "/bibliotheque/telephone",
} as const;

/** Les pages filles de la Bibliothèque, sans la page d'accueil. */
export const PAGES_FILLES_BIBLIOTHEQUE: readonly string[] = [
  ROUTES_BIBLIOTHEQUE.perso,
  ROUTES_BIBLIOTHEQUE.publique,
  ROUTES_BIBLIOTHEQUE.telephone,
];
