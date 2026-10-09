// Test de l'arrêt global (Échap pris seulement pendant une tâche, demande d'arrêt lue par
// les actions en cours). Module pur : tourne sur n'importe quel système, sans Electron.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-arret-'));
try {
  const sortie = join(dossier, 'arret.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src/arretGlobal.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { creerArretGlobal } = await import(pathToFileURL(sortie).href);

  // Faux raccourci système : garde la liste des touches prises et le rappel enregistré.
  function fauxRaccourci({ refuser = false, lever = false } = {}) {
    const etat = { prises: new Set(), rappel: null, enregistrements: 0, liberations: 0 };
    return {
      etat,
      register(touche, rappel) {
        if (lever) throw new Error('boom');
        if (refuser) return false;
        etat.prises.add(touche); etat.rappel = rappel; etat.enregistrements++;
        return true;
      },
      unregister(touche) { etat.prises.delete(touche); etat.liberations++; },
    };
  }
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1. Armer prend Échap une seule fois, même si on arme deux fois de suite.
  {
    const r = fauxRaccourci(); const g = creerArretGlobal(r, { surArret: () => {} });
    assert.equal(g.armer(), true);
    assert.equal(g.armer(), true);
    assert.deepEqual([...r.etat.prises], ['Escape']);
    assert.equal(r.etat.enregistrements, 1);
    g.desarmer();
  }

  // 2. Un appui note la demande d'arrêt et prévient (une fois par appui).
  {
    const r = fauxRaccourci(); let appels = 0;
    const g = creerArretGlobal(r, { surArret: () => { appels++; } });
    g.armer();
    assert.equal(g.arretDemande(), false);
    r.etat.rappel();
    assert.equal(g.arretDemande(), true);
    assert.equal(appels, 1);
    g.desarmer();
  }

  // 3. Désarmer rend Échap au système mais GARDE la demande d'arrêt (une frappe encore en
  //    cours doit pouvoir la voir) ; armer pour la tâche suivante l'efface.
  {
    const r = fauxRaccourci(); const g = creerArretGlobal(r, { surArret: () => {} });
    g.armer(); r.etat.rappel(); g.desarmer();
    assert.equal(r.etat.prises.size, 0);
    assert.equal(g.estArme(), false);
    assert.equal(g.arretDemande(), true);
    g.armer();
    assert.equal(g.arretDemande(), false);
    g.desarmer();
  }

  // 4. Désarmer sans avoir armé ne touche pas au système.
  {
    const r = fauxRaccourci(); const g = creerArretGlobal(r, { surArret: () => {} });
    g.desarmer();
    assert.equal(r.etat.liberations, 0);
  }

  // 5. Raccourci refusé ou erreur du système : pas d'exception, armer renvoie false.
  {
    const g1 = creerArretGlobal(fauxRaccourci({ refuser: true }), { surArret: () => {} });
    assert.equal(g1.armer(), false); assert.equal(g1.estArme(), false);
    const g2 = creerArretGlobal(fauxRaccourci({ lever: true }), { surArret: () => {} });
    assert.equal(g2.armer(), false); assert.equal(g2.estArme(), false);
  }

  // 6. Filet de sécurité : sans désarmement, Échap est rendu au système après le délai.
  {
    const r = fauxRaccourci(); const g = creerArretGlobal(r, { surArret: () => {}, delaiSecuriteMs: 40 });
    g.armer();
    assert.equal(g.estArme(), true);
    await attendre(120);
    assert.equal(g.estArme(), false);
    assert.equal(r.etat.prises.size, 0);
  }

  // 7. Chaque action repousse le filet de sécurité tant que la tâche vit.
  {
    const r = fauxRaccourci(); const g = creerArretGlobal(r, { surArret: () => {}, delaiSecuriteMs: 80 });
    g.armer();
    await attendre(50); g.signalerActivite();
    await attendre(50);
    assert.equal(g.estArme(), true, 'repoussé par l\'activité');
    await attendre(150);
    assert.equal(g.estArme(), false, 'rendu après inactivité');
  }

  // 8. signalerActivite sans tâche armée ne reprend jamais le raccourci.
  {
    const r = fauxRaccourci(); const g = creerArretGlobal(r, { surArret: () => {} });
    g.signalerActivite();
    assert.equal(r.etat.enregistrements, 0);
  }

  // --- La frappe s'arrête entre deux blocs quand l'arrêt est demandé (frappeAdaptee.mts) ---
  const sortieFrappe = join(dossier, 'frappe.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src/frappeAdaptee.mts')], outfile: sortieFrappe, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { taperTexteAdapte, TAILLE_BLOC_FRAPPE } = await import(pathToFileURL(sortieFrappe).href);
  const ENTREE = 999, MAJ = 998, DEBUT = 997;

  function fauxMateriel(apresChaqueFrappe = () => {}) {
    const tape = [];
    const clavier = {
      config: { autoDelayMs: 0 },
      type: async (...e) => { tape.push(...e); apresChaqueFrappe(tape); },
    };
    const garde = { exclusif: async (a) => a(), combinaison: async () => ({ ok: true }) };
    return { tape, clavier, garde };
  }
  const base = (m, texte, extra = {}) => ({ clavier: m.clavier, garde: m.garde, entree: ENTREE, maj: MAJ, debut: DEBUT, texte, titreFenetre: null, ...extra });

  // 9. Sans arrêt : même résultat qu'avant (lignes tapées, vrai Entrée entre elles).
  {
    const m = fauxMateriel();
    const r = await taperTexteAdapte(base(m, 'abc\ndef'));
    assert.equal(r.ok, true);
    assert.deepEqual(m.tape, ['abc', ENTREE, 'def']);
  }

  // 10. Une longue ligne est envoyée par blocs, sans rien perdre.
  {
    const m = fauxMateriel();
    const ligne = 'x'.repeat(TAILLE_BLOC_FRAPPE * 2 + 5);
    await taperTexteAdapte(base(m, ligne));
    assert.deepEqual(m.tape.map((b) => b.length), [TAILLE_BLOC_FRAPPE, TAILLE_BLOC_FRAPPE, 5]);
    assert.equal(m.tape.join(''), ligne);
  }

  // 11. Arrêt demandé en pleine ligne : plus aucun bloc n'est tapé ensuite.
  {
    let arret = false;
    const m = fauxMateriel((tape) => { if (tape.length === 1) arret = true; });
    const r = await taperTexteAdapte(base(m, 'y'.repeat(TAILLE_BLOC_FRAPPE * 3), { arretDemande: () => arret }));
    assert.equal(r.ok, false);
    assert.equal(m.tape.length, 1, 'un seul bloc tapé, puis arrêt');
  }

  // 12. Arrêt demandé avant l'Entrée : la ligne suivante n'est jamais écrite.
  {
    let arret = false;
    const m = fauxMateriel((tape) => { if (tape.length === 1) arret = true; });
    const r = await taperTexteAdapte(base(m, 'ligne1\nligne2', { arretDemande: () => arret }));
    assert.equal(r.ok, false);
    assert.deepEqual(m.tape, ['ligne1']);
  }

  // 13. Un emoji à la frontière d'un bloc n'est jamais coupé en deux.
  {
    const m = fauxMateriel();
    const ligne = 'a'.repeat(TAILLE_BLOC_FRAPPE - 1) + '😀' + 'b';
    await taperTexteAdapte(base(m, ligne));
    assert.equal(m.tape.join(''), ligne);
    for (const bloc of m.tape) assert.equal(bloc.isWellFormed(), true, 'pas de moitié d\'emoji');
  }

  console.log('OK : arret global (Echap pris seulement pendant une tache, demande conservee, filet de securite).');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
