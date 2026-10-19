// Créé le 08/10/2026, Bourama : garde-fou 2 du canal PC. Garde, hors de React, la demande
// d'accord en cours (une application protégée veut recevoir le clavier ou être ouverte) pour
// que la bulle de Clovis puisse l'afficher et renvoyer la réponse de l'étudiant.
//
// Même principe que lib/tacheCanal.ts : un petit magasin sans dépendance, lu par React avec
// useSyncExternalStore. La demande vient du plugin PontNatif (événement "autorisation") et la
// réponse repart vers lui, voir useAutorisationPc dans lib/superpositionElectron.ts.

// Choix de l'étudiant (18/10/2026, décision de Bourama) : "cette_fois" (autoriser cette fois
// seulement), "toujours_appli" (toujours autoriser pour cette appli), "refuser".
export type ChoixAutorisation = "cette_fois" | "toujours_appli" | "refuser";

const CHOIX_CONNUS: readonly ChoixAutorisation[] = ["cette_fois", "toujours_appli", "refuser"];

// boutons : ceux que l'application PC propose pour CETTE demande (une application sensible n'a
// jamais "toujours_appli"). risque : avertissement affiché avant les boutons, absent si rien à
// signaler. Les deux sont facultatifs : une demande sans boutons garde les deux boutons d'origine.
export type DemandeAutorisation = {
  id: string;
  texte: string;
  boutons?: ChoixAutorisation[];
  risque?: string | null;
};

// Boutons montrés quand la demande n'en précise pas.
export const BOUTONS_AUTORISATION_PAR_DEFAUT: ChoixAutorisation[] = ["cette_fois", "refuser"];

// Ce qui arrive du plugin n'est jamais cru tel quel : seuls les choix connus passent.
export function boutonsAutorisationValides(brut: unknown): ChoixAutorisation[] | undefined {
  if (!Array.isArray(brut)) return undefined;
  const valides = brut.filter((b): b is ChoixAutorisation => CHOIX_CONNUS.includes(b as ChoixAutorisation));
  return valides.length > 0 ? [...new Set(valides)] : undefined;
}

let demande: DemandeAutorisation | null = null;
let repondeur: ((id: string, choix: ChoixAutorisation) => void) | null = null;
const ecouteurs = new Set<() => void>();

function prevenir() {
  ecouteurs.forEach((ecouteur) => ecouteur());
}

// Même objet tant que rien ne change : useSyncExternalStore compare par référence.
export function lireDemandeAutorisation(): DemandeAutorisation | null {
  return demande;
}

export function demandeAutorisationRepos(): DemandeAutorisation | null {
  return null;
}

export function abonnerDemandeAutorisation(ecouteur: () => void): () => void {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}

export function poserDemandeAutorisation(nouvelle: DemandeAutorisation) {
  demande = nouvelle;
  prevenir();
}

// id absent : efface quelle que soit la demande (fermeture de la fenêtre). Sinon n'efface que
// la demande portant cet id : un "fin" tardif ne doit pas fermer une demande plus récente.
export function effacerDemandeAutorisation(id: string | null) {
  if (!demande || (id !== null && demande.id !== id)) return;
  demande = null;
  prevenir();
}

export function definirRepondeurAutorisation(fonction: ((id: string, choix: ChoixAutorisation) => void) | null) {
  repondeur = fonction;
}

// Réponse de l'étudiant (un des boutons). La bulle se ferme tout de suite, sans attendre la
// confirmation du plugin. true et false (anciens boutons Autoriser et Refuser) restent compris ;
// tout ce qui n'est pas un choix clair est un refus.
export function repondreAutorisationCanal(id: string, reponse: ChoixAutorisation | boolean) {
  const choix: ChoixAutorisation =
    reponse === true ? "cette_fois" : CHOIX_CONNUS.includes(reponse as ChoixAutorisation) ? (reponse as ChoixAutorisation) : "refuser";
  repondeur?.(id, choix);
  effacerDemandeAutorisation(id);
}
