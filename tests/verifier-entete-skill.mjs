import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = await readFile(new URL("../lib/enteteSkill.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { appliquerEntete, lireEntete, lireChampsEntete } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

// Sans en-tête : il est ajouté, le texte est conservé.
assert.equal(appliquerEntete("Juste du texte", "Chimie", "Aide"), '---\nname: "Chimie"\ndescription: "Aide"\n---\n\nJuste du texte');
// Avec en-tête : name et description sont remplacés, les autres clés et le corps restent.
assert.equal(appliquerEntete("---\nname: a\ndescription: b\ntags: x\n---\n\nCorps", "N", "D"), '---\nname: "N"\ndescription: "D"\ntags: x\n---\n\nCorps');
// Valeur sur plusieurs lignes supprimée proprement.
assert.equal(appliquerEntete("---\nname: a\ndescription: >\n  l1\n  l2\ntags: x\n---\ncorps", "N", "D"), '---\nname: "N"\ndescription: "D"\ntags: x\n---\ncorps');
// Idempotent.
const une = appliquerEntete("x", "A \"B\"", "é");
assert.equal(appliquerEntete(une, "A \"B\"", "é"), une);
// Lecture : valeurs entre guillemets JSON, simples ou nues.
assert.deepEqual(lireEntete(une), { nom: 'A "B"', description: "é" });
assert.deepEqual(lireEntete("---\nname: nu\ndescription: 'a''b'\n---\n"), { nom: "nu", description: "a'b" });
assert.deepEqual(lireEntete("---\nname: x\ndescription: >\n  l1\n---\n"), { nom: "x", description: undefined });
assert.deepEqual(lireEntete("pas d'entete"), {});
// Le même résultat que le backend pour le même cas.
assert.equal(appliquerEntete("---\nname: ancien\ndescription: vieux\nautre: garde\n---\n\nCorps", "Maths", "Aide"), '---\nname: "Maths"\ndescription: "Aide"\nautre: garde\n---\n\nCorps');
// Lecture complète pour l'aperçu : tous les champs dans l'ordre, valeurs sur plusieurs lignes comprises.
assert.equal(lireChampsEntete("pas d'entete"), null);
assert.deepEqual(lireChampsEntete(une), { champs: [{ cle: "name", valeur: 'A "B"' }, { cle: "description", valeur: "é" }], corps: "\nx" });
assert.deepEqual(lireChampsEntete("---\nname: x\ndescription: >\n  l1\n  l2\n\n  l3\nlicense: MIT\ntags:\n  - a\n  - b\n---\nCorps").champs, [
  { cle: "name", valeur: "x" }, { cle: "description", valeur: "l1 l2\nl3" }, { cle: "license", valeur: "MIT" }, { cle: "tags", valeur: "- a\n- b" },
]);
assert.deepEqual(lireChampsEntete("---\nname: a\ndescription: debut\n  suite\n---\n").champs[1], { cle: "description", valeur: "debut suite" });
assert.equal(lireChampsEntete("---\nname:\ndescription: \"\"\n---\n").champs.every(c => c.valeur === ""), true);
console.log("OK : en-tête SKILL.md aligné sur Nom et Description (écriture et lecture)");
