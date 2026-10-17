// Lecture legere de la fenetre au premier plan et drapeau "bureau au premier plan" (16/10/2026,
// demande de Bourama : Classinus doit toujours savoir quelle fenetre est devant, et savoir qu'on
// est sur le bureau quand tout est ferme). Modules purs : tourne sans Windows ; la syntaxe du
// script est controlee avec PowerShell quand il est installe (pwsh), sinon cette etape est sautee.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-premier-plan-'));
try {
  const sortie = join(dossier, 'lecture.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src/lectureFenetreWindows.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const m = await import(pathToFileURL(sortie).href);
  const limites = m.limitesDepuisParametres({});

  // 1. Parametre : seul "true" active la lecture legere.
  assert.equal(m.titresSeulsDepuisParametres({}), false);
  assert.equal(m.titresSeulsDepuisParametres({ titres_seuls: 'true' }), false);
  assert.equal(m.titresSeulsDepuisParametres({ titres_seuls: 1 }), false);
  assert.equal(m.titresSeulsDepuisParametres({ titres_seuls: true }), true);

  // 2. Script : lecture normale inchangee, lecture legere activee a la demande.
  const normal = m.construireScript(limites, 1234);
  const leger = m.construireScript(limites, 1234, '0', false, true, 'fenetre', [], '', true);
  assert.ok(normal.includes('$titresSeuls = $false'));
  assert.ok(leger.includes('$titresSeuls = $true'));
  for (const script of [normal, leger]) {
    assert.ok(script.includes('$resultat.bureau_premier_plan = $true'), 'drapeau bureau au premier plan');
    assert.ok(script.includes('$resultat.titres_seuls = $true'));
  }

  // 3. La sortie anticipee vient APRES le cas "seule Classinus est ouverte" et AVANT le parcours
  // du contenu (sinon la lecture legere lirait quand meme tout, ou perdrait fenetre_classinus).
  const posClassinus = leger.indexOf('$resultat.fenetre_classinus = $true');
  const posSortieLegere = leger.indexOf('if ($titresSeuls -and -not $fenetreVisee)');
  const posContenu = leger.indexOf('$types = @{');
  assert.ok(posClassinus > 0 && posSortieLegere > posClassinus && posContenu > posSortieLegere, 'ordre des blocs du script');

  // 4. Syntaxe PowerShell du script (toutes les variantes), si pwsh est disponible.
  let pwsh = null;
  for (const candidat of [process.env.PWSH, '/tmp/pwsh/pwsh', 'pwsh']) {
    if (!candidat) continue;
    try { execFileSync(candidat, ['-NoProfile', '-Command', '1'], { stdio: 'ignore', env: { ...process.env, DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: '1' } }); pwsh = candidat; break; } catch { /* essai suivant */ }
  }
  if (pwsh) {
    const verif = join(dossier, 'verif.ps1');
    await writeFile(verif, "param($f)\n$e=$null;$t=$null\n[void][System.Management.Automation.Language.Parser]::ParseFile($f,[ref]$t,[ref]$e)\nif($e.Count -gt 0){$e|ForEach-Object{'L'+$_.Extent.StartLineNumber+' '+$_.Message};exit 1}\n", 'utf8');
    const variantes = { normal, leger, bureau: m.construireScript(limites, 1234, '0', false, true, 'bureau'), fenetre: m.construireScript(limites, 1234, '0', false, true, 'fenetre', [], 'Bloc-notes') };
    for (const [nom, script] of Object.entries(variantes)) {
      const fichier = join(dossier, `${nom}.ps1`);
      await writeFile(fichier, '\uFEFF' + script, 'utf8');
      try {
        execFileSync(pwsh, ['-NoProfile', '-File', verif, fichier], { stdio: 'pipe', env: { ...process.env, DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: '1' } });
      } catch (e) {
        assert.fail(`syntaxe PowerShell invalide (${nom}) : ${String(e.stdout ?? e.message)}`);
      }
    }
  } else {
    console.log('(pwsh absent : syntaxe PowerShell non controlee)');
  }
  console.log('OK : lecture legere des titres, drapeau bureau au premier plan, script valide.');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
