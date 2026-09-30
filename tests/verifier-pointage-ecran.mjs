// Frontières Electron/React simulées ; le plugin et la trajectoire sont réels.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const racine = resolve(import.meta.dirname, '..');
const temporaire = await mkdtemp(join(tmpdir(), 'pointage-'));
const etat = globalThis.testPointage = {
  bornes: { x: 100, y: 80 }, origine: { x: -1280, y: -100 },
  zoom: 1.25, zoomSuperposition: 1, notifications: [],
};
const substitutions = modules => ({ name: 'frontieres', setup(b) {
  b.onResolve({filter: /.*/}, a => modules[a.path] === undefined ? undefined : {path: a.path, namespace: 'test'});
  b.onLoad({filter: /.*/, namespace: 'test'}, a => ({contents: modules[a.path], loader: 'js'}));
}});
try {
  const natif = join(temporaire, 'natif.mjs');
  await build({ entryPoints: [join(racine, 'packages/capacitor-superposition-electron/electron/src/plugin.mts')], outfile: natif, bundle: true, format: 'esm', platform: 'node',
    define: {'process.platform': '"win32"'}, plugins: [substitutions({
      'electron': `const t=globalThis.testPointage;
        export const BrowserWindow={getAllWindows:()=>[
          {getTitle:()=>"Classinus",isDestroyed:()=>false,getContentBounds:()=>t.bornes,webContents:{getZoomFactor:()=>t.zoom}},
          {getTitle:()=>"classinus-superposition-agent",isDestroyed:()=>false,showInactive:()=>{},hide:()=>{},getContentBounds:()=>t.origine,webContents:{getZoomFactor:()=>t.zoomSuperposition}}
        ]};
        export const screen={screenToDipPoint:p=>({x:p.x/1.5,y:p.y/1.5}),getAllDisplays:()=>[{bounds:{x:-1280,y:-100,width:3200,height:1180}}]};`,
      '@capawesome/capacitor-electron/plugin': `export class ElectronPlugin{context={notifyListeners:(nom,etat)=>globalThis.testPointage.notifications.push({nom,etat})}}; export const defineElectronPlugin=(_,C)=>new C();`,
    })] });
  const { SuperpositionAgent: pont, pointerCurseurEcran } = await import(pathToFileURL(natif).href);
  const points = await pont.preparerDeplacement({depart:{x:40,y:80},repereDepart:'page',cible:{x:900,y:600},repereCible:'ecran'});
  assert.deepEqual(points, {depart:{x:150,y:180},cible:{x:600,y:400}});
  await pont.pousserEtat({curseur:{...points.cible,repere:'ecran',visible:true}});
  assert.deepEqual(etat.notifications.at(-1).etat.curseur, {x:1880,y:500,repere:'ecran',visible:true});
  etat.bornes = {x:800,y:250};
  await pont.pousserEtat({curseur:{...points.cible,repere:'ecran',visible:true}});
  assert.equal(etat.notifications.at(-1).etat.curseur.x,1880); // fenêtre déplacée : curseur fixe
  assert.deepEqual(await pont.preparerDeplacement({depart:points.cible,repereDepart:'ecran',cible:{x:20,y:30},repereCible:'page'}), {depart:{x:-160,y:120},cible:{x:20,y:30}});
  await assert.rejects(pont.preparerDeplacement({depart:points.cible,repereDepart:'ecran',cible:{x:NaN,y:10},repereCible:'ecran'}));
  await assert.rejects(pont.preparerDeplacement({depart:points.cible,repereDepart:'ecran',cible:{x:100000,y:10},repereCible:'ecran'}));
  await pont.envoyerInteraction({fonction:'deposerCurseur',args:[1880,500]});
  assert.deepEqual(etat.notifications.at(-1).etat.args,[600,400]);
  assert.equal(etat.notifications.at(-1).etat.repere,'ecran');
  // Un curseur au repos ne suit pas la fenêtre, même après minimisation Windows.
  await pont.pousserEtat({curseur:{x:40,y:80,repere:'page',visible:true}});
  const repos = {...etat.notifications.at(-1).etat.curseur};
  etat.bornes = {x:-32000,y:-32000};
  await pont.pousserEtat({curseur:{x:40,y:80,repere:'page',visible:true}});
  assert.deepEqual(etat.notifications.at(-1).etat.curseur,repos);
  await pont.pousserEtat({curseur:{x:50,y:90,repere:'page',visible:true}});
  assert.deepEqual(etat.notifications.at(-1).etat.curseur,repos);
  await pont.pousserEtat({curseur:{x:NaN,y:Infinity,repere:'ecran',visible:true}});
  assert.deepEqual(etat.notifications.at(-1).etat.curseur,{...repos,repere:'ecran'});
  etat.bornes = {x:800,y:250};
  // Renderer principal sans requestAnimationFrame : le trajet doit quand même finir.
  globalThis.requestAnimationFrame = () => { throw new Error('RAF principal suspendu'); };
  await pont.pousserEtat({curseur:{x:600,y:400,repere:'ecran',visible:true},canal:{actif:true}});
  let pointageTermine=false;
  const confirmer=setInterval(()=>{
    const dernier=etat.notifications.findLast(n=>n.nom==='etat'&&n.etat.pointageId);
    if(dernier) { void pont.accuserPointage({id:dernier.etat.pointageId}); }
  },10);
  try {
    assert.deepEqual(await pointerCurseurEcran({x:1298,y:52}),{succes:true});
    pointageTermine=true;
  } finally {clearInterval(confirmer);delete globalThis.requestAnimationFrame;}
  assert(pointageTermine);
  const arrivee=etat.notifications.findLast(n=>n.nom==='etat'&&n.etat.pointageId);
  assert(Math.abs(arrivee.etat.curseur.x-(1298/1.5+1280))<0.001);
  assert.equal(etat.notifications.at(-1).etat.repere,'ecran');
  await assert.rejects(pointerCurseurEcran({x:900,y:600}),/confirmé/); // sans réponse du miroir : jamais un faux succès
  etat.pont = pont;
  const contexte = join(temporaire,'contexte.mjs');
  await build({entryPoints:[join(racine,'lib/contexteCurseurVirtuel.tsx')],outfile:contexte,bundle:true,format:'esm',platform:'node',plugins:[substitutions({
    'react': `export const createContext=()=>({});export const useCallback=f=>f;export const useContext=()=>null;export const useRef=v=>({current:v});export const useState=v=>[v,()=>{}];`,
    'framer-motion': `export const useMotionValue=v=>({get:()=>v,set:n=>{v=n}});export const animate=(_a,_b,o)=>{globalThis.testPointage.dernierUpdate=o.onUpdate;o.onUpdate?.(1);const p=Promise.resolve();p.stop=()=>{globalThis.testPointage.animationArretee=true};return p;};`,
    '@capacitor/core': `export const Capacitor={getPlatform:()=>"electron"};export const registerPlugin=()=>globalThis.testPointage.pont;`,
  })]});
  globalThis.window = {innerWidth:800,innerHeight:600};
  globalThis.HTMLElement = class {};
  const {useFournirCurseurVirtuel}=await import(pathToFileURL(contexte).href);
  const curseur=useFournirCurseurVirtuel();
  await curseur.deplacerVers({x:900,y:600},{repere:'ecran',cliquer:false});
  assert.equal(curseur.repere.get(),'ecran');
  assert.equal(curseur.x.get(),600); assert.equal(curseur.y.get(),400);
  await curseur.deplacerVers({x:20,y:30});
  assert.equal(curseur.repere.get(),'page');
  assert.equal(curseur.x.get(),20); assert.equal(curseur.y.get(),30);
  curseur.deposerPoint({x:700,y:500},'ecran');
  etat.dernierUpdate(0.5); // une ancienne animation ne doit pas écraser le dépôt.
  curseur.afficher();
  assert(etat.animationArretee);
  assert.equal(curseur.repere.get(),'ecran');
  assert.equal(curseur.x.get(),700); assert.equal(curseur.y.get(),500);
  console.log('OK : DPI 150 %, zoom, écrans à origine négative, fenêtre déplacée/minimisée, position invalide ignorée, dépôt préservé contre une ancienne animation. Aucun pilote souris chargé.');
} finally {
  delete globalThis.testPointage; delete globalThis.window; delete globalThis.HTMLElement;
  await rm(temporaire,{recursive:true,force:true});
}
