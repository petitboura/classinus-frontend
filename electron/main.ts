import { BrowserWindow, screen } from 'electron';
import { createCapacitorElectronApp } from '@capawesome/capacitor-electron';

import config from './capacitor.electron.config';

const capacitorApp = createCapacitorElectronApp(config);

// Lot R (27/09/2026, Bourama : chantier "canal en direct sort de
// l'appli", voir plan-canal-en-direct-pc.md a la racine du depot).
// Deuxieme fenetre : sans bordure, transparente, toujours au dessus de
// tout (y compris une appli en plein ecran) et a l'origine sans capture
// de clic. Elle charge une route Next dediee (app/agent-superposition/page.tsx)
// qui reutilise tel quel le curseur virtuel/la bulle/la barre de
// saisie/le journal du canal en direct -- voir lib/superpositionElectron.ts
// pour le pont d'etat avec la fenetre principale, et
// packages/capacitor-superposition-electron pour le plugin qui relaie cet
// etat entre les deux processus de rendu.
//
// Hors perimetre de ce lot (voir le plan) : purement visuel et de relais,
// aucune action reelle en dehors de la page Clovis.
const TITRE_FENETRE_SUPERPOSITION = 'classinus-superposition-agent';

function zoneTousEcrans() {
  const ecrans = screen.getAllDisplays();
  const gauche = Math.min(...ecrans.map((e) => e.bounds.x));
  const haut = Math.min(...ecrans.map((e) => e.bounds.y));
  const droite = Math.max(...ecrans.map((e) => e.bounds.x + e.bounds.width));
  const bas = Math.max(...ecrans.map((e) => e.bounds.y + e.bounds.height));
  return { x: gauche, y: haut, width: droite - gauche, height: bas - haut };
}

capacitorApp.whenReady.then(() => {
  const zone = zoneTousEcrans();
  // Meme script de preload que la fenetre principale (expose le pont
  // Capacitor/plugins cote renderer) : chemin officiellement documente
  // par le paquet via son export "./preload", pas un chemin devine (voir
  // node_modules/@capawesome/capacitor-electron/package.json).
  const preloadPath = require.resolve('@capawesome/capacitor-electron/preload');
  const scheme = config.scheme ?? 'capacitor-electron';
  const hostname = config.hostname ?? 'localhost';

  const superposition = new BrowserWindow({
    title: TITRE_FENETRE_SUPERPOSITION,
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  // 'screen-saver' = niveau le plus haut disponible (Electron,
  // setAlwaysOnTop) -- necessaire pour rester visible par dessus une
  // appli en plein ecran, pas seulement au dessus des fenetres normales.
  superposition.setAlwaysOnTop(true, 'screen-saver');
  superposition.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Rien capte par defaut : la page elle meme active la capture des
  // clics uniquement la ou un element est reellement affiche (voir
  // definirCapturerSourisSuperposition dans lib/superpositionElectron.ts,
  // et le plugin SuperpositionAgent.definirCapturerSouris).
  superposition.setIgnoreMouseEvents(true, { forward: true });

  // Meme garde de navigation que la fenetre principale (voir
  // installNavigationGuards dans le runtime @capawesome/capacitor-electron
  // -- non exporte publiquement, donc reproduit ici a l'identique) : un
  // lien qui sortirait de l'origine de l'appli s'ouvre dans le
  // navigateur systeme plutot que de naviguer cette fenetre.
  const origine = `${scheme}://${hostname}`;
  superposition.webContents.on('will-navigate', (evenement, url) => {
    if (!url.startsWith(origine)) evenement.preventDefault();
  });
  superposition.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  superposition.once('ready-to-show', () => superposition.showInactive());

  // Assomption a verifier par Bourama (impossible a tester dans ce bac a
  // sable, pas de build Next complet possible ici -- police Google
  // bloquee par le reseau) : export statique Next SANS trailingSlash
  // (voir next.config.mjs, aucune option de ce nom) produit un fichier
  // PLAT "<route>.html" par route, pas un dossier "<route>/index.html".
  // Si ce n'est pas le cas, remplacer la ligne ci dessous par
  // `${origine}/agent-superposition/index.html`.
  void superposition.loadURL(`${origine}/agent-superposition.html`);
});
