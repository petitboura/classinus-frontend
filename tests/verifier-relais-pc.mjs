// Test du noyau du relais téléphone embarqué (lancement, états, santé, arrêt).
// Module pur : tourne sur n'importe quel système, sans Electron ni exe.
// Vérifie aussi que les constantes dupliquées entre electron/relais.ts et le
// plugin restent identiques (même principe que verifier-liens-entrants.mjs).
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-relais-pc-'));
try {
  const sortie = join(dossier, 'relais.mjs');
  await build({
    entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-relais-pc-electron/electron/src/relaisPc.mts')],
    outfile: sortie,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  const {
    creerRelaisPc,
    MESSAGE_INDISPONIBLE,
    MESSAGE_LANCEMENT_IMPOSSIBLE,
    MESSAGE_INJOIGNABLE,
    MESSAGE_ARRET_INATTENDU,
  } = await import(pathToFileURL(sortie).href);

  // Faux processus : le test le fait partir à la main.
  function fauxProcessus({ pid = 1234 } = {}) {
    const rappels = [];
    return {
      pid,
      quitte: false,
      codeSortie: null,
      appelsTuer: 0,
      tuer() { this.appelsTuer++; },
      surSortie(rappel) { rappels.push(rappel); },
      partir(code = 0) {
        this.quitte = true;
        this.codeSortie = code;
        for (const rappel of rappels.splice(0)) rappel();
      },
    };
  }

  // Faux lanceur : garde les processus créés.
  function fauxLanceur({ lancement } = {}) {
    const lanceur = {
      appels: [],
      processus: [],
      lancer(chemin, dossierTravail) {
        lanceur.appels.push([chemin, dossierTravail]);
        const proc = fauxProcessus({ pid: 1000 + lanceur.processus.length });
        lanceur.processus.push(proc);
        if (lancement) return lancement(chemin, dossierTravail, proc);
        return proc;
      },
    };
    return lanceur;
  }

  // Faux minuteurs : on les déclenche à la main.
  function fauxPlanificateur() {
    const taches = [];
    return {
      taches,
      planifier(rappel, delaiMs) {
        const tache = { rappel, delaiMs, arretee: false, arreter() { tache.arretee = true; } };
        taches.push(tache);
        return tache;
      },
    };
  }

  function creer({ cheminExe = 'C:/relais/Relais-Class-Tech.exe', sante = async () => true, lancement, surChangement, journal } = {}) {
    const lanceur = fauxLanceur(lancement ? { lancement } : {});
    const planificateur = fauxPlanificateur();
    const etats = [];
    const journaux = [];
    const noyau = creerRelaisPc({
      cheminExe,
      dossierTravail: 'C:/relais',
      urlSante: () => 'http://127.0.0.1:8765/relais/sante',
      lancer: lanceur.lancer,
      lireSante: sante,
      surChangement: surChangement ?? ((e) => etats.push(e)),
      journaliser: journal ?? ((t) => journaux.push(t)),
      planifier: planificateur.planifier,
      delaiSanteMs: 3000,
      essaisSante: 3,
      intervalleEssaiMs: 2000,
    });
    return { noyau, lanceur, planificateur, etats, journaux };
  }

  async function laisserPasser(tours = 5) {
    for (let i = 0; i < tours; i++) await Promise.resolve();
  }

  // 1. Sans exe : indisponible, demarrer() ne lance rien.
  {
    const { noyau, lanceur } = creer({ cheminExe: null });
    assert.equal((await noyau.lireEtat()).etat, 'indisponible');
    assert.equal((await noyau.lireEtat()).message, MESSAGE_INDISPONIBLE);
    noyau.demarrer();
    assert.deepEqual(lanceur.appels, []);
    assert.equal((await noyau.lireEtat()).etat, 'indisponible');
  }

  // 2. Avec exe : arrêté au départ, avec la page de santé seulement après lancement.
  {
    const { noyau } = creer();
    const etat = await noyau.lireEtat();
    assert.equal(etat.etat, 'arrete');
    assert.equal(etat.urlSante, null);
    assert.equal(etat.pid, null);
  }

  // 3. Démarrage : lance l'exe dans son dossier, état "demarrage" avec pid et page de santé.
  {
    const { noyau, lanceur, planificateur } = creer();
    const etat = noyau.demarrer();
    assert.equal(etat.etat, 'demarrage');
    assert.equal(etat.urlSante, 'http://127.0.0.1:8765/relais/sante');
    assert.equal(etat.pid, 1000);
    assert.deepEqual(lanceur.appels, [['C:/relais/Relais-Class-Tech.exe', 'C:/relais']]);
    assert.equal(planificateur.taches.length, 1);
    assert.equal(planificateur.taches[0].delaiMs, 3000);
  }

  // 4. Santé qui répond : "enmarche" après le premier contrôle.
  {
    const { noyau, planificateur, etats } = creer();
    noyau.demarrer();
    planificateur.taches[0].rappel();
    await laisserPasser();
    assert.equal((await noyau.lireEtat()).etat, 'enmarche');
    assert.ok(etats.some((e) => e.etat === 'enmarche'));
  }

  // 5. Santé qui tarde : nouvel essai, puis "enmarche" quand elle répond.
  {
    let repond = false;
    const { noyau, planificateur } = creer({ sante: async () => repond });
    noyau.demarrer();
    planificateur.taches[0].rappel();
    await laisserPasser();
    assert.equal((await noyau.lireEtat()).etat, 'demarrage');
    assert.equal(planificateur.taches.length, 2);
    assert.equal(planificateur.taches[1].delaiMs, 2000);
    repond = true;
    planificateur.taches[1].rappel();
    await laisserPasser();
    assert.equal((await noyau.lireEtat()).etat, 'enmarche');
  }

  // 6. Santé qui ne répond jamais : "erreur" avec un message clair, après les essais.
  {
    const { noyau, planificateur } = creer({ sante: async () => false });
    noyau.demarrer();
    for (let i = 0; i < 4; i++) {
      planificateur.taches[planificateur.taches.length - 1].rappel();
      await laisserPasser();
    }
    const etat = await noyau.lireEtat();
    assert.equal(etat.etat, 'erreur');
    assert.equal(etat.message, MESSAGE_INJOIGNABLE);
  }

  // 7. Erreur de lecture de santé (relais pas encore levé) : nouvel essai, détail au journal.
  {
    let appels = 0;
    const { noyau, planificateur, journaux } = creer({
      sante: async () => {
        appels++;
        if (appels === 1) throw new Error('ECONNREFUSED');
        return true;
      },
    });
    noyau.demarrer();
    planificateur.taches[0].rappel();
    await laisserPasser();
    assert.equal(planificateur.taches.length, 2);
    assert.ok(journaux.some((t) => t.includes('ECONNREFUSED')));
    planificateur.taches[1].rappel();
    await laisserPasser();
    assert.equal((await noyau.lireEtat()).etat, 'enmarche');
  }

  // 8. Arrêt demandé : le processus est tué, l'état passe à "arrete" à sa sortie.
  {
    const { noyau, lanceur } = creer();
    noyau.demarrer();
    noyau.arreter();
    assert.equal(lanceur.processus[0].appelsTuer, 1);
    lanceur.processus[0].partir(0);
    assert.equal((await noyau.lireEtat()).etat, 'arrete');
  }

  // 9. Arrêt sans rien en cours : sans effet, pas d'erreur.
  {
    const { noyau } = creer();
    noyau.arreter();
    assert.equal((await noyau.lireEtat()).etat, 'arrete');
  }

  // 10. Processus parti tout seul : "erreur" avec un message clair, détail au journal.
  {
    const { noyau, lanceur, journaux } = creer();
    noyau.demarrer();
    lanceur.processus[0].partir(1);
    const etat = await noyau.lireEtat();
    assert.equal(etat.etat, 'erreur');
    assert.equal(etat.message, MESSAGE_ARRET_INATTENDU);
    assert.equal(etat.pid, null);
    assert.ok(journaux.some((t) => t.includes('1')));
  }

  // 11. Lancement impossible : "erreur" avec un message clair.
  {
    const { noyau } = creer({ lancement: () => { throw new Error('EPERM'); } });
    const etat = noyau.demarrer();
    assert.equal(etat.etat, 'erreur');
    assert.equal(etat.message, MESSAGE_LANCEMENT_IMPOSSIBLE);
  }

  // 12. Deuxième démarrage pendant que ça tourne : ne relance pas un deuxième processus.
  {
    const { noyau, lanceur } = creer();
    noyau.demarrer();
    noyau.demarrer();
    assert.equal(lanceur.appels.length, 1);
  }

  // 13. Relance après un arrêt : nouveau processus, nouvel état "demarrage".
  {
    const { noyau, lanceur, planificateur } = creer();
    noyau.demarrer();
    noyau.arreter();
    lanceur.processus[0].partir(0);
    const etat = noyau.demarrer();
    assert.equal(etat.etat, 'demarrage');
    assert.equal(lanceur.appels.length, 2);
    assert.equal(planificateur.taches.filter((t) => !t.arretee).length, 1);
  }

  // 14. lireEtat() voit un processus parti sans passer par le rappel (cas limite) : retombe à "arrete".
  {
    const { noyau, lanceur } = creer();
    noyau.demarrer();
    lanceur.processus[0].quitte = true;
    lanceur.processus[0].codeSortie = 0;
    assert.equal((await noyau.lireEtat()).etat, 'arrete');
  }

  // 15. Un écouteur d'état qui échoue ne casse jamais le relais.
  {
    const { noyau, planificateur } = creer({ surChangement: () => { throw new Error('fenêtre fermée'); } });
    noyau.demarrer();
    planificateur.taches[0].rappel();
    await laisserPasser();
    assert.equal((await noyau.lireEtat()).etat, 'enmarche');
  }

  // 16. L'état renvoyé est une copie : le modifier ne change pas l'état interne.
  // (Santé négative : lireEtat ne fait pas avancer l'état par sa sonde.)
  {
    const { noyau } = creer({ sante: async () => false });
    const copie = noyau.demarrer();
    copie.etat = 'enmarche';
    assert.equal((await noyau.lireEtat()).etat, 'demarrage');
  }

  // 17. Constantes dupliquées : electron/relais.ts et le plugin disent la même chose.
  {
    const racine = resolve(import.meta.dirname, '..');
    const appli = readFileSync(join(racine, 'electron/relais.ts'), 'utf8');
    const plugin = readFileSync(join(racine, 'packages/capacitor-relais-pc-electron/electron/src/plugin.mts'), 'utf8');
    for (const nom of ['NOM_EXE_RELAIS', 'NOM_REGLAGES_RELAIS', 'NOM_DOSSIER_RELAIS', 'HOTE_RELAIS_DEFAUT', 'PORT_RELAIS_DEFAUT']) {
      const motif = new RegExp(`${nom}\\s*=\\s*([^;\\n]+)`);
      const dansAppli = appli.match(motif);
      const dansPlugin = plugin.match(motif);
      assert.ok(dansAppli, `${nom} introuvable dans electron/relais.ts`);
      assert.ok(dansPlugin, `${nom} introuvable dans plugin.mts`);
      // Guillemets simples ou doubles selon le fichier : on compare la valeur nue.
      const valeur = (t) => t.trim().replace(/^['"]|['"]$/g, '');
      assert.equal(valeur(dansPlugin[1]), valeur(dansAppli[1]), `${nom} diffère entre l'appli et le plugin`);
    }
  }

  console.log('verifier-relais-pc : OK (17 groupes de verifications)');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
