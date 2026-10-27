import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Carte de connexion proposée par l'IA dans le chat (26/10/2026) : contrôles de câblage.
const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
const [carte, riches, autonome, espace, partage] = await Promise.all([
  lire("../components/chat/CarteConnecteur.tsx"),
  lire("../components/chat/composantsMarkdownRiches.tsx"),
  lire("../components/chat/RenduMarkdownAutonome.tsx"),
  lire("../components/connexions/EspaceConnexions.tsx"),
  lire("../lib/connexionsApplis.ts"),
]);

assert.match(riches, /case "connecteur":\s*return <CarteConnecteur/, "le chat doit reconnaître le bloc connecteur");
assert.match(autonome, /case "connecteur":\s*return <CarteConnecteur/, "le rendu autonome doit reconnaître le bloc connecteur");
assert.ok(carte.includes("a.visibleDansEspaceConnexions"), "jamais de carte pour un service masqué dans l'écran Connexions");
assert.ok(carte.includes("descriptionConnexion(app.nom)") && carte.includes("JETONS[app.nom]"), "mêmes textes que l'écran Connexions");
assert.ok(carte.includes("<PanneauConnexion") && carte.includes("<CarteConnexion"), "même carte et même panneau que l'écran Connexions");
assert.ok(!carte.includes('type="password"'), "le jeton se saisit dans le panneau, jamais dans la carte");
assert.ok(espace.includes('from "@/lib/connexionsApplis"') && !espace.includes("const DESCRIPTIONS"), "une seule source des descriptions");
assert.ok(partage.includes("export const DESCRIPTIONS") && partage.includes("export const JETONS") && partage.includes("export function descriptionConnexion"));
assert.ok(carte.includes("memoriserRetourConnexion"), "retour dans la conversation après l'autorisation");
assert.ok(carte.includes("Utiliser pour ça"), "bouton qui redonne la main à l'IA");
for (const [nom, texte] of [["carte", carte], ["partage", partage]]) {
  assert.ok(!/[^-(]--[^-]/.test(texte.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")) , "double tiret affiché dans " + nom);
}
console.log("Carte de connexion du chat : contrôles passés.");
