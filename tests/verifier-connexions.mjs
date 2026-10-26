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

// Les services Google Workspace en préversion restent masqués tant que Google n'a pas donné son accord.
const GOOGLE = "AFFICHER_GOOGLE_WORKSPACE_APERCU";
assert.ok(catalogue.includes("const AFFICHER_GOOGLE_WORKSPACE_APERCU = false;"), "les services Google en préversion doivent rester masqués par défaut");

const applications = [
  ["github", true, true],
  ["notion", true, true],
  ["google_drive", false, false],
  ["google_gmail_mcp", GOOGLE, GOOGLE],
  ["google_docs_mcp", GOOGLE, GOOGLE],
  ["google_sheets_mcp", GOOGLE, GOOGLE],
  ["google_slides_mcp", GOOGLE, GOOGLE],
  ["google_calendar_mcp", GOOGLE, GOOGLE],
  ["google_chat_mcp", GOOGLE, GOOGLE],
  ["google_classroom_mcp", GOOGLE, GOOGLE],
  ["google_people_mcp", GOOGLE, GOOGLE],
  ["microsoft_mcp", true, true],
  ["netlify_mcp", false, true],
  ["render_mcp", false, true],
  ["cloudflare_mcp", true, true],
  ["higgsfield_mcp", true, true],
  ["vercel_mcp", true, true],
  ["railway_mcp", true, true],
  ["supabase_mcp", true, true],
];

for (const [nom, visibleBouton, visibleEspace] of applications) {
  const entree = catalogue.split("\n").find((ligne) => ligne.includes('nom: "' + nom + '"') && ligne.includes("visibleDansBoutonApplications"));
  assert.ok(entree, "catalogue : entrée absente pour " + nom);
  assert.ok(entree.includes("visibleDansBoutonApplications: " + visibleBouton), "visibilité du bouton incorrecte pour " + nom);
  assert.ok(entree.includes("visibleDansEspaceConnexions: " + visibleEspace), "visibilité de l’espace connexions incorrecte pour " + nom);
}

// Aucun détail interne de la plateforme ne doit être montré aux utilisateurs.
for (const [nom, texte] of [["catalogue", catalogue], ["espace", espace], ["aide", aide]]) {
  assert.ok(!/TAVILY|Wolfram|MCP_SERVEURS_COMPLEMENTAIRES/.test(texte), "informations internes visibles dans " + nom);
}
assert.ok(guideClaude.includes("URL_MCP_CLASSINUS_CLAUDE"), "le guide Claude doit utiliser l'URL centralisée");
assert.ok(barre.includes("SERVICES_MCP_OAUTH.includes(nom)"), "chaque service OAuth du menu doit déclencher une action");
assert.ok(catalogue.includes("export const SERVICES_MCP_OAUTH"), "la liste des services OAuth du chat doit venir du catalogue");
assert.ok(espace.includes('app.modeConnexion === "jeton"'), "Netlify doit utiliser son mode jeton personnel");
const applisJeton = await lire("../lib/connexionsApplis.ts");
assert.ok(espace.includes("jeton.enregistrer("), "le jeton personnel doit être validé côté serveur");
assert.ok(applisJeton.includes("enregistrer: enregistrerJetonNetlify"), "Netlify doit être branché sur la validation de son jeton");
assert.ok(applisJeton.includes("enregistrer: enregistrerJetonRender"), "Render doit être branché sur la validation de sa clé");

assert.match(espace, /APPLIS_DISPONIBLES\.filter\(\(app\) => app\.visibleDansEspaceConnexions\)/);
assert.match(barre, /APPLIS_DISPONIBLES\.filter\(\(a\) => a\.visibleDansBoutonApplications\)/);
assert.ok(espace.includes('ligne.etat === "erreur" ? void recharger()'), "Réessayer doit actualiser le statut, pas relancer OAuth");
assert.ok(espace.includes("ligne.message"), "les erreurs de statut doivent être visibles");
assert.ok(barre.includes('if (etat === "erreur") return "Statut indisponible";'));
assert.ok(barre.includes('[service]: "erreur"'), "une panne de statut MCP ne doit pas être interprétée comme une déconnexion");
assert.ok(barre.includes('[service]: "deconnecte"'), "après une déconnexion réussie, l’état doit devenir Non connecté");
assert.ok(!/catch \(e\) \{\s*\/\/ Échec du démarrage[^\n]*\n\s*setPlatformMcpEtat/.test(barre), "un échec de connexion ou de déconnexion ne doit pas passer l’état en erreur de statut");
assert.ok(catalogue.includes("registre.repli && promesseRegistre === promesseCourante"));
assert.ok(catalogue.includes('window.addEventListener("online", reessayerSiDisponible)'));
assert.ok(catalogue.includes('window.addEventListener("focus", reessayerSiDisponible)'));
assert.match(api, /\/api\/connexions\/\$\{service\}\/statut/);
assert.match(api, /\/api\/connexions\/\$\{service\}\/demarrer/);
assert.match(api, /\/api\/connexions\/\$\{service\}\/deconnecter/);
assert.ok(aide.includes("Google Drive n’est pas proposé dans les interfaces de connexion"));
assert.ok(aide.includes("Netlify") && aide.includes("Render") && aide.includes("Cloudflare"), "l’aide doit citer les services ajoutés");
assert.ok(packageJson.includes('"test:connexions": "node tests/verifier-connexions.mjs"'));

assert.ok(barre.includes(' .catch(() => setGithubConnecte(null))'.trim()), "GitHub inconnu en cas d’échec du statut");
assert.ok(barre.includes(' .catch(() => setNotionConnecte(null))'.trim()), "Notion inconnu en cas d’échec du statut");
assert.ok(barre.includes('connecte = (await statutConnexion("github")).connecte;'));
assert.ok(barre.includes('connecte = (await statutConnexion("notion")).connecte;'));
assert.ok(barre.includes('type EtatConnexionMcp = "chargement" | "connecte" | "deconnecte" | "a_reconnecter" | "erreur"'));
assert.ok(barre.includes('if (etat === "chargement" || etat === "erreur")') || barre.includes('etat === "chargement" || etat === "erreur"'), "le menu MCP doit revérifier un état inconnu");

console.log("Vérifications structurelles des connexions Classinus : OK");
