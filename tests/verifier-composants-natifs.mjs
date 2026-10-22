// Garde-fou du 22/10/2026 (demande Bourama) : plus jamais de liste déroulante
// ni de case à cocher du navigateur dans l'appli. Elles sont dessinées par le
// système, pas par notre thème. Utiliser SelectPersonnalise et CaseACocher.
// Lancé automatiquement avant chaque build (voir "prebuild" dans package.json) :
// si un composant natif réapparaît, le build s'arrête avec le fichier et la ligne.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '..');
const DOSSIERS = ['app', 'components'];
const AUTORISES = new Set(['components/SelectPersonnalise.tsx', 'components/CaseACocher.tsx']);

function fichiers(dossier) {
  const sortie = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin));
    else if (/\.(tsx|jsx)$/.test(nom)) sortie.push(chemin);
  }
  return sortie;
}

// Les commentaires sont remplacés par des espaces (sauts de ligne gardés)
// pour que les numéros de ligne restent justes.
function sansCommentaires(texte) {
  return texte
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, avant) => avant + ' '.repeat(m.length - avant.length));
}

const MOTIFS = [
  { regex: /<select[\s>]/g, quoi: 'liste déroulante native <select>', remede: 'SelectPersonnalise' },
  { regex: /<input\b[^>]*?\btype\s*=\s*(?:["']checkbox["']|\{\s*["']checkbox["']\s*\})/g, quoi: 'case à cocher native <input type="checkbox">', remede: 'CaseACocher' },
];

const problemes = [];
for (const dossier of DOSSIERS) {
  for (const fichier of fichiers(join(racine, dossier))) {
    const rel = relative(racine, fichier).split('\\').join('/');
    if (AUTORISES.has(rel)) continue;
    const texte = sansCommentaires(readFileSync(fichier, 'utf8'));
    for (const { regex, quoi, remede } of MOTIFS) {
      for (const m of texte.matchAll(regex)) {
        const ligne = texte.slice(0, m.index).split('\n').length;
        problemes.push(`${rel}:${ligne}  ${quoi}, utiliser ${remede}`);
      }
    }
  }
}

if (problemes.length) {
  console.error('Composants natifs interdits (non thémés) :\n' + problemes.map((p) => '  ' + p).join('\n'));
  process.exit(1);
}
console.log('Aucune liste ni case à cocher native.');
