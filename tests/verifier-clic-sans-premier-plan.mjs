// Clic sur un bouton Windows classique sans mettre la fenetre devant (13/10/2026). Verifie le
// script genere : seule une boite de dialogue (#32770) est activee avant le clic, une fenetre
// ordinaire n'est jamais mise devant. Le script ne s'execute que sur un vrai Windows.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-clic-premier-plan-'));
try {
  const sortie = join(dossier, 'clic.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src/clicWindows.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { construireScriptClic } = await import(pathToFileURL(sortie).href);
  const script = construireScriptClic(120, 80, 4321, 'C:\\temp\\marqueur');

  const debut = script.indexOf('public static void CliquerBouton');
  assert.ok(debut > 0, 'la methode CliquerBouton existe');
  const methode = script.slice(debut, script.indexOf('\n  }', debut));
  const appels = methode.match(/SetForegroundWindow\(/g) ?? [];
  assert.equal(appels.length, 1, 'un seul appel de mise au premier plan dans CliquerBouton');
  assert.match(methode, /if \(EstBoiteDialogue\(fenetre\)\) SetForegroundWindow\(fenetre\);/, 'mise au premier plan reservee aux boites de dialogue');
  assert.ok(methode.indexOf('EstBoiteDialogue') < methode.indexOf('SendMessageTimeout'), 'le choix se fait avant le clic');
  assert.match(script, /Equals\("#32770",StringComparison\.Ordinal\)/, 'boite de dialogue reconnue par sa classe Windows');
  // Les autres actions (Invoke, Toggle, ...) n'ont jamais mis de fenetre devant : rien de nouveau.
  assert.equal((script.match(/SetForegroundWindow\(/g) ?? []).length, 2, 'declaration + un seul appel dans tout le script');
  console.log("OK : clic de bouton Windows (fenetre ordinaire laissee derriere, boite de dialogue activee).");
} finally {
  await rm(dossier, { recursive: true, force: true });
}
