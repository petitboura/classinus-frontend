// Créé le 08/10/2026, Bourama : garde-fou 2 du canal PC. Garde, hors de React, la demande
// d'accord en cours (une application protégée veut recevoir le clavier ou être ouverte) pour
// que la bulle de Clovis puisse l'afficher et renvoyer la réponse de l'étudiant.
//
// Même principe que lib/tacheCanal.ts : un petit magasin sans dépendance, lu par React avec
// useSyncExternalStore. La demande vient du plugin PontNatif (événement "autorisation") et la
// réponse repart vers lui, voir useAutorisationPc dans lib/superpositionElectron.ts.

export type DemandeAutorisation = { id: string; texte: string };

let demande: DemandeAutorisation | null = null;
let repondeur: ((id: string, accepte: boolean) => void) | null = null;
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

export function definirRepondeurAutorisation(fonction: ((id: string, accepte: boolean) => void) | null) {
  repondeur = fonction;
}

// Réponse de l'étudiant (bouton Autoriser ou Refuser). La bulle se ferme tout de suite, sans
// attendre la confirmation du plugin.
export function repondreAutorisationCanal(id: string, accepte: boolean) {
  repondeur?.(id, accepte);
  effacerDemandeAutorisation(id);
}
