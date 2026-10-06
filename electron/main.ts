import { app, BrowserWindow, screen } from 'electron';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCapacitorElectronApp } from '@capawesome/capacitor-electron';

import config from './capacitor.electron.config';
import { installerArrierePlan } from './arrierePlan';
import { initialiserDemarrageAutomatique } from './demarrage';

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


// DIAGNOSTIC TEMPORAIRE (29/09/2026, demande Bourama) : la superposition
// ne s'affiche pas dans l'appli installee (bouton canal qui disparait au
// clic, curseur et journal jamais visibles). Ce bloc ne change aucun
// comportement : il ecrit dans un fichier ce qui arrive a la fenetre de
// superposition (chargement de sa page, erreurs de sa console, affichage
// et masquage) et ouvre ses outils de developpement dans une fenetre a
// part. A RETIRER des que la cause est trouvee.
function journalDiagnostic(message: string) {
  try {
    const fichier = join(app.getPath('userData'), 'diagnostic-superposition.log');
    appendFileSync(fichier, `${new Date().toISOString()} ${message}\n`, 'utf8');
  } catch {
    // Ecriture impossible : on ne casse jamais l'appli pour un diagnostic.
  }
}

function brancherDiagnosticSuperposition(fenetre: BrowserWindow, urlDemandee: string) {
  journalDiagnostic(`--- creation de la fenetre de superposition, url demandee : ${urlDemandee}`);
  journalDiagnostic(`chemin de ce fichier journal : ${join(app.getPath('userData'), 'diagnostic-superposition.log')}`);
  const wc = fenetre.webContents;
  wc.on('did-start-loading', () => journalDiagnostic('did-start-loading'));
  wc.on('did-finish-load', () => journalDiagnostic(`did-finish-load, url reelle : ${wc.getURL()}`));
  wc.on('did-fail-load', (_evenement, code, description, urlEchec, principale) => {
    journalDiagnostic(`did-fail-load code=${code} description=${description} url=${urlEchec} fenetrePrincipale=${principale}`);
  });
  wc.on('render-process-gone', (_evenement, details) => {
    journalDiagnostic(`render-process-gone raison=${details.reason} code=${details.exitCode}`);
  });
  wc.on('preload-error', (_evenement, cheminPreload, erreur) => {
    journalDiagnostic(`preload-error ${cheminPreload} : ${erreur.message}`);
  });
  wc.on('console-message', (evenement) => {
    journalDiagnostic(`console niveau=${evenement.level} ${evenement.sourceId}:${evenement.lineNumber} ${evenement.message}`);
  });
  // Complement du 29/09/2026 : titre reel de la fenetre de superposition
  // apres chargement (confirme que le blocage de page-title-updated est
  // actif), puis un releve toutes les 3 secondes pendant la premiere
  // minute : titre et visibilite de chaque fenetre de l'appli, pour voir
  // si la superposition est retrouvee et si son etat change au clic.
  wc.on('did-finish-load', () => {
    journalDiagnostic(`titre de la fenetre de superposition apres chargement : "${fenetre.getTitle()}"`);
  });
  let releves = 0;
  const minuteur = setInterval(() => {
    releves += 1;
    const fenetres = BrowserWindow.getAllWindows()
      .map((f) => `[titre="${f.getTitle()}" visible=${f.isVisible()} id=${f.id}]`)
      .join(' ');
    journalDiagnostic(`releve ${releves} : ${fenetres}`);
    if (releves >= 20) clearInterval(minuteur);
  }, 3000);
  fenetre.on('closed', () => clearInterval(minuteur));
  fenetre.on('show', () => journalDiagnostic('fenetre : show'));
  fenetre.on('hide', () => journalDiagnostic('fenetre : hide'));
  fenetre.on('closed', () => journalDiagnostic('fenetre : closed'));
  wc.on('did-finish-load', () => {
    // Les DevTools volaient le premier plan pendant les lectures Windows.
    void wc
      .executeJavaScript(
        "JSON.stringify({ url: location.href, plateforme: (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'inconnue', nbElementsSuperposition: document.querySelectorAll('[data-agent-superposition]').length, longueurBody: document.body ? document.body.innerHTML.length : -1 })"
      )
      .then((resultat) => journalDiagnostic(`etat de la page apres chargement : ${String(resultat)}`))
      .catch((erreur: unknown) => journalDiagnostic(`etat de la page illisible : ${String(erreur)}`));
  });
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
    // focusable: false retire le 28/09/2026 : sous Windows, une fenetre non
    // focusable ne recoit jamais le clavier, donc la barre de saisie texte
    // de la superposition (ControlesInteractionCanal.tsx) n'aurait pas pu
    // ecrire. La fenetre apparait toujours sans voler le focus (voir
    // showInactive plus bas) ; elle ne le prend que si l'etudiant clique
    // lui meme sur un de ses elements.
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      backgroundThrottling: false,
    },
  });

  // 'screen-saver' = niveau le plus haut disponible (Electron,
  // setAlwaysOnTop) -- necessaire pour rester visible par dessus une
  // appli en plein ecran, pas seulement au dessus des fenetres normales.
  superposition.setAlwaysOnTop(true, 'screen-saver');
  superposition.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Rien capte par defaut : le plugin SuperpositionAgent (suivreSouris dans
  // packages/capacitor-superposition-electron/electron/src/plugin.mts) active
  // la capture des clics uniquement quand le pointeur est au dessus d'un
  // element reellement affiche. Volontairement SANS forward: true : avec
  // cette option la superposition recevait tous les mouvements de souris du
  // PC et faisait trembler la fleche au dessus des champs de saisie.
  superposition.setIgnoreMouseEvents(true);

  // Correctif (29/09/2026, demande Bourama) : le plugin SuperpositionAgent
  // (packages/capacitor-superposition-electron/electron/src/plugin.mts)
  // retrouve cette fenetre par son titre (getTitle() ===
  // TITRE_FENETRE_SUPERPOSITION). Or Electron remplace le titre de la
  // fenetre par celui de la page des qu'elle est chargee (ici "Classinus",
  // herite du layout racine), sauf si on l'en empeche : la fenetre n'etait
  // alors plus retrouvee, donc jamais montree (showInactive jamais
  // appele) et sans capture de clic. On fige donc le titre.
  superposition.on('page-title-updated', (evenement) => {
    evenement.preventDefault();
  });

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

  // Visibilite (01/10/2026, demande Bourama) : la superposition n'est plus
  // cachee tant que le canal est inactif. Elle reste affichee en permanence,
  // fenetre principale fermee comprise, mais seul le bouton d'activation du
  // canal y est dessine tant que le canal est inactif (voir
  // app/agent-superposition/page.tsx). Elle n'est jamais montree ici : le
  // plugin SuperpositionAgent (packages/capacitor-superposition-electron/
  // electron/src/plugin.mts) l'affiche des que la fenetre principale a envoye
  // son premier etat, sans voler le focus, pour que le bouton ne soit jamais
  // visible avant d'etre capable d'agir.

  // Assomption a verifier par Bourama (impossible a tester dans ce bac a
  // sable, pas de build Next complet possible ici -- police Google
  // bloquee par le reseau) : export statique Next SANS trailingSlash
  // (voir next.config.mjs, aucune option de ce nom) produit un fichier
  // PLAT "<route>.html" par route, pas un dossier "<route>/index.html".
  // Si ce n'est pas le cas, remplacer la ligne ci dessous par
  // `${origine}/agent-superposition/index.html`.
  const urlSuperposition = `${origine}/agent-superposition.html`;
  brancherDiagnosticSuperposition(superposition, urlSuperposition);
  void superposition.loadURL(urlSuperposition);

  // Arriere-plan (01/10/2026, demande Bourama) : fermer la fenetre principale
  // la cache au lieu de l'arreter, le canal en direct et le bouton
  // permanent continuent. Voir arrierePlan.ts.
  const principale = capacitorApp.getMainWindow();
  if (principale) installerArrierePlan(principale);
  initialiserDemarrageAutomatique();
});
