import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

// lib/erreurTour.ts : le code de l'erreur choisit le bandeau. L'import de ErreurApi est remplacé
// par une classe équivalente pour ne pas charger tout lib/erreurs.ts.
const CLASSE_ERREUR_API =
  "export class ErreurApi extends Error { constructor(statusCode, message, code) { super(message); this.statusCode = statusCode; this.code = code; } }\n";
const source = (await readFile(new URL("../lib/erreurTour.ts", import.meta.url), "utf8")).replace(
  'import { ErreurApi } from "@/lib/erreurs";\n',
  ""
);
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const mod = await import(`data:text/javascript;base64,${Buffer.from(CLASSE_ERREUR_API + js).toString("base64")}`);
const { codeDepuisException, codeErreurValide, ErreurApi } = mod;

assert.equal(codeErreurValide("delai"), "delai");
assert.equal(codeErreurValide("forte_demande"), "forte_demande");
assert.equal(codeErreurValide("inconnu"), "serveur");
assert.equal(codeErreurValide(undefined), "serveur");
assert.equal(codeDepuisException(new TypeError("Failed to fetch")), "reseau");
assert.equal(codeDepuisException(new Error("boom")), "serveur");
assert.equal(codeDepuisException(new DOMException("t", "TimeoutError")), "delai");

const cas = [
  [401, "SESSION_EXPIREE", "session"],
  [401, "CONNEXION_REQUISE", "connexion"],
  [400, undefined, "requete"],
  [413, undefined, "requete"],
  [422, undefined, "requete"],
  [429, undefined, "forte_demande"],
  [503, undefined, "forte_demande"],
  [500, undefined, "serveur"],
  [404, undefined, "serveur"],
];
for (const [statut, code, attendu] of cas) {
  assert.equal(codeDepuisException(new ErreurApi(statut, "x", code)), attendu, `${statut} ${code}`);
}

// Branchement dans le chat : plus aucun « Réessayer » qui repart de zéro sans distinction.
const chat = await readFile(new URL("../components/chat/ChatIA.tsx", import.meta.url), "utf8");
assert.equal((chat.match(/erreurTour: \{ code: codeDepuisException\(e\) \}/g) || []).length, 5, "les 5 catch posent le code d'erreur");
assert.ok(!chat.includes("erreur: true"), "plus d'ancien drapeau erreur");
assert.equal((chat.match(/erreurs_typees: true/g) || []).length, 5, "les 5 appels du chat demandent les erreurs typées");
assert.ok(chat.includes('evenement.type === "erreur_tour"'), "l'événement du serveur est traité");
assert.ok(chat.includes("<BandeauErreurReponse"), "le bandeau est affiché");
assert.ok(/message\.repriseDisponible \? reprendreAgent\(index\) : continuerApresInterruption\(\)/.test(chat), "Continuer reprend avec l'état quand il existe");
assert.equal((chat.match(/\.filter\(garderDansHistorique\)/g) || []).length, 3, "une réponse vide en erreur n'est pas envoyée en historique");

// Textes du bandeau : tous les codes, en français et en anglais.
const bandeau = await readFile(new URL("../components/chat/BandeauErreurReponse.tsx", import.meta.url), "utf8");
for (const code of ["delai", "forte_demande", "serveur", "reseau", "session", "connexion", "requete"]) {
  assert.equal((bandeau.match(new RegExp(`\\b${code}:`, "g")) || []).length, 2, `${code} existe en français et en anglais`);
}
assert.ok(!/--/.test(bandeau.replace(/\/\/[^\n]*/g, "")), "pas de double tiret dans les textes affichés");
// Arrêter : retour immédiat, attente de l'état envoyé par le serveur, puis coupure.
assert.ok(chat.includes("DELAI_ATTENTE_ARRET_MS"), "délai d'attente borné");
assert.equal((chat.match(/await lireFluxChat\(/g) || []).length, 5, "les 5 envois passent par lireFluxChat");
assert.ok(/evenement\.type === "arret_tour"/.test(chat), "l'état envoyé à l'arrêt est gardé");
assert.ok(/message\.interrompue && \(!genEnCours \|\| arretEnCours\)/.test(chat), "le bandeau d'arrêt est visible dès le clic");
assert.ok(/message\.repriseDisponible \? reprendreAgent\(index\) : continuerApresInterruption\(\)/.test(chat), "Continuer reprend avec l'état");
const interrompue = await readFile(new URL("../components/chat/BandeauReponseInterrompue.tsx", import.meta.url), "utf8");
for (const mot of ["interrompue", "arretEnCours", "modifier", "continuer", "reessayer"]) {
  assert.equal((interrompue.match(new RegExp(`\\b${mot}:`, "g")) || []).length, 2, `${mot} existe en français et en anglais`);
}
console.log("OK : erreur en plein tour, code choisi selon l'erreur, bandeau et reprise branchés");
