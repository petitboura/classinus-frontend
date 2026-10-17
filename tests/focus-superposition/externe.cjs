// Fenetre externe de type Chromium (comme Chrome ou VS Code) avec une zone de texte.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const dossier = process.env.DOSSIER_TEST;
app.whenReady().then(() => {
  const f = new BrowserWindow({ x: 0, y: 0, width: 500, height: 300, title: 'Fenetre externe test' });
  f.on('page-title-updated', (e) => e.preventDefault());
  f.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<body><textarea id="t" autofocus style="width:400px;height:150px"></textarea></body>'));
  f.webContents.once('did-finish-load', () => {
    f.show(); f.focus();
    fs.writeFileSync(path.join(dossier, 'externe-prete'), 'ok');
    setInterval(async () => {
      try {
        const r = await f.webContents.executeJavaScript('document.hasFocus() + "|" + document.activeElement.id + "|" + document.getElementById("t").value');
        fs.writeFileSync(path.join(dossier, 'statut-externe'), r);
      } catch {}
    }, 100);
  });
});
