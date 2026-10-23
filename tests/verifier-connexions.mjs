import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
const [catalogue, espace, barre, api, aide, packageJson, guideClaude] = await Promise.all([
  lire("../lib/outils.ts"),
  lire("../components/connexions/EspaceConnexions.tsx"),
  lire("../components/chat/BarreDeSaisie.tsx"),
  lire("../lib/api.ts"),
  lire("../app/decouvrir/personnaliser/applications-connectees/page.tsx"),
  lire("../package.json"),
  lire("../components/EspaceConnecterClaude.tsx"),
]);

const applications = [
  ["github", true, true],
  ["notion", true, true],
  ["google_drive", true, true],
  ["google_gmail_mcp", true, true],
  ["google_docs_mcp", true, true],
  ["google_sheets_mcp", true, true],
  ["google_slides_mcp", true, true],
  ["google_calendar_mcp", true, true],
  ["google_chat_mcp", true, true],
  ["google_classroom_mcp", true, true],
  ["google_people_mcp", true, true],
  ["microsoft_mcp", true, true],
  ["netlify_mcp", true, true],
  ["render_mcp", true, true],
  ["cloudflare_mcp", true, true],
  ["higgsfield_mcp", true, true],
  ["vercel_mcp", true, true],
  ["railway_mcp", true, true],
  ["supabase_mcp", true, true],
];

const servicesGoogleEnApercu = [
  "google_drive", "google_gmail_mcp", "google_docs_mcp", "google_sheets_mcp",
  "google_slides_mcp", "google_calendar_mcp", "google_chat_mcp",
  "google_classroom_mcp", "google_people_mcp",
];
for (const nom of servicesGoogleEnApercu) {
  const entree = catalogue.split("\n").find((ligne) => ligne.includes('nom: "' + nom + '"'));
  assert.ok(entree?.includes('etatDisponibilite: "apercu"'), "Google Workspace doit être marqué préversion : " + nom);
}
assert.ok(espace.includes('app.etatDisponibilite === "apercu"'), "les cartes doivent afficher la préversion Google");
assert.ok(aide.includes("avant autorisation explicite de Google"), "la restriction d’accès hors domaine doit être expliquée");

for (const [nom, visibleBouton, visibleEspace] of applications) {
  const entree = catalogue.split("\n").find((ligne) => ligne.includes('nom: "' + nom + '"') && ligne.includes("visibleDansBoutonApplications"));
  assert.ok(entree, "catalogue : entrée absente pour " + nom);
  assert.ok(entree.includes("visibleDansBoutonApplications: " + visibleBouton), "visibilité du bouton incorrecte pour " + nom);
  assert.ok(entree.includes("visibleDansEspaceConnexions: " + visibleEspace), "visibilité de l’espace connexions incorrecte pour " + nom);
}

assert.match(espace, /APPLIS_DISPONIBLES\.filter\(\(app\) => app\.visibleDansEspaceConnexions\)/);
assert.match(barre, /APPLIS_DISPONIBLES\.filter\(\(a\) => a\.visibleDansBoutonApplications\)/);
assert.ok(espace.includes('ligne.etat === "erreur" ? void recharger()'), "Réessayer doit actualiser le statut, pas relancer OAuth");
assert.ok(espace.includes("ligne.message"), "les erreurs de statut doivent être visibles");
assert.ok(barre.includes('if (etat === "erreur") return "Statut indisponible";'));
assert.ok(barre.includes('[service]: "erreur"'), "une panne de statut MCP ne doit pas être interprétée comme une déconnexion");
assert.ok(catalogue.includes("registre.repli && promesseRegistre === promesseCourante"));
assert.ok(catalogue.includes('window.addEventListener("online", reessayerSiDisponible)'));
assert.ok(catalogue.includes('window.addEventListener("focus", reessayerSiDisponible)'));
assert.match(api, /\/api\/connexions\/\$\{service\}\/statut/);
assert.match(api, /\/api\/connexions\/\$\{service\}\/demarrer/);
assert.match(api, /\/api\/connexions\/\$\{service\}\/deconnecter/);
assert.ok(aide.includes("Google Drive") && aide.includes("Tavily"), "l’aide doit refléter le catalogue complet");
assert.ok(catalogue.includes("export const MCP_SERVEURS_COMPLEMENTAIRES"), "les MCP gérés par la plateforme doivent avoir un catalogue distinct");
for (const id of ["tavily", "generation", "wolfram", "classinus_claude"]) {
  assert.ok(catalogue.includes('id: "' + id + '"'), "MCP complémentaire absent : " + id);
}
assert.ok(catalogue.includes('statut: "desactive"'), "Wolfram doit rester déclaré comme désactivé, sans faux bouton de connexion");
assert.ok(catalogue.includes("TAVILY_API_KEY"), "Tavily doit être documenté comme clé de plateforme");
assert.ok(catalogue.includes('https://api.classinus.com/mcp/espace'), "l'endpoint MCP Classinus doit être centralisé");
assert.ok(espace.includes("MCP_SERVEURS_COMPLEMENTAIRES.map"), "la liste des MCP de plateforme doit être visible");
assert.ok(espace.includes('app.modeConnexion === "jeton"'), "Netlify doit utiliser son mode jeton personnel");
assert.ok(espace.includes('enregistrerJetonNetlify(jetonNetlify.trim())'), "le jeton Netlify doit être validé côté serveur");
assert.ok(catalogue.includes('modeConnexion: "jeton"'), "Netlify ne doit pas démarrer une OAuth inexistante");
assert.ok(espace.includes("serveur.guideHref"), "le guide Claude doit être accessible depuis l'inventaire MCP");
assert.ok(guideClaude.includes("URL_MCP_CLASSINUS_CLAUDE"), "le guide Claude doit utiliser la même URL centralisée");
assert.ok(packageJson.includes('"test:connexions": "node tests/verifier-connexions.mjs"'));

assert.ok(barre.includes(' .catch(() => setGithubConnecte(null))'.trim()), "GitHub inconnu en cas d’échec du statut");
assert.ok(barre.includes(' .catch(() => setNotionConnecte(null))'.trim()), "Notion inconnu en cas d’échec du statut");
assert.ok(barre.includes('connecte = (await statutConnexion("github")).connecte;'));
assert.ok(barre.includes('connecte = (await statutConnexion("notion")).connecte;'));
assert.ok(barre.includes('type EtatConnexionMcp = "chargement" | "connecte" | "deconnecte" | "a_reconnecter" | "erreur"'));
assert.ok(barre.includes('if (etat === "chargement" || etat === "erreur")') || barre.includes('etat === "chargement" || etat === "erreur"'), "le menu MCP doit revérifier un état inconnu");

console.log("Vérifications structurelles des connexions Classinus : OK");
