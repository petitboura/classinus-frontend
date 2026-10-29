// Garde-fou du 29/10/2026 (demande Bourama) : plus jamais une couleur du thème qui n'existe pas.
// Une classe comme bg-dj-primaire ne produit RIEN quand "primaire" n'est pas défini dans
// tailwind.config.ts : le bouton se retrouve sans fond, avec du texte blanc, invisible en thème clair
// ou en thème sombre. Ici, chaque classe de couleur dj-... utilisée dans le code doit exister dans le
// thème. Lancé automatiquement avant chaque build (voir "prebuild" dans package.json) : sinon le build
// s'arrête avec le fichier et la ligne fautifs. Ne pas le contourner ni l'assouplir.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '..');
const DOSSIERS = ['app', 'components', 'lib'];

function fichiers(dossier) {
  const sortie = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin));
    else if (/\.(tsx|jsx|ts)$/.test(nom)) sortie.push(chemin);
  }
  return sortie;
}

// Les commentaires sont remplacés par des espaces (sauts de ligne gardés) : numéros de ligne justes.
function sansCommentaires(texte) {
  return texte
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, avant) => avant + ' '.repeat(m.length - avant.length));
}

// Les noms définis : couleurs du bloc "dj" et images de fond "dj-..." de tailwind.config.ts.
const config = readFileSync(join(racine, 'tailwind.config.ts'), 'utf8');
const debutDj = config.indexOf('dj: {', config.indexOf('colors:'));
if (debutDj < 0) {
  console.error('Bloc de couleurs "dj" introuvable dans tailwind.config.ts : le garde-fou ne peut pas vérifier.');
  process.exit(1);
}
let profondeur = 0;
let finDj = -1;
for (let i = debutDj + 3; i < config.length; i++) {
  if (config[i] === '{') profondeur++;
  else if (config[i] === '}') {
    profondeur--;
    if (profondeur === 0) { finDj = i; break; }
  }
}
const blocDj = config.slice(debutDj + 3, finDj);
const defini = new Set([...blocDj.matchAll(/^\s*"?([a-z0-9-]+)"?\s*:/gm)].map((m) => m[1]));
const debutImages = config.indexOf('backgroundImage:');
for (const m of config.slice(debutImages, debutImages + 4000).matchAll(/"dj-([a-z0-9-]+)"\s*:\s*"var/g)) defini.add(m[1]);

const PREFIXES = '(?:bg|text|border(?:-[trblxy])?|ring|ring-offset|fill|stroke|from|to|via|divide|outline|decoration|shadow|placeholder|caret|accent)';
const MOTIF = new RegExp(`(?<![A-Za-z0-9_-])${PREFIXES}-dj-([a-z0-9-]+?)(?:\\/[^\\s"'\`]+)?(?=[\\s"'\`)}\\]:,;]|$)`, 'g');

const problemes = [];
for (const dossier of DOSSIERS) {
  for (const fichier of fichiers(join(racine, dossier))) {
    const rel = relative(racine, fichier).split('\\').join('/');
    const texte = sansCommentaires(readFileSync(fichier, 'utf8'));
    for (const m of texte.matchAll(MOTIF)) {
      if (defini.has(m[1])) continue;
      const ligne = texte.slice(0, m.index).split('\n').length;
      problemes.push(`${rel}:${ligne}  couleur "dj-${m[1]}" inexistante dans tailwind.config.ts`);
    }
  }
}

if (problemes.length) {
  console.error('Couleurs du thème inexistantes (le style ne s\'appliquerait pas) :\n' + problemes.map((p) => '  ' + p).join('\n') + '\nCouleurs définies : ' + [...defini].sort().join(', '));
  process.exit(1);
}
console.log('Toutes les couleurs dj-... utilisées existent dans le thème.');
