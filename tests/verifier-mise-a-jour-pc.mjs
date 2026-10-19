// Test du noyau de mise à jour automatique de l'appli PC (vérifications, états, téléchargement,
// installation). Module pur : tourne sur n'importe quel système, sans Electron ni réseau.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-maj-pc-'));
try {
  const sortie = join(dossier, 'maj.mjs');
  await build({
    entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-mise-a-jour-pc-electron/electron/src/miseAJourPc.mts')],
    outfile: sortie,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  const {
    creerMiseAJourPc,
    DELAI_INITIAL_MS,
    INTERVALLE_VERIFICATION_MS,
    MESSAGE_INDISPONIBLE,
    MESSAGE_ERREUR_VERIFICATION,
    MESSAGE_ERREUR_INSTALLATION,
  } = await import(pathToFileURL(sortie).href);

  // Faux electron-updater : garde les rappels, compte les appels, permet de simuler les événements.
  function fauxMiseur({ verification = async () => {}, installation = () => {} } = {}) {
    const rappels = {};
    const miseur = {
      autoDownload: false,
      autoInstallOnAppQuit: false,
      allowPrerelease: true,
      allowDowngrade: true,
      appelsVerification: 0,
      appelsInstallation: [],
      on(evenement, rappel) { rappels[evenement] = rappel; return miseur; },
      async checkForUpdates() { miseur.appelsVerification++; return verification(); },
      quitAndInstall(silencieux, relancer) { miseur.appelsInstallation.push([silencieux, relancer]); installation(); },
      emettre(evenement, ...args) { rappels[evenement]?.(...args); },
    };
    return miseur;
  }

  // Faux minuteurs : on les déclenche à la main.
  function fauxPlanificateur() {
    const taches = [];
    return {
      taches,
      planifier(rappel, delaiMs, repeter) {
        const tache = { rappel, delaiMs, repeter, arretee: false, arreter() { tache.arretee = true; } };
        taches.push(tache);
        return tache;
      },
    };
  }

  function creer({ miseur = fauxMiseur(), empaquetee = true, surChangement, journal } = {}) {
    const planificateur = fauxPlanificateur();
    const etats = [];
    const journaux = [];
    let horloge = 1000;
    const noyau = creerMiseAJourPc({
      miseur,
      versionActuelle: '0.1.0',
      empaquetee,
      surChangement: surChangement ?? ((e) => etats.push(e)),
      journaliser: journal ?? ((t) => journaux.push(t)),
      maintenant: () => (horloge += 1),
      planifier: planificateur.planifier,
    });
    return { noyau, miseur, planificateur, etats, journaux };
  }

  // 1. En développement (appli non installée) : indisponible, aucune planification, le miseur n'est pas touché.
  {
    const { noyau, miseur, planificateur } = creer({ empaquetee: false });
    noyau.demarrer();
    assert.equal(noyau.lireEtat().etat, 'indisponible');
    assert.equal(noyau.lireEtat().message, MESSAGE_INDISPONIBLE);
    assert.equal(planificateur.taches.length, 0);
    assert.equal(miseur.autoDownload, false);
    const apres = await noyau.verifier();
    assert.equal(apres.etat, 'indisponible');
    assert.equal(miseur.appelsVerification, 0);
    assert.equal(noyau.installer(), false);
    assert.equal(miseur.appelsInstallation.length, 0);
  }

  // 2. Démarrage installé : réglages sûrs, deux minuteurs (30 s une fois, 4 h en boucle), état de départ.
  {
    const { noyau, miseur, planificateur } = creer();
    assert.equal(noyau.lireEtat().etat, 'inactif');
    noyau.demarrer();
    noyau.demarrer(); // un second appel ne duplique rien
    assert.equal(miseur.autoDownload, true);
    assert.equal(miseur.autoInstallOnAppQuit, true);
    assert.equal(miseur.allowPrerelease, false);
    assert.equal(miseur.allowDowngrade, false);
    assert.equal(planificateur.taches.length, 2);
    assert.deepEqual(
      planificateur.taches.map((t) => [t.delaiMs, t.repeter]),
      [[DELAI_INITIAL_MS, false], [INTERVALLE_VERIFICATION_MS, true]]
    );
    assert.equal(DELAI_INITIAL_MS, 30_000);
    assert.equal(INTERVALLE_VERIFICATION_MS, 4 * 60 * 60 * 1000);
    assert.equal(noyau.lireEtat().versionActuelle, '0.1.0');
  }

  // 3. Flux complet : vérification, mise à jour trouvée, progression bornée et arrondie, prête.
  {
    const miseur = fauxMiseur({
      verification: async () => {
        miseur.emettre('checking-for-update');
        miseur.emettre('update-available', { version: '0.2.0' });
      },
    });
    const { noyau, etats } = creer({ miseur });
    noyau.demarrer();
    await noyau.verifier();
    assert.equal(noyau.lireEtat().etat, 'telechargement');
    assert.equal(noyau.lireEtat().versionDisponible, '0.2.0');
    assert.equal(noyau.lireEtat().progression, 0);
    miseur.emettre('download-progress', { percent: 42.6 });
    assert.equal(noyau.lireEtat().progression, 43);
    miseur.emettre('download-progress', { percent: 180 });
    assert.equal(noyau.lireEtat().progression, 100);
    miseur.emettre('download-progress', { percent: -5 });
    assert.equal(noyau.lireEtat().progression, 0);
    miseur.emettre('download-progress', { percent: 'pas un nombre' });
    assert.equal(noyau.lireEtat().progression, 0); // valeur illisible : on garde la précédente
    miseur.emettre('update-downloaded', { version: '0.2.0' });
    const prete = noyau.lireEtat();
    assert.equal(prete.etat, 'prete');
    assert.equal(prete.versionDisponible, '0.2.0');
    assert.equal(prete.progression, 100);
    assert.equal(prete.message, null);
    assert.ok(etats.length >= 5, 'chaque changement prévient la fenêtre');
    assert.ok(etats.every((e) => e.versionActuelle === '0.1.0'));
  }

  // 4. Aucune nouvelle version : à jour, avec l'heure de la vérification.
  {
    const miseur = fauxMiseur({
      verification: async () => {
        miseur.emettre('checking-for-update');
        miseur.emettre('update-not-available');
      },
    });
    const { noyau } = creer({ miseur });
    noyau.demarrer();
    const r = await noyau.verifier();
    assert.equal(r.etat, 'a-jour');
    assert.equal(r.versionDisponible, null);
    assert.ok(typeof r.derniereVerification === 'number');
  }

  // 5. Vérification sans événement conclusif : on ne reste pas bloqué sur "verification".
  {
    const miseur = fauxMiseur({ verification: async () => { miseur.emettre('checking-for-update'); } });
    const { noyau } = creer({ miseur });
    noyau.demarrer();
    const r = await noyau.verifier();
    assert.equal(r.etat, 'a-jour');
  }

  // 6. Échec réseau : message générique pour l'étudiant, détail technique seulement dans le journal,
  //    et la vérification suivante réessaie.
  {
    let echec = true;
    const miseur = fauxMiseur({
      verification: async () => {
        if (echec) throw new Error('getaddrinfo ENOTFOUND github.com secret-detail');
        miseur.emettre('update-not-available');
      },
    });
    const { noyau, journaux } = creer({ miseur });
    noyau.demarrer();
    const r = await noyau.verifier();
    assert.equal(r.etat, 'erreur');
    assert.equal(r.message, MESSAGE_ERREUR_VERIFICATION);
    assert.ok(!JSON.stringify(r).includes('ENOTFOUND'), 'le détail technique ne sort pas du processus principal');
    assert.ok(journaux.some((t) => t.includes('ENOTFOUND')));
    echec = false;
    const r2 = await noyau.verifier();
    assert.equal(r2.etat, 'a-jour');
    assert.equal(miseur.appelsVerification, 2);
  }

  // 7. Événement d'erreur d'electron-updater : même traitement qu'un échec de vérification.
  {
    const { noyau, miseur, journaux } = creer();
    noyau.demarrer();
    miseur.emettre('error', new Error('signature invalide'));
    assert.equal(noyau.lireEtat().etat, 'erreur');
    assert.equal(noyau.lireEtat().message, MESSAGE_ERREUR_VERIFICATION);
    assert.ok(journaux.some((t) => t.includes('signature invalide')));
  }

  // 8. Jamais deux vérifications en même temps.
  {
    let liberer;
    const miseur = fauxMiseur({ verification: () => new Promise((r) => { liberer = r; }) });
    const { noyau } = creer({ miseur });
    noyau.demarrer();
    const a = noyau.verifier();
    const b = noyau.verifier();
    await b;
    assert.equal(miseur.appelsVerification, 1);
    liberer();
    await a;
    assert.equal(miseur.appelsVerification, 1);
  }

  // 9. Pas de nouvelle vérification pendant un téléchargement ni quand la mise à jour est prête.
  {
    const miseur = fauxMiseur();
    const { noyau } = creer({ miseur });
    noyau.demarrer();
    miseur.emettre('update-available', { version: '0.2.0' });
    await noyau.verifier();
    assert.equal(miseur.appelsVerification, 0);
    miseur.emettre('update-downloaded', { version: '0.2.0' });
    await noyau.verifier();
    assert.equal(miseur.appelsVerification, 0);
    // Un événement "checking-for-update" tardif ne fait pas régresser une mise à jour prête.
    miseur.emettre('checking-for-update');
    assert.equal(noyau.lireEtat().etat, 'prete');
    miseur.emettre('update-not-available');
    assert.equal(noyau.lireEtat().etat, 'prete');
  }

  // 10. Une erreur survenue après le téléchargement ne retire pas l'installation possible.
  {
    const { noyau, miseur } = creer();
    noyau.demarrer();
    miseur.emettre('update-downloaded', { version: '0.2.0' });
    miseur.emettre('error', new Error('réseau coupé'));
    assert.equal(noyau.lireEtat().etat, 'prete');
  }

  // 11. Installer : refusé tant que rien n'est prêt ; une fois prêt, ferme et relance (jamais en silence total
  //     pour l'installeur, mais avec relance automatique).
  {
    const { noyau, miseur } = creer();
    noyau.demarrer();
    assert.equal(noyau.installer(), false);
    miseur.emettre('update-available', { version: '0.2.0' });
    assert.equal(noyau.installer(), false, 'téléchargement en cours : pas d\'installation');
    miseur.emettre('update-downloaded', { version: '0.2.0' });
    assert.equal(noyau.installer(), true);
    assert.deepEqual(miseur.appelsInstallation, [[false, true]]);
  }

  // 12. Échec au lancement de l'installation : message clair, l'état reste "prete" (réessai ou installation à la fermeture).
  {
    const miseur = fauxMiseur({ installation: () => { throw new Error('EPERM'); } });
    const { noyau, journaux } = creer({ miseur });
    noyau.demarrer();
    miseur.emettre('update-downloaded', { version: '0.2.0' });
    assert.equal(noyau.installer(), false);
    assert.equal(noyau.lireEtat().etat, 'prete');
    assert.equal(noyau.lireEtat().message, MESSAGE_ERREUR_INSTALLATION);
    assert.ok(journaux.some((t) => t.includes('EPERM')));
  }

  // 13. Les minuteurs déclenchent bien une vérification, et arreter() les annule tous.
  {
    const miseur = fauxMiseur({ verification: async () => { miseur.emettre('update-not-available'); } });
    const { noyau, planificateur } = creer({ miseur });
    noyau.demarrer();
    planificateur.taches[0].rappel();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(miseur.appelsVerification, 1);
    noyau.arreter();
    assert.ok(planificateur.taches.every((t) => t.arretee));
  }

  // 14. Un écouteur d'état qui échoue ne casse jamais la mise à jour.
  {
    const miseur = fauxMiseur();
    const { noyau } = creer({ miseur, surChangement: () => { throw new Error('fenêtre fermée'); } });
    noyau.demarrer();
    miseur.emettre('update-available', { version: '0.2.0' });
    miseur.emettre('update-downloaded', { version: '0.2.0' });
    assert.equal(noyau.lireEtat().etat, 'prete');
  }

  // 15. L'état renvoyé est une copie : le modifier ne change pas l'état interne.
  {
    const { noyau } = creer();
    noyau.demarrer();
    const copie = noyau.lireEtat();
    copie.etat = 'prete';
    assert.equal(noyau.lireEtat().etat, 'inactif');
  }

  console.log('verifier-mise-a-jour-pc : OK (15 groupes de verifications)');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
