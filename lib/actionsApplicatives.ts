"use client";

// Chantier A (agent applicatif, voir plan-agent-applicatif-clovis.md) :
// permet à un composant (bouton, champ, section) de déclarer lui-même
// une action que Clovis peut exécuter à sa place, directement dans son
// propre code -- jamais dans une liste séparée maintenue à la main.
// Même philosophie que lib/evenementsDonnees.ts : une source unique de
// vérité, jamais une liste apprise une fois pour toutes.
//
// Principe central (décision Bourama) : à tout instant,
// obtenirActionsDisponibles() ne renvoie QUE les actions réellement
// montées, visibles et actives -- jamais une action désactivée, démontée
// ou qui n'existe pas encore à l'écran. Un composant qui se démonte doit
// donc TOUJOURS se désinscrire (voir useDeclarerAction, nettoyage
// automatique à l'unmount).

export type ActionDeclaree = {
  id: string;
  description: string;
  // Défaut prudent décidé avec Bourama : une action non qualifiée est
  // TOUJOURS considérée sensible tant qu'elle ne déclare pas
  // explicitement sensible: false.
  sensible: boolean;
  // Décision Bourama (point 3, section 6 du plan) : déclaré directement
  // dans la métadonnée de l'action, au même endroit que le reste --
  // jamais dans une liste séparée qui pourrait se désynchroniser.
  // true seulement pour les actions à effet indépendant de l'écran
  // (valider/envoyer/sauvegarder) qui peuvent continuer même si
  // l'étudiant change de page.
  continuerEnArrierePlan: boolean;
  actif: boolean;
  executer: () => void | Promise<void>;
};

export type ActionDisponible = Pick<
  ActionDeclaree,
  "id" | "description" | "sensible" | "continuerEnArrierePlan"
>;

const NOM_EVENEMENT = "clovis:actions_modifiees";

const registre = new Map<string, ActionDeclaree>();

function signalerChangement() {
  window.dispatchEvent(new CustomEvent(NOM_EVENEMENT));
}

/**
 * Enregistre ou met à jour une action. Un id déjà présent est simplement
 * remplacé (permet à un composant de mettre à jour sa condition
 * d'activation sans se démonter/remonter) -- avertit dans la console en
 * développement seulement si deux composants DIFFÉRENTS se disputent le
 * même id, signe probable d'une collision de nommage à corriger.
 */
export function declarerAction(action: ActionDeclaree): void {
  if (process.env.NODE_ENV === "development") {
    const existante = registre.get(action.id);
    if (existante && existante.executer !== action.executer && existante.description !== action.description) {
      // eslint-disable-next-line no-console
      console.warn(
        `[actionsApplicatives] id "${action.id}" redéclaré avec une description différente -- collision de nommage probable.`
      );
    }
  }
  registre.set(action.id, action);
  signalerChangement();
}

export function retirerAction(id: string): void {
  if (registre.delete(id)) signalerChangement();
}

/**
 * Liste des actions réellement disponibles MAINTENANT (montées et
 * actif === true). Jamais mémorisée, jamais mise en cache : toujours
 * recalculée depuis le registre vivant au moment de l'appel.
 */
export function obtenirActionsDisponibles(): ActionDisponible[] {
  const disponibles: ActionDisponible[] = [];
  for (const action of registre.values()) {
    if (!action.actif) continue;
    disponibles.push({
      id: action.id,
      description: action.description,
      sensible: action.sensible,
      continuerEnArrierePlan: action.continuerEnArrierePlan,
    });
  }
  return disponibles;
}

/**
 * Exécute l'action `id` si -- et seulement si -- elle est toujours
 * montée et active à cet instant précis. Ne fait JAMAIS confiance à une
 * liste d'actions disponibles obtenue plus tôt dans le raisonnement :
 * l'état a pu changer entre-temps (navigation de l'étudiant, action déjà
 * effectuée, etc).
 */
export async function executerAction(id: string): Promise<{ succes: true } | { succes: false; raison: string }> {
  const action = registre.get(id);
  if (!action) return { succes: false, raison: `Action "${id}" introuvable : elle n'est plus montée à l'écran.` };
  if (!action.actif) return { succes: false, raison: `Action "${id}" désactivée à cet instant.` };
  await action.executer();
  return { succes: true };
}

export function ecouterActionsModifiees(callback: () => void): () => void {
  window.addEventListener(NOM_EVENEMENT, callback);
  return () => window.removeEventListener(NOM_EVENEMENT, callback);
}
