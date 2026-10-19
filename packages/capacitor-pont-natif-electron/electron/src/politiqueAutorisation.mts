// Politique d'autorisation du canal PC (18/10/2026, décision de Bourama, avant la publication).
//
// Principe : l'étudiant garde la main sur ce que Classinus regarde, ouvre, écrit et clique.
// Ce module ne contient QUE le fonctionnement (comment décider, quoi retenir). Les CONDITIONS
// (quelles applications sont sensibles, quels mots de titre sont sensibles, quels choix
// "toujours" l'étudiant a déjà faits, le texte d'avertissement) viennent du serveur avec chaque
// demande, dans parametres.autorisation, pour pouvoir être changées à distance sans publier
// une nouvelle version de l'application PC. Rien n'est écrit en dur ici sauf un texte
// d'avertissement de secours.
//
// Forme attendue (tout est facultatif, sauf active) :
//   autorisation: {
//     active: true,
//     applications_sensibles: ["powershell", "1password", ...],  // noms de programmes
//     mots_titre_sensibles: ["banque", "paypal", ...],           // mots dans le titre d'une fenêtre
//     applications_toujours: ["notepad", ...],                   // choix "toujours" de l'étudiant
//     message_risque: "texte affiché pour une application sensible",
//     message_risque_action: "texte affiché quand Classinus demande lui-même une autorisation",
//     actions: ["lire", "ecrire", "ouvrir", "cliquer"],          // actions soumises à accord
//   }
// Sans ce bloc (ou avec active différent de true), cette politique est éteinte : le plugin garde
// son comportement d'avant (seules les applications protégées demandent un accord).
//
// Règles voulues par Bourama :
// - application normale : trois choix, "autoriser cette fois seulement" (vaut pour toute la tâche
//   en cours dans cette application), "toujours autoriser pour cette appli" (mémorisé), "refuser" ;
// - application sensible (ou non identifiée) : deux choix seulement, "autoriser cette fois
//   seulement" (vaut pour cette seule action) et "refuser", la question revient avant chaque
//   action, et l'étudiant est averti que c'est risqué ;
// - jamais de "toujours autoriser" général : il se donne application par application.
//
// Module pur : aucune dépendance à Electron ni à Windows, testable partout.

import { normaliserProgramme, listeDepuisParametres } from "./applicationsProtegees.mjs";

export type ActionControlee = "lire" | "ecrire" | "ouvrir" | "cliquer";
export type ChoixEtudiant = "cette_fois" | "toujours_appli" | "refuser";

export const ACTIONS_CONTROLEES: readonly ActionControlee[] = ["lire", "ecrire", "ouvrir", "cliquer"];

// Texte de secours : le serveur peut le remplacer avec message_risque.
export const MESSAGE_RISQUE_PAR_DEFAUT =
  "Cette application est sensible : Classinus pourrait y voir ou y faire des choses risquées. N'autorise que si tu es sûr.";

// Quand Classinus demande lui-même une autorisation avant une action qu'il sent sensible
// (payer, supprimer, envoyer) : obligation décidée par Bourama le 18/10/2026.
export const MESSAGE_RISQUE_ACTION_PAR_DEFAUT =
  "Cette action peut avoir des conséquences difficiles à annuler. N'autorise que si tu es sûr.";

export const BOUTONS_NORMAL: readonly ChoixEtudiant[] = ["cette_fois", "toujours_appli", "refuser"];
export const BOUTONS_SENSIBLE: readonly ChoixEtudiant[] = ["cette_fois", "refuser"];

export type Politique = {
  active: boolean;
  sensibles: string[];
  motsTitreSensibles: string[];
  actions: ActionControlee[];
  messageRisque: string;
  messageRisqueAction: string;
};

function listeDeChaines(valeur: unknown): string[] {
  return Array.isArray(valeur) ? valeur.filter((v): v is string => typeof v === "string") : [];
}

export function politiqueDepuisParametres(parametres: Record<string, unknown>): Politique {
  const brut = parametres.autorisation;
  const bloc = typeof brut === "object" && brut !== null ? (brut as Record<string, unknown>) : null;
  if (!bloc || bloc.active !== true) {
    return {
      active: false,
      sensibles: [],
      motsTitreSensibles: [],
      actions: [],
      messageRisque: MESSAGE_RISQUE_PAR_DEFAUT,
      messageRisqueAction: MESSAGE_RISQUE_ACTION_PAR_DEFAUT,
    };
  }
  // Les applications déjà protégées par l'ancien réglage restent sensibles.
  const sensibles = [
    ...new Set([
      ...listeDeChaines(bloc.applications_sensibles).map(normaliserProgramme),
      ...listeDepuisParametres(parametres),
    ]),
  ].filter((nom) => nom !== "");
  const mots = listeDeChaines(bloc.mots_titre_sensibles)
    .map((mot) => mot.trim().toLowerCase())
    .filter((mot) => mot !== "");
  const actionsBrutes = listeDeChaines(bloc.actions).filter((a): a is ActionControlee =>
    (ACTIONS_CONTROLEES as readonly string[]).includes(a)
  );
  const texteOu = (valeur: unknown, secours: string) => (typeof valeur === "string" && valeur.trim() ? valeur.trim() : secours);
  return {
    active: true,
    sensibles,
    motsTitreSensibles: mots,
    // Sans liste d'actions envoyée, tout est soumis à accord.
    actions: actionsBrutes.length > 0 ? [...new Set(actionsBrutes)] : [...ACTIONS_CONTROLEES],
    messageRisque: texteOu(bloc.message_risque, MESSAGE_RISQUE_PAR_DEFAUT),
    messageRisqueAction: texteOu(bloc.message_risque_action, MESSAGE_RISQUE_ACTION_PAR_DEFAUT),
  };
}

// Choix "toujours" déjà faits par l'étudiant, envoyés par le serveur. Absent : null (rien à
// changer à ce que l'application PC retient déjà).
export function toujoursDepuisParametres(parametres: Record<string, unknown>): string[] | null {
  const brut = parametres.autorisation;
  if (typeof brut !== "object" || brut === null) return null;
  const liste = (brut as Record<string, unknown>).applications_toujours;
  if (!Array.isArray(liste)) return null;
  return listeDeChaines(liste).map(normaliserProgramme).filter((nom) => nom !== "");
}

export type Cible = { application: string | null | undefined; titre?: string | null };

// Une application inconnue (nom illisible) est traitée comme sensible : mieux vaut une question
// de trop qu'un accès à une application que Classinus n'a pas pu identifier.
export function estSensible(cible: Cible, politique: Politique): boolean {
  const nom = normaliserProgramme(cible.application);
  if (nom === "") return true;
  if (politique.sensibles.includes(nom)) return true;
  const titre = (cible.titre ?? "").toLowerCase();
  return titre !== "" && politique.motsTitreSensibles.some((mot) => titre.includes(mot));
}

export type Accords = {
  tacheContient(application: string): boolean;
  toujoursContient(application: string): boolean;
  accorderTache(application: string): void;
  accorderToujours(application: string): void;
  // Remplace les choix "toujours" par la liste du serveur (source de vérité quand elle est donnée).
  remplacerToujours(liste: readonly string[]): void;
  // Fin de la tâche de Classinus : les accords "cette fois" tombent, les "toujours" restent.
  reinitialiserTache(): void;
  toujours(): string[];
};

export function creerAccords(options: { surToujours?: (application: string) => void } = {}): Accords {
  const tache = new Set<string>();
  const toujours = new Set<string>();
  const cle = (application: string) => normaliserProgramme(application);
  return {
    tacheContient: (application) => tache.has(cle(application)),
    toujoursContient: (application) => toujours.has(cle(application)),
    accorderTache: (application) => {
      const nom = cle(application);
      if (nom !== "") tache.add(nom);
    },
    accorderToujours: (application) => {
      const nom = cle(application);
      if (nom === "" || toujours.has(nom)) return;
      toujours.add(nom);
      try {
        options.surToujours?.(nom);
      } catch {
        // Une mémorisation qui échoue ne doit jamais faire échouer l'action de l'étudiant.
      }
    },
    remplacerToujours: (liste) => {
      toujours.clear();
      for (const application of liste) {
        const nom = cle(application);
        if (nom !== "") toujours.add(nom);
      }
    },
    reinitialiserTache: () => tache.clear(),
    toujours: () => [...toujours],
  };
}

export type Decision =
  | { type: "autorise" }
  | { type: "demander"; boutons: readonly ChoixEtudiant[]; risque: string | null; sensible: boolean };

export function decider(options: {
  politique: Politique;
  action: ActionControlee;
  cible: Cible;
  accords: Accords;
}): Decision {
  const { politique, action, cible, accords } = options;
  if (!politique.active || !politique.actions.includes(action)) return { type: "autorise" };
  if (estSensible(cible, politique)) {
    return { type: "demander", boutons: BOUTONS_SENSIBLE, risque: politique.messageRisque, sensible: true };
  }
  const nom = normaliserProgramme(cible.application);
  if (accords.toujoursContient(nom) || accords.tacheContient(nom)) return { type: "autorise" };
  return { type: "demander", boutons: BOUTONS_NORMAL, risque: null, sensible: false };
}

// Ce que l'étudiant a choisi : retient l'accord qui doit l'être. Renvoie vrai si l'action peut
// continuer. Une application sensible ne retient jamais rien : la question reviendra.
export function appliquerChoix(options: {
  choix: ChoixEtudiant;
  cible: Cible;
  sensible: boolean;
  accords: Accords;
}): boolean {
  const { choix, cible, sensible, accords } = options;
  if (choix === "refuser") return false;
  const nom = normaliserProgramme(cible.application);
  if (!sensible && nom !== "") {
    if (choix === "toujours_appli") accords.accorderToujours(nom);
    else accords.accorderTache(nom);
  }
  return true;
}

const VERBES: Record<ActionControlee, string> = {
  lire: "regarder",
  ecrire: "écrire dans",
  ouvrir: "ouvrir",
  cliquer: "cliquer dans",
};

// Phrase affichée à l'étudiant au-dessus des boutons. nom : titre de la fenêtre ou nom du programme.
export function texteDemande(action: ActionControlee, nom: string): string {
  const cible = nom.trim() || "une application que Classinus n'a pas pu identifier";
  return `Classinus veut ${VERBES[action]} ${cible}.`;
}
