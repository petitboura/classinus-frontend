// Diagnostic sur un vrai Windows : un clic sur la superposition laisse-t-il la fenetre du dessous devant ?
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const electronExe = require('electron');
const racine = resolve(import.meta.dirname);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const ps = (...args) => execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(racine, 'focus-superposition/aide.ps1'), ...args], { encoding: 'utf8' }).trim();
const titreExterne = 'Fenetre externe test';
let echec = false;

async function lancerVariante(variante, typeExterne) {
  const dossier = await mkdtemp(join(tmpdir(), 'focus-'));
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object Windows.Forms.Form
$f.Text='${titreExterne}'; $f.StartPosition='Manual'; $f.Left=0; $f.Top=0; $f.Width=500; $f.Height=300
$t = New-Object Windows.Forms.TextBox; $t.Left=20; $t.Top=20; $t.Width=300
$f.Controls.Add($t)
$tm = New-Object Windows.Forms.Timer; $tm.Interval=100
$tm.Add_Tick({ try { [System.IO.File]::WriteAllText('${join(dossier, 'statut-externe').replaceAll("'", "''")}', ([string]([System.Windows.Forms.Form]::ActiveForm -ne $null) + '|' + [string]$t.Focused + '|' + $t.Text)) } catch {} })
$tm.Start()
$f.Add_Shown({ $f.TopMost=$true; $f.Activate(); $t.Focus(); [System.IO.File]::WriteAllText('${join(dossier, 'externe-prete').replaceAll("'", "''")}','ok') })
[void]$f.ShowDialog()`;
  await writeFile(join(dossier, 'externe.ps1'), '\uFEFF' + script);
  const externe = typeExterne === 'winforms'
    ? spawn('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', join(dossier, 'externe.ps1')], { stdio: 'ignore' })
    : spawn(electronExe, [join(racine, 'focus-superposition/externe.cjs')], { env: { ...process.env, DOSSIER_TEST: dossier }, stdio: 'ignore' });
  const attendre = async (nom, delai = 20000) => {
    for (let i = 0; i < delai / 100; i++) { try { return await readFile(join(dossier, nom), 'utf8'); } catch { await pause(100); } }
    throw new Error('attente de ' + nom);
  };
  const compte = async (prefixe) => (await readdir(dossier)).filter((n) => n.startsWith(prefixe)).length;
  const resultat = { variante, typeExterne };
  let enfant;
  try {
    await attendre('externe-prete');
    await pause(800);
    resultat.avantTout = ps('fg');
    resultat.statutAvant = (await readFile(join(dossier, 'statut-externe'), 'utf8').catch(() => 'aucun'));
    enfant = spawn(electronExe, [join(racine, 'focus-superposition/main.cjs')], { env: { ...process.env, DOSSIER_TEST: dossier, VARIANTE: variante }, stdio: 'inherit' });
    const { cx, cy, tx, ty } = JSON.parse(await attendre('pret.json'));
    await pause(1000);
    resultat.apresAffichage = ps('fg');
    ps('clic', String(Math.round(cx)), String(Math.round(cy)));
    await pause(800);
    resultat.clicRecu1 = (await compte('clic-')) >= 1;
    resultat.apresClic1 = ps('fg');
    resultat.statutApresClic1 = (await readFile(join(dossier, 'statut-externe'), 'utf8').catch(() => 'aucun'));
    ps('touches'); await pause(500);
    resultat.statutApresTouches = (await readFile(join(dossier, 'statut-externe'), 'utf8').catch(() => 'aucun'));
    ps('clic', String(Math.round(tx)), String(Math.round(ty)));
    await pause(800);
    resultat.apresClicChamp = ps('fg');
    await writeFile(join(dossier, 'commande'), 'saisie-on'); await attendre('fait-saisie-on'); await pause(600);
    resultat.pendantSaisie = ps('fg');
    await writeFile(join(dossier, 'commande'), 'saisie-off'); await attendre('fait-saisie-off'); await pause(800);
    resultat.apresSaisie = ps('fg');
    ps('clic', String(Math.round(cx)), String(Math.round(cy)));
    await pause(800);
    resultat.clicRecu2 = (await compte('clic-')) >= 2;
    resultat.apresClic2 = ps('fg');
    resultat.nbFocusOverlay = await compte('focus-');
  } catch (e) {
    resultat.erreur = String(e);
  } finally {
    try { await writeFile(join(dossier, 'commande'), 'fin'); } catch {}
    await pause(500);
    try { enfant?.kill(); } catch {}
    try { externe.kill(); } catch {}
    execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-Process | Where-Object { $_.MainWindowTitle -eq "' + titreExterne + '" } | Stop-Process -Force -ErrorAction SilentlyContinue']);
    await rm(dossier, { recursive: true, force: true });
  }
  const bon = (v) => v === titreExterne;
  resultat.ok = !resultat.erreur && bon(resultat.apresClic1) && resultat.clicRecu1 && bon(resultat.apresSaisie) && bon(resultat.apresClic2) && resultat.clicRecu2;
  console.log('::notice title=focus-' + typeExterne + '::' + JSON.stringify(resultat));
  if (variante !== 'actuel' && !resultat.ok) echec = true;
}

for (const t of ['winforms', 'chromium']) await lancerVariante('actuel', t);
process.exit(echec ? 1 : 0);
