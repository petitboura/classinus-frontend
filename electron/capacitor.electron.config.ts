import { defineConfig } from '@capawesome/capacitor-electron/config';

import { lancementDepuisSession } from './lancementSession';

export default defineConfig({
  hooks: {
    onWindowCreated: (window) => {
      // Le canal et le miroir continuent lorsque Classinus est en arrière-plan.
      window.webContents.setBackgroundThrottling(false);
      // Plus de barre de menu Fichier, Édition, Affichage, Fenêtre en haut de la fenêtre
      // (20/10/2026, demande de Bourama). Windows et Linux seulement : la fenêtre n'a plus de
      // menu, donc ses raccourcis de menu (zoom, Ctrl+W, Ctrl+Q) ne marchent plus non plus.
      // Copier, coller et annuler continuent de fonctionner.
      window.removeMenu();
    },
  },
  window: {
    width: 1200,
    height: 800,
    // Lancé par Windows à l'ouverture de session (voir demarrage.ts) : ni
    // fenêtre ni écran d'ouverture, seul le bouton du canal en direct
    // apparaît (superposition). Lancé à la main : comportement habituel.
    showOnLaunch: !lancementDepuisSession(),
  },
  // Plus aucun écran d'ouverture Electron (05/10/2026, décision de Bourama) :
  // il pouvait s'afficher avant la vraie fenêtre et se mélanger avec la
  // superposition. Ne JAMAIS le remettre, même si la branche est réalignée
  // avec main : garder splashScreen désactivé et ne pas recréer
  // electron/assets/splash.html (le runtime l'afficherait tout seul).
  splashScreen: { enabled: false },
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
  // Correctif (17/10/2026, demande Bourama) : images et videos trouvees par
  // Classinus ne s'affichaient pas dans l'appli PC (miniatures et galerie
  // d'images en https, lecteur YouTube en iframe, videos en https), car la
  // politique ci-dessous n'autorisait que les fichiers de l'appli (images,
  // videos) et aucune iframe. On autorise donc les images et videos en
  // https, et seulement les iframes YouTube, rien d'autre.
  csp: {
    policy: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https: wss:",
      "object-src 'none'",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
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
