import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
const [catalogue, espace, barre, api, aide, packageJson] = await Promise.all([
  lire("../lib/outils.ts"),
  lire("../components/connexions/EspaceConnexions.tsx"),
  lire("../components/chat/BarreDeSaisie.tsx"),
  lire("../lib/api.ts"),
  lire("../app/decouvrir/personnaliser/applications-connectees/page.tsx"),
  lire("../package.json"),
]);

const applications = [
  ["github", true, true],
  ["notion", true, true],
  ["google_drive", false, false],
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
assert.ok(packageJson.includes('"test:connexions": "node tests/verifier-connexions.mjs"'));

assert.ok(barre.includes(' .catch(() => setGithubConnecte(null))'.trim()), "GitHub inconnu en cas d’échec du statut");
assert.ok(barre.includes(' .catch(() => setNotionConnecte(null))'.trim()), "Notion inconnu en cas d’échec du statut");
assert.ok(barre.includes('connecte = (await statutConnexion("github")).connecte;'));
assert.ok(barre.includes('connecte = (await statutConnexion("notion")).connecte;'));
assert.ok(barre.includes('type EtatConnexionMcp = "chargement" | "connecte" | "deconnecte" | "a_reconnecter" | "erreur"'));
assert.ok(barre.includes('if (etat === "chargement" || etat === "erreur")') || barre.includes('etat === "chargement" || etat === "erreur"'), "le menu MCP doit revérifier un état inconnu");

console.log("Vérifications structurelles des connexions Classinus : OK");
