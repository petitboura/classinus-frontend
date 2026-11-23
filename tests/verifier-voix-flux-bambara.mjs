// Lecture au fil de l'eau de la voix bambara : exécute le lecteur et le flux avec un faux contexte audio.
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const dossier = await mkdtemp(join(tmpdir(), "flux-bambara-"));
for (const nom of ["voixBambaraTexte", "voixBambaraLecture", "voixBambaraFlux"]) {
  const source = await readFile(new URL(`../lib/${nom}.ts`, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  await writeFile(join(dossier, `${nom}.mjs`), js.replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"'));
}
const { creerLecteurBambara } = await import(join(dossier, "voixBambaraLecture.mjs"));
const { creerLectureEnFlux } = await import(join(dossier, "voixBambaraFlux.mjs"));

const pause = () => new Promise((r) => setTimeout(r, 0));
const laisser = async () => { for (let i = 0; i < 5; i += 1) await pause(); };

// Faux contexte audio : chaque source démarrée est notée, le test décide quand elle finit.
function fauxEnvironnement() {
  const jouees = [];
  const arretees = [];
  const contexte = {
    state: "running",
    destination: {},
    createAnalyser: () => ({ fftSize: 1024, connect() {}, getFloatTimeDomainData() {} }),
    createBufferSource: () => {
      const s = {
        buffer: null, onended: null, connect() {},
        start() { jouees.push(s); },
        stop() { arretees.push(s); },
      };
      return s;
    },
    decodeAudioData: async (brut) => ({ texte: brut }),
    resume: async () => {},
  };
  const demandes = [];
  const synthetiser = (texte) => new Promise((resoudre, rejeter) => demandes.push({ texte, resoudre: () => resoudre(texte), rejeter }));
  const finir = (i) => jouees[i].onended?.();
  return { contexte, jouees, arretees, demandes, synthetiser, finir };
}

// 1. Le premier morceau joue avant la fin, l'ordre est gardé, trois synthèses d'avance au plus.
{
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  const tampons = [];
  const flux = lecteur.flux({ surTampon: (t) => tampons.push(t.texte) });
  flux.ajouter(["un", "deux", "trois", "quatre"]);
  await laisser();
  assert.deepEqual(e.demandes.map((d) => d.texte), ["un", "deux", "trois"], "trois synthèses préparées, pas la quatrième");
  e.demandes[0].resoudre();
  await laisser();
  assert.equal(e.jouees.length, 1, "le premier son part sans attendre la suite ni la fin");
  e.finir(0);
  await laisser();
  assert.deepEqual(e.demandes.map((d) => d.texte), ["un", "deux", "trois", "quatre"], "la quatrième part quand la première est lue");
  // Les suivantes arrivent dans le désordre : l'ordre de lecture reste celui du texte.
  e.demandes[2].resoudre();
  await laisser();
  assert.equal(e.jouees.length, 1, "le troisième ne passe pas devant le deuxième");
  e.demandes[1].resoudre();
  await laisser();
  assert.equal(e.jouees.length, 2);
  e.finir(1);
  await laisser();
  e.finir(2);
  e.demandes[3].resoudre();
  await laisser();
  e.finir(3);
  flux.terminer();
  await flux.fini;
  assert.deepEqual(tampons, ["un", "deux", "trois", "quatre"], "tout est lu, dans l'ordre");
}

// 2. Le flux attend des morceaux qui arrivent plus tard, et finit quand on termine.
{
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  const flux = lecteur.flux();
  flux.ajouter(["a"]);
  await laisser();
  e.demandes[0].resoudre();
  await laisser();
  e.finir(0);
  await laisser();
  flux.ajouter(["b"]);
  await laisser();
  e.demandes[1].resoudre();
  await laisser();
  assert.equal(e.jouees.length, 2, "un morceau ajouté après une attente est lu");
  e.finir(1);
  flux.terminer();
  await flux.fini;
  flux.ajouter(["c"]);
  await laisser();
  assert.equal(e.demandes.length, 2, "rien n'est ajouté après la fin");
}

// 3. avantJouer retient le premier son.
{
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  let libere;
  const flux = lecteur.flux({ avantJouer: () => new Promise((r) => { libere = r; }) });
  flux.ajouter(["a"]);
  await laisser();
  e.demandes[0].resoudre();
  await laisser();
  assert.equal(e.jouees.length, 0, "le son attend avantJouer");
  libere();
  await laisser();
  assert.equal(e.jouees.length, 1);
  e.finir(0);
  flux.terminer();
  await flux.fini;
}

// 4. interrompre avant le premier son ne tue pas le flux ; après le premier son il le coupe pour de bon.
{
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  const flux = lecteur.flux();
  flux.ajouter(["a", "b"]);
  lecteur.interrompre();
  await laisser();
  e.demandes[0].resoudre();
  await laisser();
  assert.equal(e.jouees.length, 1, "interrompre avant le premier son n'empêche pas la lecture");
  lecteur.interrompre();
  assert.equal(e.arretees.length, 1, "interrompre après le premier son coupe le son");
  await flux.fini;
  flux.ajouter(["c"]);
  await laisser();
  assert.equal(e.demandes.length, 2, "plus rien n'est ajouté après l'interruption");
}

// 5. arreter et annuler coupent même avant le premier son : rien ne sera joué.
for (const couper of [(l) => l.arreter(), (_l, f) => f.annuler()]) {
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  const flux = lecteur.flux();
  flux.ajouter(["a"]);
  await laisser();
  couper(lecteur, flux);
  e.demandes[0].resoudre();
  await flux.fini;
  await laisser();
  assert.equal(e.jouees.length, 0, "rien n'est joué après l'arrêt");
}

// 6. annuler d'une ancienne lecture ne touche pas une plus récente.
{
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  const ancien = lecteur.flux();
  const recent = lecteur.flux();
  ancien.annuler();
  recent.ajouter(["x"]);
  await laisser();
  e.demandes[0].resoudre();
  await laisser();
  assert.equal(e.jouees.length, 1, "la lecture récente continue");
  e.finir(0);
  recent.terminer();
  await recent.fini;
}

// 7. Une synthèse qui échoue rejette la fin de la lecture.
{
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  const flux = lecteur.flux();
  flux.ajouter(["a"]);
  await laisser();
  e.demandes[0].rejeter(new Error("voix en panne"));
  await assert.rejects(flux.fini, /voix en panne/);
}

// 8. creerLectureEnFlux : les phrases terminées partent avant la fin, le reste à la fin, une seule fois.
{
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  const lecture = creerLectureEnFlux({ lecteur, texteMax: 600 });
  const texte = "Bonjour. Comment vas-tu ? Très bien";
  lecture.alimenter(texte.slice(0, 8));
  await laisser();
  assert.equal(e.demandes.length, 0, "aucune phrase sûre d'être finie");
  lecture.alimenter(texte.slice(0, 20));
  await laisser();
  assert.deepEqual(e.demandes.map((d) => d.texte), ["Bonjour."], "la première phrase part avant la fin de la réponse");
  const fin = lecture.terminer(texte);
  await laisser();
  assert.deepEqual(e.demandes.map((d) => d.texte), ["Bonjour.", "Comment vas-tu ? Très bien"], "le reste part à la fin, en un morceau");
  for (let i = 0; i < 2; i += 1) {
    e.demandes[i].resoudre();
    await laisser();
    e.finir(i);
    await laisser();
  }
  await fin;
}

// 9. creerLectureEnFlux : annuler coupe, et terminer échoue si la voix échoue.
{
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  const lecture = creerLectureEnFlux({ lecteur, texteMax: 600 });
  lecture.alimenter("Un. Deux");
  await laisser();
  lecture.annuler();
  e.demandes[0].resoudre();
  await laisser();
  assert.equal(e.jouees.length, 0, "annuler avant le premier son : rien n'est joué");
}
{
  const e = fauxEnvironnement();
  const lecteur = creerLecteurBambara(e.contexte, e.synthetiser);
  const lecture = creerLectureEnFlux({ lecteur, texteMax: 600 });
  const fin = lecture.terminer("Une phrase");
  await laisser();
  e.demandes[0].rejeter(new Error("voix en panne"));
  await assert.rejects(fin, /voix en panne/);
}

console.log("voix flux bambara : ok");
