// capacitor-dossiers-electron ne genere pas de .d.ts pour son
// electron/dist/plugin.mjs (outDir "dist" seul, pas de "declaration"
// dans son tsconfig -- inutile pour ce paquet, dont dist/plugin.mjs
// n'est normalement charge que par la plateforme Capacitor elle-meme).
// Ici on l'importe directement comme simple module Node pour reutiliser
// obtenirAppareilIdPc() (voir plugin.mts) -- declaration minimale,
// limitee a cet unique export utilise.
declare module "capacitor-dossiers-electron/electron/dist/plugin.mjs" {
  export function obtenirAppareilIdPc(): string;
}

// screenshot-desktop n'a pas de paquet @types officiel au moment
// d'ecrire ceci. Signature minimale, limitee a l'usage fait ici (appel
// sans argument, resultat Buffer PNG non exploite pour l'instant -- voir
// plugin.mts, cas "lire_ecran").
declare module "screenshot-desktop" {
  function screenshotDesktop(options?: { format?: string; screen?: number }): Promise<Buffer>;
  export default screenshotDesktop;
}
