// Message affiché entre l'envoi d'une question et le premier signe de réponse
// (27/11/2026, demande Bourama). L'anglais de chaque texte est dans
// lib/i18n/interface.ts.
export const TEXTES_ATTENTE = [
  "Je réfléchis",
  "Ça mijote",
  "Les idées arrivent",
  "Je creuse",
  "Un petit instant",
  "Petite étincelle",
  "Les neurones chauffent",
  "Je fais le lien",
  "Je rassemble tout",
  "Mise en ordre",
  "Ça prend forme",
  "Je peaufine",
] as const;

export const STYLES_ATTENTE = ["roue", "lettres", "vague"] as const;

// Temps d'affichage possibles d'un texte, en millisecondes : le rythme alterne
// au hasard entre rapide et lent.
export const DUREES_ATTENTE_MS = [1000, 1400, 1900, 2600, 3500] as const;

// Tire un élément au hasard, jamais celui qui vient d'être montré.
export function tirerAutre<T>(liste: readonly T[], precedent?: T): T {
  const candidats = liste.filter((element) => element !== precedent);
  return candidats[Math.floor(Math.random() * candidats.length)];
}
