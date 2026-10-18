// Crayon (11/10/2026) : les traits ne s'estompent jamais avant l'envoi, seulement 10 secondes
// après l'envoi ; un trait terminé est signalé (la zone d'écriture s'ouvre alors toute seule).
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-traits-'));
const sortie = join(dossier, 'crayon.mjs');
// React n'est pas utile ici : une doublure suffit pour charger le module hors navigateur.
const doublureReact = join(dossier, 'react.mjs');
await writeFile(doublureReact, 'export const useSyncExternalStore = () => null;');
await build({ entryPoints: [resolve('lib/crayonEcran.ts')], bundle: true, platform: 'node', format: 'esm', outfile: sortie, alias: { react: doublureReact }, logLevel: 'error' });
mock.timers.enable({ apis: ['setTimeout'] });
const c = await import(pathToFileURL(sortie).href);
let n = 0;
const ok = (nom, cond) => { assert.ok(cond, nom); n += 1; };
const tracer = () => { c.commencerTrait(10, 10); c.ajouterPoint(60, 60); c.terminerTrait(); };

try {
  c.basculerCrayon();
  c.commencerTrait(10, 10);
  ok('pendant le trait : dessine', c.lireEtatCrayon().dessine === true);
  c.ajouterPoint(60, 60);
  c.terminerTrait();
  ok('trait fini : plus dessine, trait gardé', c.lireEtatCrayon().dessine === false && c.lireEtatCrayon().traits.length === 1);

  // Rien n'est envoyé : aucun effacement automatique, même longtemps après.
  mock.timers.tick(60000);
  ok('pas envoyé : reste affiché après 60 s', c.lireEtatCrayon().visibles === true && c.lireEtatCrayon().restaurable === false);

  // Envoi : estompage 10 s plus tard.
  c.marquerTraitsEnvoyes();
  mock.timers.tick(9000);
  ok('envoyé : encore affiché avant 10 s', c.lireEtatCrayon().visibles === true);
  mock.timers.tick(1500);
  ok('envoyé : estompé après 10 s, rappelable', c.lireEtatCrayon().visibles === false && c.lireEtatCrayon().restaurable === true);

  // Retour : le dessin reste (non envoyé de nouveau) jusqu'au prochain envoi.
  c.rappelerTraits();
  mock.timers.tick(60000);
  ok('rappelé : reste affiché, pas d\'effacement automatique', c.lireEtatCrayon().visibles === true);
  ok('rappelé : à joindre au prochain message', c.traitsAJoindre(c.lireEtatCrayon()));

  // Un nouveau trait pendant le délai d'estompage annule l'estompage.
  c.marquerTraitsEnvoyes();
  mock.timers.tick(5000);
  c.commencerTrait(5, 5);
  c.ajouterPoint(50, 50);
  c.terminerTrait();
  mock.timers.tick(60000);
  ok('nouveau trait avant la fin du délai : rien ne s\'estompe', c.lireEtatCrayon().visibles === true && c.lireEtatCrayon().traits.length === 2);

  // Effacement à la main : toujours rappelable.
  c.effacerTraits();
  ok('effacé à la main : rappelable', c.lireEtatCrayon().visibles === false && c.lireEtatCrayon().restaurable === true);
  c.rappelerTraits();
  ok('retour après effacement à la main', c.lireEtatCrayon().visibles === true && c.lireEtatCrayon().traits.length === 2);

  // Ranger le crayon au milieu d'un trait le termine.
  c.reinitialiserCrayon();
  c.basculerCrayon();
  c.commencerTrait(1, 1);
  c.basculerCrayon();
  ok('crayon rangé en plein trait : plus dessine', c.lireEtatCrayon().dessine === false);
  // Échec de lecture à l'envoi (18/10/2026) : le dessin marqué envoyé revient à l'écran, à joindre.
  c.reinitialiserCrayon();
  c.basculerCrayon();
  tracer();
  c.marquerTraitsEnvoyes();
  ok('envoyé : plus à joindre', c.traitsAJoindre(c.lireEtatCrayon()) === false);
  c.annulerEnvoiTraits();
  ok('envoi annulé : à joindre de nouveau, affiché', c.traitsAJoindre(c.lireEtatCrayon()) === true && c.lireEtatCrayon().visibles === true && c.lireEtatCrayon().envoyes === false);
  mock.timers.tick(60000);
  ok('envoi annulé : plus d\'estompage programmé', c.lireEtatCrayon().visibles === true);
  // Sans effet si l'étudiant a effacé les traits lui même pendant la lecture.
  c.marquerTraitsEnvoyes();
  c.effacerTraits();
  c.annulerEnvoiTraits();
  ok('effacé à la main pendant la lecture : on ne les remet pas', c.lireEtatCrayon().visibles === false && c.traitsAJoindre(c.lireEtatCrayon()) === false);
  // Sans effet s'il n'y a rien d'envoyé.
  c.reinitialiserCrayon();
  c.annulerEnvoiTraits();
  ok('rien à annuler : état inchangé', c.lireEtatCrayon().traits.length === 0);
  console.log(`traits du crayon : ${n} verifications ok`);
} finally {
  mock.timers.reset();
  await rm(dossier, { recursive: true, force: true });
}
process.exit(0);
