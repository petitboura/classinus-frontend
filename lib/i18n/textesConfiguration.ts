// 28/09/2026, demande Bourama, onglet "Configuration" de Bureau.
// Première vraie fondation de traduction dans Classinus : aujourd'hui,
// tout le texte affiché ailleurs dans l'app est écrit en dur en français
// directement dans les composants. Portée volontairement limitée aux
// textes de ce nouvel onglet, le reste de l'application n'est pas touché.
//
// Principe : chaque texte a un identifiant stable (IdTexteConfiguration),
// jamais la chaîne française elle même, appelé depuis les composants via
// texteConfiguration(id). Une seule langue existe aujourd'hui (fr).
// Ajouter une langue plus tard = ajouter un objet à côté de FR ci-dessous
// (même forme, mêmes clés) et faire choisir la langue à
// texteConfiguration(), sans changer un seul composant qui l'appelle.

const FR = {
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
  "champ.nom.auto": "Nom généré automatiquement",
  "champ.nom.placeholder": "Ex : Corriger un exercice",
  "champ.nom.caseAuto": "Auto",
  "titre.creation.procedure": "Nouvelle procédure",
  "titre.creation.regle": "Nouvelle règle",
  "titre.creation.comportement": "Nouveau comportement",
  "titre.creation.style": "Nouveau style",
  "titre.edition.procedure": "Modifier cette procédure",
  "titre.edition.regle": "Modifier cette règle",
  "titre.edition.comportement": "Modifier ce comportement",
  "titre.edition.style": "Modifier ce style",
  "procedure.etape.placeholder": "Décris l'étape",
  "procedure.ajouterEtape": "Ajouter une étape",
  "procedure.etape.un": "étape",
  "procedure.etape.plusieurs": "étapes",
  "procedure.autres.un": "autre étape",
  "procedure.autres.plusieurs": "autres étapes",
  "procedure.monter": "Monter cette étape",
  "procedure.descendre": "Descendre cette étape",
  "procedure.retirer": "Retirer cette étape",
  "regle.ajout.placeholder": "Ex : toujours répondre en français",
  "regle.ajout.bouton": "Ajouter",
  "comportement.cas.libelle": "Dans tel cas",
  "comportement.cas.placeholder": "Ex : l'élève se trompe plusieurs fois de suite",
  "comportement.reaction.libelle": "Comporte-toi ainsi",
  "comportement.reaction.placeholder": "Ex : reste patient, encourage et reformule autrement",
  "style.libelle": "Le ton à reproduire",
  "style.placeholder": "Colle un exemple de ton écriture, ou décris le ton voulu. Ex : phrases courtes, ton chaleureux, jamais de jargon",
  "editeur.onglet.contenu": "Contenu",
  "editeur.onglet.codes": "Codes",
  "editeur.ariaOnglets": "Vue de l'élément",
  "action.fermer": "Fermer",
  "action.supprimer": "Supprimer",
  "action.creer": "Créer",
  "action.enregistrer": "Enregistrer",
  "action.enregistrement": "Enregistrement…",
  "action.ia": "Utiliser avec l'IA",
  "action.activer": "Activer",
  "action.desactiver": "Désactiver (ne sera plus proposé à l'IA)",
  "action.ouvrir": "Ouvrir et modifier",
  "menu.aria": "Actions pour cet élément",
  "action.lierCode": "Lier à un code",
  "action.destinataire": "Destinataire",
  "destinataire.titre": "Qui utilise cet élément ?",
  "destinataire.deux": "Moi et les destinataires",
  "destinataire.deuxDetail": "Il s'applique à vous et à ceux qui reçoivent le code.",
  "destinataire.destinataires": "Les destinataires seulement",
  "destinataire.destinatairesDetail": "Il ne s'applique pas à vous, seulement à ceux qui reçoivent le code.",
  "destinataire.badge": "Destinataires seulement",
  "action.partager": "Partager",
  "action.telecharger": "Télécharger",
  "action.publier": "Publier",
  "confirm.supprimer": "Supprimer cet élément ? Cette action est définitive.",
  "retour.publie": "Publié dans le catalogue public",
  "retour.publication": "Publication en cours…",
  "retour.nomFichierDefaut": "configuration",
  "ariaCategorie": "Catégorie de configuration",
} as const;

export type IdTexteConfiguration = keyof typeof FR;

export function texteConfiguration(id: IdTexteConfiguration): string {
  return FR[id];
}

// Pluriel géré ici pour que les composants n'aient jamais à décider du
// mot (et qu'une autre langue puisse avoir sa propre règle).
export function texteNombreEtapes(n: number): string {
  return `${n} ${texteConfiguration(n > 1 ? "procedure.etape.plusieurs" : "procedure.etape.un")}`;
}

export function texteAutresEtapes(n: number): string {
  return `+ ${n} ${texteConfiguration(n > 1 ? "procedure.autres.plusieurs" : "procedure.autres.un")}`;
}
