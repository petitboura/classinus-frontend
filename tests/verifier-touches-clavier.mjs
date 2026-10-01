// Test de la conversion des raccourcis clavier (canal en direct PC, outil appuyer_touches).
// Module pur : tourne sur n'importe quel systeme, sans Windows ni nut-js.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-touches-'));
try {
  const sortie = join(dossier, 'touches.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src/touchesClavier.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { analyserTouches, libelleCombinaison } = await import(pathToFileURL(sortie).href);
  const ok = (texte, attendu) => assert.deepEqual(analyserTouches(texte), { ok: true, combinaisons: attendu }, texte);
  const ko = (entree, morceau) => { const r = analyserTouches(entree); assert.equal(r.ok, false, String(entree)); assert(r.erreur.includes(morceau), r.erreur); };

  ok('ctrl+c', [['LeftControl', 'C']]);
  ok('Ctrl+Shift+Esc', [['LeftControl', 'LeftShift', 'Escape']]);
  ok('alt+tab', [['LeftAlt', 'Tab']]);
  ok('win+d', [['LeftSuper', 'D']]);
  ok('enter', [['Enter']]);
  ok('échap', [['Escape']]);
  ok('f5', [['F5']]);
  ok('F12', [['F12']]);
  ok('ctrl+1', [['LeftControl', 'Num1']]);
  ok('ctrl+a ctrl+c', [['LeftControl', 'A'], ['LeftControl', 'C']]);
  ok('c+ctrl', [['LeftControl', 'C']]); // modificateur toujours enfonce en premier
  ok('ctrl++', [['LeftControl', 'Add']]);
  ok('suppr', [['Delete']]);
  // Refus : jamais de touche devinee.
  ko('fleche', 'fleche');
  ko('ctrl+zz', 'zz');
  ko('', 'manquant');
  ko('   ', 'manquant');
  ko(undefined, 'manquant');
  ko(42, 'manquant');
  ko('ctrl+shift+alt+win+a+b', 'trop longue');
  ko(Array(11).fill('a').join(' '), 'trop de combinaisons');
  ok(Array(10).fill('a').join(' '), Array(10).fill(['A']));

  assert.equal(libelleCombinaison(['LeftControl', 'C']), 'Ctrl+C');
  assert.equal(libelleCombinaison(['LeftAlt', 'Tab']), 'Alt+Tab');
  assert.equal(libelleCombinaison(['LeftSuper', 'Num1']), 'Windows+1');
  assert.equal(libelleCombinaison(['Escape']), 'Échap');
  console.log('OK touches clavier : raccourcis, touches seules et séquences converties ; touche inconnue et abus refusés.');
} catch (e) {
  console.log(`::error title=Echec du test des touches clavier::${String(e.stack || e).slice(0, 1500).replaceAll('%','%25').replaceAll('\n','%0A')}`);
  throw e;
} finally { await rm(dossier, { recursive: true, force: true }); }
