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

// Temps d'affichage possibles d'un texte du message d'attente, en millisecondes : tiré au hasard
// entre deux valeurs, de 2 à 5 secondes (28/11/2026, demande Bourama : le texte changeait trop vite).
export const DUREE_ATTENTE_MIN_MS = 2000;
export const DUREE_ATTENTE_MAX_MS = 5000;

export function dureeAttenteAleatoireMs(): number {
  return DUREE_ATTENTE_MIN_MS + Math.floor(Math.random() * (DUREE_ATTENTE_MAX_MS - DUREE_ATTENTE_MIN_MS + 1));
}

// Temps d'affichage possibles d'une icône de réflexion (IconeReflexion), en millisecondes : le
// rythme alterne au hasard entre rapide et lent.
export const DUREES_ATTENTE_MS = [1000, 1400, 1900, 2600, 3500] as const;

// Tire un élément au hasard, jamais celui qui vient d'être montré.
export function tirerAutre<T>(liste: readonly T[], precedent?: T): T {
  const candidats = liste.filter((element) => element !== precedent);
  return candidats[Math.floor(Math.random() * candidats.length)];
}

// Sac de textes (28/11/2026, demande Bourama : le même texte revenait souvent). Chaque texte est
// montré une fois, dans un ordre mélangé, avant que l'un d'eux revienne ; le premier d'un nouveau
// tour n'est jamais celui qui vient d'être montré. Le sac reste en mémoire d'un message à l'autre,
// pour que deux messages de suite ne commencent pas par le même texte. À n'appeler que dans le
// navigateur (jamais au rendu), pour que le serveur et le navigateur affichent la même chose.
let sacAttente: string[] = [];
let dernierTexteAttente: string | undefined;

export function texteAttenteSuivant(): string {
  if (sacAttente.length === 0) {
    const melange = [...TEXTES_ATTENTE] as string[];
    for (let i = melange.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [melange[i], melange[j]] = [melange[j], melange[i]];
    }
    if (melange.length > 1 && melange[0] === dernierTexteAttente) {
      [melange[0], melange[melange.length - 1]] = [melange[melange.length - 1], melange[0]];
    }
    sacAttente = melange;
  }
  const texte = sacAttente.shift() as string;
  dernierTexteAttente = texte;
  return texte;
}
