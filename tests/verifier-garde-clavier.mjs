// Test de la garde du clavier (aucune touche ne doit rester enfoncée après un raccourci).
// Module pur : tourne sur n'importe quel système, sans Windows ni nut-js.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-garde-'));
try {
  const sortie = join(dossier, 'garde.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src/gardeClavier.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { creerGardeClavier } = await import(pathToFileURL(sortie).href);

  const CTRL = 1, SHIFT = 2, ALT = 3, C = 4, TAB = 5;

  // Faux clavier : suit les touches réellement enfoncées, avec des pannes réglables.
  function fauxClavier({ echecAppui = () => null, echecRelache = () => null, bloquerAppui = () => false } = {}) {
    const etat = { enfoncees: new Set(), journal: [] };
    return {
      etat,
      pressKey: async (t) => {
        if (bloquerAppui(t)) return new Promise(() => {});
        const e = echecAppui(t); if (e) throw new Error(e);
        etat.enfoncees.add(t); etat.journal.push(`+${t}`);
      },
      releaseKey: async (t) => {
        const e = echecRelache(t); if (e) throw new Error(e);
        etat.enfoncees.delete(t); etat.journal.push(`-${t}`);
      },
    };
  }
  const opts = { delaiOperationMs: 50, pauseMs: 0 };

  // 1. Cas normal : appui dans l'ordre, relâchement dans l'ordre inverse.
  {
    const k = fauxClavier(); const g = creerGardeClavier(k, opts);
    assert.deepEqual(await g.combinaison([CTRL, C]), { ok: true });
    assert.deepEqual(k.etat.journal, ['+1', '+4', '-4', '-1']);
    assert.equal(k.etat.enfoncees.size, 0);
  }

  // 2. Erreur pendant l'appui de la 3e touche : les deux modificateurs sont relâchés.
  {
    const k = fauxClavier({ echecAppui: (t) => (t === TAB ? 'panne' : null) }); const g = creerGardeClavier(k, opts);
    const r = await g.combinaison([CTRL, ALT, TAB]);
    assert.equal(r.ok, false); assert.equal(r.erreur, 'panne');
    assert.equal(k.etat.enfoncees.size, 0);
  }

  // 3. Un relâchement échoue une fois puis réussit : nouvel essai, rien ne reste enfoncé.
  {
    let n = 0;
    const k = fauxClavier({ echecRelache: (t) => (t === CTRL && n++ === 0 ? 'panne unique' : null) }); const g = creerGardeClavier(k, opts);
    assert.deepEqual(await g.combinaison([CTRL, C]), { ok: true });
    assert.equal(k.etat.enfoncees.size, 0);
  }

  // 4. Le relâchement de Ctrl échoue toujours : Maj et Alt sont quand même relâchés,
  //    et l'erreur signale que Ctrl est peut-être resté enfoncé.
  {
    const k = fauxClavier({ echecRelache: (t) => (t === CTRL ? 'bloqué' : null) }); const g = creerGardeClavier(k, opts);
    const r = await g.combinaison([CTRL, SHIFT, ALT, C]);
    assert.equal(r.ok, false); assert.deepEqual(r.touchesPeutEtreEnfoncees, [CTRL]);
    assert.deepEqual([...k.etat.enfoncees], [CTRL]);
  }

  // 5. Un appui qui ne répond jamais est abandonné, et la touche est relâchée.
  {
    const k = fauxClavier({ bloquerAppui: (t) => t === C }); const g = creerGardeClavier(k, opts);
    const r = await g.combinaison([CTRL, C]);
    assert.equal(r.ok, false);
    assert.equal(k.etat.enfoncees.size, 0);
  }

  // 6. Deux raccourcis demandés en même temps ne s'entremêlent pas.
  {
    const k = fauxClavier(); const g = creerGardeClavier(k, opts);
    await Promise.all([g.combinaison([CTRL, C]), g.combinaison([ALT, TAB])]);
    assert.deepEqual(k.etat.journal, ['+1', '+4', '-4', '-1', '+3', '+5', '-5', '-3']);
  }

  // 7. Une touche restée enfoncée par un échec précédent est relâchée avant l'action suivante.
  {
    let panne = true;
    const k = fauxClavier({ echecRelache: (t) => (panne && t === SHIFT ? 'bloqué' : null) }); const g = creerGardeClavier(k, opts);
    await g.combinaison([SHIFT, C]);
    assert.deepEqual([...k.etat.enfoncees], [SHIFT]);
    panne = false;
    assert.deepEqual(await g.combinaison([CTRL, C]), { ok: true });
    assert.equal(k.etat.enfoncees.size, 0);
  }

  // 8. Relâchement d'urgence (fermeture de l'appli) : tout part tout de suite.
  {
    const k = fauxClavier({ bloquerAppui: (t) => t === C }); const g = creerGardeClavier(k, { ...opts, delaiOperationMs: 5000 });
    void g.combinaison([CTRL, SHIFT, C]);
    await new Promise((r) => setTimeout(r, 20));
    assert.deepEqual([...k.etat.enfoncees].sort(), [CTRL, SHIFT]);
    await g.relacherToutEnUrgence();
    assert.equal(k.etat.enfoncees.size, 0);
  }

  console.log('Garde du clavier : tous les tests passent.');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
