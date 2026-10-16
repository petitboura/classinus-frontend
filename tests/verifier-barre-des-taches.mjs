// Le curseur de Clovis ne doit jamais se placer au niveau de la barre des taches (elle le cache),
// et la zone utile de l'ecran est envoyee a la bulle (16/10/2026, demande de Bourama).
// Frontieres Electron simulees ; le plugin est reel.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const racine = resolve(import.meta.dirname, '..');
const temporaire = await mkdtemp(join(tmpdir(), 'barre-taches-'));
const ecran = globalThis.testBarre = {
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  workArea: { x: 0, y: 0, width: 1920, height: 1040 },
  notifications: [],
};
const substitutions = modules => ({ name: 'frontieres', setup(b) {
  b.onResolve({filter: /.*/}, a => modules[a.path] === undefined ? undefined : {path: a.path, namespace: 'test'});
  b.onLoad({filter: /.*/, namespace: 'test'}, a => ({contents: modules[a.path], loader: 'js'}));
}});
try {
  const natif = join(temporaire, 'natif.mjs');
  await build({ entryPoints: [join(racine, 'packages/capacitor-superposition-electron/electron/src/plugin.mts')], outfile: natif, bundle: true, format: 'esm', platform: 'node',
    define: {'process.platform': '"win32"'}, plugins: [substitutions({
      'electron': `const t=globalThis.testBarre;
        const fenetre=(titre)=>({getTitle:()=>titre,isDestroyed:()=>false,isVisible:()=>true,showInactive:()=>{},hide:()=>{},setFocusable:()=>{},setSkipTaskbar:()=>{},setIgnoreMouseEvents:()=>{},focus:()=>{},isFocused:()=>false,on:()=>{},
          getContentBounds:()=>({x:0,y:0,width:1920,height:1080}),webContents:{getZoomFactor:()=>1,isLoading:()=>false}});
        const fenetres=[fenetre("Classinus"),fenetre("classinus-superposition-agent")];
        export const app={on:()=>{},isPackaged:false,getLoginItemSettings:()=>({openAtLogin:false}),setLoginItemSettings:()=>{}};
        export const globalShortcut={register:()=>true,unregister:()=>{},unregisterAll:()=>{},isRegistered:()=>false};
        export const BrowserWindow={getAllWindows:()=>fenetres};
        export const screen={screenToDipPoint:p=>p,
          getAllDisplays:()=>[{bounds:t.bounds,workArea:t.workArea}],
          getDisplayNearestPoint:()=>({bounds:t.bounds,workArea:t.workArea}),
          getCursorScreenPoint:()=>({x:0,y:0})};`,
      '@capawesome/capacitor-electron/plugin': `export class ElectronPlugin{context={notifyListeners:(nom,etat)=>globalThis.testBarre.notifications.push({nom,etat})}}; export const defineElectronPlugin=(_,C)=>new C();`,
    })] });
  const { SuperpositionAgent: pont } = await import(pathToFileURL(natif).href);

  const pousser = async (x, y) => {
    await pont.pousserEtat({ curseur: { x, y, repere: 'ecran', visible: true }, canal: { actif: true } });
    return ecran.notifications.findLast(n => n.nom === 'etat').etat;
  };

  // Barre des taches en bas (40 px) : le curseur s'arrete juste au dessus.
  let etat = await pousser(500, 1060);
  assert.equal(etat.curseur.x, 500);
  assert.equal(etat.curseur.y, 1040 - 28, 'curseur sur la barre du bas : ramene juste au dessus');
  assert.deepEqual(etat.zoneUtile, { gauche: 0, haut: 0, droite: 1920, bas: 1040 });

  // Ailleurs sur l'ecran, rien ne change, bords compris (boutons de fenetre en haut a droite).
  etat = await pousser(500, 300);
  assert.deepEqual([etat.curseur.x, etat.curseur.y], [500, 300]);
  etat = await pousser(1915, 5);
  assert.deepEqual([etat.curseur.x, etat.curseur.y], [1915, 5]);
  // Juste au dessus de la limite : inchange.
  etat = await pousser(700, 1000);
  assert.deepEqual([etat.curseur.x, etat.curseur.y], [700, 1000]);

  // Un glissement fait par l'etudiant ne peut pas non plus deposer le curseur sur la barre.
  await pont.envoyerInteraction({ fonction: 'deposerCurseur', args: [600, 1070] });
  const depose = ecran.notifications.findLast(n => n.nom === 'interaction').etat;
  assert.deepEqual(depose.args, [600, 1040 - 28]);

  // Barre a droite.
  ecran.workArea = { x: 0, y: 0, width: 1880, height: 1080 };
  etat = await pousser(1900, 500);
  assert.deepEqual([etat.curseur.x, etat.curseur.y], [1880 - 28, 500]);
  assert.deepEqual(etat.zoneUtile, { gauche: 0, haut: 0, droite: 1880, bas: 1080 });

  // Barre a gauche.
  ecran.workArea = { x: 40, y: 0, width: 1880, height: 1080 };
  etat = await pousser(10, 500);
  assert.deepEqual([etat.curseur.x, etat.curseur.y], [44, 500]);

  // Barre en haut.
  ecran.workArea = { x: 0, y: 40, width: 1920, height: 1040 };
  etat = await pousser(800, 10);
  assert.deepEqual([etat.curseur.x, etat.curseur.y], [800, 44]);

  // Pas de barre (masquee automatiquement) : zone utile = ecran entier, aucun changement.
  ecran.workArea = { ...ecran.bounds };
  etat = await pousser(500, 1075);
  assert.deepEqual([etat.curseur.x, etat.curseur.y], [500, 1075]);

  console.log('OK : curseur hors barre des taches (bas, droite, gauche, haut), zone utile envoyee a la bulle');
} finally {
  await rm(temporaire, { recursive: true, force: true });
}

// Le plugin garde des minuteurs (suivi de la souris) : on termine explicitement.
process.exit(0);
