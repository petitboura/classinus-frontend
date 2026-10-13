// Test de la lecture d'une fenetre choisie par son titre (13/10/2026) : lecture du parametre,
// script genere sans injection, refus avec une autre zone. Modules purs : tourne sans Windows
// (le script PowerShell lui meme ne peut etre execute que sur un vrai Windows).
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-fenetre-visee-'));
try {
  const sortie = join(dossier, 'lecture.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src/lectureFenetreWindows.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const m = await import(pathToFileURL(sortie).href);
  const limites = m.limitesDepuisParametres({});

  // 1. Lecture du parametre : texte nettoye, borne, jamais autre chose qu'une chaine.
  assert.equal(m.fenetreVoulueDepuisParametres({}), '');
  assert.equal(m.fenetreVoulueDepuisParametres({ fenetre_cible: 42 }), '');
  assert.equal(m.fenetreVoulueDepuisParametres({ fenetre_cible: '  Sans titre - Bloc-notes  ' }), 'Sans titre - Bloc-notes');
  assert.equal(m.fenetreVoulueDepuisParametres({ fenetre_cible: 'x'.repeat(500) }).length, 200);

  // 2. Sans fenetre voulue : le script garde son comportement (aucun titre insere).
  const habituel = m.construireScript(limites, 1234);
  assert.ok(habituel.includes("$fenetreVoulue = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(''))"));
  assert.ok(habituel.includes('$fenetreVisee = $false'));

  // 3. Le titre passe en base64 : aucun caractere special ne peut sortir de la chaine.
  const piege = `a'b"c\`d$(Get-Date)\nligne 2 é`;
  const script = m.construireScript(limites, 1234, '0', false, true, 'fenetre', [], piege);
  assert.ok(!script.includes('Get-Date'), 'le titre ne doit pas apparaitre en clair dans le script');
  assert.ok(script.includes(Buffer.from(piege, 'utf8').toString('base64')));

  // 4. Une fenetre precise ne se lit qu'avec la zone fenetre.
  assert.throws(() => m.construireScript(limites, 1234, '0', false, true, 'bureau', [], 'Bloc-notes'));
  assert.throws(() => m.construireScript(limites, 1234, '0', false, true, 'barre_des_taches', [], 'Bloc-notes'));

  // 5. Le choix par titre vient AVANT le repli sur la fenetre du premier plan, qui est desactive
  //    quand la fenetre est visee (sinon la lecture partirait sur une autre fenetre).
  assert.ok(script.indexOf('$fenetreVisee = $true') < script.indexOf('if (-not $fenetreVisee -and (('));
  assert.ok(script.includes("if ($zoneLue -eq 'fenetre' -and -not $fenetreVisee) { $annexes"));
  // Plusieurs fenetres ou aucune : la lecture s'arrete, jamais de choix au hasard.
  assert.ok(script.includes('Aucune fenêtre ouverte ne correspond') && script.includes('Plusieurs fenêtres correspondent'));

  // 6. Les accolades et parentheses du script restent equilibrees.
  for (const [ouvre, ferme] of [['{', '}'], ['(', ')']]) {
    const compte = t => [...t].reduce((n, c) => n + (c === ouvre) - (c === ferme), 0);
    assert.equal(compte(script), compte(habituel), `${ouvre}${ferme} : meme equilibre que le script habituel`);
  }

  console.log('OK : lecture d\'une fenetre derriere (parametre, script sans injection, zone, ordre de choix).');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
