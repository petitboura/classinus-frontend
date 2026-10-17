// Lecteur YouTube dans l'appli PC (17/10/2026, demande de Bourama : la video ne se lisait pas).
// YouTube exige l'en-tete Referer ; le protocole maison de l'appli n'en envoie aucun. Module pur :
// tourne sans Electron (le module "electron" est remplace par un faux qui garde le rappel).
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const racine = resolve(import.meta.dirname, '..');
const dossier = await mkdtemp(join(tmpdir(), 'classinus-youtube-'));
try {
  const fauxElectron = join(dossier, 'faux-electron.mjs');
  await writeFile(
    fauxElectron,
    "globalThis.appelsYoutube = []; export const session = { defaultSession: { webRequest: { onBeforeSendHeaders(filtre, rappel) { globalThis.appelsYoutube.push({ filtre, rappel }); } } } };"
  );
  const sortie = join(dossier, 'referer.mjs');
  await build({
    entryPoints: [join(racine, 'electron/refererYoutube.ts')],
    outfile: sortie,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    alias: { electron: fauxElectron },
  });
  const m = await import(pathToFileURL(sortie).href);

  // 1. Le Referer est une adresse https dont le domaine est l'identifiant de l'appli.
  const config = await readFile(join(racine, 'electron/electron-builder.config.js'), 'utf8');
  const appId = config.match(/appId:\s*'([^']+)'/)?.[1];
  assert.ok(appId, "appId introuvable dans electron-builder.config.js");
  assert.equal(new URL(m.REFERER_YOUTUBE).protocol, 'https:');
  assert.equal(new URL(m.REFERER_YOUTUBE).hostname, appId);

  // 2. En-tetes : Referer ajoute ou remplace (quelle que soit la casse), le reste intact.
  const sans = m.ajouterRefererYoutube({ 'User-Agent': 'x', Accept: '*/*' });
  assert.deepEqual(sans, { 'User-Agent': 'x', Accept: '*/*', Referer: m.REFERER_YOUTUBE });
  const avec = m.ajouterRefererYoutube({ referer: 'capacitor-electron://localhost/', REFERER: 'autre', Accept: '*/*' });
  assert.deepEqual(avec, { Accept: '*/*', Referer: m.REFERER_YOUTUBE });
  const origine = { Referer: 'a' };
  m.ajouterRefererYoutube(origine);
  assert.deepEqual(origine, { Referer: 'a' }, "les en-tetes d'origine ne doivent pas etre modifies");

  // 3. Installation : seulement les pages du lecteur YouTube, et le rappel renvoie le bon en-tete.
  m.installerRefererYoutube();
  assert.equal(globalThis.appelsYoutube.length, 1);
  assert.deepEqual(globalThis.appelsYoutube[0].filtre.urls, ['https://www.youtube.com/embed/*', 'https://www.youtube-nocookie.com/embed/*']);
  let recu;
  globalThis.appelsYoutube[0].rappel({ requestHeaders: { Accept: '*/*' } }, (reponse) => { recu = reponse; });
  assert.equal(recu.requestHeaders.Referer, m.REFERER_YOUTUBE);

  // 4. La politique de securite autorise toujours les iframes YouTube (sinon rien ne s'affiche).
  const csp = await readFile(join(racine, 'electron/capacitor.electron.config.ts'), 'utf8');
  assert.ok(csp.includes('frame-src https://www.youtube.com https://www.youtube-nocookie.com'));

  // 5. Branchement : le principal installe la regle avant de creer les fenetres, et les deux
  // lecteurs integres gardent une regle de renvoi d'adresse compatible avec YouTube.
  const principal = await readFile(join(racine, 'electron/main.ts'), 'utf8');
  const posInstall = principal.indexOf('installerRefererYoutube();');
  assert.ok(posInstall > 0, 'installerRefererYoutube non appele dans main.ts');
  assert.ok(posInstall < principal.indexOf('new BrowserWindow('), 'regle installee apres la creation des fenetres');
  for (const fichier of ['components/chat/LinkPreview.tsx', 'components/chat/CartesVideosBulle.tsx']) {
    const source = await readFile(join(racine, fichier), 'utf8');
    assert.ok(source.includes('referrerPolicy="strict-origin-when-cross-origin"'), `${fichier} sans referrerPolicy`);
  }

  // 6. Focus de la superposition : apres un clic hors champ de texte, la fenetre du dessous
  // reprend la main ; si un champ de texte a le focus, rien ne change.
  const page = await readFile(join(racine, 'app/agent-superposition/PageAgentSuperpositionClient.tsx'), 'utf8');
  const bloc = page.match(/function surRelacheClic\(\) \{([\s\S]*?)\n    \}/)?.[1] ?? '';
  assert.ok(bloc.includes('document.activeElement'), 'surRelacheClic ne regarde pas le champ actif');
  assert.ok(bloc.includes('estZoneDeTexte') && bloc.includes('return;'), 'surRelacheClic ne protege pas la frappe');
  assert.ok(bloc.includes('definirSaisieTexteSuperposition(false)'), 'surRelacheClic ne rend pas le focus');
  assert.ok(page.includes('document.addEventListener("pointerup", surRelacheClic, true)'), 'ecouteur de clic absent');
  assert.ok(page.includes('document.removeEventListener("pointerup", surRelacheClic, true)'), 'ecouteur de clic jamais retire');

  console.log('Lecteur YouTube et focus apres clic : verifications reussies.');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
