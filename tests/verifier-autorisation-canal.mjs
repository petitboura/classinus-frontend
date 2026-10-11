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
  s.definirRepondeurAutorisation((id, accepte) => reponses.push([id, accepte]));
  s.repondreAutorisationCanal('a1', true);
  assert.deepEqual(reponses, [['a1', true]]);
  assert.equal(s.lireDemandeAutorisation(), null);

  // 5. Un refus est transmis comme un refus.
  s.poserDemandeAutorisation({ id: 'a2', texte: '?' });
  s.repondreAutorisationCanal('a2', false);
  assert.deepEqual(reponses[1], ['a2', false]);

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
        export const rendre = (texte) => renderToStaticMarkup(createElement(BandeauAutorisationAgent, { texte, onAutoriser: () => {}, onRefuser: () => {} }));
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
  assert.match(html, />Autoriser cette fois</);
  assert.match(html, />Refuser</);
  assert.equal((html.match(/<button/g) ?? []).length, 2);
  // 10. Un texte venant du système n'est jamais interprété comme du code HTML.
  const piege = rendre('<img src=x onerror=alert(1)>');
  assert.equal(piege.includes('<img'), false);
  assert.match(piege, /&lt;img/);

  console.log('OK : demande d\'accord (magasin, reponse transmise, fermeture) et bandeau Autoriser / Refuser.');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
