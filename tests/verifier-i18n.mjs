import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/i18n/interface.ts", "utf8");
const javascript = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
});
const module = { exports: {} };
vm.runInNewContext(javascript, { module, exports: module.exports });

const { traduireTexteInterface } = module.exports;
assert.equal(typeof traduireTexteInterface, "function");

assert.equal(traduireTexteInterface("Bibliothèque", "en"), "Library");
assert.equal(traduireTexteInterface("Langue de l’interface", "en"), "Interface language");
assert.equal(traduireTexteInterface("Étape 3", "en"), "Step 3");
assert.equal(traduireTexteInterface("Âge", "en"), "Age");
assert.equal(traduireTexteInterface("Mot de passe mis à jour", "en"), "Password updated");
assert.equal(traduireTexteInterface("Télécharger Classinus pour Android", "en"), "Download Classinus for Android");
assert.equal(traduireTexteInterface("Accéder à l'application Classinus", "en"), "Open the Classinus app");
assert.equal(traduireTexteInterface("« Windows a protégé votre ordinateur »", "en"), "“Windows protected your PC”");
assert.equal(traduireTexteInterface("Bibliothèque", "fr"), "Bibliothèque");

const texteUtilisateur = "Un texte propre à l'utilisateur qui ne doit pas être réécrit.";
assert.equal(traduireTexteInterface(texteUtilisateur, "en"), texteUtilisateur);

const locale = readFileSync("lib/i18n/locale.ts", "utf8");
assert.match(locale, /CLE_LOCALE_CLASSINUS\s*=\s*"classinus\.locale"/);
assert.match(locale, /localStorage\.setItem\(CLE_LOCALE_CLASSINUS, locale\)/);
assert.match(locale, /EVENEMENT_LOCALE_CLASSINUS/);

const globalI18n = readFileSync("components/InternationalisationGlobale.tsx", "utf8");
assert.doesNotMatch(globalI18n, /<select\b|<option\b/, "Le composant global ne doit pas afficher de sélecteur de langue.");
assert.match(globalI18n, /return null;/, "La traduction globale ne doit afficher aucun contrôle.");
assert.match(globalI18n, /traductionActive/, "Le français pur ne doit pas surveiller la page");
assert.match(globalI18n, /if \(!traductionActive\.current\) return;/, "L'observateur doit s'arrêter quand rien n'est traduit");
for (const protectedSelector of ["pre", "code", "textarea", ".markdown-body", ".katex", "[contenteditable='true']"]) {
  assert.ok(globalI18n.includes(protectedSelector), `Expected user content protection for ${protectedSelector}`);
}

console.log("Frontend localization checks passed.");
