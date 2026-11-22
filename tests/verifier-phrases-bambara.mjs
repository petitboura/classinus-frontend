// Page bambara, phrases proactives (22/11/2026) : exécute la logique pure (choix des variantes, file des phrases)
// et vérifie le branchement dans la page.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
const source = await lire("../lib/phrasesBambaraLogique.ts");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

const rendre = () => new Promise((r) => setImmediate(r));
const differe = () => {
  let resoudre;
  const promesse = new Promise((r) => (resoudre = r));
  return { promesse, resoudre };
};

// Les six moments, dans le même ordre que le serveur (core/phrases_bambara.py) et la migration.
assert.deepEqual([...m.MOMENTS_PHRASES], ["accueil", "recherche_web", "recherche_videos", "recherche_images", "creation_image", "outil_lent"]);

// Chaque effet de construction a son moment.
assert.equal(m.momentPourEffet("recherche"), "recherche_web");
assert.equal(m.momentPourEffet("videos"), "recherche_videos");
assert.equal(m.momentPourEffet("images"), "recherche_images");
assert.equal(m.momentPourEffet("creation"), "creation_image");

// Lecture de la réponse du serveur : valide, partielle, absurde. Jamais d'erreur levée.
const liste = m.lireListePhrases({
  reglages: { delai_outil_lent_s: 4, intervalle_outil_lent_s: 20 },
  phrases: [
    { id: "a", moment: "accueil", duree_ms: 1500, version: "v1" },
    { id: "a", moment: "accueil", duree_ms: 1, version: "v1" },
    { id: "b", moment: "moment_invente", version: "v" },
    { id: "", moment: "accueil", version: "v" },
    { id: "c", moment: "outil_lent", version: "" },
    { id: "d", moment: "outil_lent", duree_ms: -5, version: "v2" },
    null,
    "texte",
  ],
  en_preparation: 2.7,
});
assert.deepEqual(liste.reglages, { delaiOutilLentS: 4, intervalleOutilLentS: 20 });
assert.deepEqual(liste.phrases.map((p) => p.id), ["a", "d"]);
assert.equal(liste.phrases[0].dureeMs, 1500);
assert.equal(liste.phrases[1].dureeMs, 0);
assert.equal(liste.enPreparation, 2);
for (const brut of [null, undefined, 5, "x", [], {}, { phrases: "non", reglages: 3, en_preparation: "beaucoup" }]) {
  const l = m.lireListePhrases(brut);
  assert.deepEqual(l.phrases, []);
  assert.deepEqual(l.reglages, m.REGLAGES_PAR_DEFAUT);
  assert.equal(l.enPreparation, 0);
}
assert.deepEqual(m.lireListePhrases({ reglages: { delai_outil_lent_s: 0, intervalle_outil_lent_s: 1000 } }).reglages, m.REGLAGES_PAR_DEFAUT);

// Variantes : tirées au hasard, sans répéter celle qui vient de passer.
const trois = ["x", "y", "z"].map((id) => ({ id, moment: "accueil", dureeMs: 1, version: "v" }));
const autre = { id: "w", moment: "outil_lent", dureeMs: 1, version: "v" };
assert.equal(m.choisirVariante(trois, "recherche_web", null), null);
assert.equal(m.choisirVariante([], "accueil", null), null);
assert.equal(m.choisirVariante([...trois, autre], "outil_lent", "w").id, "w", "une seule variante : elle se répète faute de mieux");
for (let i = 0; i < 50; i += 1) assert.notEqual(m.choisirVariante(trois, "accueil", "y").id, "y");
assert.equal(m.choisirVariante(trois, "accueil", null, () => 0).id, "x");
assert.equal(m.choisirVariante(trois, "accueil", null, () => 0.999).id, "z");
assert.equal(m.choisirVariante(trois, "accueil", null, () => 1).id, "z", "un tirage hors limites reste dans la liste");
assert.equal(m.choisirVariante(trois, "accueil", "x", () => 0).id, "y");

// File des phrases : un faux lecteur dont on décide quand chaque phrase finit.
function monter({ chargeables = true, peutJouer = true } = {}) {
  const journal = [];
  const lectures = new Map();
  let enCoursLecture = 0;
  let maxEnMemeTemps = 0;
  const chargements = new Map();
  const outils = {
    charger: (moment) => {
      journal.push("charger:" + moment);
      if (chargeables === "manuel") {
        const d = differe();
        chargements.set(moment, d);
        return d.promesse;
      }
      return Promise.resolve(chargeables === true || chargeables.includes(moment) ? "cle-" + moment : null);
    },
    peutJouer: () => Promise.resolve(peutJouer),
    jouer: (cle) => {
      journal.push("jouer:" + cle);
      enCoursLecture += 1;
      maxEnMemeTemps = Math.max(maxEnMemeTemps, enCoursLecture);
      const d = differe();
      lectures.set(cle, d);
      return d.promesse.finally(() => {
        enCoursLecture -= 1;
      });
    },
    arreter: () => {
      journal.push("arreter");
      for (const d of lectures.values()) d.resoudre();
    },
    surDebut: (moment) => journal.push("debut:" + moment),
    surFin: (moment) => journal.push("fin:" + moment),
  };
  const o = m.creerOrdonnanceur(outils);
  return { o, journal, lectures, chargements, maxEnMemeTemps: () => maxEnMemeTemps };
}

// Une phrase se joue, finit, puis la suivante commence : jamais deux en même temps.
{
  const { o, journal, lectures, maxEnMemeTemps } = monter();
  o.demander("recherche_web");
  o.demander("recherche_images");
  await rendre();
  assert.equal(o.enCours(), "recherche_web");
  assert.deepEqual(journal.filter((j) => j.startsWith("jouer")), ["jouer:cle-recherche_web"]);
  lectures.get("cle-recherche_web").resoudre();
  await rendre();
  assert.equal(o.enCours(), "recherche_images");
  lectures.get("cle-recherche_images").resoudre();
  await rendre();
  assert.equal(o.enCours(), null);
  assert.equal(maxEnMemeTemps(), 1);
  assert.deepEqual(journal.filter((j) => j.startsWith("debut") || j.startsWith("fin")), [
    "debut:recherche_web", "fin:recherche_web", "debut:recherche_images", "fin:recherche_images",
  ]);
}

// Un même moment déjà en cours ou en attente n'est pas ajouté une seconde fois.
{
  const { o, journal, lectures } = monter();
  o.demander("outil_lent");
  o.demander("outil_lent");
  await rendre();
  o.demander("outil_lent");
  o.demander("recherche_web");
  o.demander("recherche_web");
  await rendre();
  lectures.get("cle-outil_lent").resoudre();
  await rendre();
  lectures.get("cle-recherche_web").resoudre();
  await rendre();
  assert.equal(journal.filter((j) => j === "jouer:cle-outil_lent").length, 1);
  assert.equal(journal.filter((j) => j === "jouer:cle-recherche_web").length, 1);
}

// Règle de Bourama : la réponse n'a jamais coupé une phrase. Annuler retire seulement ce qui attend ;
// la phrase qui parle finit, et c'est à sa fin que la réponse peut être lue.
{
  const { o, journal, lectures } = monter();
  o.demander("recherche_web");
  o.demander("outil_lent");
  await rendre();
  o.annulerEnAttente();
  assert.ok(!journal.includes("arreter"), "annuler n'arrête pas la phrase qui parle");
  let reponseLue = false;
  const attente = o.attendreFin().then(() => {
    reponseLue = true;
  });
  await rendre();
  assert.equal(reponseLue, false, "la réponse attend la fin de la phrase qui parle");
  lectures.get("cle-recherche_web").resoudre();
  await attente;
  assert.equal(reponseLue, true);
  assert.ok(!journal.includes("jouer:cle-outil_lent"), "la phrase qui attendait a été retirée");
  assert.ok(!journal.includes("arreter"));
}

// Rien ne parle : attendreFin rend la main tout de suite.
{
  const { o } = monter();
  await o.attendreFin();
  o.demander("accueil");
  await rendre();
  o.annulerEnAttente();
}

// Une phrase encore en téléchargement quand la réponse arrive est abandonnée sans la faire attendre.
{
  const { o, journal, chargements } = monter({ chargeables: "manuel" });
  o.demander("recherche_images");
  await rendre();
  o.annulerEnAttente();
  await o.attendreFin();
  chargements.get("recherche_images").resoudre("cle-recherche_images");
  await rendre();
  assert.ok(!journal.some((j) => j.startsWith("jouer")), "elle ne joue pas une fois arrivée trop tard");
  assert.ok(!journal.some((j) => j.startsWith("debut")));
}

// Une phrase qui n'est plus valable (l'outil a fini) est sautée, avant comme après son chargement.
{
  const { o, journal } = monter();
  let valable = false;
  o.demander("creation_image", () => valable);
  await rendre();
  assert.ok(!journal.some((j) => j.startsWith("jouer")));
  assert.ok(!journal.includes("charger:creation_image"), "inutile de charger ce qui ne sert plus");
}
{
  const { o, journal, chargements } = monter({ chargeables: "manuel" });
  let valable = true;
  o.demander("creation_image", () => valable);
  await rendre();
  valable = false;
  chargements.get("creation_image").resoudre("cle-creation_image");
  await rendre();
  assert.ok(!journal.some((j) => j.startsWith("jouer")));
}

// Phrase indisponible ou son bloqué : sautée, jamais rejouée plus tard ; les suivantes passent.
{
  const { o, journal, lectures } = monter({ chargeables: ["outil_lent"] });
  o.demander("recherche_web");
  o.demander("outil_lent");
  await rendre();
  assert.equal(o.enCours(), "outil_lent");
  lectures.get("cle-outil_lent").resoudre();
  await rendre();
  assert.ok(!journal.includes("jouer:cle-recherche_web"));
}
{
  const { o, journal } = monter({ peutJouer: false });
  o.demander("accueil");
  await rendre();
  assert.ok(!journal.some((j) => j.startsWith("jouer") || j.startsWith("debut")), "son bloqué : l'accueil est sauté");
  await o.attendreFin();
}

// Geste explicite de la personne : la phrase qui parle s'arrête et la file est vidée.
{
  const { o, journal } = monter();
  o.demander("accueil");
  o.demander("outil_lent");
  await rendre();
  o.interrompre();
  await o.attendreFin();
  assert.ok(journal.includes("arreter"));
  assert.ok(journal.includes("fin:accueil"));
  assert.equal(o.enCours(), null);
  assert.ok(!journal.includes("jouer:cle-outil_lent"));
}

// Une lecture qui échoue est passée sous silence : surFin est appelé, la suivante joue.
{
  const journal = [];
  let appels = 0;
  const o = m.creerOrdonnanceur({
    charger: async (moment) => "cle-" + moment,
    peutJouer: async () => true,
    jouer: async (cle) => {
      appels += 1;
      journal.push("jouer:" + cle);
      if (appels === 1) throw new Error("décodage impossible");
    },
    arreter: () => {},
    surDebut: () => {},
    surFin: (moment) => journal.push("fin:" + moment),
  });
  o.demander("recherche_web");
  o.demander("outil_lent");
  await o.attendreFin();
  await rendre();
  assert.deepEqual(journal, ["jouer:cle-recherche_web", "fin:recherche_web", "jouer:cle-outil_lent", "fin:outil_lent"]);
}

// Un chargement qui échoue est passé sous silence.
{
  const journal = [];
  const o = m.creerOrdonnanceur({
    charger: async () => {
      throw new Error("réseau");
    },
    peutJouer: async () => true,
    jouer: async (cle) => journal.push(cle),
    arreter: () => {},
    surDebut: () => {},
    surFin: () => {},
  });
  o.demander("accueil");
  await o.attendreFin();
  assert.deepEqual(journal, []);
}

// Mémoire des tâches : un seul téléchargement à la fois par audio, et un échec n'est pas gardé.
{
  const taches = m.creerMemoireDeTaches();
  let lancements = 0;
  const lancer = () => {
    lancements += 1;
    return Promise.resolve(lancements);
  };
  const [a, b] = await Promise.all([taches.obtenir("x", lancer), taches.obtenir("x", lancer)]);
  assert.equal(a, 1);
  assert.equal(b, 1);
  await assert.rejects(taches.obtenir("y", () => Promise.reject(new Error("réseau"))));
  assert.equal(await taches.obtenir("y", () => Promise.resolve("ok")), "ok", "après un échec, la demande suivante réessaie");
}

// Branchement dans la page : la réponse attend les phrases, les gestes explicites les arrêtent, rien n'est en dur.
const page = await lire("../components/bambara/PageBambaraClient.tsx");
const hook = await lire("../lib/usePhrasesBambara.ts");
const voix = await lire("../lib/voixBambara.ts");
const erreurs = await lire("../lib/erreurs.ts");
assert.match(page, /usePhrasesBambara\(/);
assert.match(page, /avantLecture: attendreFinPhrases/, "la voix du micro attend la fin de la phrase");
assert.match(page, /await attendreFinPhrases\(\)/, "la réponse écrite attend la fin de la phrase");
assert.equal((page.match(/surOutilsEnCours: changerOutils/g) ?? []).length, 2, "les deux chemins (micro et écrit) suivent les outils");
assert.doesNotMatch(page, /surOutilsEnCours: setOutils/);
assert.match(voix, /await options\.avantLecture\?\.\(\)/);
assert.ok(voix.indexOf("await options.avantLecture?.()") < voix.indexOf('options.surEtat("reponse")'), "l'attente précède le début de la lecture");
assert.match(page, /interrompreLesPhrases\(\)/);
assert.match(page, /phraseEnCours \? "reponse"/, "la bulle montre qu'une phrase parle");
// La réponse ne coupe jamais une phrase : le hook ne fait qu'annuler ce qui attend.
assert.doesNotMatch(hook.split("const attendreFin")[1].split("const niveau")[0], /interrompre\(\)/);
// Aucune phrase ni délai en dur dans le code : tout vient du serveur.
assert.doesNotMatch(hook, /["'`][^"'`\n]*(Bonjour|Salut|I ni ce|An ka)[^"'`\n]*["'`]/i);
assert.match(hook, /listeRef\.current\?\.reglages \?\? REGLAGES_PAR_DEFAUT/);
// Aucun texte visible, donc rien à traduire ; le nouveau code d'erreur existe en français et en anglais.
assert.equal((erreurs.match(/BAMBARA_PHRASE_INTROUVABLE/g) ?? []).length, 2);
// Pas de double tiret ni de tiret long dans les fichiers livrés (demande de Bourama).
for (const [nom, texte] of [["logique", source], ["hook", hook], ["page", page]]) {
  assert.ok(!texte.includes("—"), "tiret long dans " + nom);
  assert.ok(!/ -- /.test(texte), "double tiret dans " + nom);
}

console.log("verifier-phrases-bambara : ok");
