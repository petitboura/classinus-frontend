// Test des raccourcis du crayon du canal PC (touches prises seulement canal actif, une
// touche refusée n'empêche pas les autres). Module pur : tourne sur n'importe quel système,
// sans Electron.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-crayon-'));
try {
  const sortie = join(dossier, 'raccourcis.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-superposition-electron/electron/src/raccourcisCrayon.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { creerRaccourcisCrayon } = await import(pathToFileURL(sortie).href);

  const TOUCHES = { basculer: 'CommandOrControl+Shift+Y', rappeler: 'CommandOrControl+Shift+U', effacer: 'CommandOrControl+Shift+L' };

  // Faux raccourci système : garde les touches prises et leur rappel.
  function fauxRaccourci({ refuser = [], lever = false } = {}) {
    const etat = { prises: new Map(), enregistrements: 0, liberations: 0 };
    return {
      etat,
      register(touche, rappel) {
        if (lever) throw new Error('boom');
        if (refuser.includes(touche)) return false;
        etat.prises.set(touche, rappel); etat.enregistrements++;
        return true;
      },
      unregister(touche) { etat.prises.delete(touche); etat.liberations++; },
    };
  }
  function creer(options = {}) {
    const r = fauxRaccourci(options.systeme);
    const actions = []; const refus = [];
    const c = creerRaccourcisCrayon(r, { surAction: (a) => actions.push(a), surIndisponibles: (l) => refus.push(l) });
    return { r, c, actions, refus };
  }

  // 1. Canal éteint : aucune touche prise, même une fois les touches définies.
  {
    const { r, c } = creer();
    assert.equal(c.definirTouches(TOUCHES), true);
    assert.equal(r.etat.prises.size, 0);
  }

  // 2. Canal actif : les trois touches sont prises, chacune déclenche sa propre action.
  {
    const { r, c, actions, refus } = creer();
    c.definirTouches(TOUCHES);
    c.definirActif(true);
    assert.deepEqual([...r.etat.prises.keys()].sort(), Object.values(TOUCHES).sort());
    r.etat.prises.get(TOUCHES.basculer)();
    r.etat.prises.get(TOUCHES.rappeler)();
    r.etat.prises.get(TOUCHES.effacer)();
    assert.deepEqual(actions, ['basculer', 'rappeler', 'effacer']);
    assert.deepEqual(refus, [[]]);
  }

  // 3. Ordre inverse (canal actif avant que les touches soient connues) : même résultat.
  {
    const { r, c } = creer();
    c.definirActif(true);
    assert.equal(r.etat.prises.size, 0);
    c.definirTouches(TOUCHES);
    assert.equal(r.etat.prises.size, 3);
  }

  // 4. Répéter le même état (cas de chaque état poussé par la fenêtre principale) ne
  //    reprend rien.
  {
    const { r, c } = creer();
    c.definirTouches(TOUCHES);
    for (let i = 0; i < 20; i++) c.definirActif(true);
    assert.equal(r.etat.enregistrements, 3);
    assert.equal(r.etat.liberations, 0);
  }

  // 5. Canal éteint : toutes les touches sont rendues. Rallumé : reprises.
  {
    const { r, c } = creer();
    c.definirTouches(TOUCHES);
    c.definirActif(true);
    c.definirActif(false);
    assert.equal(r.etat.prises.size, 0);
    assert.equal(r.etat.liberations, 3);
    c.definirActif(true);
    assert.equal(r.etat.prises.size, 3);
  }

  // 6. Une touche refusée par le système : les deux autres marchent, le refus est signalé.
  {
    const { r, c, refus } = creer({ systeme: { refuser: [TOUCHES.rappeler] } });
    c.definirTouches(TOUCHES);
    c.definirActif(true);
    assert.deepEqual(c.prises().sort(), ['basculer', 'effacer']);
    assert.equal(r.etat.prises.size, 2);
    assert.deepEqual(refus, [['rappeler']]);
    // Rendre les touches ne libère que celles qui ont été prises.
    c.definirActif(false);
    assert.equal(r.etat.liberations, 2);
  }

  // 7. Le système qui lève une erreur ne casse rien : tout est signalé indisponible.
  {
    const { c, refus } = creer({ systeme: { lever: true } });
    c.definirTouches(TOUCHES);
    c.definirActif(true);
    assert.deepEqual(c.prises(), []);
    assert.deepEqual(refus, [['basculer', 'rappeler', 'effacer']]);
  }

  // 8. Touches invalides (incomplètes, vides, en double) refusées, rien n'est pris.
  {
    const { r, c } = creer();
    c.definirActif(true);
    assert.equal(c.definirTouches({ basculer: 'A', rappeler: 'B' }), false);
    assert.equal(c.definirTouches({ basculer: 'A', rappeler: 'A', effacer: 'B' }), false);
    assert.equal(c.definirTouches({ basculer: 'A', rappeler: ' ', effacer: 'B' }), false);
    assert.equal(c.definirTouches(null), false);
    assert.equal(r.etat.prises.size, 0);
  }

  // 9. Changer les touches pendant que le canal est actif rend les anciennes et prend les nouvelles.
  {
    const { r, c } = creer();
    c.definirTouches(TOUCHES);
    c.definirActif(true);
    c.definirTouches({ basculer: 'CommandOrControl+Shift+1', rappeler: 'CommandOrControl+Shift+2', effacer: 'CommandOrControl+Shift+3' });
    assert.deepEqual([...r.etat.prises.keys()].sort(), ['CommandOrControl+Shift+1', 'CommandOrControl+Shift+2', 'CommandOrControl+Shift+3']);
  }

  console.log('Raccourcis du crayon : tous les tests passent.');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
