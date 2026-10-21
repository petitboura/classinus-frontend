import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import ts from "typescript";

const ROOTS = ["app", "components", "lib", "packages"];
const EXTENSIONS = new Set([".ts", ".tsx"]);
const ATTRS = new Set([
  "title", "placeholder", "aria-label", "aria-description", "alt",
  "label", "value", "tooltip", "emptylabel",
]);
const PROPERTIES = new Set([
  "title", "titre", "description", "label", "libelle", "placeholder",
  "tooltip", "emptylabel", "emptytext", "ariaLabel", "aria-label",
]);
const TAGS_NON_UI = new Set(["code", "pre", "textarea", "script", "style", "svg", "math"]);

function fichiersDans(racine) {
  const chemin = join(process.cwd(), racine);
  try {
    return readdirSync(chemin, { withFileTypes: true }).flatMap((entree) => {
      const suivant = join(chemin, entree.name);
      if (entree.isDirectory()) {
        if (["node_modules", ".next", "dist", "build", ".git"].includes(entree.name)) return [];
        return fichiersDans(join(racine, entree.name));
      }
      return EXTENSIONS.has(extname(entree.name)) ? [suivant] : [];
    });
  } catch {
    return [];
  }
}

function normaliser(texte) {
  return texte.normalize("NFC")
    .replace(/[’‘‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[\u00a0\s]+/g, " ")
    .trim()
    .toLocaleLowerCase("fr");
}

function decoderEntites(texte) {
  return texte
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function estTexteFrancais(texte) {
  if (/[àâçéèêëîïôùûüÿœæ]/i.test(texte)) return true;
  const t = normaliser(texte);
  if (/^(?:annuler|enregistrer|supprimer|modifier|ajouter|continuer|rechercher|recherche|valider|effacer|lancer|télécharger|telecharger|envoyer|fermer|ouvrir|traduire|chargement|réessayer|reessayer|confirmer|refuser|accepter|afficher|masquer|saisir|choisir|sélectionner|selectionner|terminer|reprendre|créer|creer|déplacer|deplacer|renommer|partager|connecter|déconnecter|deconnecter|inscription|connexion|paramètres|parametres|bibliothèque|bibliotheque|aucun|aucune|aucuns|aucunes|bienvenue|suivant|précédent|precedent|retour|aide|mémoire|memoire|profil|règle|regle|procédure|procedure|comportement|étape|etape)\b/.test(t)) return true;
  return /\b(?:de|du|des|la|le|les|un|une|et|pour|dans|sur|avec|sans|ton|ta|tes|votre|vos|tu|vous|est|sont|peut|peuvent|doit|doivent|comment|pourquoi|quand|où|ou|qui|quoi|plus|moins|pas|ici|déjà|deja|encore|cette|ces|celui|celle|afin|entre|pendant|depuis|avant|après|apres|vers|chez|compte|code|fichier|document|conversation|message|erreur)\b/.test(t);
}

function sousContenuProtege(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent)) {
      const tag = (ts.isJsxElement(parent) ? parent.openingElement.tagName : parent.tagName).getText();
      if (TAGS_NON_UI.has(tag.toLowerCase())) return true;
    }
  }
  return false;
}

const contenuDictionnaire = readFileSync("lib/i18n/interface.ts", "utf8");
const sourceDictionnaire = ts.createSourceFile("lib/i18n/interface.ts", contenuDictionnaire, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const cles = new Set();
function trouverDictionnaire(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "EN" && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
    for (const propriete of node.initializer.properties) {
      if (!ts.isPropertyAssignment(propriete) || !ts.isStringLiteral(propriete.initializer)) continue;
      const cle = ts.isStringLiteral(propriete.name) || ts.isNoSubstitutionTemplateLiteral(propriete.name)
        ? propriete.name.text
        : ts.isIdentifier(propriete.name) ? propriete.name.text : null;
      if (cle !== null) cles.add(normaliser(cle));
    }
  }
  ts.forEachChild(node, trouverDictionnaire);
}
trouverDictionnaire(sourceDictionnaire);

const textes = new Map();
function ajouter(texte, fichier, source) {
  const valeur = decoderEntites(texte).replace(/[\u00a0\s]+/g, " ").trim();
  if (valeur.length < 3 || valeur.length > 500 || !estTexteFrancais(valeur)) return;
  if (/^(?:https?:\/\/|mailto:|data:)/i.test(valeur) || /\$\{[^}]+\}/.test(valeur)) return;
  if (/^[A-Z0-9_./-]+$/.test(valeur)) return;
  const cle = normaliser(valeur);
  if (cles.has(cle)) return;
  if (!textes.has(cle)) textes.set(cle, { texte: valeur, fichier, source });
}

function parcourir(node, fichier, sourceFile) {
  if (ts.isJsxText(node) && !sousContenuProtege(node)) {
    ajouter(node.getText(sourceFile), fichier, "JSXText");
  }
  if (ts.isJsxAttribute(node)) {
    const nom = node.name.getText(sourceFile).toLowerCase();
    if (ATTRS.has(nom) && node.initializer && ts.isStringLiteral(node.initializer)) {
      ajouter(node.initializer.text, fichier, nom);
    }
  }
  if (ts.isPropertyAssignment(node)) {
    const nom = (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : "").toLowerCase();
    if (PROPERTIES.has(nom) && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
      ajouter(node.initializer.text, fichier, nom);
    }
  }
  ts.forEachChild(node, (enfant) => parcourir(enfant, fichier, sourceFile));
}

const fichiers = ROOTS.flatMap(fichiersDans);
for (const fichier of fichiers) {
  const contenu = readFileSync(fichier, "utf8");
  const kind = extname(fichier) === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(fichier, contenu, ts.ScriptTarget.Latest, true, kind);
  parcourir(source, fichier.replace(process.cwd() + "/", ""), source);
}

const manquants = [...textes.values()].sort((a, b) => a.fichier.localeCompare(b.fichier) || a.texte.localeCompare(b.texte));
console.log(`Interface localization audit: ${cles.size} translation keys, ${fichiers.length} TypeScript files scanned, ${manquants.length} likely French strings without a dictionary entry.`);
for (const item of manquants.slice(0, 300)) {
  console.log(`MISSING_I18N [${item.fichier}] [${item.source}] ${JSON.stringify(item.texte)}`);
}
if (manquants.length > 300) console.log(`Additional missing entries omitted: ${manquants.length - 300}`);
