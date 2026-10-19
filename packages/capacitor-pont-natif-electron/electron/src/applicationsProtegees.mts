// Applications protégées du canal PC (08/10/2026, garde-fou 2, demande de Bourama) :
// pour écrire au clavier dans un terminal, un gestionnaire de mots de passe, les
// paramètres Windows, ou ouvrir l'un d'eux, Clovis doit obtenir l'accord de l'étudiant,
// action par action (bulle Autoriser ou Refuser dans la superposition).
//
// Ce module est pur (aucune dépendance à Electron ni à Windows) : il peut être testé
// partout, comme gardeClavier.mts et arretGlobal.mts. Il ne contient aucune liste
// d'applications : la liste et le délai viennent du serveur avec chaque demande
// (core/outils_action_agent_pc.py).

// "accepte" : autorisé cette fois seulement ; "toujours" : autorisé et à retenir pour cette appli
// (18/10/2026, trois boutons) ; "refuse" ; "delai" : pas de réponse à temps.
export type DecisionAutorisation = "accepte" | "toujours" | "refuse" | "delai";

// Boutons possibles de la bulle. Même vocabulaire que politiqueAutorisation.mts.
export type BoutonAutorisation = "cette_fois" | "toujours_appli" | "refuser";
const BOUTONS_PAR_DEFAUT: readonly BoutonAutorisation[] = ["cette_fois", "refuser"];

export type EvenementAutorisation =
  | { id: string; phase: "demande"; texte: string; boutons: readonly BoutonAutorisation[]; risque: string | null }
  | { id: string; phase: "fin" };

// Options d'une demande : quels boutons montrer, et l'avertissement de risque éventuel.
export type OptionsDemande = { boutons?: readonly BoutonAutorisation[]; risque?: string | null };

export const DELAI_AUTORISATION_PAR_DEFAUT_MS = 60_000;
const DELAI_AUTORISATION_MIN_MS = 5_000;
const DELAI_AUTORISATION_MAX_MS = 300_000;

// "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\PowerShell.EXE" devient "powershell".
export function normaliserProgramme(nom: unknown): string {
  if (typeof nom !== "string") return "";
  const dernier = nom.trim().split(/[\\/]/).pop() ?? "";
  return dernier.trim().toLowerCase().replace(/\.exe$/, "");
}

// Liste envoyée par le serveur (applications_protegees). Absente ou vide : la protection
// n'est pas activée, rien n'est demandé à l'étudiant.
export function listeDepuisParametres(parametres: Record<string, unknown>): string[] {
  const brut = parametres.applications_protegees;
  if (!Array.isArray(brut)) return [];
  return brut.map(normaliserProgramme).filter((nom) => nom !== "");
}

export function estApplicationProtegee(programme: unknown, liste: readonly string[]): boolean {
  const nom = normaliserProgramme(programme);
  return nom !== "" && liste.includes(nom);
}

// Délai d'attente de la réponse de l'étudiant, envoyé par le serveur (delai_autorisation_ms).
export function delaiAutorisationDepuisParametres(parametres: Record<string, unknown>): number {
  const valeur = Number(parametres.delai_autorisation_ms);
  if (!Number.isFinite(valeur) || parametres.delai_autorisation_ms === null) return DELAI_AUTORISATION_PAR_DEFAUT_MS;
  return Math.min(DELAI_AUTORISATION_MAX_MS, Math.max(DELAI_AUTORISATION_MIN_MS, Math.floor(valeur)));
}

// Win+R ouvre la fenêtre "Exécuter", qui lance n'importe quelle commande sans ouvrir de
// terminal : elle demande l'accord de l'étudiant quelle que soit l'application au premier
// plan. Reçoit les combinaisons de touchesClavier.mts (noms de touches nut-js).
export function combinaisonsOuvrentExecuter(combinaisons: readonly (readonly string[])[]): boolean {
  return combinaisons.some(
    (noms) => noms.includes("LeftSuper") && noms.some((nom) => nom.toUpperCase() === "R")
  );
}

export type OptionsGestionnaire = {
  // Prévient l'interface (la bulle de la superposition) qu'une demande s'ouvre ou se ferme.
  envoyer: (evenement: EvenementAutorisation) => void;
  creerId?: () => string;
};

export function creerGestionnaireAutorisations(options: OptionsGestionnaire) {
  const enAttente = new Map<string, (decision: DecisionAutorisation) => void>();
  // Boutons réellement montrés pour chaque demande : une réponse qui n'en fait pas partie est ignorée.
  const boutonsOfferts = new Map<string, readonly BoutonAutorisation[]>();
  let compteur = 0;
  const creerId = options.creerId ?? (() => `autorisation-${Date.now()}-${++compteur}`);

  function prevenir(evenement: EvenementAutorisation): void {
    try {
      options.envoyer(evenement);
    } catch {
      // Une interface indisponible ne doit jamais faire planter l'action : sans bulle
      // visible, la demande se termine au bout du délai, par un refus.
    }
  }

  // Pose une question à l'étudiant et attend sa réponse, au plus delaiMs. Une seule
  // demande à la fois : une nouvelle demande refuse celle qui était encore ouverte.
  function demander(texte: string, delaiMs: number, demande: OptionsDemande = {}): Promise<DecisionAutorisation> {
    refuserTout();
    const id = creerId();
    const boutons = demande.boutons && demande.boutons.length > 0 ? demande.boutons : BOUTONS_PAR_DEFAUT;
    const risque = typeof demande.risque === "string" && demande.risque.trim() ? demande.risque.trim() : null;
    return new Promise<DecisionAutorisation>((resolve) => {
      const minuteur = setTimeout(() => terminer("delai"), delaiMs);
      function terminer(decision: DecisionAutorisation): void {
        if (!enAttente.has(id)) return;
        clearTimeout(minuteur);
        enAttente.delete(id);
        boutonsOfferts.delete(id);
        prevenir({ id, phase: "fin" });
        resolve(decision);
      }
      enAttente.set(id, terminer);
      boutonsOfferts.set(id, boutons);
      prevenir({ id, phase: "demande", texte, boutons, risque });
    });
  }

  // Réponse de l'étudiant : un des boutons montrés (cette_fois, toujours_appli, refuser). Les
  // anciennes réponses true et false (Autoriser, Refuser) restent comprises. Renvoie false pour
  // une demande inconnue ou déjà terminée (réponse en double, ou arrivée après le délai) et
  // pour un bouton « toujours » qui n'était pas proposé : elle est ignorée. Toute autre réponse
  // qu'un accord clair est un refus.
  function repondre(id: unknown, reponse: unknown): boolean {
    const terminer = typeof id === "string" ? enAttente.get(id) : undefined;
    if (!terminer || typeof id !== "string") return false;
    // Comme avant : tout ce qui n'est pas un accord clair est un refus.
    const choix: BoutonAutorisation =
      reponse === true || reponse === "cette_fois" ? "cette_fois" : reponse === "toujours_appli" ? "toujours_appli" : "refuser";
    const offerts = boutonsOfferts.get(id) ?? BOUTONS_PAR_DEFAUT;
    if (!offerts.includes(choix)) return false;
    terminer(choix === "cette_fois" ? "accepte" : choix === "toujours_appli" ? "toujours" : "refuse");
    return true;
  }

  // Arrêt global (Échap) ou nouvelle demande : tout ce qui attend est refusé.
  function refuserTout(): void {
    for (const terminer of [...enAttente.values()]) terminer("refuse");
  }

  return { demander, repondre, refuserTout, nombreEnAttente: () => enAttente.size };
}
