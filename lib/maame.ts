// Maame (23/11/2026, demande de Bourama) : l'appli à part faite de la page bambara, installable depuis le
// navigateur du téléphone (PWA) et servie sur sa propre adresse (maame.classinus.com). Elle utilise le même
// code que la page bambara de Classinus ; ce fichier dit seulement si l'adresse visitée est celle de Maame.
// Le début de l'adresse reconnue est écrit ici ; public/maame-hote.js et next.config.mjs (qui ne peuvent pas
// importer ce fichier) doivent garder la même valeur.

export const DEBUT_HOTE_MAAME = "maame.";

// Adresse reçue du serveur (en-tête host, avec ou sans port) ou du navigateur (window.location.hostname).
export function estHoteMaame(hote: string | null | undefined): boolean {
  if (!hote) return false;
  return hote.trim().toLowerCase().startsWith(DEBUT_HOTE_MAAME);
}

// Côté navigateur seulement. L'appli native (Capacitor) et le serveur de développement local ne sont jamais Maame.
export function estMaameDansNavigateur(): boolean {
  if (typeof window === "undefined") return false;
  return estHoteMaame(window.location.hostname);
}
