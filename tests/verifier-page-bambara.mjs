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

// Conversation : modifier un tour ne touche jamais aux autres tours ni à la liste d'origine.
const toursDepart = [{ id: "a", question: "", texte: "", visuels: [] }, { id: "b", question: "q", texte: "t", visuels: [] }];
const toursApres = m.modifierTour(toursDepart, "a", (t) => ({ ...t, texte: "x" }));
assert.equal(toursApres[0].texte, "x");
assert.equal(toursApres[1], toursDepart[1]);
assert.equal(toursDepart[0].texte, "");
assert.equal(m.modifierTour(toursDepart, "inconnu", (t) => ({ ...t, texte: "y" })).every((t) => t.texte !== "y"), true);

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
// Noir et blanc seulement (demande de Bourama, 18/11/2026) : aucune couleur d'accent, d'erreur ou en dur
// dans la page. Les couleurs viennent de .bb-page (noir et blanc qui s'inversent selon le thème).
const css = await lire("../components/bambara/bambara.css");
const [carte, effet] = await Promise.all([
  lire("../components/bambara/CarteVisuelBambara.tsx"),
  lire("../components/bambara/EffetConstruction.tsx"),
]);
const sansCommentaires = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
for (const [nom, texte] of [["PageBambaraClient", client], ["ChampEcritureBambara", champ], ["CarteVisuelBambara", carte], ["EffetConstruction", effet]]) {
  assert.doesNotMatch(sansCommentaires(texte), /dj-(accent|erreur|bordure-forte)|#[0-9a-fA-F]{3,8}\b|rgba?\(|bg-black\/|text-white/, nom + " : couleur interdite");
}
const cssCode = sansCommentaires(css);
assert.doesNotMatch(cssCode, /--dj-(erreur|accent-2|bordure-forte)/);
const hexAutorises = new Set(["#ffffff", "#000000"]);
for (const hex of cssCode.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) assert.ok(hexAutorises.has(hex.toLowerCase()), "bambara.css : couleur " + hex + " interdite");
assert.doesNotMatch(cssCode, /rgba?\(|hsla?\(/);
assert.match(client, /bb-page/);

// Mise en page du 18/11/2026 (demande de Bourama) : la bulle, le champ et le micro flottent par dessus le contenu,
// le clavier se pose par dessus au lieu de pousser la page, et les images et vidéos sont de petites rangées
// défilantes comme dans le chat, jamais de grandes cartes empilées.
const [rangees, decalage, layout] = await Promise.all([
  lire("../components/bambara/RangeesVisuelsBambara.tsx"),
  lire("../lib/useDecalageClavier.ts"),
  lire("../app/bambara/layout.tsx"),
]);
assert.match(layout, /interactiveWidget: "overlays-content"/);
assert.match(client, /useDecalageClavier/);
assert.match(client, /RangeesVisuelsBambara/);
assert.match(client, /absolute inset-x-0 top-0/);
assert.match(client, /absolute inset-x-0 bottom-0/);
assert.doesNotMatch(client, /flex-col"\s*\n?\s*style=\{\{\s*\n?\s*paddingTop/);
assert.match(decalage, /visualViewport/);
// Effet conversation (18/11/2026) : chaque demande s'ajoute à la suite, rien n'efface les tours précédents.
assert.match(client, /demarrerTour/);
assert.match(client, /tours\.map/);
assert.doesNotMatch(client, /setVisuels|setTexteReponse|setTours\(\[\]\)/);
assert.match(ecriture, /avantEnvoi\(question\)/);
assert.match(rangees, /overflow-x-auto/);
assert.match(rangees, /VisionneuseImage/);
assert.doesNotMatch(carte, /max-h-\[62vh\]|w-full rounded-2xl/);

console.log("Page bambara : toutes les vérifications passent.");
