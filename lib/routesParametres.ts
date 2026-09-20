// 19/09/2026, demande Bourama : Paramètres fonctionne maintenant comme
// Bureau/Bibliothèque/Concentration/Personnaliser Clovis -- ses écrans
// deviennent de vraies pages, chacune avec sa propre adresse, au lieu de
// changer l'affichage de la même page (ancien composant EspaceParametres.tsx,
// état `vue`, supprimé). Même principe que lib/routesBureau.ts.
//
// "Exporter mes données", "Se déconnecter" et "Supprimer mon compte"
// restent des actions sur la page d'accueil (pas des écrans à afficher),
// donc pas d'adresse ici pour elles.
export const ROUTES_PARAMETRES = {
  accueil: "/parametres",
  profil: "/parametres/profil",
  preferences: "/parametres/preferences",
  confidentialite: "/parametres/confidentialite",
  aide: "/parametres/aide",
  aPropos: "/parametres/a-propos",
  capacitesTelephone: "/parametres/capacites-telephone",
  accessibilite: "/parametres/accessibilite",
} as const;
