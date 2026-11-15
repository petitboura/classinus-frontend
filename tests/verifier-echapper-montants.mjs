// Montants d'argent et LaTeX (14/11/2026, demande de Bourama).
// Vérifie lib/echapperMontants.ts (module pur) :
// 1. les montants reçoivent "\$" (style anglais "$5", style français "0.01$" et "3,50 $") ;
// 2. les formules, le code et les "$" déjà échappés ne changent pas ;
// 3. la fonction est idempotente (la repasser ne change plus rien) ;
// 4. de bout en bout : avec remark-math, le texte du bug signalé ne contient plus de formule.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const racine = resolve(import.meta.dirname, '..');
const dossier = await mkdtemp(join(tmpdir(), 'classinus-montants-'));

try {
  const sortie = join(dossier, 'montants.mjs');
  await build({
    entryPoints: [join(racine, 'lib/echapperMontants.ts')],
    outfile: sortie,
    bundle: true,
    platform: 'node',
    format: 'esm',
  });
  const { echapperMontants } = await import(pathToFileURL(sortie).href);

  // 1. Montants : le "$" reçoit un antislash
  const montants = [
    // Le texte du bug signalé.
    [
      '**0.01$/min** (0.60$/h) si tu apportes ton LLM, **~0.058$/min** (3.50$/h) en Napster-hosted.',
      '**0.01\\$/min** (0.60\\$/h) si tu apportes ton LLM, **~0.058\\$/min** (3.50\\$/h) en Napster-hosted.',
    ],
    ['Le prix est $5 par mois', 'Le prix est \\$5 par mois'],
    ['Entre $5 et $10', 'Entre \\$5 et \\$10'],
    ['Comptez 3,50 $ par heure', 'Comptez 3,50 \\$ par heure'],
    ['Comptez 3,50\u00a0$ par heure', 'Comptez 3,50\u00a0\\$ par heure'],
    ['De $20 - $30 par mois', 'De \\$20 - \\$30 par mois'],
    ['Au total **$5**', 'Au total **\\$5**'],
    ['Soit $1,000.50/an', 'Soit \\$1,000.50/an'],
    ['Un salaire de $5k par an', 'Un salaire de \\$5k par an'],
    ['Coût : $5.', 'Coût : \\$5.'],
    ['Coût : 5$.', 'Coût : 5\\$.'],
    // Un montant après une formule du même paragraphe.
    ['La formule $x=5$ coûte 5$/min', 'La formule $x=5$ coûte 5\\$/min'],
    // Un paragraphe oublié ouvert ne contamine pas le suivant.
    ['pour $x vaut\n\nprix 5$/min', 'pour $x vaut\n\nprix 5\\$/min'],
  ];
  for (const [entree, attendu] of montants) {
    assert.equal(echapperMontants(entree), attendu, `montant : ${JSON.stringify(entree)}`);
  }

  // 2. Formules, code, "$" déjà échappés : rien ne change
  const inchanges = [
    'Aucun dollar ici',
    '$x^2$',
    'Soit $a_1 + 5$ puis $y$',
    '$2 + 3$ puis la suite',
    '$5$',
    '$2$ et $3$',
    '$x = 5$',
    '$3x + 2$',
    '$7 - 3 = 4$',
    '$2(x+1)$',
    '$5 \\times 3$',
    '$f(x) = 2x$ et $g(x) = 3$',
    '$$\\int_0^1 5 dx$$',
    '$$\n5 + 3\n$$',
    'Une formule \\(x^2\\) et \\[5 + 3\\]',
    'Déjà échappé : \\$5 et 5\\$/min',
    'Du code `$5 par mois` en ligne',
    '```js\nconst prix = "$5";\nconst t = "0.01$/min";\n```',
  ];
  for (const entree of inchanges) {
    assert.equal(echapperMontants(entree), entree, `inchangé : ${JSON.stringify(entree)}`);
  }

  // 3. Idempotence
  for (const [entree] of montants) {
    const une = echapperMontants(entree);
    assert.equal(echapperMontants(une), une, `idempotent : ${JSON.stringify(entree)}`);
  }

  // 4. De bout en bout avec remark-math
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { default: remarkMath } = await import('remark-math');
  const { default: remarkRehype } = await import('remark-rehype');
  const { default: rehypeStringify } = await import('rehype-stringify');
  const rendre = async (texte) =>
    String(
      await unified().use(remarkParse).use(remarkMath).use(remarkRehype).use(rehypeStringify).process(texte)
    );

  const bug = '**0.01$/min** (0.60$/h) si tu apportes ton LLM, **~0.058$/min** (3.50$/h) en Napster-hosted.';
  const avant = await rendre(bug);
  assert.ok(/math-inline/.test(avant), 'le bug doit exister sans la correction (sinon ce test ne prouve rien)');
  const apres = await rendre(echapperMontants(bug));
  assert.ok(!/math-inline/.test(apres), `plus aucune formule : ${apres}`);
  assert.ok(apres.includes('<strong>0.01$/min</strong>'), `gras et montant intacts : ${apres}`);
  assert.ok(apres.includes('<strong>~0.058$/min</strong>'), `second gras intact : ${apres}`);

  const formule = await rendre(echapperMontants('Soit $x^2$ pour 5$/min'));
  assert.equal((formule.match(/math-inline/g) ?? []).length, 1, `une seule formule : ${formule}`);

  console.log('OK : montants échappés, formules et code inchangés, rendu vérifié avec remark-math.');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
