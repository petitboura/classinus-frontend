import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = await readFile(new URL("../lib/titreReflexion.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { titreReflexion, premierePhraseReflexion } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

// Mot, deux points, première phrase (espace avant les deux points en français seulement).
assert.equal(titreReflexion("Je vais lire le fichier. Ensuite je compare.", 0, "fr"), "Réflexion : Je vais lire le fichier.");
assert.equal(titreReflexion("Let me read the file. Then compare.", 0, "en"), "Reasoning: Let me read the file.");
// Le mot change d'une réflexion à l'autre et repart du début après la dernière.
assert.deepEqual([0, 1, 2, 3, 4].map((n) => titreReflexion("x", n, "fr").split(" ")[0]), ["Réflexion", "Raisonnement", "Analyse", "Pensée", "Réflexion"]);
assert.deepEqual([0, 1, 2, 3].map((n) => titreReflexion("x", n, "en").split(":")[0].split(" ")[0]), ["Reasoning", "Thinking", "Analysis", "Reflection"]);
// Un titre en gras écrit par le modèle devient le titre, sans la mise en forme.
assert.equal(titreReflexion("**Plan de l'approche**\n\nJe dois voir les tests.", 1, "fr"), "Raisonnement : Plan de l'approche");
// Sans texte utilisable : le mot seul.
assert.equal(titreReflexion("", 0, "fr"), "Réflexion");
assert.equal(titreReflexion("  \n\n ", 1, "en"), "Thinking");
// Jamais de tiret double ni long dans le titre.
assert.ok(!/--|—|–/.test(titreReflexion("Voir ceci -- puis cela — enfin ça. Suite", 0, "fr")));
// Un point dans un nombre ne coupe pas la phrase.
assert.equal(premierePhraseReflexion("Il faut calculer 3.5 fois 2 puis comparer"), "Il faut calculer 3.5 fois 2 puis comparer");
// Plafond de longueur, coupé à un mot, avec points de suspension.
const longue = premierePhraseReflexion("mot ".repeat(100));
assert.ok(longue.length <= 161 && longue.endsWith("…"));

console.log("titre de réflexion : ok");
