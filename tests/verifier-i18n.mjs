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
// Le sélecteur flottant a été supprimé : le composant de traduction ne rend aucun contrôle.
assert.doesNotMatch(globalI18n, /<option value="fr">FR · Français<\/option>/);
assert.doesNotMatch(globalI18n, /<option value="en">EN · English<\/option>/);
assert.match(globalI18n, /return null;/, "Le composant global de traduction ne doit rien afficher");
assert.match(globalI18n, /obtenirLocale\(\)/, "La langue doit provenir des préférences");

assert.equal(traduireTexteInterface("à tes applications connectées", "en"), "to your connected apps");
assert.equal(traduireTexteInterface("On te ramène", "en"), "Taking you back");
assert.equal(
  traduireTexteInterface("Relie tes comptes externes à Classinus, consulte leur état et retire leurs autorisations quand tu le souhaites.", "en"),
  "Connect your external accounts to Classinus, check their status, and revoke their permissions whenever you like."
);
assert.match(globalI18n, /if \(!traductionActive\.current\) return;/, "L'observateur doit s'arrêter quand rien n'est traduit");
for (const protectedSelector of ["pre", "code", "textarea", ".markdown-body", ".katex", "[contenteditable='true']"]) {
  assert.ok(globalI18n.includes(protectedSelector), `Expected user content protection for ${protectedSelector}`);
}

console.log("Frontend localization checks passed.");
