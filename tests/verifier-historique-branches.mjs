// Test de la reconstruction d'une conversation rouverte
// (components/chat/BulleMessage.tsx : construireMessagesDepuisHistorique).
// Bug du 31/10/2026 : le dernier echange, bien en base, disparaissait a la
// reouverture quand une deuxieme racine parasite existait dans le fil.
// Le composant complet demande un navigateur : on extrait et transpile
// uniquement les deux fonctions pures concernees.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = await readFile(new URL("../components/chat/BulleMessage.tsx", import.meta.url), "utf8");
const debut = source.indexOf("function ligneVersMessage");
const fin = source.indexOf("// - heure affichée");
assert.ok(debut > 0 && fin > debut, "fonctions introuvables dans BulleMessage.tsx");
const prelude = `
function nettoyerMessageHistorique(content) { return { texte: content, piecesJointes: null }; }
${source.slice(debut, fin)}
`;
const compile = ts.transpileModule(prelude, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const m = await import(`data:text/javascript;base64,${Buffer.from(compile.outputText).toString("base64")}`);

const L = (id, parent_id, role, jour) => ({
  id,
  parent_id,
  role,
  content: `m${id}`,
  created_at: `2026-10-${jour}T00:00:00Z`,
  selectionne_le: null,
  meta: null,
});
const ids = (messages) => messages.map((x) => x.id);

// 1. Deuxieme racine courte et recente, mais branche longue qui porte
// l'echange le plus recent : c'est elle qui doit s'afficher.
{
  const lignes = [
    L(1, null, "user", "01"), L(2, 1, "assistant", "01"), L(3, 2, "user", "01"), L(4, 3, "assistant", "01"),
    L(5, null, "user", "02"), L(6, 5, "assistant", "02"),
    L(7, 4, "user", "03"), L(8, 7, "assistant", "03"),
  ];
  const messages = m.construireMessagesDepuisHistorique(lignes);
  assert.deepEqual(ids(messages), [1, 2, 3, 4, 7, 8]);
  assert.equal(messages[0].versions.length, 2);
}

// 2. Ligne dont le parent est absent : rattachee en fin de fil, pas perdue.
{
  const lignes = [
    L(1, null, "user", "01"), L(2, 1, "assistant", "01"),
    L(9, 999, "user", "02"), L(10, 9, "assistant", "02"),
  ];
  assert.deepEqual(ids(m.construireMessagesDepuisHistorique(lignes)), [1, 2, 9, 10]);
}

// 3. Versions alternatives normales : la plus recente affichee, les deux navigables.
{
  const lignes = [L(1, null, "user", "01"), L(2, 1, "assistant", "01"), L(3, 1, "assistant", "02")];
  const messages = m.construireMessagesDepuisHistorique(lignes);
  assert.deepEqual(ids(messages), [1, 3]);
  assert.equal(messages[1].versions.length, 2);
}

// 4. Fil simple : ordre inchange.
{
  const lignes = [L(1, null, "user", "01"), L(2, 1, "assistant", "01"), L(3, 2, "user", "02")];
  assert.deepEqual(ids(m.construireMessagesDepuisHistorique(lignes)), [1, 2, 3]);
}

console.log("Historique du chat (branches et orphelins) : tous les tests passent.");
