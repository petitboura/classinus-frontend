// Test de la lecture du flux du chat et de la reprise après coupure (lib/repriseFluxChat.ts).
// Module pur : tourne sans navigateur, avec de fausses réponses.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = await readFile(new URL("../lib/repriseFluxChat.ts", import.meta.url), "utf8");
const compile = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const m = await import(`data:text/javascript;base64,${Buffer.from(compile.outputText).toString("base64")}`);

const ligne = (n) => `data: {"n":${n}}\n\n`;
const encodeur = new TextEncoder();

// Fausse réponse : envoie les morceaux, puis ferme proprement ou sur une erreur.
function reponse(morceaux, { erreur = false } = {}) {
  const flux = new ReadableStream({
    start(controleur) {
      for (const morceau of morceaux) controleur.enqueue(encodeur.encode(morceau));
      if (erreur) controleur.error(new Error("réseau coupé"));
      else controleur.close();
    },
  });
  return { ok: true, status: 200, body: flux };
}

// 1. Lecture complète : compte les événements, ignore signe de vie et [DONE].
{
  const recus = []; const compteur = { recus: 0 };
  const issue = await m.lireFluxSse(reponse([ligne(0), ": signe de vie\n\n", ligne(1), "data: [DONE]\n\n"]), (e) => recus.push(e.n), undefined, compteur, true);
  assert.equal(issue, "fini");
  assert.deepEqual(recus, [0, 1]);
  assert.equal(compteur.recus, 2);
}

// 2. Un événement coupé en deux morceaux réseau est reconstitué.
{
  const recus = []; const compteur = { recus: 0 };
  await m.lireFluxSse(reponse(['data: {"n"', ":7}\n\n", "data: [DONE]\n\n"]), (e) => recus.push(e.n), undefined, compteur, true);
  assert.deepEqual(recus, [7]);
}

// 3. Fin de flux sans [DONE] : "coupe" pour un tour rattachable, "fini" pour un flux direct (visiteur).
{
  const a = await m.lireFluxSse(reponse([ligne(0)]), () => {}, undefined, { recus: 0 }, true);
  assert.equal(a, "coupe");
  const b = await m.lireFluxSse(reponse([ligne(0)]), () => {}, undefined, { recus: 0 }, false);
  assert.equal(b, "fini");
}

// 4. Erreur de lecture : "coupe" si rattachable, relancée sinon (comportement d'origine).
{
  const a = await m.lireFluxSse(reponse([ligne(0)], { erreur: true }), () => {}, undefined, { recus: 0 }, true);
  assert.equal(a, "coupe");
  await assert.rejects(() => m.lireFluxSse(reponse([ligne(0)], { erreur: true }), () => {}, undefined, { recus: 0 }, false));
}

// 5. Une ligne mal formée est comptée (le serveur la numérote) mais n'arrête rien.
{
  const recus = []; const compteur = { recus: 0 };
  await m.lireFluxSse(reponse([ligne(0), "data: pas du json\n\n", ligne(2), "data: [DONE]\n\n"]), (e) => recus.push(e.n), undefined, compteur, true);
  assert.deepEqual(recus, [0, 2]);
  assert.equal(compteur.recus, 3);
}

// 6. Arrêt demandé : la lecture rend la main sans erreur.
{
  const controleur = new AbortController();
  controleur.abort();
  const issue = await m.lireFluxSse(reponse([ligne(0)]), () => assert.fail("rien ne doit être livré"), controleur.signal, { recus: 0 }, true);
  assert.equal(issue, "fini");
}

// 7. Reprise : se reconnecte au bon numéro, sans doublon ni trou, jusqu'à la fin.
{
  const tout = [0, 1, 2, 3, 4];
  const recus = []; const compteur = { recus: 0 };
  const demandes = [];
  const premiere = await m.lireFluxSse(reponse([ligne(0), ligne(1)]), (e) => recus.push(e.n), undefined, compteur, true);
  assert.equal(premiere, "coupe");
  await m.reprendreFluxApresCoupure({
    compteur,
    surEvenement: (e) => recus.push(e.n),
    ouvrirFlux: async (depuis) => {
      demandes.push(depuis);
      if (demandes.length === 1) throw new Error("toujours hors ligne");
      return reponse([...tout.slice(depuis).map(ligne), "data: [DONE]\n\n"]);
    },
  });
  assert.deepEqual(recus, tout);
  assert.deepEqual(demandes, [2, 2]);
}

// 8. Tour introuvable (404) : l'erreur d'origine est relancée, sans réessayer.
{
  const erreurInitiale = new Error("origine");
  let appels = 0;
  await assert.rejects(
    () => m.reprendreFluxApresCoupure({ compteur: { recus: 1 }, surEvenement: () => {}, erreurInitiale, ouvrirFlux: async () => { appels++; return { ok: false, status: 404, body: null }; } }),
    (e) => e === erreurInitiale
  );
  assert.equal(appels, 1);
}

// 9. Retrait du composant : la reprise s'arrête sans erreur, et le signal est reconnu.
{
  const controleur = new AbortController();
  controleur.abort(m.RAISON_DEMONTAGE);
  assert.equal(m.demontageDemande(controleur.signal), true);
  assert.equal(m.demontageDemande(new AbortController().signal), false);
  const arret = new AbortController(); arret.abort();
  assert.equal(m.demontageDemande(arret.signal), false);
  await m.reprendreFluxApresCoupure({ compteur: { recus: 0 }, surEvenement: () => {}, signal: controleur.signal, ouvrirFlux: async () => assert.fail("aucune connexion attendue") });
}

// 10. Indicateur de reconnexion : actif pendant la reprise, éteint après, y compris en cas d'échec.
{
  const etats = [];
  const desabonner = m.abonnerReconnexionFlux(() => etats.push(m.reconnexionFluxEnCours()));
  assert.equal(m.reconnexionFluxEnCours(), false);
  await assert.rejects(() => m.reprendreFluxApresCoupure({ compteur: { recus: 0 }, surEvenement: () => {}, ouvrirFlux: async () => ({ ok: false, status: 403, body: null }) }));
  desabonner();
  assert.deepEqual(etats, [true, false]);
  assert.equal(m.reconnexionFluxEnCours(), false);
}

console.log("Reprise du flux du chat : tous les tests passent.");
