import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-clic-test-'));
try {
  const sortie = join(dossier, 'clic.mjs');
  await build({entryPoints:[resolve(import.meta.dirname,'../packages/capacitor-pont-natif-electron/electron/src/clicEcran.mts')],outfile:sortie,bundle:true,platform:'node',format:'esm'});
  const {cliquerEcran, ANNONCE_CURSEUR_REEL} = await import(pathToFileURL(sortie).href);
  const traces=[];
  const operations={
    pointer:async()=>traces.push('pointer'),
    accessibilite:async()=>({statut:'effectue',action:'Invoke'}),
    annoncer:async texte=>{assert.equal(texte,ANNONCE_CURSEUR_REEL);traces.push('annonce affichée');},
    souris:async()=>traces.push('souris'),
  };
  assert.deepEqual(await cliquerEcran({x:120,y:80},operations),{ok:true,mode:'accessibilite',action:'Invoke',curseur_reel_utilise:false});
  assert.deepEqual(traces,['pointer']);
  traces.length=0;
  operations.accessibilite=async()=>({statut:'indisponible',raison:'Pas de contrôle accessible'});
  assert.equal((await cliquerEcran({x:120,y:80},operations)).mode,'souris');
  assert.deepEqual(traces,['pointer','annonce affichée','souris']); // aucune demande de validation.
  traces.length=0;
  operations.annoncer=async()=>{throw new Error('Annonce non affichée');};
  await assert.rejects(cliquerEcran({x:120,y:80},operations),/Annonce non affichée/);
  assert.deepEqual(traces,['pointer']);
  traces.length=0;
  operations.accessibilite=async()=>({statut:'incertain',raison:'Invocation commencée puis délai dépassé'});
  assert((await cliquerEcran({x:120,y:80},operations)).erreur);
  assert.deepEqual(traces,['pointer']); // aucune deuxième action après un clic possiblement effectué.
  traces.length=0;
  assert((await cliquerEcran({x:NaN,y:80},operations)).erreur);
  assert.deepEqual(traces,[]);
  console.log('OK : clic indépendant, repli après annonce sans validation, annonce absente et résultat incertain sans double clic.');
} finally { await rm(dossier,{recursive:true,force:true}); }
