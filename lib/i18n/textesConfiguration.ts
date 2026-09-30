// 28/09/2026, demande Bourama, onglet "Configuration" de Bureau.
// Première vraie fondation de traduction dans Classinus : aujourd'hui,
// TOUT le texte affiché ailleurs dans l'app est écrit en dur en français
// directement dans les composants (vérifié, aucune exception hors la
// liste de langues de LANGUES_TRADUCTION_ERREURS qui n'a rien à voir).
// Portée volontairement limitée aux textes de ce nouvel onglet : le
// reste de l'application n'est PAS touché ici.
//
// Principe : chaque texte a un identifiant stable (IdTexteConfiguration),
// jamais la chaîne française elle même, appelé depuis les composants via
// texteConfiguration(id). Une seule langue existe aujourd'hui (fr).
// Ajouter une langue plus tard = ajouter un objet à côté de FR ci-dessous
// (même forme, mêmes clés) et faire choisir la langue à
// texteConfiguration() -- SANS changer un seul composant qui l'appelle.

export type IdTexteConfiguration =
  | "onglet.procedure"
  | "onglet.regle"
  | "onglet.comportement"
  | "onglet.style"
  | "bouton.nouveau.procedure"
  | "bouton.nouveau.regle"
  | "bouton.nouveau.comportement"
  | "bouton.nouveau.style"
  | "vide.procedure"
  | "vide.regle"
  | "vide.comportement"
  | "vide.style"
  | "champ.quandUtiliser.libelle"
  | "champ.quandUtiliser.placeholder"
  | "titre.creation.procedure"
  | "titre.creation.regle"
  | "titre.creation.comportement"
  | "titre.creation.style"
  | "titre.edition.procedure"
  | "titre.edition.regle"
  | "titre.edition.comportement"
  | "titre.edition.style";

const FR: Record<IdTexteConfiguration, string> = {
  "onglet.procedure": "Procédure",
  "onglet.regle": "Règle",
  "onglet.comportement": "Comportement",
  "onglet.style": "Style",
  "bouton.nouveau.procedure": "Nouvelle procédure",
  "bouton.nouveau.regle": "Nouvelle règle",
  "bouton.nouveau.comportement": "Nouveau comportement",
  "bouton.nouveau.style": "Nouveau style",
  "vide.procedure": "Aucune procédure pour l'instant.",
  "vide.regle": "Aucune règle pour l'instant.",
  "vide.comportement": "Aucun comportement pour l'instant.",
  "vide.style": "Aucun style pour l'instant.",
  "champ.quandUtiliser.libelle": "Quand l'utiliser (optionnel)",
  "champ.quandUtiliser.placeholder": "Ex : quand l'élève demande un exercice corrigé",
  "titre.creation.procedure": "Nouvelle procédure",
  "titre.creation.regle": "Nouvelle règle",
  "titre.creation.comportement": "Nouveau comportement",
  "titre.creation.style": "Nouveau style",
  "titre.edition.procedure": "Modifier cette procédure",
  "titre.edition.regle": "Modifier cette règle",
  "titre.edition.comportement": "Modifier ce comportement",
  "titre.edition.style": "Modifier ce style",
};

export function texteConfiguration(id: IdTexteConfiguration): string {
  return FR[id];
}
