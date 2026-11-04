import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Widgets MCP-UI (04/11/2026) : protocole de messages et câblage.
const lire = (c) => readFile(new URL(c, import.meta.url), "utf8");
const source = await lire("../lib/mcpUi.ts");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const ctx = { theme: "clair", locale: "fr", donnees: { content: [{ type: "text", text: "ok" }], structuredContent: { a: 1 } } };
const sans = { theme: "sombre", locale: "en" };

// Liens : seulement http(s).
assert.equal(m.adresseHttpValide("javascript:alert(1)"), null);
assert.equal(m.adresseHttpValide("data:text/html,x"), null);
assert.ok(m.adresseHttpValide("https://x.test/a"));

// Taille bornée.
assert.equal(m.borner(99999), m.CONFIG_MCP_UI.hauteurMaxPx);
assert.equal(m.borner(1), m.CONFIG_MCP_UI.hauteurMinPx);
assert.equal(m.borner("x"), null);

// MCP-UI.
assert.deepEqual(m.traiterMessageWidget({ type: "ui-size-change", payload: { height: 400 } }, sans), [{ type: "taille", hauteur: 400 }]);
const lien = m.traiterMessageWidget({ type: "link", payload: { url: "https://x.test" }, messageId: "1" }, sans);
assert.equal(lien.find((a) => a.type === "lien").url, "https://x.test/");
assert.deepEqual(m.traiterMessageWidget({ type: "link", payload: { url: "javascript:1" } }, sans), []);
const refus = m.traiterMessageWidget({ type: "tool", payload: {}, messageId: "9" }, sans);
assert.equal(refus[0].message.payload.error.length > 0, true);
assert.deepEqual(m.traiterMessageWidget({ type: "prompt", payload: {} }, sans), []);

// MCP Apps (JSON-RPC).
const init = m.traiterMessageWidget({ jsonrpc: "2.0", id: 1, method: "ui/initialize", params: { protocolVersion: "2026-01-26" } }, ctx);
assert.equal(init[0].message.id, 1);
assert.equal(init[0].message.result.hostContext.theme, "light");
const pret = m.traiterMessageWidget({ jsonrpc: "2.0", method: "ui/notifications/initialized" }, ctx);
assert.equal(pret[1].message.method, "ui/notifications/tool-result");
assert.deepEqual(pret[1].message.params.structuredContent, { a: 1 });
assert.deepEqual(m.traiterMessageWidget({ jsonrpc: "2.0", method: "ui/notifications/initialized" }, sans), []);
assert.equal(m.traiterMessageWidget({ jsonrpc: "2.0", id: 2, method: "tools/call", params: {} }, ctx)[0].message.error.code, -32601);
assert.equal(m.traiterMessageWidget({ jsonrpc: "2.0", id: 3, method: "ui/open-link", params: { url: "file:///etc/passwd" } }, ctx)[0].message.error.code, -32602);
assert.deepEqual(m.traiterMessageWidget({ jsonrpc: "2.0", method: "ui/notifications/size-changed", params: { height: 300 } }, ctx), [{ type: "taille", hauteur: 300 }]);

// Jamais d'exception sur des données absurdes.
for (const x of [null, undefined, 5, "a", [], { type: 3 }, { jsonrpc: "2.0" }]) assert.deepEqual(m.traiterMessageWidget(x, ctx), []);

// Texte de repli masqué seulement quand un widget s'affiche.
const t = "Submitted 1 job\n[Ressource : ui://hf/job/1]";
assert.equal(m.masquerLigneRessource(t, [{}]), "Submitted 1 job");
assert.equal(m.masquerLigneRessource(t, []), t);

// Câblage et sécurité du composant.
const [comp, chat, bulle, ligne] = await Promise.all(["../components/chat/WidgetMcpUi.tsx", "../components/chat/ChatIA.tsx", "../components/chat/OutilResultatBulle.tsx", "../components/chat/LigneOutil.tsx"].map(lire));
const code = comp.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
assert.ok(comp.includes('srcDoc: ressource.contenu, sandbox: "allow-scripts" }'), "HTML sans allow-same-origin");
assert.ok(!code.includes("allow-top-navigation") && !code.includes("allow-popups"), "pas de navigation ni popups");
assert.ok(comp.includes("evenement.source !== iframeRef.current.contentWindow"), "émetteur vérifié par sa fenêtre");
assert.ok(chat.includes('item.type === "ressources_ui"') && chat.includes('evenement.type === "ressources_ui"'), "événement traité et mis en file");
assert.ok(bulle.includes("WidgetsMcpUi") && ligne.includes("WidgetsMcpUi"));
console.log("Widgets MCP-UI : contrôles passés.");
