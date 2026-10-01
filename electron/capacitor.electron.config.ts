import { defineConfig } from '@capawesome/capacitor-electron/config';

export default defineConfig({
  hooks: {
    onWindowCreated: (window) => {
      // Le canal et le miroir continuent lorsque Classinus est en arrière-plan.
      window.webContents.setBackgroundThrottling(false);
    },
  },
  window: {
    width: 1200,
    height: 800,
  },
  // Correctif (29/09/2026, demande Bourama) : la politique de securite par
  // defaut du runtime (script-src 'self', sans 'unsafe-inline') bloque
  // silencieusement TOUT script en ligne, y compris ceux que Next.js insere
  // lui meme dans chaque page pour l'hydratation React en export statique
  // (les blocs self.__next_f.push(...), qui portent les donnees serialisees
  // du rendu serveur -- inevitables avec `output: "export"`, aucun moyen de
  // les sortir en fichier externe). Sans cette politique, React ne se
  // montait donc jamais : l'appli restait figee sur du HTML statique non
  // interactif (voir aussi les deux scripts sortis en fichiers externes
  // dans app/layout.tsx pour la meme raison, une correction complementaire
  // mais insuffisante seule).
  // Le reste de la politique reprend le DEFAULT_CSP du runtime tel quel
  // (voir node_modules/@capawesome/capacitor-electron/dist/runtime/index.js),
  // seul script-src change.
  csp: {
    policy: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "media-src 'self' blob:",
      "connect-src 'self' https: wss:",
      "object-src 'none'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  // A splash screen is shown automatically while the app boots when a splash
  // file exists (`assets/splash.html` or `assets/splash.png`). Uncomment to
  // customize it:
  // splashScreen: {
  //   path: 'assets/splash.html',
  //   width: 400,
  //   height: 300,
  //   backgroundColor: '#ffffff',
  //   minimumDurationMs: 0,
  // },
  // Per-plugin config overrides. Merged over the `plugins` section of the
  // Capacitor config (this section wins per key) — the Electron equivalent of
  // Android string resources / iOS Info.plist plugin settings. Being
  // TypeScript, values can be computed, e.g. a live-update channel derived
  // from the app version (`import packageJson from './package.json'`):
  // plugins: {
  //   LiveUpdate: {
  //     defaultChannel: `production-${packageJson.version}`,
  //   },
  // },
});
