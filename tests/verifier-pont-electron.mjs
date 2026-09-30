// Vrai runtime Electron, vrai preload Capacitor et vrai plugin PontNatif.
// Seule la session Supabase est remplacée : aucun compte utilisateur requis.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const { WebSocketServer } = require('ws');
const racine = resolve(import.meta.dirname, '..');
const temporaire = await mkdtemp(join(tmpdir(), 'classinus-electron-'));
const serveur = new WebSocketServer({ host: '127.0.0.1', port: 0 });
await new Promise(r => serveur.once('listening', r));
const api = `http://127.0.0.1:${serveur.address().port}`;
let enfant;
let fenetreWindows;
const titreExterne = `Fenêtre externe PC ${process.pid}`;
let sorties = '';
const messages = [];
let demandesNatives = 0;
let connexionRenderer;
serveur.on('connection', ws => ws.on('message', brut => {
  const message = JSON.parse(brut);
  messages.push(message);
  if (message.auth_token && message.actions_systeme_via_renderer) {
    connexionRenderer = ws;
    demandesNatives++;
    setTimeout(() => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ id: 'lecture-native', action_systeme: 'lire_ecran', parametres: {}, via_renderer: true }));
    }, 1000);
  }
}));
const attendre = async fn => {
  for (let i = 0; i < 200; i++) {
    if (fn()) return;
    if (enfant?.exitCode !== null && enfant?.exitCode !== undefined) throw new Error(sorties);
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`Le pont Electron ne répond pas. Messages : ${JSON.stringify(messages)}\n${sorties}`);
};
try {
  if (process.platform === 'win32') {
    const script = `
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object Windows.Forms.Form
$f.Text='${titreExterne}'; $f.Width=600; $f.Height=400
$label=New-Object Windows.Forms.Label
$label.Text='Contenu externe visible par le pont'; $label.Width=450; $label.Left=20; $label.Top=20
$f.Controls.Add($label)
$f.Add_Shown({[System.IO.File]::WriteAllText('${join(temporaire,'fenetre-prete').replaceAll("'","''")}', 'ok')})
[void]$f.ShowDialog()
`;
    await writeFile(join(temporaire,'fenetre.ps1'),'\uFEFF'+script);
    fenetreWindows = spawn('powershell.exe',['-NoProfile','-STA','-ExecutionPolicy','Bypass','-File',join(temporaire,'fenetre.ps1')],{stdio:'inherit'});
    for(let i=0;i<100;i++) {
      try { await readFile(join(temporaire,'fenetre-prete')); break; } catch {
        if(i===99) throw new Error('La fenêtre Windows de test ne démarre pas.');
        await new Promise(r=>setTimeout(r,100));
      }
    }
  }
  await mkdir(join(temporaire, 'generated'));
  await mkdir(join(temporaire, 'app'));
  const paquets = ['capacitor-dossiers-electron', 'capacitor-pont-natif-electron', 'capacitor-superposition-electron'];
  const plugins = paquets.map(packageName => ({ packageName, specifier: `${packageName}/electron/dist/plugin.mjs` }));
  await writeFile(join(temporaire, 'generated/capacitor.config.json'), '{}');
  await writeFile(join(temporaire, 'generated/plugin-manifest.json'), JSON.stringify({ platformVersion: '0.1.1', plugins }));
  await writeFile(join(temporaire, 'generated/plugins.mjs'), `export const plugins = {${paquets.map(p => `${JSON.stringify(p)}: () => import(${JSON.stringify(pathToFileURL(join(racine, 'packages', p, 'electron/dist/plugin.mjs')).href)})`).join(',')}};`);
  await writeFile(join(temporaire, 'package.json'), JSON.stringify({ name: 'classinus-pont-test', main: 'main.cjs' }));
  await writeFile(join(temporaire, 'main.cjs'), `
    const {app,BrowserWindow,screen} = require('electron');
    app.setPath('userData', ${JSON.stringify(join(temporaire, 'profil'))});
    const {createCapacitorElectronApp} = require(${JSON.stringify(require.resolve('@capawesome/capacitor-electron'))});
    const runtime = createCapacitorElectronApp({singleInstance:false, window:{showOnLaunch:${process.platform === 'win32'},statePersistence:false},
      csp:{policy:"default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' http: ws:"},
      hooks:{onWindowCreated:w=>{w.webContents.on('console-message',e=>console.log(e.message));}}
    });
    runtime.whenReady.catch(e=>{console.error(e);app.exit(1);});
    runtime.whenReady.then(async()=>{
      const w=runtime.getMainWindow();
      if(process.platform==='win32'){w.show();w.focus();console.log('FOCUS_CLASSINUS',w.isFocused());}
      const depart=screen.getCursorScreenPoint();
      const zone=screen.getPrimaryDisplay().bounds;
      const miroir=new BrowserWindow({title:'classinus-superposition-agent',...zone,show:false,frame:false,transparent:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,preload:require.resolve('@capawesome/capacitor-electron/preload',{paths:[${JSON.stringify(join(racine,'node_modules'))}]})}});
      miroir.setIgnoreMouseEvents(true,{forward:true});
      miroir.webContents.on('page-title-updated',e=>e.preventDefault());
      miroir.webContents.on('console-message',e=>{
        console.log(e.message);
        if(e.message.startsWith('POINTAGE_AFFICHE')) console.log('POINTEUR_WINDOWS_INCHANGE',JSON.stringify(depart)===JSON.stringify(screen.getCursorScreenPoint()));
      });
      await miroir.loadURL(new URL('miroir.html',w.webContents.getURL()).href);
      await new Promise(r=>setTimeout(r,100));
      await w.webContents.executeJavaScript('window.preparerTestPointage()');
      console.log('MIROIR_PRET');
    });
  `);
  const bundle = await build({
    stdin: { contents: `import './lib/supabase'; import {Capacitor,registerPlugin} from '@capacitor/core';
      console.log('PLATEFORME',Capacitor.getPlatform());
      window.preparerTestPointage=()=>registerPlugin('SuperpositionAgent').pousserEtat({curseur:{x:200,y:150,echelle:1,visible:true,forme:'defaut',enAction:false,repere:'page'},canal:{actif:true}});`, resolveDir: racine },
    bundle: true, write: false, format: 'iife',
    define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify('https://supabase.invalid'),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify('session-test'),
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(api),
    },
    plugins: [{ name: 'session-test', setup(b) {
      b.onResolve({ filter: /^(\.\/canalTempsReel|.*contexteCanalEnDirect|.*contexteCurseurVirtuel|\.\/api)$/ }, a => ({ path: a.path, namespace: 'session-test' }));
      b.onLoad({ filter: /.*/, namespace: 'session-test' }, a => ({ loader: 'js', contents:
        a.path.endsWith('contexteCanalEnDirect')
          ? ['pousserJournalDepuisAgent','mettreAJourJournalDepuisAgent','afficherReponseDepuisAgent','afficherTexteDepuisAgent','activerCanalDepuisAgent','obtenirConversationIdCanal'].map(n=>`export const ${n}=()=>null;`).join('\n')
          : a.path.endsWith('contexteCurseurVirtuel') ? 'export const deplacerCurseurDepuisAgent=async()=>{};'
          : a.path === './api' ? 'export const appelerApiStream=async()=>{};'
          : `export const initialiserCanalTempsReel=()=>{};export const enregistrerPluginDossiers=()=>{};`,
      }));
    }}],
  });
  await writeFile(join(temporaire, 'app/bundle.js'), bundle.outputFiles[0].text);
  const miroirBundle=await build({stdin:{contents:`
    import {ecouterEtatSuperposition} from './lib/superpositionElectron';
    ecouterEtatSuperposition(etat=>{
      const c=document.getElementById('curseur');c.style.left=etat.curseur.x+'px';c.style.top=etat.curseur.y+'px';
      if(etat.pointageId) console.log('POINTAGE_AFFICHE',etat.curseur.x,etat.curseur.y);
    });`,resolveDir:racine},bundle:true,write:false,format:'iife',plugins:[{name:'etat-canal-test',setup(b){
      b.onResolve({filter:/contexteCanalEnDirect$/},a=>({path:a.path,namespace:'etat-canal-test'}));
      b.onResolve({filter:/canalAgentApplicatif$/},a=>({path:a.path,namespace:'etat-canal-test'}));
      b.onLoad({filter:/.*/,namespace:'etat-canal-test'},a=>({loader:'js',contents:a.path.endsWith('canalAgentApplicatif') ? 'export const envoyerMessageEtudiant=()=>{};' : ['pousserJournalDepuisAgent','mettreAJourJournalDepuisAgent','afficherTexteDepuisAgent'].map(n=>`export const ${n}=()=>null;`).join('\n')}));
    }}]});
  await writeFile(join(temporaire,'app/miroir.js'),miroirBundle.outputFiles[0].text);
  await writeFile(join(temporaire,'app/miroir.html'),`<html><head><title>classinus-superposition-agent</title></head><body style="background:transparent"><div id="curseur" style="position:fixed;width:20px;height:20px;background:orange"></div><script src="miroir.js"></script></body></html>`);
  const session = {access_token:'session-test',refresh_token:'refresh-test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:'pc-test'}};
  await writeFile(join(temporaire, 'app/index.html'), `<!doctype html><html><head><title>Classinus</title></head><body><script>localStorage.setItem('sb-supabase-auth-token',${JSON.stringify(JSON.stringify(session))});</script><script src="bundle.js"></script></body></html>`);
  enfant = spawn(require('electron'), ['--no-sandbox', temporaire], { stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', b => { sorties += b; });
  enfant.stderr.on('data', b => { sorties += b; });
  await attendre(() => messages.some(m => m.id === 'lecture-native' && 'resultat' in m));
  assert(messages.some(m => m.auth_token === 'session-test' && m.appareil_id.endsWith('-systeme')));
  assert(messages.some(m => m.auth_token === 'session-test' && m.actions_systeme_via_renderer === true && !m.appareil_id.endsWith('-systeme')));
  assert.equal(demandesNatives,1,'La demande native ne doit pas être dupliquée.');
  if (process.platform === 'win32') {
    const lecture = messages.find(m=>m.id==='lecture-native').resultat;
    assert.equal(lecture.titre_fenetre_active,titreExterne,JSON.stringify(lecture));
    assert.equal(lecture.fenetre_classinus,false,JSON.stringify(lecture));
    assert(lecture.elements.some(e=>e.nom.includes('Contenu externe visible par le pont')),JSON.stringify(lecture));
    assert(sorties.includes('FOCUS_CLASSINUS true'),sorties);
    console.log('OK Windows : Classinus a le focus, lire_ecran lit le texte de la fenêtre externe derrière lui.');
  }
  assert(sorties.includes('PLATEFORME electron'), sorties);
  await attendre(()=>sorties.includes('MIROIR_PRET'));
  // Même WS et même IPC que lire_ecran ; l'arrivée doit être confirmée par le miroir réel.
  connexionRenderer.send(JSON.stringify({id:'pointage-natif',action_systeme:'pointer_ecran',parametres:{x:320,y:240},via_renderer:true}));
  await attendre(()=>messages.some(m=>m.id==='pointage-natif'&&'resultat' in m));
  assert.deepEqual(messages.find(m=>m.id==='pointage-natif').resultat,{succes:true});
  assert(sorties.includes('POINTAGE_AFFICHE'),sorties);
  assert(sorties.includes('POINTEUR_WINDOWS_INCHANGE true'),sorties);
  console.log('OK : session Supabase -> canal applicatif -> IPC Capacitor -> plugin Electron -> réponse lire_ecran, sans demande sur la seconde connexion.');
} finally {
  if (enfant && enfant.exitCode === null) {
    const ferme = new Promise(r => enfant.once('exit', r));
    enfant.kill();
    await ferme;
  }
  if (fenetreWindows && fenetreWindows.exitCode === null) {
    const ferme = new Promise(r=>fenetreWindows.once('exit',r));
    fenetreWindows.kill();
    await ferme;
  }
  for (const ws of serveur.clients) ws.terminate();
  await new Promise(r => serveur.close(r));
  await rm(temporaire, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
