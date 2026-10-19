// Test du magasin de demande d'accord et du bandeau Autoriser / Refuser de la bulle de Clovis.
// Tourne partout : pas d'Electron, pas de navigateur.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-autorisation-'));
try {
  const racine = resolve(import.meta.dirname, '..');
  async function charger(entree, nom, extra = {}) {
    const sortie = join(dossier, nom);
    await build({ entryPoints: [join(racine, entree)], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent', absWorkingDir: racine, ...extra });
    return import(pathToFileURL(sortie).href);
  }

  // Magasin de la demande d'accord.
  const s = await charger('lib/autorisationCanal.ts', 'autorisation.mjs');
  let prevenus = 0;
  const desabonner = s.abonnerDemandeAutorisation(() => { prevenus++; });

  // 1. Au repos : aucune demande, et le même objet nul à chaque lecture.
  assert.equal(s.lireDemandeAutorisation(), null);
  assert.equal(s.demandeAutorisationRepos(), null);

  // 2. Une demande est posée et lue telle quelle (même objet tant que rien ne change).
  s.poserDemandeAutorisation({ id: 'a1', texte: 'Clovis veut écrire dans PowerShell. Autoriser cette fois ?' });
  assert.equal(s.lireDemandeAutorisation().id, 'a1');
  assert.equal(s.lireDemandeAutorisation(), s.lireDemandeAutorisation());
  assert.equal(prevenus, 1);

  // 3. Un "fin" tardif d'une autre demande n'efface pas la demande en cours.
  s.effacerDemandeAutorisation('ancienne');
  assert.equal(s.lireDemandeAutorisation().id, 'a1');
  assert.equal(prevenus, 1);

  // 4. La réponse est transmise au plugin, avec le bon id, et la bulle se ferme tout de suite.
  const reponses = [];
  s.definirRepondeurAutorisation((id, choix) => reponses.push([id, choix]));
  s.repondreAutorisationCanal('a1', 'cette_fois');
  assert.deepEqual(reponses, [['a1', 'cette_fois']]);
  assert.equal(s.lireDemandeAutorisation(), null);

  // 5. Un refus est transmis comme un refus.
  s.poserDemandeAutorisation({ id: 'a2', texte: '?' });
  s.repondreAutorisationCanal('a2', 'refuser');
  assert.deepEqual(reponses[1], ['a2', 'refuser']);

  // 5 bis. Les trois choix passent tels quels ; true et false des anciennes versions restent compris ;
  // tout le reste est un refus.
  s.poserDemandeAutorisation({ id: 'a2b', texte: '?' });
  s.repondreAutorisationCanal('a2b', 'toujours_appli');
  assert.deepEqual(reponses[2], ['a2b', 'toujours_appli']);
  s.poserDemandeAutorisation({ id: 'a2c', texte: '?' });
  s.repondreAutorisationCanal('a2c', true);
  assert.deepEqual(reponses[3], ['a2c', 'cette_fois']);
  s.poserDemandeAutorisation({ id: 'a2d', texte: '?' });
  s.repondreAutorisationCanal('a2d', false);
  assert.deepEqual(reponses[4], ['a2d', 'refuser']);
  s.poserDemandeAutorisation({ id: 'a2e', texte: '?' });
  s.repondreAutorisationCanal('a2e', 'piege');
  assert.deepEqual(reponses[5], ['a2e', 'refuser']);

  // 5 ter. Les boutons venant du plugin sont filtrés : seuls les choix connus passent.
  assert.deepEqual(s.boutonsAutorisationValides(['cette_fois', 'piege', 'refuser', 'cette_fois']), ['cette_fois', 'refuser']);
  assert.equal(s.boutonsAutorisationValides(['piege']), undefined);
  assert.equal(s.boutonsAutorisationValides('cette_fois'), undefined);
  assert.equal(s.boutonsAutorisationValides(undefined), undefined);

  // 6. Sans transmetteur branché, répondre ne plante pas.
  s.definirRepondeurAutorisation(null);
  s.poserDemandeAutorisation({ id: 'a3', texte: '?' });
  s.repondreAutorisationCanal('a3', true);
  assert.equal(s.lireDemandeAutorisation(), null);

  // 7. Fermeture de la fenêtre : efface quelle que soit la demande.
  s.poserDemandeAutorisation({ id: 'a4', texte: '?' });
  s.effacerDemandeAutorisation(null);
  assert.equal(s.lireDemandeAutorisation(), null);

  // 8. Effacer sans demande ne prévient personne pour rien.
  const avant = prevenus;
  s.effacerDemandeAutorisation(null);
  assert.equal(prevenus, avant);

  desabonner();
  s.poserDemandeAutorisation({ id: 'a5', texte: '?' });
  s.effacerDemandeAutorisation(null);

  // Bandeau Autoriser / Refuser.
  // Un seul fichier autonome : React, lucide et le bandeau sont regroupés, pour que le test
  // ne dépende pas de l'endroit où il est écrit.
  const sortieBandeau = join(dossier, 'bandeau.cjs');
  await build({
    stdin: {
      contents: `
        import { createElement } from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { BandeauAutorisationAgent } from './components/BandeauAutorisationAgent';
        export const rendre = (texte, boutons, risque) => renderToStaticMarkup(createElement(BandeauAutorisationAgent, { texte, boutons, risque, onChoix: () => {} }));
      `,
      resolveDir: racine,
      loader: 'tsx',
    },
    outfile: sortieBandeau, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', logLevel: 'silent', absWorkingDir: racine,
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const module_ = await import(pathToFileURL(sortieBandeau).href);
  const rendre = module_.rendre ?? module_.default.rendre;
  const html = rendre('Clovis veut écrire dans Windows PowerShell. Autoriser cette fois ?');
  // 9. Le message, les deux boutons, et rien d'autre à cliquer.
  assert.match(html, /Clovis veut écrire dans Windows PowerShell\. Autoriser cette fois \?/);
  assert.match(html, />Autoriser cette fois seulement</);
  assert.match(html, />Refuser</);
  assert.equal((html.match(/<button/g) ?? []).length, 2, 'sans boutons précisés : les deux boutons d\'origine');
  assert.equal(html.includes('role="alert"'), false, 'pas d\'avertissement quand rien à signaler');
  assert.equal(html.includes('Toujours autoriser'), false);
  // 9 bis. Application normale : trois boutons, dans l'ordre reçu.
  const normal = rendre('Classinus veut regarder Bloc-notes.', ['cette_fois', 'toujours_appli', 'refuser']);
  assert.equal((normal.match(/<button/g) ?? []).length, 3);
  assert.match(normal, />Toujours autoriser pour cette appli</);
  assert.ok(normal.indexOf('Autoriser cette fois seulement') < normal.indexOf('Toujours autoriser pour cette appli'));
  assert.ok(normal.indexOf('Toujours autoriser pour cette appli') < normal.indexOf('Refuser'));
  // 9 ter. Application sensible : deux boutons seulement et l'avertissement au-dessus des boutons.
  const sensible = rendre('Classinus veut écrire dans PowerShell.', ['cette_fois', 'refuser'], 'Cette application est sensible.');
  assert.equal((sensible.match(/<button/g) ?? []).length, 2);
  assert.equal(sensible.includes('Toujours autoriser'), false);
  assert.match(sensible, /role="alert"[^>]*>.*Cette application est sensible\./);
  assert.ok(sensible.indexOf('Cette application est sensible.') < sensible.indexOf('<button'));
  // 9 quater. L'avertissement venant du système n'est jamais interprété comme du code HTML.
  assert.equal(rendre('?', ['refuser'], '<img src=x onerror=alert(1)>').includes('<img'), false);
  // 10. Un texte venant du système n'est jamais interprété comme du code HTML.
  const piege = rendre('<img src=x onerror=alert(1)>');
  assert.equal(piege.includes('<img'), false);
  assert.match(piege, /&lt;img/);

  console.log('OK : demande d\'accord (magasin, reponse transmise, fermeture) et bandeau (cette fois seulement, toujours pour cette appli, refuser).');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
