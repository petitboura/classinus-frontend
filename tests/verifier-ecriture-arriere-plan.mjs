// Test de l'ecriture en arriere plan (12/10/2026) : lecture de la sortie du script Windows,
// regle "jamais reessayer apres le debut de l'ecriture", et script genere sans injection.
// Modules purs : tourne sans Windows ni Electron (le script PowerShell lui meme ne peut etre
// verifie que sur un vrai Windows).
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-arriere-plan-'));
try {
  const sortie = join(dossier, 'ecriture.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src/ecritureArrierePlan.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const m = await import(pathToFileURL(sortie).href);

  // 1. Ecriture reussie.
  let r = m.interpreterSortieEcriture('{"statut":"effectue","fenetre":"Sans titre - Bloc-notes","application":"notepad","ajoutes":7}', true);
  assert.deepEqual(r, { statut: 'effectue', fenetre: 'Sans titre - Bloc-notes', application: 'notepad', ajoutes: 7 });

  // 2. Application protegee : rien n'a ete ecrit, l'appelant doit demander l'accord.
  r = m.interpreterSortieEcriture('{"statut":"protegee","fenetre":"PowerShell","application":"powershell"}', false);
  assert.deepEqual(r, { statut: 'protegee', fenetre: 'PowerShell', application: 'powershell' });

  // 3. Indisponible avant l'ecriture : l'appelant peut choisir un autre moyen, avec la raison.
  r = m.interpreterSortieEcriture('{"statut":"indisponible","raison":"fenetre_introuvable"}', false);
  assert.deepEqual(r, { statut: 'indisponible', raison: m.RAISON_FENETRE_INTROUVABLE });
  r = m.interpreterSortieEcriture('{"statut":"indisponible","raison":"plusieurs_champs"}', false);
  assert.equal(r.statut, 'indisponible');

  // 4. REGLE ABSOLUE : des que l'ecriture a commence (marqueur present), jamais "indisponible"
  //    ni "protegee", meme si le script dit le contraire ou ne renvoie rien d'exploitable.
  for (const brut of ['{"statut":"indisponible","raison":"x"}', '{"statut":"protegee","fenetre":"a","application":"b"}', '', 'pas du json', '{"statut":"autre"}']) {
    r = m.interpreterSortieEcriture(brut, true);
    assert.equal(r.statut, 'incertain', `commence + ${JSON.stringify(brut)}`);
  }
  // Mais une ecriture confirmee reste confirmee.
  assert.equal(m.interpreterSortieEcriture('{"statut":"effectue","fenetre":"a","application":"b","ajoutes":1}', true).statut, 'effectue');

  // 5. Sortie illisible avant l'ecriture : indisponible, avec le diagnostic tronque.
  r = m.interpreterSortieEcriture('', false, 'x'.repeat(5000));
  assert.equal(r.statut, 'indisponible');
  assert.equal(r.diagnostic.length, 2000);

  // 6. Activation de la fenetre.
  assert.deepEqual(m.interpreterSortieActivation('{"statut":"effectue","fenetre":"Bloc-notes"}'), { statut: 'effectue', fenetre: 'Bloc-notes' });
  assert.equal(m.interpreterSortieActivation('{"statut":"indisponible","raison":"refus"}').statut, 'indisponible');
  assert.equal(m.interpreterSortieActivation('n importe quoi').statut, 'indisponible');

  // 7. Seuls des noms de programmes surs entrent dans le script.
  assert.deepEqual(m.listeProgrammesSure(['PowerShell', "x'; Remove-Item *; '", 'cmd', '']), ['powershell', 'cmd']);

  // 8. Le texte et la cible passent en base64 : aucun caractere special ne peut sortir de la chaine.
  const piege = `a'b"c\`d$(Get-Date)\nligne 2 é`;
  const script = m.construireScriptEcriture({ cible: piege, texte: piege, pidClassinus: 1234, applicationsProtegees: ['cmd'], forcer: false, marqueur: "C:\\tmp\\it's.action" });
  assert.ok(!script.includes('Get-Date'), 'le texte ne doit pas apparaitre en clair dans le script');
  assert.ok(script.includes('$pidClassinus = 1234'));
  assert.ok(script.includes("'cmd'"));
  assert.ok(script.includes("C:\\tmp\\it''s.action"), 'apostrophe du chemin doublee');
  assert.ok(script.includes('$forcer = $false'));
  assert.ok(m.construireScriptEcriture({ cible: 'a', texte: 'b', pidClassinus: 1, applicationsProtegees: [], forcer: true, marqueur: 'm' }).includes('$forcer = $true'));
  assert.throws(() => m.construireScriptEcriture({ cible: 'a', texte: 'b', pidClassinus: Number.NaN, applicationsProtegees: [], forcer: false, marqueur: 'm' }));
  // Le marqueur est ecrit AVANT l'ecriture du texte.
  assert.ok(script.indexOf("WriteAllText('C:\\tmp\\it''s.action'") < script.indexOf('$valeur.SetValue('));

  console.log('OK : ecriture en arriere plan (sortie du script, jamais de reessai apres le debut, script sans injection).');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
