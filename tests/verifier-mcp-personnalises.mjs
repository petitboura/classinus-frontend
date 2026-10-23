import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [panel, connections, api, tools, oauth, guide, labels] = await Promise.all([
  read("../components/connexions/McpPersonnalises.tsx"),
  read("../components/connexions/EspaceConnexions.tsx"),
  read("../lib/api.ts"),
  read("../lib/outils.ts"),
  read("../app/oauth/retour/page.tsx"),
  read("../app/decouvrir/personnaliser/applications-connectees/page.tsx"),
  read("../lib/i18n/interface.ts"),
]);

assert.ok(connections.includes("<McpPersonnalises />"), "le panneau doit être visible dans Applications connectées");
assert.ok(connections.includes('import { McpPersonnalises }'), "le panneau doit être importé");
assert.ok(!panel.includes("localStorage"), "les configurations doivent être conservées côté backend, pas dans le navigateur");
assert.ok(panel.includes('{ id: "oauth", label: "OAuth automatique (si compatible)" }'), "le formulaire doit offrir OAuth");
assert.ok(panel.includes('{ id: "bearer", label: "Jeton Bearer" }'), "le formulaire doit offrir Bearer");
assert.ok(panel.includes('{ id: "none", label: "Aucune authentification" }'), "le formulaire doit offrir l'absence d'authentification");
assert.ok(panel.includes('adresse.protocol !== "https:"'), "le formulaire doit refuser toute URL non HTTPS");
assert.ok(panel.includes("testerMcpPersonnalise"), "le panneau doit tester les outils distants");
assert.ok(panel.includes("definirMcpPersonnaliseActif"), "le panneau doit activer et désactiver un serveur");
assert.ok(panel.includes("supprimerMcpPersonnalise"), "le panneau doit supprimer un serveur");
assert.ok(panel.includes("demarrerConnexionMcpPersonnalise"), "le panneau doit démarrer OAuth");
assert.ok(panel.includes("deconnecterMcpPersonnalise"), "le panneau doit pouvoir déconnecter OAuth");

for (const route of [
  "/api/mcp-personnalises",
  "outils-interface",
  "/tester",
  "/demarrer-oauth",
  "/deconnecter",
  "/actif",
]) {
  assert.ok(api.includes(route), "route frontend absente : " + route);
}
assert.ok(api.includes("export async function lireRegistreOutils"), "le catalogue des outils doit rester dynamique");
assert.ok(api.includes("outils: [...registre.outils"), "les outils personnalisés doivent être ajoutés au registre existant");
assert.ok(tools.includes("invaliderRegistreOutils"), "les changements doivent invalider le cache des outils");
assert.ok(tools.includes("SIGNED_IN") && tools.includes("SIGNED_OUT"), "le cache personnel doit être invalidé au changement de compte");
assert.ok(oauth.includes('mcp_personnalise: "Serveur MCP personnalisé"'), "le retour OAuth doit reconnaître le serveur personnalisé");
assert.ok(oauth.includes('r.service === "mcp_personnalise"'), "le retour OAuth doit rafraîchir les outils");
assert.ok(guide.includes("Serveurs MCP personnalisés"), "la page Découvrir doit documenter les MCP personnalisés");
assert.ok(labels.includes('"serveurs mcp personnalisés": "Custom MCP servers"'), "le panneau doit avoir sa traduction anglaise");
assert.ok(labels.includes("function normaliserCasse(texte: string): string"), "le dictionnaire doit conserver sa signature TypeScript");

console.log("Vérifications structurelles MCP personnalisés : OK");
