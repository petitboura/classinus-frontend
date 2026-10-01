// Créé le 01/10/2026, demande Bourama : le bouton permanent du canal en
// direct doit être disponible dès l'ouverture de la session Windows, fenêtre
// de Classinus fermée. Windows lance donc Classinus avec cet argument, ce
// qui permet de démarrer sans ouvrir la fenêtre principale ni l'écran
// d'ouverture (voir capacitor.electron.config.ts).
//
// Fichier volontairement sans import d'Electron : la config Capacitor le
// charge aussi en dehors du processus Electron.
//
// Le plugin SuperpositionAgent (packages/capacitor-superposition-electron)
// pilote le même réglage depuis les Paramètres et répète cette valeur : les
// deux projets TypeScript sont compilés séparément, un import entre eux
// serait fragile (même choix que pour le titre de la fenêtre de superposition).
export const ARGUMENT_LANCEMENT_SESSION = '--lancement-session';

export function lancementDepuisSession(): boolean {
  return process.argv.includes(ARGUMENT_LANCEMENT_SESSION);
}
