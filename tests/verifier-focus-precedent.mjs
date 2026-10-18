// Test du focus rendu à la fenêtre précédente après une saisie dans la superposition (canal PC,
// 18/10/2026). Logique pure avec un faux système : tourne partout, sans Windows ni Electron.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-focus-'));
try {
  const sortie = join(dossier, 'focus.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-superposition-electron/electron/src/focusPrecedent.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { creerFocusPrecedent, creerSystemeWindows, poigneeDe } = await import(pathToFileURL(sortie).href);

  const PROPRE = 500;
  const BLOC_NOTES = 101;

  // Faux Windows : une fenêtre active, des fenêtres existantes, un journal des activations.
  function fauxSysteme({ active = BLOC_NOTES, existantes = [BLOC_NOTES], refuser = false, lever = false } = {}) {
    const etat = { active, existantes: new Set(existantes), activations: [] };
    return {
      etat,
      premierPlan: () => { if (lever) throw new Error('boom'); return etat.active; },
      existe: (h) => etat.existantes.has(h),
      activer: (h) => { etat.activations.push(h); if (refuser) return false; etat.active = h; return true; },
    };
  }

  // 1. Cas du bug : la saisie commence, la superposition prend le focus et le garde. À la fin,
  //    la fenêtre d'avant redevient active.
  {
    const s = fauxSysteme();
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE);
    s.etat.active = PROPRE; // Windows donne le focus à la superposition
    const etaitActive = f.estActive(PROPRE);
    assert.equal(etaitActive, true);
    s.etat.active = 333; // setFocusable(false) donne l'activation à une fenêtre système (second journal)
    assert.equal(f.rendre(PROPRE, etaitActive), true);
    assert.deepEqual(s.etat.activations, [BLOC_NOTES]);
    assert.equal(s.etat.active, BLOC_NOTES);
  }

  // 2. L'étudiant a cliqué dans une autre fenêtre pendant la saisie : on n'y touche pas.
  {
    const s = fauxSysteme();
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE);
    s.etat.active = 202; // il a cliqué ailleurs, cette fenêtre est déjà active
    s.etat.existantes.add(202);
    const etaitActive = f.estActive(PROPRE);
    assert.equal(etaitActive, false);
    assert.equal(f.rendre(PROPRE, etaitActive), false);
    assert.deepEqual(s.etat.activations, []);
  }

  // 3. La fenêtre d'avant a été fermée entre temps : rien n'est activé.
  {
    const s = fauxSysteme();
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE);
    s.etat.active = PROPRE;
    s.etat.existantes.delete(BLOC_NOTES);
    assert.equal(f.rendre(PROPRE, true), false);
    assert.deepEqual(s.etat.activations, []);
  }

  // 4. Windows refuse l'activation : on le dit (faux), sans planter.
  {
    const s = fauxSysteme({ refuser: true });
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE);
    s.etat.active = PROPRE;
    assert.equal(f.rendre(PROPRE, true), false);
  }

  // 5. La superposition est déjà la fenêtre active au moment de noter : rien à noter, et une
  //    note précédente n'est pas écrasée par la superposition elle même.
  {
    const s = fauxSysteme({ active: PROPRE });
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE);
    assert.equal(f.rendre(PROPRE, true), false);
    assert.deepEqual(s.etat.activations, []);
  }
  {
    const s = fauxSysteme();
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE); // note le Bloc-notes
    s.etat.active = PROPRE;
    f.memoriser(PROPRE); // deuxième demande pendant la saisie : ne doit pas perdre la note
    assert.equal(f.rendre(PROPRE, true), true);
    assert.deepEqual(s.etat.activations, [BLOC_NOTES]);
  }

  // 6. Aucune fenêtre active (poignée 0) : rien à noter.
  {
    const s = fauxSysteme({ active: 0 });
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE);
    assert.equal(f.rendre(PROPRE, true), false);
  }

  // 7. La note ne sert qu'une fois : une deuxième fin de saisie ne réactive rien.
  {
    const s = fauxSysteme();
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE);
    s.etat.active = PROPRE;
    assert.equal(f.rendre(PROPRE, true), true);
    s.etat.active = PROPRE;
    assert.equal(f.rendre(PROPRE, true), false);
    assert.equal(s.etat.activations.length, 1);
  }

  // 8. Une erreur du système ne remonte jamais (un plantage ici couperait la superposition).
  {
    const s = fauxSysteme({ lever: true });
    const f = creerFocusPrecedent(s);
    assert.doesNotThrow(() => f.memoriser(PROPRE));
    assert.equal(f.rendre(PROPRE, true), false);
  }

  // 9. Poignées de formes différentes (nombre ou grand entier) : comparées sans erreur.
  {
    const s = fauxSysteme({ active: 101n });
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE);
    s.etat.active = BigInt(PROPRE);
    s.etat.existantes.add(101n);
    assert.equal(f.rendre(PROPRE, true), true);
  }

  // 10. Sans système (hors Windows, ou module natif absent) : tout est sans effet.
  {
    const f = creerFocusPrecedent(null);
    assert.doesNotThrow(() => f.memoriser(PROPRE));
    assert.equal(f.rendre(PROPRE, true), false);
    if (process.platform !== 'win32') assert.equal(creerSystemeWindows(), null);
  }

  // 11. Lecture de la poignée d'une fenêtre Electron (4 ou 8 octets).
  {
    const huit = Buffer.alloc(8); huit.writeBigUInt64LE(0x1234abcdn);
    const quatre = Buffer.alloc(4); quatre.writeUInt32LE(0x1234abcd);
    assert.equal(BigInt(poigneeDe(huit)), 0x1234abcdn);
    assert.equal(BigInt(poigneeDe(quatre)), 0x1234abcdn);
  }

  // 12. La trace dit pourquoi le focus n'a pas été rendu (sert à lire le journal de diagnostic).
  {
    const s = fauxSysteme();
    const f = creerFocusPrecedent(s);
    assert.equal(f.apercuPremierPlan(), '0x65');
    f.memoriser(PROPRE);
    assert.match(f.trace(), /noté 0x65/);
    s.etat.active = 202; // une autre fenêtre est devenue active avant la fin de la saisie
    assert.equal(f.rendre(PROPRE, f.estActive(PROPRE)), false);
    assert.match(f.trace(), /n'était plus la fenêtre active avant la fin de la saisie \(actuellement 0xca\)/);
    assert.match(f.trace(), /fenêtre notée 0x65/);
  }
  {
    const f = creerFocusPrecedent(fauxSysteme());
    assert.equal(f.rendre(PROPRE, true), false);
    assert.match(f.trace(), /aucune fenêtre notée avant la saisie/);
  }
  {
    const s = fauxSysteme({ active: PROPRE });
    const f = creerFocusPrecedent(s);
    f.memoriser(PROPRE);
    assert.match(f.trace(), /déjà active, rien noté/);
  }
  {
    const f = creerFocusPrecedent(null);
    assert.equal(f.apercuPremierPlan(), 'inconnu');
    assert.equal(f.estActive(PROPRE), false);
  }
  {
    const f = creerFocusPrecedent(fauxSysteme({ lever: true }));
    assert.doesNotThrow(() => f.estActive(PROPRE));
    assert.equal(f.estActive(PROPRE), false);
  }

  console.log('Focus précédent : tout est bon.');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
