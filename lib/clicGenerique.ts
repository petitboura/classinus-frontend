"use client";

// Chantier agent applicatif (voir plan-agent-applicatif-clovis.md),
// chantier F : mode générique de secours (DOM + sélecteur), pour tout
// ce qui n'a pas encore d'action déclarée via le chantier A. Le modèle
// doit toujours préférer lister_actions_disponibles puis
// executer_action_application, et n'utiliser ce mode qu'en dernier
// recours (rappelé dans le docstring de l'outil côté backend).
//
// Contrairement au chantier A, aucune métadonnée de sensibilité n'est
// déclarée ici : par cohérence avec le défaut prudent décidé avec
// Bourama, un clic générique est TOUJOURS considéré sensible, sans
// exception (voir lib/canalAgentApplicatif.ts).

/**
 * Vrai si l'élément est réellement visible et actionnable à l'instant
 * présent -- jamais mémorisé, toujours recalculé au moment de l'appel
 * (même principe que obtenirActionsDisponibles pour le chantier A).
 */
export function estVisibleEtActif(element: HTMLElement): boolean {
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-disabled") === "true") return false;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.display === "none") return false;

  return true;
}

/**
 * Résout un sélecteur CSS vers un unique élément cliquable actuellement
 * monté, visible et actif. Renvoie null aussi bien si l'élément est
 * introuvable QUE s'il est trouvé mais indisponible -- l'appelant
 * traite les deux cas de la même façon ("ignore", pour laisser une
 * chance à une autre connexion du même compte, voir
 * lib/canalAgentApplicatif.ts), jamais une supposition sur pourquoi
 * l'élément n'est pas utilisable ici.
 */
export function resoudreElementCliquable(selecteur: string): HTMLElement | null {
  let element: Element | null;
  try {
    element = document.querySelector(selecteur);
  } catch {
    // Sélecteur CSS syntaxiquement invalide fourni par le modèle.
    return null;
  }
  if (!(element instanceof HTMLElement)) return null;
  if (!estVisibleEtActif(element)) return null;
  return element;
}
