// Régression de bout en bout : Chromium -> vraie route WS Python -> outils PC.
// L'OS Windows est simulé ; PowerShell/UIA doit aussi être vérifié sur Windows.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { chromium } from '@playwright/test';

const racine = resolve(import.meta.dirname, '..');
const backend = process.env.BACKEND_REPO || resolve(racine, '../classinus-backend');
const temporaire = await mkdtemp(join(tmpdir(), 'canal-pc-'));
const reserver = createServer();
await new Promise(r => reserver.listen(0, '127.0.0.1', r));
const portBackend = reserver.address().port;
await new Promise(r => reserver.close(r));
const api = `http://127.0.0.1:${portBackend}`;
const python = spawn(process.env.PYTHON || 'python', [join(backend, 'tests/serveur_canal_pc.py'), String(portBackend)], { stdio: 'inherit' });
let contexte, pont;
const serveur = createServer();
const attendre = async (fn, libelle) => {
  for (let i = 0; i < 100; i++) {
    try { if (await fn()) return; } catch { }
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error(`Délai dépassé : ${libelle}`);
};
const etat = async () => (await fetch(`${api}/test/etat`)).json();

const substituts = (modules) => ({
  name: 'frontieres-test',
  setup(b) {
    b.onResolve({ filter: /.*/ }, args => {
      if (args.path === "ws") return {path:require.resolve("ws"), external:true};
      const contenu = modules(args.path);
      if (contenu !== undefined) return { path: args.path, namespace: 'test', pluginData: contenu };
    });
    b.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.pluginData, loader: 'js' }));
  },
});

try {
  await attendre(async () => (await fetch(`${api}/test/etat`)).ok, 'serveur Python');
  const contexteCanal = ['pousserJournalDepuisAgent', 'mettreAJourJournalDepuisAgent', 'afficherReponseDepuisAgent', 'afficherTexteDepuisAgent', 'activerCanalDepuisAgent'].map(n => `export const ${n}=()=>null;`).join('\n') + '\nexport const obtenirConversationIdCanal=()=>null;';
  const bundle = await build({
    stdin: { contents: `import {initialiserCanalAgentApplicatif} from './lib/canalAgentApplicatif';
      import {lirePageVisible} from './lib/lecturePage';
      import {estDansFenetreSuperposition} from './lib/superpositionElectron';
      window.lirePageVisible=lirePageVisible; window.estDansFenetreSuperposition=estDansFenetreSuperposition;
      initialiserCanalAgentApplicatif();`, resolveDir: racine },
    bundle: true, write: false, format: 'iife',
    define: { 'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(api) },
    plugins: [substituts(p => {
      if (p.endsWith('/supabase') || p === './supabase') return `export const supabase={auth:{getSession:async()=>({data:{session:{access_token:'session-test'}}}),onAuthStateChange:()=>{}}};`;
      if (p === '@capacitor/core') return `export const Capacitor={getPlatform:()=>window.plateforme||'electron',isNativePlatform:()=>true}; export const registerPlugin=()=>({obtenirInfosAppareil:async()=>({appareilId:'pc-test'})});`;
      if (p.endsWith('contexteCanalEnDirect')) return contexteCanal;
      if (p.endsWith('contexteCurseurVirtuel')) return 'export const deplacerCurseurDepuisAgent=async()=>{};';
      if (p === './api') return 'export const appelerApiStream=async()=>{};';
    })],
  });
  const html = `<html><head><meta charset="utf-8"><title>Classinus test</title></head><body style="margin:0; height:100vh; overflow:hidden">
    <main><h1>Devoir de mathématiques</h1><p>Résoudre x + 2 = 5.</p><button>Ouvrir le cours</button><input value="réponse visible"><input type="password" value="SECRET-INTERDIT"></main>
    <aside data-agent-superposition="true" style="position:fixed;right:0;bottom:0"><button>Flottant un</button><button>Flottant deux</button><button>Flottant trois</button></aside>
    <script src="/bundle.js"></script></body></html>`;
  serveur.on('request', (req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('content-type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else { res.setHeader('content-type', 'text/html'); res.end(html); }
  });
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const site = `http://127.0.0.1:${serveur.address().port}`;
  contexte = await chromium.launchPersistentContext(join(temporaire, 'profil'), {
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: JSON.parse(process.env.CHROMIUM_ARGS || '[]'),
  });
  const page = contexte.pages()[0];
  await page.goto(site);
  await attendre(async () => (await etat()).actions.length > 0, 'scan initial');
  assert(!(await etat()).actions.some(a => a.description.includes('Flottant')));
  let lecture = await (await fetch(`${api}/test/lire-page`)).json();
  assert(lecture.texte.includes('Résoudre x + 2 = 5.'), JSON.stringify(lecture));
  assert(lecture.texte.includes('réponse visible'));
  assert(!lecture.texte.includes('SECRET-INTERDIT'));
  assert(!lecture.texte.includes('Flottant'));
  // Le renderer masqué garde sa connexion et répond encore aux lectures.
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  lecture = await (await fetch(`${api}/test/lire-page`)).json();
  assert(lecture.texte.includes('Devoir de mathématiques'));
  // Une superposition chargée avant son useEffect n'ouvre pas de WS.
  const miroir = await contexte.newPage();
  await miroir.goto(`${site}/agent-superposition.html`);
  assert(await miroir.evaluate(() => window.estDansFenetreSuperposition()));
  assert.deepEqual((await etat()).appareils, ['pc-test']);
  // Menu/dialogue réellement visible dans la page.
  await page.evaluate(() => { const dialogue = document.createElement('div'); dialogue.style='position:fixed;inset:0;background:white'; dialogue.innerHTML='<h2>Correction du devoir</h2><p>La réponse est 3.</p><button>Fermer la correction</button>'; document.body.append(dialogue); });
  lecture = await (await fetch(`${api}/test/lire-page`)).json();
  assert(lecture.texte.includes('La réponse est 3.'));

  // Plugin natif réel et lecteur réel, avec frontières Win32/nut-js simulées.
  const evenement = await import('node:events');
  globalThis.canalPcTest = {
    scripts: [], echouerNut: false, focus: true,
    lecture: { titre_fenetre_active: 'Devoir.txt — Bloc-notes', application: 'notepad', fenetre_classinus: false,
      fenetres_ouvertes: ['Calculatrice'], elements: [{type:'document',nom:'Zone de texte',valeur:'Bonjour depuis Windows',valeur_masquee:false,etats:[],x:320,y:240}], coupe:false,mode:'uia' },
    enfant: () => { const e = new evenement.EventEmitter(); e.unref=()=>{}; queueMicrotask(()=>e.emit('spawn')); return e; },
  };
  const native = join(temporaire, 'pont.mjs');
  await build({ entryPoints: [join(racine,'packages/capacitor-pont-natif-electron/electron/src/plugin.mts')], outfile:native, bundle:true, platform:'node',format:'esm',packages:'external',
    define: { 'process.platform': '"win32"' },
    plugins: [substituts(p => {
      if (p === 'electron') return `export const BrowserWindow={getAllWindows:()=>[{isDestroyed:()=>false,getTitle:()=>"classinus-superposition-agent",isFocused:()=>globalThis.canalPcTest.focus,getNativeWindowHandle:()=>Buffer.from([42,0,0,0,0,0,0,0])}]};`;
      if (p === '@capawesome/capacitor-electron/plugin') return `export class ElectronPlugin {context={notifyListeners(){}}}; export const defineElectronPlugin=(_,C)=>new C();`;
      if (p.startsWith('capacitor-dossiers-electron/')) return 'export const obtenirAppareilIdPc=()=>"pc-test";';
      if (p === 'node:child_process') return `export const spawn=()=>globalThis.canalPcTest.enfant(); export const execFile=(_,args,opts,cb)=>{const script=Buffer.from(args.at(-1),'base64').toString('utf16le');globalThis.canalPcTest.scripts.push(script); cb(null,JSON.stringify(globalThis.canalPcTest.lecture));};`;
      if (p === '@nut-tree-fork/nut-js') return `if(globalThis.canalPcTest.echouerNut) throw new Error('binding natif indisponible'); export const keyboard={type:async()=>{}}; export const mouse={setPosition:async()=>{},click:async()=>{}}; export class Point{}; export const Button={LEFT:0}; export const getActiveWindow=async()=>({getTitle:async()=>null});`;
    })],
  });
  pont = (await import(pathToFileURL(native).href)).PontNatif;
  await pont.enregistrerToken({token:'session-test',apiUrl:api});
  await attendre(async () => (await etat()).appareils.includes('pc-test-systeme'), 'canal système même backend');
  globalThis.canalPcTest.echouerNut = true;
  const ouverture = await (await fetch(`${api}/test/ouvrir`)).json();
  assert(ouverture.texte.includes('lancée'));
  const frappeEnErreur = await (await fetch(`${api}/test/taper`)).json();
  assert(frappeEnErreur.texte.includes('binding natif indisponible'));
  const ecran = await (await fetch(`${api}/test/lire-ecran`)).json();
  assert(ecran.texte.includes('Bonjour depuis Windows'));
  assert(ecran.texte.includes('(320, 240)'));
  assert(ecran.texte.includes('Calculatrice'));
  assert(globalThis.canalPcTest.scripts[0].includes('$handleSuperposition = [IntPtr]([long]42)'));
  // Une erreur du pilote clavier remonte, sans couper la lecture UIA ni perdre la réponse WS.
  assert(globalThis.canalPcTest.scripts[0].includes('if ($h -ne $handleSuperposition)'));
  await page.evaluate(() => { window.plateforme='web'; document.dispatchEvent(new Event('visibilitychange')); });
  await attendre(async()=> !(await etat()).appareils.includes('pc-test'), 'onglet web masqué fermé');
  await page.evaluate(() => { Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'}); document.dispatchEvent(new Event('visibilitychange')); });
  await attendre(async()=> (await etat()).appareils.includes('pc-test'), 'onglet web visible reconnecté');
  console.log('OK : page, champs, popup, exclusion du miroir, arrière-plan, canal natif, lecture Windows indépendante de nut-js, contenu transmis au modèle.');
} finally {
  await pont?.deconnexion();
  await contexte?.close();
  serveur.closeAllConnections();
  if (serveur.listening) await new Promise(r=>serveur.close(r));
  python.kill();
  await rm(temporaire, { recursive:true, force:true });
  delete globalThis.canalPcTest;
}
