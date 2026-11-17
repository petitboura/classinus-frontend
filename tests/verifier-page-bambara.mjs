// Page bambara : exécute la logique pure qui choisit quoi montrer et vérifie le branchement.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
const source = await lire("../lib/pageBambaraVisuels.ts");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

// Vidéos YouTube écrites par l'IA : trouvées une seule fois, avec leur miniature.
const t1 = "Voici.\nhttps://www.youtube.com/watch?v=abcdefghijk\nEt encore https://youtu.be/abcdefghijk.";
const v1 = m.extraireVisuelsDuTexte(t1);
assert.equal(v1.length, 1);
assert.equal(v1[0].genre, "video");
assert.equal(v1[0].idVideo, "abcdefghijk");
assert.equal(v1[0].miniature, "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg");

// Images : markdown et lien direct, sans doublon entre les deux.
const t2 = "![chat](https://exemple.org/chat.png)\nhttps://exemple.org/chat.png\nhttps://exemple.org/chien.jpg?x=1";
const v2 = m.extraireVisuelsDuTexte(t2);
assert.deepEqual(v2.map((v) => v.url), ["https://exemple.org/chat.png", "https://exemple.org/chien.jpg?x=1"]);
assert.ok(v2.every((v) => v.genre === "image"));

// Un lien ordinaire n'est pas un visuel, un texte vide non plus.
assert.deepEqual(m.extraireVisuelsDuTexte("Voir https://exemple.org/page"), []);
assert.deepEqual(m.extraireVisuelsDuTexte(""), []);

// Fichiers générés : seules les images et vidéos sont gardées.
const f = m.visuelsDepuisFichiers([{ url: "https://x.org/a.png" }, { url: "https://x.org/b.mp4" }, { url: "https://x.org/c.pdf" }]);
assert.deepEqual(f.map((v) => v.genre), ["image", "video"]);

// Listes du serveur : visuels créés, entrées sans adresse ignorées.
assert.equal(m.visuelsDepuisImages([{ url: "https://x.org/i.jpg", titre: "i" }, { url: "" }]).length, 1);
const vs = m.visuelsDepuisVideos([{ url: "https://www.youtube.com/watch?v=zzzzzzzzzzz", titre: "v" }]);
assert.equal(vs[0].idVideo, "zzzzzzzzzzz");

// Fusion : jamais deux fois le même visuel.
assert.equal(m.fusionnerVisuels(v1, m.extraireVisuelsDuTexte(t1)).length, 1);
assert.equal(m.fusionnerVisuels(v1, v2).length, 3);

// Effet de construction selon l'outil en cours.
assert.equal(m.effetPourOutil("generer_image"), "creation");
assert.equal(m.effetPourOutil("rechercher_image"), "images");
assert.equal(m.effetPourOutil("rechercher_video"), "videos");
assert.equal(m.effetPourOutil("tavily_search"), "recherche");
assert.equal(m.effetPourOutil("memoire_lire"), null);
assert.equal(m.effetPourOutil(undefined), null);
assert.equal(m.effetPrincipal(["tavily_search", "generer_image"]), "creation");
assert.equal(m.effetPrincipal(["memoire_lire"]), null);
assert.equal(m.effetPrincipal([]), null);

// Branchement : le client est annoncé, la réflexion jamais montrée, la page n'a ni texte ni menu.
const [api, page, client] = await Promise.all([
  lire("../lib/pageBambara.ts"),
  lire("../app/bambara/page.tsx"),
  lire("../components/bambara/PageBambaraClient.tsx"),
]);
assert.match(api, /CLIENT_PAGE_BAMBARA = "page_bambara"/);
assert.match(api, /client: CLIENT_PAGE_BAMBARA/);
assert.doesNotMatch(api, /case "raisonnement"/);
assert.doesNotMatch(api, /canal_en_direct/);
assert.match(page, /ssr: false/);
assert.match(client, /ouvrirVoixBambara/);
assert.match(client, /demanderPageBambara/);
assert.doesNotMatch(client, /ChatIA|BarreDeSaisie|BulleMessage/);

// Écriture : un petit bouton clavier ouvre un champ, la demande écrite passe par le même appel que la parole,
// le texte se montre au fur et à mesure et la réponse est lue à voix haute par la voix bambara.
const [ecriture, champ] = await Promise.all([
  lire("../lib/useEcritureBambara.ts"),
  lire("../components/bambara/ChampEcritureBambara.tsx"),
]);
assert.match(api, /surTexte\?\.\(reponse\)/);
assert.match(ecriture, /demanderPageBambara\(question/);
assert.match(ecriture, /creerLecteurBambara/);
assert.match(ecriture, /synthetiserVoixBambara/);
assert.match(ecriture, /voix\.disponible/);
assert.match(client, /useEcritureBambara/);
assert.match(client, /ChampEcritureBambara/);
assert.match(client, /Keyboard/);
assert.match(client, /champOuvert/);
assert.match(champ, /enterKeyHint="send"/);
assert.match(champ, /isComposing/);
console.log("Page bambara : toutes les vérifications passent.");
