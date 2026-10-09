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
const demandeMenu = join(dossier, 'menu-ouvrir');
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
# Bouton sans aucun libelle (comme un bouton d'icone) et bouton dans un panneau nomme :
# l'IA doit les voir, designer le premier par son identifiant et connaitre le panneau du second.
$sansLibelle = New-Object Windows.Forms.Button
$sansLibelle.Text=''; $sansLibelle.Left=700; $sansLibelle.Top=90; $sansLibelle.Width=60
$groupe = New-Object Windows.Forms.GroupBox
$groupe.Text='Panneau essai'; $groupe.Left=30; $groupe.Top=260; $groupe.Width=300; $groupe.Height=90
$dansGroupe = New-Object Windows.Forms.Button
$dansGroupe.Text='Dans le panneau'; $dansGroupe.Left=10; $dansGroupe.Top=30; $dansGroupe.Width=150
$groupe.Controls.Add($dansGroupe)
$form.Controls.AddRange(@($label,$bouton,$champ,$secret,$case,$sansLibelle,$groupe))
# Menu Windows natif (classe #32768), comme Bloc-notes ou l'Explorateur : un ContextMenuStrip
# WinForms n'expose aucun element a UI Automation et ne represente donc pas les vraies applications.
$menu = New-Object Windows.Forms.ContextMenu
[void]$menu.MenuItems.Add('Copier le texte')
[void]$menu.MenuItems.Add('Coller le texte')
$script:menuOuvert = $false

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
  if ([System.IO.File]::Exists('${ps(demandeMenu)}') -and -not $script:menuOuvert) {
    # Show est modal : le menu reste ouvert jusqu'a la fin du test, donc a faire en dernier.
    $script:menuOuvert = $true; EcrireEtat 'menu'
    $menu.Show($form, (New-Object Drawing.Point(400, 250)))
  }
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
let sortieApplication='';
const application = spawn('powershell.exe', ['-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',cheminScript], { stdio:['ignore','pipe','pipe'] });
application.stdout.on('data',b=>{sortieApplication+=b;});
application.stderr.on('data',b=>{sortieApplication+=b;});
const attendre = async fn => {
  let derniereErreur;
  for (let i=0; i<225; i++) {
    if(application.exitCode!==null) throw new Error('La fenêtre Windows de test a quitté : '+sortieApplication);
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
    // Base de la vision de l'ecran : un bouton sans nom reste dans la lecture, avec la nature
    // (classe BUTTON) et la position qui permettent a l'IA de le designer.
    assert(lecture.elements.some(e=>e.nom==='' && !e.valeur_masquee && /button/i.test(e.classe ?? '') && Number.isFinite(e.x)),JSON.stringify(lecture));
    // Le nom du panneau qui contient un element est indique.
    assert(lecture.elements.some(e=>e.nom==='Dans le panneau' && e.panneau==='Panneau essai'),JSON.stringify(lecture));
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
  try {
    verifier(premiere);
  } catch (erreur) {
    // Le journal d'un job GitHub n'est lisible qu'a la main : un message ::error:: devient une
    // annotation, relisible aussi par l'API. On y met ce qui a ete lu, pour voir ce qui manque.
    const resume = premiere.elements.map(e=>`${e.type}|${e.nom}|id=${e.id_auto??''}|panneau=${e.panneau??''}`).join(' ;; ');
    console.log('::error title=Lecture UIA::' + String(erreur.message).split('\n')[0].slice(0,200) + ' => ' + resume.slice(0,1500));
    try {
      const trace = construireScript(limitesDepuisParametres({}),process.pid,etat.superposition)
        .replace('$script:elements =', '$script:traces = New-Object System.Collections.Generic.List[object]\n  $script:elements =')
        .replace('if ($el.Cached.IsOffscreen)', '$script:traces.Add(\"$($el.Cached.ControlType.ProgrammaticName)|nom=$($el.Cached.Name)|id=$($el.Cached.AutomationId)|hors=$($el.Cached.IsOffscreen)|invoke=$($el.GetCachedPropertyValue($AE::IsInvokePatternAvailableProperty))|focus=$($el.Cached.IsKeyboardFocusable)|classe=$($el.Cached.ClassName)|rect=$($el.Cached.BoundingRectangle)\")\n    if ($el.Cached.IsOffscreen)')
        .replace('$resultat.coupe = $script:coupe', '$resultat.trace = $script:traces\n  $resultat.coupe = $script:coupe');
      const fichierTrace = join(dossier,'trace.ps1');
      await writeFile(fichierTrace, '\uFEFF' + trace);
      const sortieTrace = await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fichierTrace],{encoding:'utf8',maxBuffer:20*1024*1024});
      const lecture = JSON.parse(sortieTrace.stdout);
      console.log('::error title=Trace UIA::' + (lecture.trace ?? []).join(' ;; ').slice(0,3500));
    } catch (e) { console.log('::error title=Trace UIA indisponible::' + String(e.message).slice(0,300)); }
    throw erreur;
  }
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
  assert.equal(clicBouton.statut,'effectue',JSON.stringify({...clicBouton,cible:bouton}));
  assert.equal(await attendre(()=>readFile(join(dossier,'clic-effectue'),'utf8')),'ok');
  const option=premiere.elements.find(e=>e.nom==='Option indépendante');
  assert(option,JSON.stringify(premiere));
  assert.equal((await cliquerParAccessibiliteWindows(option)).statut,'effectue');
  assert.equal(await attendre(()=>readFile(join(dossier,'case-cochee'),'utf8')),'True');
  assert.equal(await positionSouris(),avant);
  const label=premiere.elements.find(e=>e.nom==='Texte visible depuis Windows');
  assert.equal((await cliquerParAccessibiliteWindows(label)).statut,'indisponible');
  assert.equal(await positionSouris(),avant);
  console.log('OK Windows réel : bouton cliqué et case cochée par actions indépendantes, contrôle incompatible détecté, pointeur Windows inchangé.');
  // Aucun menu n'est ouvert pour l'instant : la lecture ne doit pas en inventer.
  assert.equal(premiere.menu_ouvert,false,JSON.stringify(premiere));
  await writeFile(demandeFocus,'go');
  await attendre(async()=>JSON.parse(await readFile(fichierEtat,'utf8')).phase==='superposition');
  verifier(await lireFenetreAuPremierPlan({},etat.superposition));
  const focus = await lireFenetreAuPremierPlan({},etat.superposition,true);
  assert(!('erreur' in focus),JSON.stringify(focus));
  verifier(await lireFenetreAuPremierPlan({}));
  console.log('OK Windows réel : texte, boutons, valeur, mot de passe masqué, miroir exclu, focus restauré.');
  await writeFile(demandeMenu,'go');
  await attendre(async()=>JSON.parse(await readFile(fichierEtat,'utf8')).phase==='menu');
  // Le menu s'affiche juste apres l'ecriture de l'etat : quelques essais, pas d'attente infinie.
  let avecMenu;
  for (let essai=0; essai<5; essai++) {
    avecMenu = await lireFenetreAuPremierPlan({},etat.superposition);
    if (avecMenu.menu_ouvert === true) break;
    await new Promise(r=>setTimeout(r,500));
  }
  assert.equal(avecMenu.titre_fenetre_active,titre,JSON.stringify(avecMenu));
  if (avecMenu.menu_ouvert !== true) {
    // Diagnostic : fenetres visibles dans l'ordre d'affichage (haut vers bas), pour voir ou est le menu.
    const diag = `
Add-Type -TypeDefinition @'
using System; using System.Text; using System.Collections.Generic; using System.Runtime.InteropServices;
public static class DiagFenetres {
  delegate bool Cb(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(Cb f, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassNameW(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint c);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  public static List<string> Sans_titre() {
    List<string> r = new List<string>(); uint moi = 0; GetWindowThreadProcessId(GetForegroundWindow(), out moi);
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      if (!IsWindowVisible(h)) return true;
      StringBuilder t = new StringBuilder(256); GetWindowTextW(h, t, 256);
      uint p; GetWindowThreadProcessId(h, out p);
      if (p == moi && t.Length == 0) r.Add(h.ToInt64().ToString());
      return true;
    }, IntPtr.Zero);
    return r;
  }
  public static string Liste() {
    StringBuilder r = new StringBuilder(); int n = 0; IntPtr fg = GetForegroundWindow();
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      if (!IsWindowVisible(h)) return true;
      StringBuilder c = new StringBuilder(256); GetClassNameW(h, c, 256);
      StringBuilder t = new StringBuilder(256); GetWindowTextW(h, t, 256);
      uint p; GetWindowThreadProcessId(h, out p);
      r.Append(n++ + ":" + (h == fg ? "FG " : "") + c + "|" + t + "|pid=" + p + "|ex=" + GetWindowLong(h, -20).ToString("x") + "|owner=" + (GetWindow(h, 4) != IntPtr.Zero) + "; ");
      return true;
    }, IntPtr.Zero);
    return r.ToString();
  }
}
'@
[DiagFenetres]::Liste()
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$AE = [System.Windows.Automation.AutomationElement]
foreach ($h in [DiagFenetres]::Sans_titre()) {
  "=== UIA de la fenetre sans titre " + $h
  try {
    $racine = $AE::FromHandle([IntPtr][long]$h)
    "racine : type=" + $racine.Current.ControlType.ProgrammaticName + " nom=[" + $racine.Current.Name + "] classe=" + $racine.Current.ClassName + " horsecran=" + $racine.Current.IsOffscreen
    $tous = $racine.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    "descendants (vue brute) : " + $tous.Count
    $cond = New-Object System.Windows.Automation.PropertyCondition($AE::NativeWindowHandleProperty, [int][long]$h)
    $bureau = $AE::RootElement.FindFirst([System.Windows.Automation.TreeScope]::Children, $cond)
    if ($null -eq $bureau) { "depuis le bureau : element introuvable" } else {
      "depuis le bureau : type=" + $bureau.Current.ControlType.ProgrammaticName + " classe=" + $bureau.Current.ClassName
      $fils = $bureau.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
      "  descendants depuis le bureau : " + $fils.Count
      $k = 0; foreach ($f in $fils) { if ($k++ -ge 8) { break }; "    * " + $f.Current.ControlType.ProgrammaticName + " [" + $f.Current.Name + "]" }
    }
    $i = 0
    foreach ($e in $tous) { if ($i++ -ge 15) { break }; "  - " + $e.Current.ControlType.ProgrammaticName + " [" + $e.Current.Name + "] classe=" + $e.Current.ClassName + " horsecran=" + $e.Current.IsOffscreen + " cle=" + $e.Current.IsControlElement }
    $ctl = $racine.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
  } catch { "erreur UIA : " + $_.Exception.Message }
}`;
    const liste = await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(diag,'utf16le').toString('base64')],{encoding:'utf8',timeout:30000});
    throw new Error('Menu non détecté. '+liste.stdout.slice(0,3200)+' | lecture : '+JSON.stringify(avecMenu).slice(0,600));
  }
  assert.equal(avecMenu.menu_ouvert,true,JSON.stringify(avecMenu));
  const copier = avecMenu.elements.find(e=>e.nom==='Copier le texte');
  assert(copier && copier.zone==='menu ouvert' && Number.isFinite(copier.x),JSON.stringify(avecMenu));
  assert(avecMenu.elements.some(e=>e.nom==='Continuer' && !e.zone),'la fenêtre elle-même doit rester lue : '+JSON.stringify(avecMenu));
  console.log('OK Windows réel : menu Windows ouvert lu avec sa zone, fenêtre elle-même toujours lue.');
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
