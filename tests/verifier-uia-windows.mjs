// Test Windows réel : WinForms accessible, PowerShell/UI Automation, puis focus de la superposition.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { build } from 'esbuild';

if (process.platform !== 'win32') throw new Error('Ce test nécessite Windows et une session de bureau.');
const dossier = await mkdtemp(join(tmpdir(), 'classinus-uia-'));
const fichierEtat = join(dossier, 'etat.json');
const demandeFocus = join(dossier, 'superposition');
const ps = s => s.replaceAll("'", "''");
const titre = `Classinus UIA regression ${process.pid}`;
const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class FocusTest {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
'@
[void][FocusTest]::SetProcessDPIAware()
$form = New-Object Windows.Forms.Form
$form.Text = '${ps(titre)}'
$form.Width=800; $form.Height=500; $form.TopMost=$true
$label = New-Object Windows.Forms.Label
$label.Text='Texte visible depuis Windows'; $label.Left=30; $label.Top=30; $label.Width=600
$bouton = New-Object Windows.Forms.Button
$bouton.Text='Continuer'; $bouton.Left=30; $bouton.Top=90; $bouton.Width=150
$bouton.Add_Click({[System.IO.File]::WriteAllText('${ps(join(dossier,'clic-effectue'))}','ok')})
$case = New-Object Windows.Forms.CheckBox
$case.Text='Option indépendante'; $case.Left=350; $case.Top=90; $case.Width=200
$case.Add_CheckedChanged({[System.IO.File]::WriteAllText('${ps(join(dossier,'case-cochee'))}',$case.Checked.ToString())})
$champ = New-Object Windows.Forms.TextBox
$champ.Text='Valeur fenêtre Windows'; $champ.Left=30; $champ.Top=140; $champ.Width=250
$secret = New-Object Windows.Forms.TextBox
$secret.Text='SECRET-INTERDIT'; $secret.UseSystemPasswordChar=$true; $secret.Left=30; $secret.Top=190
$form.Controls.AddRange(@($label,$bouton,$champ,$secret,$case))
$overlay = New-Object Windows.Forms.Form
$overlay.Text='classinus-superposition-agent'
$overlay.FormBorderStyle=[Windows.Forms.FormBorderStyle]::FixedToolWindow
$overlay.TopMost=$true; $overlay.Width=200; $overlay.Height=100
function EcrireEtat($phase) {
  $json = @{phase=$phase; principal=$form.Handle.ToInt64().ToString(); superposition=$overlay.Handle.ToInt64().ToString()} | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText('${ps(fichierEtat)}',$json)
}
$form.Add_Shown({ $form.Activate(); [void][FocusTest]::SetForegroundWindow($form.Handle); EcrireEtat 'principal' })
$timer = New-Object Windows.Forms.Timer
$timer.Interval=100
$timer.Add_Tick({
  if ([System.IO.File]::Exists('${ps(demandeFocus)}') -and -not $overlay.Visible) {
    $overlay.Show($form); $overlay.Activate(); [void][FocusTest]::SetForegroundWindow($overlay.Handle)
    EcrireEtat 'superposition'
  }
})
$timer.Start()
[void]$form.ShowDialog()
`;
const cheminScript = join(dossier, 'fenetre.ps1');
// Windows PowerShell 5.1 attend un BOM pour les sources UTF-8.
await writeFile(cheminScript, '\uFEFF' + script);
const application = spawn('powershell.exe', ['-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',cheminScript], { stdio:'inherit' });
const attendre = async fn => {
  let derniereErreur;
  for (let i=0; i<80; i++) {
    try { const r=await fn(); if(r) return r; } catch(e) { derniereErreur=e; }
    await new Promise(r=>setTimeout(r,200));
  }
  throw derniereErreur || new Error('Fenêtre de test Windows non disponible.');
};
try {
  const etat = await attendre(async()=>JSON.parse(await readFile(fichierEtat,'utf8')));
  const sortie = join(dossier,'lecture.mjs');
  await build({ entryPoints:[resolve(import.meta.dirname,'../packages/capacitor-pont-natif-electron/electron/src/lectureFenetreWindows.mts')],outfile:sortie,bundle:true,platform:'node',format:'esm' });
  const {lireFenetreAuPremierPlan, construireScript, limitesDepuisParametres} = await import(pathToFileURL(sortie).href);
  const verifier = lecture => {
    assert.equal(lecture.titre_fenetre_active,titre,JSON.stringify(lecture));
    assert.equal(lecture.mode,'uia',JSON.stringify(lecture));
    assert(lecture.elements.some(e=>e.nom.includes('Texte visible depuis Windows')));
    assert(lecture.elements.some(e=>e.nom==='Continuer' && Number.isFinite(e.x) && Number.isFinite(e.y)));
    assert(lecture.elements.some(e=>e.valeur==='Valeur fenêtre Windows' || e.nom==='Valeur fenêtre Windows'));
    assert(lecture.elements.some(e=>e.valeur_masquee));
    assert(!JSON.stringify(lecture).includes('SECRET-INTERDIT'));
  };
  const premiere = await lireFenetreAuPremierPlan({},etat.superposition);
  if (premiere.mode !== 'uia') {
    const diagnostic = construireScript(limitesDepuisParametres({}),process.pid,etat.superposition)
      .replace('$script:elements =', '$script:traces = New-Object System.Collections.Generic.List[object]\n  $script:elements =')
      .replace('if ($el.Cached.IsOffscreen)', '$script:traces.Add(@{nom=$el.Cached.Name;type=$el.Cached.ControlType.ProgrammaticName;hors_ecran=$el.Cached.IsOffscreen;rectangle=$el.Cached.BoundingRectangle.ToString()})\n    if ($el.Cached.IsOffscreen)')
      .replace('$resultat.coupe = $script:coupe', '$resultat.trace = $script:traces\n  $resultat.coupe = $script:coupe');
    const trace = await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(diagnostic,'utf16le').toString('base64')],{encoding:'utf8'});
    console.log('Diagnostic UIA :',trace.stdout);
  }
  verifier(premiere);
  const moduleClic=join(dossier,'clic.mjs');
  await build({entryPoints:[resolve(import.meta.dirname,'../packages/capacitor-pont-natif-electron/electron/src/clicWindows.mts')],outfile:moduleClic,bundle:true,platform:'node',format:'esm'});
  const {cliquerParAccessibiliteWindows}=await import(pathToFileURL(moduleClic).href);
  const positionSouris=async()=>{
    const r=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command','Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position.ToString()'],{encoding:'utf8'});
    return r.stdout.trim();
  };
  const avant=await positionSouris();
  const bouton=premiere.elements.find(e=>e.nom==='Continuer');
  const clicBouton=await cliquerParAccessibiliteWindows(bouton);
  assert.equal(clicBouton.statut,'effectue',JSON.stringify(clicBouton));
  assert.equal(await readFile(join(dossier,'clic-effectue'),'utf8'),'ok');
  const option=premiere.elements.find(e=>e.nom==='Option indépendante');
  assert(option,JSON.stringify(premiere));
  assert.equal((await cliquerParAccessibiliteWindows(option)).statut,'effectue');
  assert.equal(await readFile(join(dossier,'case-cochee'),'utf8'),'True');
  assert.equal(await positionSouris(),avant);
  const label=premiere.elements.find(e=>e.nom==='Texte visible depuis Windows');
  assert.equal((await cliquerParAccessibiliteWindows(label)).statut,'indisponible');
  assert.equal(await positionSouris(),avant);
  console.log('OK Windows réel : bouton cliqué et case cochée par UIA, contrôle incompatible détecté, pointeur Windows inchangé.');
  await writeFile(demandeFocus,'go');
  await attendre(async()=>JSON.parse(await readFile(fichierEtat,'utf8')).phase==='superposition');
  verifier(await lireFenetreAuPremierPlan({},etat.superposition));
  const focus = await lireFenetreAuPremierPlan({},etat.superposition,true);
  assert(!('erreur' in focus),JSON.stringify(focus));
  verifier(await lireFenetreAuPremierPlan({}));
  console.log('OK Windows réel : texte, boutons, valeur, mot de passe masqué, miroir exclu, focus restauré.');
} catch (e) {
  // Les journaux CI ne sont pas lisibles depuis l'exterieur : une commande de workflow
  // ::error:: en fait une annotation de check-run, consultable par l'API GitHub.
  const detail = String((e && (e.stack || e.message)) || e).slice(0, 3000)
    .replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  console.log(`::error title=Echec du test UIA Windows::${detail}`);
  throw e;
} finally {
  application.kill();
  await rm(dossier,{recursive:true,force:true});
}
