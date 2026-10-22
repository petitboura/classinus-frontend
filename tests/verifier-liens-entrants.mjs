// Liens qui ouvrent l'appli (21/10/2026, demande de Bourama).
// Vérifie sans Android ni Windows :
// 1. la lecture des liens (lib/liensEntrants.ts, module pur) ;
// 2. que la liste de pages déclarée dans AndroidManifest.xml suit les pages de app/,
//    sans jamais déclarer une page exclue (ex. /oauth) ;
// 3. que le protocole de l'appli PC est le même que celui du code ;
// 4. que le fichier de vérification Android est bien formé et vise les bons paquets.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const racine = resolve(import.meta.dirname, '..');
const dossier = await mkdtemp(join(tmpdir(), 'classinus-liens-'));

try {
  // ---- 1. Lecture des liens -------------------------------------------------
  // lib/ouvertureParUrl.ts importe lib/api.ts (réseau, Supabase) : remplacé par un faux,
  // seules les adresses fabriquées par ouvertureParUrl servent ici.
  const fauxApi = {
    name: 'faux-api',
    setup(b) {
      b.onResolve({ filter: /^@\/lib\/api$/ }, () => ({ path: 'faux-api', namespace: 'faux' }));
      b.onLoad({ filter: /.*/, namespace: 'faux' }, () => ({
        contents: 'export const obtenirDossierCataloguePublic = async () => ({});',
        loader: 'js',
      }));
    },
  };
  const sortie = join(dossier, 'liens.mjs');
  await build({
    entryPoints: [join(racine, 'lib/liensEntrants.ts')],
    outfile: sortie,
    bundle: true,
    platform: 'node',
    format: 'esm',
    alias: { '@': racine },
    plugins: [fauxApi],
    logLevel: 'error',
  });
  process.env.NEXT_PUBLIC_APP_URL = 'https://classinus.com';
  const liens = await import(pathToFileURL(sortie).href);
  const { lireLienEntrant, adresseOuvertureAppliPc, SCHEMA_LIEN_APPLI, PREFIXES_NON_OUVERTS_DANS_APPLI } = liens;

  const attendu = (url, chemin, hash = '') => assert.deepEqual(lireLienEntrant(url), { chemin, hash }, url);
  const refuse = (url) => assert.equal(lireLienEntrant(url), null, `doit être refusé : ${url}`);

  attendu('https://classinus.com/', '/');
  attendu('https://classinus.com', '/');
  attendu('https://classinus.com/bibliotheque/publique?fichier=abc', '/bibliotheque/publique?fichier=abc');
  attendu('https://CLASSINUS.com/memoire', '/memoire');
  attendu(
    'https://classinus.com/reinitialiser-mot-de-passe#access_token=a&refresh_token=b&type=recovery',
    '/reinitialiser-mot-de-passe',
    '#access_token=a&refresh_token=b&type=recovery'
  );
  attendu(
    'https://classinus.com/reinitialiser-mot-de-passe#error=access_denied&error_code=otp_expired',
    '/reinitialiser-mot-de-passe',
    '#error=access_denied&error_code=otp_expired'
  );
  attendu('classinus://app/skills-publics?skill=x', '/skills-publics?skill=x');
  attendu('classinus://app', '/');
  attendu('classinus://app/', '/');
  // Les ".." sont résolus par l'analyse d'adresse : le résultat reste un chemin interne.
  attendu('classinus://app/../x', '/x');

  // Anciennes adresses de partage, traduites comme le fait le site.
  attendu('https://classinus.com/bibliotheque/123', '/bibliotheque/publique?fichier=123');
  attendu('https://classinus.com/dossiers/9', '/bibliotheque/publique?dossier=9');
  attendu('https://classinus.com/skills/s1', '/skills-publics?skill=s1');
  attendu('https://classinus.com/bibliotheque/perso', '/bibliotheque/perso');

  // Pas pour nous.
  refuse('https://evil.com/memoire');
  refuse('https://classinus.com.evil.com/');
  refuse('http://classinus.com/');
  refuse('classinusmobile://connexion?code=1');
  refuse('classinusmobile://oauth-callback?x=1');
  refuse('classinus://autre/x');
  refuse('https://classinus.com//evil.com');
  refuse('classinus://app//evil.com');
  refuse('javascript:alert(1)');
  refuse('pas une adresse');
  refuse('');
  for (const prefixe of PREFIXES_NON_OUVERTS_DANS_APPLI) {
    refuse(`https://classinus.com${prefixe}`);
    refuse(`https://classinus.com${prefixe}/suite?a=1`);
    refuse(`classinus://app${prefixe}/suite`);
  }
  refuse('https://classinus.com/oauth/consent?authorization_id=1');

  // Aller-retour : le lien fabriqué pour le PC est relu à l'identique.
  const suite = '/bibliotheque/publique?fichier=abc%20def&dossier=2';
  assert.deepEqual(lireLienEntrant(adresseOuvertureAppliPc(suite)), { chemin: suite, hash: '' });

  // Sans NEXT_PUBLIC_APP_URL, aucun lien https n'est accepté (rien de deviné).
  assert.equal(lireLienEntrant('https://classinus.com/memoire', []), null);

  // ---- 2. AndroidManifest.xml ----------------------------------------------
  const manifeste = await readFile(join(racine, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
  const filtres = [...manifeste.matchAll(/<intent-filter android:autoVerify="true">([\s\S]*?)<\/intent-filter>/g)];
  assert.equal(filtres.length, 1, 'un seul intent-filter autoVerify attendu');
  const corps = filtres[0][1];
  assert.match(corps, /android:scheme="https" android:host="\$\{hoteLiensApp\}"/, 'hôte via manifestPlaceholders');
  assert.match(corps, /android\.intent\.category\.BROWSABLE/);
  assert.match(corps, /<data android:path="\/" \/>/, 'la page d\'accueil "/" doit être déclarée');
  const prefixesManifeste = [...corps.matchAll(/android:pathPrefix="([^"]+)"/g)].map((m) => m[1]).sort();

  async function routesPremierNiveau(base) {
    const trouvees = new Set();
    async function aUnePage(chemin) {
      for (const entree of await readdir(chemin, { withFileTypes: true })) {
        if (entree.isFile() && entree.name === 'page.tsx') return true;
        if (entree.isDirectory() && (await aUnePage(join(chemin, entree.name)))) return true;
      }
      return false;
    }
    async function parcourir(chemin) {
      for (const entree of await readdir(chemin, { withFileTypes: true })) {
        if (!entree.isDirectory()) continue;
        const nom = entree.name;
        if (nom.startsWith('(')) await parcourir(join(chemin, nom)); // groupe de routes : transparent
        else if (nom.startsWith('[') || nom.startsWith('_') || nom.startsWith('@')) continue;
        else if (await aUnePage(join(chemin, nom))) trouvees.add(`/${nom}`);
      }
    }
    await parcourir(base);
    return trouvees;
  }
  const routes = await routesPremierNiveau(join(racine, 'app'));
  const attenduManifeste = [...routes].filter((r) => !PREFIXES_NON_OUVERTS_DANS_APPLI.includes(r)).sort();
  assert.deepEqual(
    prefixesManifeste,
    attenduManifeste,
    'AndroidManifest.xml doit déclarer exactement les pages de app/ (hors PREFIXES_NON_OUVERTS_DANS_APPLI). ' +
      'Page ajoutée ou retirée dans app/ : mettre à jour la liste du filtre.'
  );
  for (const prefixe of PREFIXES_NON_OUVERTS_DANS_APPLI) {
    assert.ok(!prefixesManifeste.includes(prefixe), `${prefixe} ne doit pas être déclaré dans le manifeste`);
  }

  const gradle = await readFile(join(racine, 'android/app/build.gradle'), 'utf8');
  assert.match(gradle, /manifestPlaceholders = \[hoteLiensApp: "[a-z0-9.-]+"\]/, 'hoteLiensApp défini dans build.gradle');
  const hoteGradle = /hoteLiensApp: "([^"]+)"/.exec(gradle)[1];
  assert.equal(hoteGradle, new URL(process.env.NEXT_PUBLIC_APP_URL).host, 'hôte gradle = hôte du site');

  // ---- 3. Protocole de l'appli PC -------------------------------------------
  const configPc = await readFile(join(racine, 'electron/capacitor.electron.config.ts'), 'utf8');
  const schemaPc = /deepLinks:\s*\{\s*scheme:\s*'([^']+)'\s*\}/.exec(configPc);
  assert.ok(schemaPc, 'deepLinks absent de la config Electron');
  assert.equal(schemaPc[1], SCHEMA_LIEN_APPLI, 'le protocole Electron doit être celui de lib/liensEntrants.ts');
  assert.ok(!/singleInstance:\s*false/.test(configPc), "l'instance unique doit rester active");

  // ---- 4. assetlinks.json ---------------------------------------------------
  const chemin = join(racine, 'public/.well-known/assetlinks.json');
  assert.ok(existsSync(chemin), 'public/.well-known/assetlinks.json manquant');
  const declarations = JSON.parse(await readFile(chemin, 'utf8'));
  const paquets = declarations.map((d) => d.target.package_name).sort();
  const idApplication = /applicationId "([^"]+)"/.exec(gradle)[1];
  const suffixeExterne = /applicationIdSuffix "([^"]+)"/.exec(gradle)[1];
  assert.deepEqual(paquets, [idApplication, `${idApplication}${suffixeExterne}`].sort(), 'un paquet par saveur');
  for (const d of declarations) {
    assert.deepEqual(d.relation, ['delegate_permission/common.handle_all_urls']);
    assert.equal(d.target.namespace, 'android_app');
    assert.ok(d.target.sha256_cert_fingerprints.length >= 1);
    for (const empreinte of d.target.sha256_cert_fingerprints) {
      assert.match(empreinte, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/, `empreinte mal formée : ${empreinte}`);
    }
  }

  console.log('OK : liens entrants (lecture, manifeste Android, protocole PC, assetlinks).');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
