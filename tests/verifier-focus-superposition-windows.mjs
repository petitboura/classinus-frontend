// Sur un vrai Windows : apres un clic sur la superposition, puis apres une saisie de texte,
// la fenetre du dessous garde-t-elle le clavier ? Teste trois types de fenetres du dessous.
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const electronExe = require('electron');
const racine = resolve(import.meta.dirname);
const moduleGarde = resolve(racine, '../packages/capacitor-superposition-electron/electron/dist/premierPlanWindows.mjs');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const ps = (...args) => execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(racine, 'focus-superposition/aide.ps1'), ...args], { encoding: 'utf8' }).trim();
const titreExterne = 'Fenetre externe test';
let echec = false;

async function essai(variante, typeExterne) {
  const dossier = await mkdtemp(join(tmpdir(), 'focus-'));
  const statut = (join(dossier, 'statut-externe')).replaceAll("'", "''");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object Windows.Forms.Form
$f.Text='${titreExterne}'; $f.StartPosition='Manual'; $f.Left=0; $f.Top=0; $f.Width=500; $f.Height=300
$t = New-Object Windows.Forms.TextBox; $t.Left=20; $t.Top=20; $t.Width=300
$f.Controls.Add($t)
$tm = New-Object Windows.Forms.Timer; $tm.Interval=100
$tm.Add_Tick({ try { [System.IO.File]::WriteAllText('${statut}', ([string]([System.Windows.Forms.Form]::ActiveForm -ne $null) + '|' + [string]$t.Focused + '|' + $t.Text)) } catch {} })
$tm.Start()
$f.Add_Shown({ $f.TopMost=$true; $f.Activate(); $t.Focus(); [System.IO.File]::WriteAllText('${join(dossier, 'externe-prete').replaceAll("'", "''")}','ok') })
[void]$f.ShowDialog()`;
  await writeFile(join(dossier, 'externe.ps1'), '\uFEFF' + script);
  const env = { ...process.env, DOSSIER_TEST: dossier, VARIANTE: variante, MODULE_GARDE: moduleGarde };
  const externe = typeExterne === 'winforms'
    ? spawn('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', join(dossier, 'externe.ps1')], { stdio: 'ignore' })
    : typeExterne === 'chromium'
      ? spawn(electronExe, [join(racine, 'focus-superposition/externe.cjs')], { env, stdio: 'ignore' })
      : spawn('python', [join(racine, 'focus-superposition/externe.py'), dossier], { stdio: 'ignore' });
  const attendre = async (nom, delai = 25000) => {
    for (let i = 0; i < delai / 100; i++) { try { return await readFile(join(dossier, nom), 'utf8'); } catch { await pause(100); } }
    throw new Error('attente de ' + nom);
  };
  const lire = () => readFile(join(dossier, 'statut-externe'), 'utf8').catch(() => 'aucun');
  const r = { variante, typeExterne };
  let enfant;
  try {
    await attendre('externe-prete');
    await pause(1500);
    r.fgDepart = ps('fg');
    enfant = spawn(electronExe, [join(racine, 'focus-superposition/main.cjs')], { env, stdio: 'inherit' });
    const { cx, cy } = JSON.parse(await attendre('pret.json'));
    await pause(2500);
    ps('clic', Math.round(cx) + ',' + Math.round(cy));
    await pause(800);
    r.fgApresClic = ps('fg');
    ps('touches', 'abc'); await pause(500);
    r.clavierApresClic = (await lire()).includes('abc');
    await writeFile(join(dossier, 'commande'), 'saisie-on'); await attendre('fait-saisie-on'); await pause(1200);
    r.fgPendantSaisie = ps('fg');
    await writeFile(join(dossier, 'commande'), 'saisie-off'); await attendre('fait-saisie-off'); await pause(1500);
    r.fgApresSaisie = ps('fg');
    ps('touches', 'xyz'); await pause(500);
    r.clavierApresSaisie = (await lire()).includes('xyz');
    r.statutFinal = await lire();
  } catch (e) {
    r.erreur = String(e);
  } finally {
    try { await writeFile(join(dossier, 'commande'), 'fin'); } catch {}
    await pause(500);
    try { enfant?.kill(); } catch {}
    try { externe.kill(); } catch {}
    execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-Process | Where-Object { $_.MainWindowTitle -eq "' + titreExterne + '" } | Stop-Process -Force -ErrorAction SilentlyContinue']);
    await rm(dossier, { recursive: true, force: true });
  }
  r.ok = !r.erreur && r.fgApresClic === titreExterne && r.clavierApresClic && r.fgApresSaisie === titreExterne && r.clavierApresSaisie;
  console.log('::notice title=focus-' + variante + '-' + typeExterne + '::' + JSON.stringify(r));
  if (variante === 'garde' && !r.ok) echec = true;
}

for (const v of ['actuel', 'garde']) for (const t of ['winforms', 'chromium', 'tk']) await essai(v, t);
process.exit(echec ? 1 : 0);
