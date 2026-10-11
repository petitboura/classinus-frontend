// Test du crayon, lot 4 : la phrase envoyée au grand modèle et le message de la bulle quand
// rien n'est lisible. Module pur : tourne sur n'importe quel système, sans Electron.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-phrase-'));
try {
  const sortie = join(dossier, 'phrase.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../lib/phraseCrayon.ts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent', alias: { '@': resolve(import.meta.dirname, '..') } });
  const { composerPhraseCrayon, TEXTE_BULLE_RIEN_LISIBLE, TEXTE_BULLE_FENETRE_CLASSINUS, TEXTE_BULLE_LECTURE_IMPOSSIBLE } = await import(pathToFileURL(sortie).href);

  const el = (type, nom, valeur = null, extra = {}) => ({ type, nom, valeur, valeur_masquee: false, etats: [], x: 0, y: 0, gauche: 0, haut: 0, largeur: 10, hauteur: 10, ...extra });
  const lecture = (elements, extra = {}) => ({ titre_fenetre_active: 'Cours.txt - Bloc-notes', application: 'notepad', fenetre_classinus: false, elements, zones: [], coupe: false, mode: 'uia', ...extra });

  // 1. Éléments lisibles : phrase avec leur type et leur nom, la fenêtre, pas de message de bulle.
  let r = composerPhraseCrayon(lecture([el('bouton', 'Valider'), el('texte', 'La dérivée d\'une fonction…')]), '');
  assert.equal(r.message, 'L\'étudiant a entouré dans la fenêtre « Cours.txt - Bloc-notes » : bouton « Valider », texte « La dérivée d\'une fonction… ».');
  assert.equal(r.messageBulle, null);

  // 2. La question de l'étudiant suit la phrase ; une question vide ou faite d'espaces est ignorée.
  r = composerPhraseCrayon(lecture([el('bouton', 'Valider')]), '  Que fait ce bouton ?  ');
  assert.ok(r.message.endsWith('\n\nQue fait ce bouton ?'));
  r = composerPhraseCrayon(lecture([el('bouton', 'Valider')]), '   ');
  assert.ok(!r.message.includes('\n'));

  // 3. Champ avec une valeur, valeur seule, valeur identique au nom.
  r = composerPhraseCrayon(lecture([el('champ', 'Nom', 'Boumi'), el('document', '', 'Bonjour'), el('texte', 'Salut', 'Salut')]), '');
  assert.ok(r.message.includes('champ « Nom » contenant « Boumi »'));
  assert.ok(r.message.includes('document contenant « Bonjour »'));
  assert.ok(r.message.includes('texte « Salut »') && !r.message.includes('contenant « Salut »'));

  // 4. Champ masqué (mot de passe) : jamais son contenu.
  r = composerPhraseCrayon(lecture([el('champ', '', 'secret', { valeur_masquee: true })]), '');
  assert.ok(r.message.includes('champ masqué') && !r.message.includes('secret'));

  // 5. Doublons écartés ; au delà de 10 éléments, le reste est compté.
  const beaucoup = Array.from({ length: 13 }, (_, i) => el('bouton', `B${i}`));
  r = composerPhraseCrayon(lecture([...beaucoup, el('bouton', 'B0')]), '');
  assert.equal(r.message.split('« B0 »').length - 1, 1);
  assert.ok(r.message.endsWith(' et 3 autres éléments.'));
  r = composerPhraseCrayon(lecture(Array.from({ length: 11 }, (_, i) => el('bouton', `B${i}`))), '');
  assert.ok(r.message.endsWith(' et un autre élément.'));

  // 6. Noms et titres trop longs coupés.
  r = composerPhraseCrayon(lecture([el('texte', 'x'.repeat(200))], { titre_fenetre_active: 't'.repeat(200) }), '');
  assert.ok(r.message.length < 300);

  // 7. Rien de lisible (image, schéma) : un endroit entouré, et la bulle le dit.
  r = composerPhraseCrayon(lecture([]), 'Explique ce schéma');
  assert.ok(r.message.startsWith('L\'étudiant a entouré un endroit de l\'écran dans la fenêtre'));
  assert.ok(r.message.includes('aucun texte lisible'));
  assert.ok(r.message.endsWith('\n\nExplique ce schéma'));
  assert.equal(r.messageBulle, TEXTE_BULLE_RIEN_LISIBLE);
  // Éléments sans nom ni valeur : même cas.
  r = composerPhraseCrayon(lecture([el('zone', ''), el('bouton', '   ')]), '');
  assert.equal(r.messageBulle, TEXTE_BULLE_RIEN_LISIBLE);

  // 8. Fenêtre de Classinus : pas encore lue, la bulle le dit.
  r = composerPhraseCrayon(lecture([], { fenetre_classinus: true }), '');
  assert.equal(r.message, 'L\'étudiant a entouré un endroit de l\'écran, dans Classinus.');
  assert.equal(r.messageBulle, TEXTE_BULLE_FENETRE_CLASSINUS);

  // 9. Lecture impossible : le message part quand même, la bulle prévient. Aucun trait : rien.
  r = composerPhraseCrayon({ erreur: 'indisponible', detail: 'x' }, 'Aide moi');
  assert.equal(r.messageBulle, TEXTE_BULLE_LECTURE_IMPOSSIBLE);
  assert.ok(r.message.includes('Aide moi'));
  assert.equal(composerPhraseCrayon({ erreur: 'aucun_trait' }, 'x'), null);

  // 10. Tout ce que la lecture voit part au grand modèle, ce qui est entouré d'abord.
  r = composerPhraseCrayon(lecture([el('bouton', 'Valider', null, { entoure: true }), el('menu', 'Fichier', null, { entoure: false }), el('texte', 'Titre du cours', null, { entoure: false })]), '');
  assert.ok(r.message.startsWith('L\'étudiant a entouré dans la fenêtre « Cours.txt - Bloc-notes » : bouton « Valider ».'));
  assert.ok(r.message.includes('Tout le reste de ce que la lecture de la fenêtre voit : menu « Fichier », texte « Titre du cours ».'));
  assert.equal(r.messageBulle, null);
  // Rien d'entouré de lisible, mais le reste de la fenêtre part quand même (image entourée).
  r = composerPhraseCrayon(lecture([el('menu', 'Fichier', null, { entoure: false })]), 'Que vois-tu ?');
  assert.ok(r.message.includes('aucun texte lisible') && r.message.includes('menu « Fichier »') && r.message.endsWith('\n\nQue vois-tu ?'));
  assert.equal(r.messageBulle, TEXTE_BULLE_RIEN_LISIBLE);
  // Un élément entouré n'est pas répété dans le reste ; au delà de 80, le reste est compté.
  r = composerPhraseCrayon(lecture([el('bouton', 'A', null, { entoure: true }), el('bouton', 'A', null, { entoure: false }), ...Array.from({ length: 82 }, (_, i) => el('lien', `L${i}`, null, { entoure: false }))]), '');
  assert.equal(r.message.split('bouton « A »').length - 1, 1);
  assert.ok(r.message.endsWith(' et 2 autres éléments.'));

  // Texte exact lu sous le trait : il part en entier (jusqu'à 600 caractères), pas les 120 d'une valeur.
  r = composerPhraseCrayon(lecture([el('champ', 'Zone de texte', 'Debut du cours. '.repeat(30), { entoure: true, texte_entoure: 'La derivee de f en a est la limite du taux' })]), '');
  assert.ok(r.message.includes('champ « Zone de texte », texte entouré : « La derivee de f en a est la limite du taux »'));
  assert.ok(!r.message.includes('Debut du cours'));
  r = composerPhraseCrayon(lecture([el('champ', '', null, { entoure: true, texte_entoure: 'x'.repeat(700) })]), '');
  assert.ok(r.message.includes('texte entouré : « ' + 'x'.repeat(599)) && !r.message.includes('x'.repeat(601)));

  // 11. Aucun texte affiché ne contient de double tiret.
  for (const t of [TEXTE_BULLE_RIEN_LISIBLE, TEXTE_BULLE_FENETRE_CLASSINUS, TEXTE_BULLE_LECTURE_IMPOSSIBLE]) assert.ok(!t.includes('--'));

  console.log('phrase du crayon : 13 verifications ok');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
