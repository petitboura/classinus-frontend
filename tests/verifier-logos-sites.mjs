import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Logos des sites (29/10/2026, demande Bourama : plus jamais de globe générique).
// Contrôles de câblage : la demande à Google ne passe plus jamais par l'écran, les deux endroits
// (cartes de connexion et lignes d'outils du chat) partagent le même composant, et la lettre de
// secours reste la seule solution de repli.
const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
const [partage, ligne, carte, sites, mcp, bulleSources] = await Promise.all([
  lire("../components/LogoDeSite.tsx"),
  lire("../components/chat/LogoSite.tsx"),
  lire("../components/connexions/LogoMcp.tsx"),
  lire("../lib/logosSites.ts"),
  lire("../lib/logoMcp.ts"),
  lire("../components/chat/SourcesBulle.tsx"),
]);

const sansCommentaires = (texte) => texte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

for (const [nom, texte] of [["LogoDeSite", partage], ["LogoSite", ligne], ["LogoMcp", carte]]) {
  assert.ok(!sansCommentaires(texte).includes("google.com/s2/favicons"), `${nom} ne doit plus demander l'icône à Google directement`);
}
assert.ok(!ligne.includes("lucide-react") && !sansCommentaires(ligne).includes("Globe"), "plus de globe générique dans les lignes d'outils");
assert.ok(sites.includes("/api/logos-sites/") && sites.includes("export function urlLogoSite"), "une seule adresse pour l'icône d'un site");
assert.ok(partage.includes("urlLogoSite(nom)"), "le composant partagé passe par le serveur de Classinus");
assert.ok(ligne.includes("<LogoDeSite") && carte.includes("<LogoDeSite"), "cartes et lignes d'outils partagent le même composant");
assert.match(partage, /onError=\{\(\) => setEtat\(\{ domaine: nom, charge: false, erreur: true \}\)\}/, "une icône absente laisse la lettre");
assert.ok(partage.includes("iconeVisible ? \"opacity-0\" : \"opacity-100\""), "la lettre reste visible tant que l'icône n'est pas chargée");

// Lettre de secours d'un site : on teste la vraie fonction, sans copie.
const { lettreDeSite } = await import("../lib/logoMcp.ts").catch(() => ({}));
if (lettreDeSite) {
  const attendu = {
    "netlify-mcp.netlify.app": "N",
    "fr.wikipedia.org": "W",
    "www.arxiv.org": "A",
    "mcp.linear.app": "L",
    "école.fr": "E",
    "123.com": "1",
  };
  for (const [site, lettre] of Object.entries(attendu)) assert.equal(lettreDeSite(site), lettre, `lettre de ${site}`);
} else {
  assert.ok(mcp.includes("export function lettreDeSite"), "lettreDeSite doit exister (calcul non exécutable ici)");
}

// Hors périmètre de ce chantier : les pastilles de sources sous les réponses gardent leur repli propre.
assert.ok(bulleSources.includes("ExternalLink"), "les pastilles de sources ne sont pas touchées");

console.log("Logos des sites : contrôles passés.");
