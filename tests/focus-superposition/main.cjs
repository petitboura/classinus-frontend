// Fenetre de test qui imite la superposition de Classinus (memes options que electron/main.ts).
// Variantes : "actuel" (comportement du depot) et "blur" (rend la main des qu'elle est activee sans saisie).
const { app, BrowserWindow, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const dossier = process.env.DOSSIER_TEST;
const variante = process.env.VARIANTE || 'actuel';
const noter = (nom) => fs.writeFileSync(path.join(dossier, nom), String(Date.now()));
let saisie = false;
let garde = null;
let poignee = null;
if (variante === 'garde') {
  import(require('node:url').pathToFileURL(process.env.MODULE_GARDE).href).then((m) => { garde = m.creerGardePremierPlan(); poignee = m.poigneeFenetre; garde.demarrer(); });
}
app.whenReady().then(() => {
  const zone = screen.getPrimaryDisplay().workArea;
  const x = zone.x, y = zone.y, largeur = zone.width, hauteur = zone.height;
  const bouton = { x: x + largeur - 320, y: y + hauteur - 220, l: 300, h: 200 };
  const champ = { x: x + largeur - 320, y: y + 20, l: 300, h: 60 };
  const fenetre = new BrowserWindow({
    x, y, width: largeur, height: hauteur, frame: false, transparent: true, hasShadow: false,
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    skipTaskbar: true, focusable: false, show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  fenetre.setAlwaysOnTop(true, 'screen-saver');
  fenetre.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  fenetre.setIgnoreMouseEvents(true);
  fenetre.on('page-title-updated', (e, titre) => { e.preventDefault(); if (titre.startsWith('CLIC')) noter('clic-' + titre); });
  fenetre.on('focus', () => {
    noter('focus-' + Date.now());
    
  });
  const html = '<body style="margin:0;background:transparent"><button style="position:fixed;right:20px;bottom:20px;width:300px;height:200px;font-size:30px" onclick="window.n=(window.n||0)+1;document.title=\'CLIC\'+window.n">Bouton</button><input id="t" style="position:fixed;right:20px;top:20px;width:300px;height:60px" onfocus="document.title=\'SAISIE-ON\'+Date.now()"></body>';
  fenetre.webContents.once('did-finish-load', () => {
    fenetre.showInactive();
    fs.writeFileSync(path.join(dossier, 'pret.json'), JSON.stringify({ cx: bouton.x + bouton.l / 2, cy: bouton.y + bouton.h / 2, tx: champ.x + champ.l / 2, ty: champ.y + champ.h / 2 }));
    // Comme le vrai plugin : la fenetre ne capte la souris que si le pointeur est au dessus d'un element.
    let traversant = true;
    setInterval(() => {
      const p = screen.getCursorScreenPoint();
      const dans = (r) => p.x >= r.x && p.x <= r.x + r.l && p.y >= r.y && p.y <= r.y + r.h;
      const veut = !(dans(bouton) || dans(champ));
      if (veut !== traversant) { traversant = veut; fenetre.setIgnoreMouseEvents(veut); }
    }, 16);
  });
  void fenetre.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  setInterval(() => {
    const cmd = path.join(dossier, 'commande');
    if (!fs.existsSync(cmd)) return;
    const texte = fs.readFileSync(cmd, 'utf8').trim();
    fs.rmSync(cmd);
    if (texte === 'saisie-on') {
      saisie = true;
      const prendre = () => { if (!saisie) return; fenetre.setFocusable(true); fenetre.setSkipTaskbar(true); fenetre.focus(); };
      if (garde) void garde.memoriser(poignee(fenetre.getNativeWindowHandle())).finally(() => { noter('debug-memo-' + garde.fenetreMemorisee()); prendre(); }); else prendre();
    } else if (texte === 'saisie-off') {
      const encore = fenetre.isFocused();
      saisie = false; fenetre.setFocusable(false); fenetre.setSkipTaskbar(true);
      noter('debug-encore-' + encore + '-memo-' + (garde ? garde.fenetreMemorisee() : 'sans'));
      if (garde && encore) void garde.restaurer().then((ok) => noter('debug-restaure-' + ok));
    } else if (texte === 'fin') app.quit();
    noter('fait-' + texte);
  }, 100);
});
