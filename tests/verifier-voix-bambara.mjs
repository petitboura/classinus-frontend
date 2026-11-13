// Mode vocal bambara : exécute la préparation du texte lu et vérifie le branchement du client.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
const source = await lire("../lib/voixBambaraTexte.ts");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { nettoyerPourVoix, decouperEnMorceaux } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

// Nettoyage : rien de ce qui ne se prononce pas ne reste.
assert.equal(nettoyerPourVoix("# Titre\n\n**Gras** et *italique*"), "Titre\nGras et italique");
assert.equal(nettoyerPourVoix("- un\n- deux\n1. trois"), "un\ndeux\ntrois");
assert.equal(nettoyerPourVoix("Voir [ce site](https://exemple.org/page) ici"), "Voir ce site ici");
assert.equal(nettoyerPourVoix("Lien https://exemple.org/x fin"), "Lien fin");
assert.equal(nettoyerPourVoix("Avant\n```js\nconst a = 1;\n```\nAprès"), "Avant\nAprès");
assert.equal(nettoyerPourVoix("Bloc ouvert ```js\ncode sans fin"), "Bloc ouvert");
assert.equal(nettoyerPourVoix("| a | b |\n|---|---|\n| 1 | 2 |"), "a b\n1 2");
assert.equal(nettoyerPourVoix("Bonjour 😀 !"), "Bonjour !");
assert.equal(nettoyerPourVoix("![dessin](https://exemple.org/i.png) texte"), "texte");
assert.equal(nettoyerPourVoix(""), "");

// Découpage : jamais plus long que la limite, ordre et contenu conservés.
const phrases = "Première phrase. Deuxième phrase! Troisième phrase? Quatrième phrase.";
const morceaux = decouperEnMorceaux(phrases, 40);
assert.ok(morceaux.length > 1);
assert.ok(morceaux.every((m) => m.length <= 40), "chaque morceau respecte la limite");
assert.equal(morceaux.join(" "), phrases);
assert.deepEqual(decouperEnMorceaux("Court.", 600), ["Court."]);
assert.deepEqual(decouperEnMorceaux("", 600), []);
const longue = "mot ".repeat(100).trim();
const coupes = decouperEnMorceaux(longue, 50);
assert.ok(coupes.every((m) => m.length <= 50));
assert.equal(coupes.join(" "), longue);
assert.ok(decouperEnMorceaux("x".repeat(130), 50).every((m) => m.length <= 50), "mot unique trop long coupé");

// Branchement : le client est annoncé au serveur, la question est montée, « autre » garde la voix d'avant.
const [chat, contexte, global, dialogue, lecteur] = await Promise.all([
  lire("../components/chat/ChatIA.tsx"),
  lire("../lib/contexteVoixDirecte.tsx"),
  lire("../components/InteractionGlobale.tsx"),
  lire("../components/voix/ChoixLangueVoix.tsx"),
  lire("../lib/voixBambara.ts"),
]);
assert.equal((chat.match(/\.\.\.\(clientTourRef\.current \? \{ client: clientTourRef\.current \} : \{\}\)/g) ?? []).length, 3, "les trois envois portent le client");
assert.ok(contexte.includes('CLIENT_VOIX_BAMBARA = "voix_bambara"') || lecteur.includes('CLIENT_VOIX_BAMBARA = "voix_bambara"'));
assert.ok(contexte.includes("surDemande: (question) => demanderAClovis(question, CLIENT_VOIX_BAMBARA)"));
assert.ok(contexte.includes('langue: LangueVoix = "autre"'), "autre langue reste le défaut");
assert.ok(contexte.includes("if (canalEnDirectEstActif())"), "pas de question pendant le canal en direct");
assert.ok(global.includes("<ChoixLangueVoix />"));
assert.ok(dialogue.includes('choisirLangue?.("bambara")') && dialogue.includes('choisirLangue?.("autre")'));
assert.ok(!/ -- /.test(lecteur + dialogue + contexte), "pas de double tiret");
console.log("voix bambara : ok");
