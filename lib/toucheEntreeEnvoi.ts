/**
 * Règle unique pour la touche Entrée dans les champs de message (04/10/2026,
 * demande de Bourama : sur téléphone la touche Entrée envoyait le message au
 * lieu de passer à la ligne, elle se comportait comme sur PC).
 *
 * - Écran tactile (téléphone, tablette) : Entrée passe à la ligne, l'envoi se
 *   fait uniquement avec le bouton Envoyer.
 * - PC avec clavier : Entrée envoie, Maj+Entrée passe à la ligne.
 *
 * Dans tous les cas, Entrée ne déclenche rien pendant une composition de texte
 * (clavier à suggestions, saisie en chinois ou japonais, etc.), sinon la
 * validation d'un mot enverrait le message par erreur.
 */

/** Vrai si l'appareil se pilote au doigt (pas de souris, pas de survol). */
export function appareilTactile(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/**
 * À appeler dans le onKeyDown d'un champ de message. Renvoie vrai si la touche
 * pressée doit envoyer le message ; dans ce cas l'appelant doit aussi appeler
 * preventDefault. Renvoie faux pour tout le reste, ce qui laisse le champ faire
 * son retour à la ligne normal.
 */
export function entreeDoitEnvoyer(e: {
  key: string;
  shiftKey: boolean;
  nativeEvent?: { isComposing?: boolean };
}): boolean {
  if (e.key !== "Enter" || e.shiftKey) return false;
  if (e.nativeEvent?.isComposing) return false;
  return !appareilTactile();
}
