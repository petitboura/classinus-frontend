// Test des applications protégées du canal PC : reconnaissance des programmes, Win+R, et
// demande d'accord à l'étudiant (accepte, refuse, délai, arrêt global, réponses en double).
// Module pur : tourne sur n'importe quel système, sans Electron ni Windows.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-protegees-'));
try {
  const src = resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src');
  async function charger(fichier, nom) {
    const sortie = join(dossier, nom);
    await build({ entryPoints: [join(src, fichier)], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
    return import(pathToFileURL(sortie).href);
  }
  const m = await charger('applicationsProtegees.mts', 'protegees.mjs');
  const { analyserTouches } = await charger('touchesClavier.mts', 'touches.mjs');
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1. Reconnaissance : chemin, majuscules, ".exe" ignorés ; programmes proches non confondus.
  {
    assert.equal(m.normaliserProgramme('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\PowerShell.EXE'), 'powershell');
    assert.equal(m.normaliserProgramme('  WindowsTerminal  '), 'windowsterminal');
    assert.equal(m.normaliserProgramme(null), '');
    const liste = m.listeDepuisParametres({ applications_protegees: ['PowerShell', 'cmd.exe', '', 42, 'regedit'] });
    assert.deepEqual(liste, ['powershell', 'cmd', 'regedit']);
    assert.equal(m.estApplicationProtegee('PowerShell.exe', liste), true);
    assert.equal(m.estApplicationProtegee('C:\\Windows\\System32\\cmd.exe', liste), true);
    assert.equal(m.estApplicationProtegee('notepad', liste), false);
    assert.equal(m.estApplicationProtegee('code', liste), false);
    assert.equal(m.estApplicationProtegee('cmdhelper', liste), false, 'pas de correspondance partielle');
    assert.equal(m.estApplicationProtegee('', liste), false);
    assert.equal(m.estApplicationProtegee(null, liste), false);
  }

  // 2. Sans liste du serveur, la protection n'est pas activée.
  {
    assert.deepEqual(m.listeDepuisParametres({}), []);
    assert.deepEqual(m.listeDepuisParametres({ applications_protegees: 'powershell' }), []);
  }

  // 3. Délai : valeur du serveur, bornée ; sinon 60 secondes.
  {
    assert.equal(m.delaiAutorisationDepuisParametres({}), 60000);
    assert.equal(m.delaiAutorisationDepuisParametres({ delai_autorisation_ms: null }), 60000);
    assert.equal(m.delaiAutorisationDepuisParametres({ delai_autorisation_ms: 'abc' }), 60000);
    assert.equal(m.delaiAutorisationDepuisParametres({ delai_autorisation_ms: 90000 }), 90000);
    assert.equal(m.delaiAutorisationDepuisParametres({ delai_autorisation_ms: 10 }), 5000);
    assert.equal(m.delaiAutorisationDepuisParametres({ delai_autorisation_ms: 99999999 }), 300000);
  }

  // 4. Win+R reconnu avec les vraies combinaisons de touchesClavier.mts, sans faux positif.
  {
    const ouvre = (texte) => { const a = analyserTouches(texte); assert.equal(a.ok, true, texte); return m.combinaisonsOuvrentExecuter(a.combinaisons); };
    assert.equal(ouvre('win+r'), true);
    assert.equal(ouvre('windows+R'), true);
    assert.equal(ouvre('ctrl+a win+r'), true);
    assert.equal(ouvre('win+d'), false);
    assert.equal(ouvre('ctrl+r'), false);
    assert.equal(ouvre('r'), false);
  }

  // 5. Accord : la demande s'ouvre, l'étudiant accepte, la demande se ferme.
  {
    const evts = []; const g = m.creerGestionnaireAutorisations({ envoyer: (e) => evts.push(e), creerId: () => 'a1' });
    const p = g.demander('Clovis veut écrire dans PowerShell. Autoriser cette fois ?', 1000);
    assert.deepEqual(evts, [{ id: 'a1', phase: 'demande', texte: 'Clovis veut écrire dans PowerShell. Autoriser cette fois ?' }]);
    assert.equal(g.nombreEnAttente(), 1);
    assert.equal(g.repondre('a1', true), true);
    assert.equal(await p, 'accepte');
    assert.deepEqual(evts[1], { id: 'a1', phase: 'fin' });
    assert.equal(g.nombreEnAttente(), 0);
  }

  // 6. Refus explicite ; une réponse en double ou inconnue est ignorée.
  {
    const evts = []; const g = m.creerGestionnaireAutorisations({ envoyer: (e) => evts.push(e), creerId: () => 'r1' });
    const p = g.demander('?', 1000);
    assert.equal(g.repondre('r1', false), true);
    assert.equal(await p, 'refuse');
    assert.equal(g.repondre('r1', true), false, 'réponse en double ignorée');
    assert.equal(g.repondre('inconnu', true), false);
    assert.equal(g.repondre(undefined, true), false);
    assert.equal(evts.filter((e) => e.phase === 'fin').length, 1);
  }

  // 7. Sans réponse : délai dépassé, la demande se ferme, une réponse tardive est ignorée.
  {
    const evts = []; const g = m.creerGestionnaireAutorisations({ envoyer: (e) => evts.push(e), creerId: () => 't1' });
    const p = g.demander('?', 40);
    assert.equal(await p, 'delai');
    assert.deepEqual(evts.map((e) => e.phase), ['demande', 'fin']);
    assert.equal(g.repondre('t1', true), false, 'réponse après le délai ignorée');
  }

  // 8. Arrêt global (Échap) : la demande ouverte est refusée tout de suite.
  {
    const g = m.creerGestionnaireAutorisations({ envoyer: () => {}, creerId: () => 'e1' });
    const p = g.demander('?', 5000);
    g.refuserTout();
    assert.equal(await p, 'refuse');
    assert.equal(g.nombreEnAttente(), 0);
  }

  // 9. Une seule demande à la fois : la nouvelle refuse l'ancienne.
  {
    let n = 0; const g = m.creerGestionnaireAutorisations({ envoyer: () => {}, creerId: () => `n${++n}` });
    const p1 = g.demander('une', 5000);
    const p2 = g.demander('deux', 5000);
    assert.equal(await p1, 'refuse');
    assert.equal(g.nombreEnAttente(), 1);
    g.repondre('n2', true);
    assert.equal(await p2, 'accepte');
  }

  // 10. Une interface qui plante ne fait pas planter la demande : elle finit par un délai.
  {
    const g = m.creerGestionnaireAutorisations({ envoyer: () => { throw new Error('interface absente'); } });
    assert.equal(await g.demander('?', 30), 'delai');
  }

  // 11. Les minuteurs ne laissent rien derrière eux.
  {
    const g = m.creerGestionnaireAutorisations({ envoyer: () => {} });
    const p = g.demander('?', 20);
    await p; await attendre(30);
    assert.equal(g.nombreEnAttente(), 0);
  }

  console.log('OK : applications protegees (reconnaissance, Win+R, accord accepte, refuse, delai, arret global, doublons).');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
