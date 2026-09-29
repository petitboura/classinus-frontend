// Double confirmation pour tout effacement de mémoire (29/09/2026, demande
// Bourama : oublier une catégorie ou tout oublier demandent la même chose,
// deux confirmations). Même mécanique que la suppression de compte
// (components/ParametresAccueil.tsx) : un window.confirm, puis la saisie
// d'un mot. Un seul endroit pour cette règle, appelé par l'écran Ma mémoire
// (une catégorie) et par Paramètres (toute la mémoire).

export const MOT_CONFIRMATION_OUBLI = "OUBLIER";

/**
 * `question` : première confirmation (ex. "Effacer toute ta mémoire ?").
 * `consequence` : ce qui sera perdu, affiché dans la seconde fenêtre.
 * Renvoie true seulement si les deux étapes sont validées.
 */
export function demanderDoubleConfirmationOubli(question: string, consequence: string): boolean {
  if (!window.confirm(question)) return false;
  const saisie = window.prompt(
    `${consequence} Cette action est définitive. Tape "${MOT_CONFIRMATION_OUBLI}" pour confirmer.`
  );
  return saisie?.trim() === MOT_CONFIRMATION_OUBLI;
}
