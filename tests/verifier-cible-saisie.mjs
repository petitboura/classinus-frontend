// Test de la cible de saisie du canal en direct PC (12/10/2026) : le texte ne part que dans
// la fenêtre annoncée par le modèle, et la frappe s'arrête si l'étudiant la quitte.
// Modules purs : tourne sur n'importe quel système, sans Electron.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-cible-'));
try {
  const src = resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src');
  const charger = async (nom) => {
    const sortie = join(dossier, `${nom}.mjs`);
    await build({ entryPoints: [join(src, `${nom}.mts`)], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
    return import(pathToFileURL(sortie).href);
  };
  const { cibleDepuisParametres, cibleCorrespond, normaliserPourCible, messageMauvaiseCible, messageFrappeInterrompue } = await charger('cibleSaisie');
  const { taperTexteAdapte, TAILLE_BLOC_FRAPPE } = await charger('frappeAdaptee');

  // 1. La cible est lue dans les paramètres ; absente ou vide, elle est vide (rien n'est tapé).
  assert.equal(cibleDepuisParametres({ cible: '  Bloc-notes ' }), 'Bloc-notes');
  assert.equal(cibleDepuisParametres({}), '');
  assert.equal(cibleDepuisParametres({ cible: 42 }), '');

  // 2. Correspondance par le titre : insensible à la casse, aux accents, à l'étoile des
  //    documents non enregistrés.
  assert.equal(cibleCorrespond('Bloc-notes', 'Sans titre - Bloc-notes', null), true);
  assert.equal(cibleCorrespond('Sans titre - Bloc-notes', '*Sans titre - Bloc-notes', null), true);
  assert.equal(cibleCorrespond('bloc notes', 'Sans titre - Bloc-notes', null), false, 'tiret et espace restent distincts');
  assert.equal(cibleCorrespond('Document Word', 'Café - document word', null), true);
  assert.equal(normaliserPourCible('  *Éléphant  Rose '), 'elephant rose');

  // 3. Une autre fenêtre ne correspond pas, un titre vide non plus.
  assert.equal(cibleCorrespond('Bloc-notes', 'Google Chrome', null), false);
  assert.equal(cibleCorrespond('Bloc-notes', null, null), false);
  assert.equal(cibleCorrespond('', 'Bloc-notes', 'notepad'), false, 'cible vide : jamais');

  // 4. Un titre trop court ne doit pas correspondre à n'importe quelle cible.
  assert.equal(cibleCorrespond('Bloc-notes', 'a', null), false);

  // 5. Le nom du programme aide quand le titre ne suffit pas.
  assert.equal(cibleCorrespond('notepad', 'Sans titre', 'notepad'), true);
  assert.equal(cibleCorrespond('notepad', 'Sans titre', 'Notepad.exe'), true);
  assert.equal(cibleCorrespond('notepad', 'Sans titre', 'chrome'), false);

  // 6. Les messages disent ce qui s'est passé et ne poussent pas à écrire ailleurs.
  assert.match(messageMauvaiseCible('Bloc-notes', 'Google Chrome'), /NON tapé.*Bloc-notes.*Google Chrome/s);
  assert.match(messageMauvaiseCible('Bloc-notes', null), /illisible/);
  assert.match(messageFrappeInterrompue('Bloc-notes', 20, 60), /INTERROMPUE.*20 caractères sur 60/s);

  // Faux matériel de frappe, comme dans verifier-arret-global.mjs.
  const ENTREE = 999, MAJ = 998, DEBUT = 997;
  function fauxMateriel() {
    const tape = [];
    return {
      tape,
      clavier: { config: { autoDelayMs: 0 }, type: async (...e) => { tape.push(...e); } },
      garde: { exclusif: async (a) => a(), combinaison: async () => ({ ok: true }) },
    };
  }
  const base = (m, texte, extra = {}) => ({ clavier: m.clavier, garde: m.garde, entree: ENTREE, maj: MAJ, debut: DEBUT, texte, titreFenetre: null, ...extra });

  // 7. Fenêtre toujours bonne : tout est tapé et le nombre de caractères est compté.
  {
    const m = fauxMateriel();
    const r = await taperTexteAdapte(base(m, 'abc\ndef', { fenetreToujoursBonne: async () => true }));
    assert.equal(r.ok, true);
    assert.equal(r.tapes, 7);
    assert.deepEqual(m.tape, ['abc', ENTREE, 'def']);
  }

  // 8. L'étudiant part au milieu d'une longue ligne : la frappe s'arrête avant le bloc
  //    suivant, rien de plus n'est écrit, et le compte est exact.
  {
    const m = fauxMateriel();
    let blocs = 0;
    const ligne = 'x'.repeat(TAILLE_BLOC_FRAPPE * 4);
    const r = await taperTexteAdapte(base(m, ligne, { fenetreToujoursBonne: async () => (blocs++ < 2) }));
    assert.equal(r.ok, false);
    assert.equal(r.fenetreChangee, true);
    assert.equal(r.tapes, TAILLE_BLOC_FRAPPE * 2);
    assert.equal(m.tape.join('').length, TAILLE_BLOC_FRAPPE * 2, 'rien écrit après le départ');
  }

  // 9. L'étudiant part juste avant un retour à la ligne : l'Entrée n'est PAS envoyée dans
  //    l'autre fenêtre.
  {
    const m = fauxMateriel();
    let appels = 0;
    const r = await taperTexteAdapte(base(m, 'abc\ndef', { fenetreToujoursBonne: async () => (appels++ < 1) }));
    assert.equal(r.fenetreChangee, true);
    assert.deepEqual(m.tape, ['abc']);
    assert.equal(r.tapes, 3);
  }

  // 10. L'étudiant est déjà parti avant le premier bloc : rien n'est tapé du tout.
  {
    const m = fauxMateriel();
    const r = await taperTexteAdapte(base(m, 'bonjour', { fenetreToujoursBonne: async () => false }));
    assert.equal(r.fenetreChangee, true);
    assert.equal(r.tapes, 0);
    assert.deepEqual(m.tape, []);
  }

  // 11. Sans vérification fournie, le comportement d'avant est conservé.
  {
    const m = fauxMateriel();
    const r = await taperTexteAdapte(base(m, 'ok'));
    assert.equal(r.ok, true);
    assert.equal(r.tapes, 2);
  }

  console.log('OK : cible de saisie (correspondance, messages) et arrêt de la frappe quand la fenêtre change.');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
