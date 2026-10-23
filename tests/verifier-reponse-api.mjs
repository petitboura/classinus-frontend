import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = await readFile(new URL("../lib/reponseApi.ts", import.meta.url), "utf8");
const compile = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const moduleApi = await import(`data:text/javascript;base64,${Buffer.from(compile.outputText).toString("base64")}`);
const { lireReponseJsonOuNulle } = moduleApi;

assert.equal(await lireReponseJsonOuNulle(new Response(null, { status: 204 })), null, "204 vide");
assert.equal(await lireReponseJsonOuNulle(new Response(null, { status: 205 })), null, "205 vide");
assert.equal(await lireReponseJsonOuNulle(new Response(null, { status: 200 })), null, "200 vide sans Content-Length");
assert.equal(await lireReponseJsonOuNulle(new Response("  \n", { status: 200 })), null, "corps ne contenant que des espaces");
assert.deepEqual(await lireReponseJsonOuNulle(new Response('{"ok":true}', { status: 200 })), { ok: true }, "JSON valide");
await assert.rejects(
  lireReponseJsonOuNulle(new Response("<html>gateway</html>", { status: 200 })),
  SyntaxError,
  "un corps non-JSON reste une erreur explicite"
);
console.log("Réponses API : cas vides, JSON valide et JSON invalide vérifiés.");
