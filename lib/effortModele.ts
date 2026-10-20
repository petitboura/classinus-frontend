// Effort de réflexion propre à chaque modèle (20/10/2026, demande de Bourama : adapter l'effort
// à chaque fournisseur, et le retirer là où ce n'est pas possible).
//
// Chaque fournisseur a ses propres niveaux : le backend envoie, avec chaque modèle, la liste de
// ceux qui existent (efforts) et celui à prendre par défaut (effort_defaut), voir
// core/efforts_modeles.py côté backend. Ce fichier n'invente rien : il lit ces deux champs.
// Sans modèle choisi, l'agent tourne sur DeepSeek (cascade), d'où la liste de repli.

import { NIVEAUX_EFFORT, type EffortReflexion, type ModeleDisponible } from "@/components/chat/barre/reglagesReponse";

// Efforts proposés pour le modèle actif. Liste vide : le modèle n'a aucun réglage d'effort, la
// ligne Effort ne doit alors pas s'afficher. Sans modèle (cascade DeepSeek) ou sans champ efforts
// (serveur pas encore à jour), liste de DeepSeek, comme avant.
export function effortsDuModele(modele: ModeleDisponible | undefined): EffortReflexion[] {
  if (!modele || !modele.efforts) return NIVEAUX_EFFORT;
  return modele.efforts as EffortReflexion[];
}

// Effort réellement appliqué : le choix de l'élève s'il existe pour ce modèle, sinon le défaut du
// modèle. Même règle que le serveur (effort_valide_pour_modele) : ce qui est affiché est ce qui
// est utilisé. null : pas de réglage pour ce modèle.
export function effortApplique(modele: ModeleDisponible | undefined, effortChoisi: EffortReflexion): EffortReflexion | null {
  const efforts = effortsDuModele(modele);
  if (efforts.length === 0) return null;
  if (efforts.includes(effortChoisi)) return effortChoisi;
  const defaut = modele?.effort_defaut as EffortReflexion | null | undefined;
  if (defaut && efforts.includes(defaut)) return defaut;
  return efforts.includes("low") ? "low" : efforts[0];
}
