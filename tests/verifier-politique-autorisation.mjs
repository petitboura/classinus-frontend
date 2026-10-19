// Test de la politique d'autorisation du canal PC (18/10/2026) : qui doit demander, quels boutons,
// ce qui est retenu (tâche, toujours), applications sensibles, conditions venues du serveur.
// Module pur : tourne partout, sans Electron ni Windows.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-politique-'));
try {
  const src = resolve(import.meta.dirname, '../packages/capacitor-pont-natif-electron/electron/src');
  const sortie = join(dossier, 'politique.mjs');
  await build({ entryPoints: [join(src, 'politiqueAutorisation.mts')], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const m = await import(pathToFileURL(sortie).href);

  const serveur = {
    autorisation: {
      active: true,
      applications_sensibles: ['PowerShell', '1Password.exe', '', 42],
      mots_titre_sensibles: ['Banque', '  paypal ', ''],
      applications_toujours: ['Notepad'],
    },
    applications_protegees: ['cmd'],
  };

  // 1. Sans le bloc du serveur, la politique est éteinte : tout passe, le plugin garde son ancien comportement.
  {
    for (const sans of [{}, { autorisation: null }, { autorisation: { active: false } }, { autorisation: { active: 'oui' } }, { autorisation: 'x' }]) {
      const p = m.politiqueDepuisParametres(sans);
      assert.equal(p.active, false);
      const accords = m.creerAccords();
      assert.deepEqual(m.decider({ politique: p, action: 'ecrire', cible: { application: 'powershell' }, accords }), { type: 'autorise' });
    }
    assert.equal(m.toujoursDepuisParametres({}), null);
    assert.equal(m.toujoursDepuisParametres({ autorisation: { active: true } }), null);
  }

  // 2. Les conditions sont lues telles que le serveur les envoie, nettoyées et sans doublon.
  {
    const p = m.politiqueDepuisParametres(serveur);
    assert.equal(p.active, true);
    assert.deepEqual(p.sensibles.sort(), ['1password', 'cmd', 'powershell'], 'applications_protegees reste sensible');
    assert.deepEqual(p.motsTitreSensibles, ['banque', 'paypal']);
    assert.deepEqual(p.actions, ['lire', 'ecrire', 'ouvrir', 'cliquer'], 'sans liste d\'actions : tout est soumis à accord');
    assert.equal(p.messageRisque, m.MESSAGE_RISQUE_PAR_DEFAUT);
    assert.equal(p.messageRisqueAction, m.MESSAGE_RISQUE_ACTION_PAR_DEFAUT);
    assert.deepEqual(m.toujoursDepuisParametres(serveur), ['notepad']);
    // Les textes et la liste d'actions peuvent être changés à distance.
    const p2 = m.politiqueDepuisParametres({ autorisation: { active: true, message_risque: ' Danger ', message_risque_action: 'Pense-y', actions: ['lire', 'piege', 'lire'] } });
    assert.equal(p2.messageRisque, 'Danger');
    assert.equal(p2.messageRisqueAction, 'Pense-y');
    assert.deepEqual(p2.actions, ['lire']);
  }

  // 3. Application normale : trois boutons ; « cette fois » vaut pour la tâche, y compris pour les clics.
  {
    const p = m.politiqueDepuisParametres(serveur);
    const accords = m.creerAccords();
    const cible = { application: 'Code.exe', titre: 'projet - Visual Studio Code' };
    const d = m.decider({ politique: p, action: 'lire', cible, accords });
    assert.equal(d.type, 'demander');
    assert.deepEqual(d.boutons, ['cette_fois', 'toujours_appli', 'refuser']);
    assert.equal(d.risque, null);
    assert.equal(d.sensible, false);
    // « Cette fois seulement » : accepté.
    assert.equal(m.appliquerChoix({ choix: 'cette_fois', cible, sensible: false, accords }), true);
    for (const action of ['lire', 'ecrire', 'ouvrir', 'cliquer']) {
      assert.equal(m.decider({ politique: p, action, cible, accords }).type, 'autorise', `${action} couvert pour la tâche`);
    }
    // Une autre application n'est pas couverte.
    assert.equal(m.decider({ politique: p, action: 'cliquer', cible: { application: 'chrome' }, accords }).type, 'demander');
    // Fin de la tâche : l'accord tombe, la question revient.
    accords.reinitialiserTache();
    assert.equal(m.decider({ politique: p, action: 'lire', cible, accords }).type, 'demander');
  }

  // 4. « Refuser » : rien n'est retenu, l'action ne continue pas.
  {
    const p = m.politiqueDepuisParametres(serveur);
    const accords = m.creerAccords();
    const cible = { application: 'code' };
    assert.equal(m.appliquerChoix({ choix: 'refuser', cible, sensible: false, accords }), false);
    assert.equal(m.decider({ politique: p, action: 'lire', cible, accords }).type, 'demander');
  }

  // 5. « Toujours pour cette appli » : retenu au-delà de la tâche, seulement pour CETTE application, et signalé.
  {
    const p = m.politiqueDepuisParametres(serveur);
    const retenus = [];
    const accords = m.creerAccords({ surToujours: (a) => retenus.push(a) });
    const cible = { application: 'C:\\Programmes\\Code.exe' };
    assert.equal(m.appliquerChoix({ choix: 'toujours_appli', cible, sensible: false, accords }), true);
    assert.deepEqual(retenus, ['code']);
    accords.reinitialiserTache();
    assert.equal(m.decider({ politique: p, action: 'cliquer', cible: { application: 'code' }, accords }).type, 'autorise', 'reste après la tâche');
    assert.equal(m.decider({ politique: p, action: 'cliquer', cible: { application: 'codex' }, accords }).type, 'demander', 'pas de correspondance partielle');
    // Même choix refait : pas de doublon signalé.
    m.appliquerChoix({ choix: 'toujours_appli', cible, sensible: false, accords });
    assert.equal(retenus.length, 1);
    // Une mémorisation qui plante ne fait pas échouer l'action.
    const fragile = m.creerAccords({ surToujours: () => { throw new Error('serveur indisponible'); } });
    assert.equal(m.appliquerChoix({ choix: 'toujours_appli', cible: { application: 'x' }, sensible: false, accords: fragile }), true);
    assert.equal(fragile.toujoursContient('x'), true);
  }

  // 6. Les choix « toujours » du compte viennent du serveur : il fait foi quand il les envoie.
  {
    const p = m.politiqueDepuisParametres(serveur);
    const accords = m.creerAccords();
    accords.remplacerToujours(m.toujoursDepuisParametres(serveur));
    assert.equal(m.decider({ politique: p, action: 'ecrire', cible: { application: 'notepad' }, accords }).type, 'autorise');
    accords.remplacerToujours([]);
    assert.equal(m.decider({ politique: p, action: 'ecrire', cible: { application: 'notepad' }, accords }).type, 'demander', 'retiré côté compte');
  }

  // 7. Application sensible : deux boutons, avertissement, la question revient à chaque action, jamais de « toujours ».
  {
    const p = m.politiqueDepuisParametres(serveur);
    const accords = m.creerAccords();
    // Même si l'étudiant avait mis « toujours » ailleurs ou pour cette tâche.
    accords.accorderToujours('powershell');
    accords.accorderTache('powershell');
    const cible = { application: 'WindowsPowerShell\\PowerShell.EXE', titre: 'Windows PowerShell' };
    for (let i = 0; i < 3; i++) {
      const d = m.decider({ politique: p, action: 'cliquer', cible, accords });
      assert.equal(d.type, 'demander', `clic ${i + 1} : la question revient`);
      assert.deepEqual(d.boutons, ['cette_fois', 'refuser']);
      assert.equal(d.risque, m.MESSAGE_RISQUE_PAR_DEFAUT);
      assert.equal(d.sensible, true);
    }
    // Accepter une application sensible ne retient RIEN.
    const vierges = m.creerAccords();
    m.appliquerChoix({ choix: 'cette_fois', cible, sensible: true, accords: vierges });
    m.appliquerChoix({ choix: 'toujours_appli', cible, sensible: true, accords: vierges });
    assert.equal(vierges.tacheContient('powershell'), false);
    assert.equal(vierges.toujoursContient('powershell'), false);
    // Les applications de l'ancien réglage (applications_protegees) sont sensibles aussi.
    assert.equal(m.decider({ politique: p, action: 'ecrire', cible: { application: 'cmd' }, accords }).sensible, true);
  }

  // 8. Sensible par le titre de la fenêtre (banque, messagerie dans un navigateur).
  {
    const p = m.politiqueDepuisParametres(serveur);
    const accords = m.creerAccords();
    accords.accorderToujours('chrome');
    const d = m.decider({ politique: p, action: 'lire', cible: { application: 'chrome', titre: 'Ma BANQUE en ligne - Accueil' }, accords });
    assert.equal(d.type, 'demander', 'même avec « toujours » pour Chrome, la page banque demande');
    assert.equal(d.sensible, true);
    assert.equal(m.decider({ politique: p, action: 'lire', cible: { application: 'chrome', titre: 'Cours de maths' }, accords }).type, 'autorise');
    assert.equal(m.decider({ politique: p, action: 'lire', cible: { application: 'chrome', titre: null }, accords }).type, 'autorise');
  }

  // 9. Application non identifiée : traitée comme sensible, jamais retenue.
  {
    const p = m.politiqueDepuisParametres(serveur);
    const accords = m.creerAccords();
    for (const application of [null, undefined, '', '   ']) {
      const d = m.decider({ politique: p, action: 'ecrire', cible: { application }, accords });
      assert.equal(d.type, 'demander');
      assert.equal(d.sensible, true);
      assert.deepEqual(d.boutons, ['cette_fois', 'refuser']);
    }
    m.appliquerChoix({ choix: 'toujours_appli', cible: { application: null }, sensible: true, accords });
    assert.deepEqual(accords.toujours(), []);
  }

  // 10. Seules les actions listées par le serveur demandent un accord.
  {
    const p = m.politiqueDepuisParametres({ autorisation: { active: true, actions: ['ecrire'] } });
    const accords = m.creerAccords();
    assert.equal(m.decider({ politique: p, action: 'cliquer', cible: { application: 'code' }, accords }).type, 'autorise');
    assert.equal(m.decider({ politique: p, action: 'ecrire', cible: { application: 'code' }, accords }).type, 'demander');
  }

  // 11. Texte de la question : simple, sans tiret double, sans jargon.
  {
    assert.equal(m.texteDemande('lire', 'Bloc-notes'), 'Classinus veut regarder Bloc-notes.');
    assert.equal(m.texteDemande('ecrire', 'Bloc-notes'), 'Classinus veut écrire dans Bloc-notes.');
    assert.equal(m.texteDemande('ouvrir', 'calc'), 'Classinus veut ouvrir calc.');
    assert.equal(m.texteDemande('cliquer', 'Chrome'), 'Classinus veut cliquer dans Chrome.');
    assert.match(m.texteDemande('lire', '  '), /application que Classinus n'a pas pu identifier/);
    for (const t of [m.MESSAGE_RISQUE_PAR_DEFAUT, m.MESSAGE_RISQUE_ACTION_PAR_DEFAUT, m.texteDemande('lire', 'x')]) {
      assert.equal(t.includes('--'), false);
    }
  }

  console.log('OK : politique d\'autorisation (normale, sensible, titre, non identifiee, tache, toujours, conditions du serveur).');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
