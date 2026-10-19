/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.classinus.app',
  productName: 'Classinus',
  directories: {
    output: 'dist',
    buildResources: 'assets',
  },
  files: [
    'build/**/*',
    'app/**/*',
    'generated/**/*',
    // `assets` is also the electron-builder `buildResources` directory, whose
    // contents are NOT packaged by default. Include it explicitly so the
    // runtime assets ship in the app (plus d'écran d'ouverture Electron).
    'assets/**/*',
    'package.json',
    // Platform runtime + plugins, prepared by `capacitor-electron vendor`.
    { from: 'vendor/node_modules', to: 'node_modules' },
  ],
  // Appli PC Windows (19/10/2026, demande Bourama : mise à jour automatique et
  // publication). Installeur NSIS par utilisateur, sans droits administrateur,
  // pour que les mises à jour se fassent sans fenêtre de confirmation Windows.
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    runAfterFinish: true,
    deleteAppDataOnUninstall: false,
  },
  // Nom stable de l'installeur dans les releases.
  artifactName: 'Classinus-Setup-${version}.${ext}',
  // Où electron-builder publie l'installeur, et d'où l'appli installée lit les
  // mises à jour (electron-builder écrit ce choix dans app-update.yml, voir
  // packages/capacitor-mise-a-jour-pc-electron). Dépôt public dédié : on ne
  // mélange pas avec les releases de classinus-frontend, dont la page
  // Télécharger lit la dernière release pour trouver l'APK Android.
  // La publication n'a lieu que depuis le workflow .github/workflows/publier-pc.yml
  // (option --publish always) : un `npm run pack` local ne publie rien.
  publish: [
    {
      provider: 'github',
      owner: 'petitboura',
      repo: 'classinus-updates-pc',
      releaseType: 'release',
    },
  ],
  // Pas de certificat de signature pour l'instant (Windows affichera un
  // avertissement SmartScreen à l'installation). Pour signer plus tard :
  // ajouter win.signtoolOptions (ou le service de signature choisi), sans
  // toucher au reste.
};
