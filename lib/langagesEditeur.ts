// Extensions CodeMirror par langage, pour l'éditeur de code du Bureau
// (voir components/bureau/EditeurCode.tsx). Mêmes clés que
// EXTENSION_PAR_LANGAGE (components/chat/BlocCode.tsx), pour rester
// cohérent avec la détection de langage déjà utilisée côté chat -- un
// langage absent d'ici ne casse rien, l'éditeur reste utilisable sans
// coloration syntaxique (même philosophie que lib/coloration.ts pour
// highlight.js).
import type { Extension } from "@codemirror/state";
import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { go } from "@codemirror/lang-go";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";

const FABRIQUES_PAR_LANGAGE: Record<string, () => Extension> = {
  python: () => python(),
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  xml: () => html(),
  css: () => css(),
  sql: () => sql(),
  java: () => java(),
  c: () => cpp(),
  cpp: () => cpp(),
  go: () => go(),
  rust: () => rust(),
  php: () => php(),
  yaml: () => yaml(),
  markdown: () => markdown(),
  json: () => json(),
};

/** Extension(s) CodeMirror pour un langage donné, tableau vide si inconnu. */
export function extensionsLangage(langage: string): Extension[] {
  const fabrique = FABRIQUES_PAR_LANGAGE[(langage || "").toLowerCase()];
  return fabrique ? [fabrique()] : [];
}

const LANGAGE_PAR_EXTENSION: Record<string, string> = {
  py: "python", js: "javascript", ts: "typescript", html: "xml", htm: "xml",
  css: "css", sh: "bash", sql: "sql", java: "java", c: "c", cpp: "cpp",
  go: "go", rs: "rust", php: "php", rb: "ruby", yml: "yaml", yaml: "yaml",
  md: "markdown", toml: "ini", json: "json",
};

/** Langage déduit de l'extension d'un fichier ouvert depuis la bibliothèque. */
export function detecterLangage(nomFichier: string): string {
  const extension = nomFichier.split(".").pop()?.toLowerCase() ?? "";
  return LANGAGE_PAR_EXTENSION[extension] ?? "texte";
}

/** Langages proposés dans le sélecteur de l'éditeur, avec un libellé lisible. */
export const LANGAGES_EDITEUR: { valeur: string; libelle: string }[] = [
  { valeur: "python", libelle: "Python" },
  { valeur: "javascript", libelle: "JavaScript" },
  { valeur: "typescript", libelle: "TypeScript" },
  { valeur: "xml", libelle: "HTML" },
  { valeur: "css", libelle: "CSS" },
  { valeur: "sql", libelle: "SQL" },
  { valeur: "java", libelle: "Java" },
  { valeur: "c", libelle: "C" },
  { valeur: "cpp", libelle: "C++" },
  { valeur: "go", libelle: "Go" },
  { valeur: "rust", libelle: "Rust" },
  { valeur: "php", libelle: "PHP" },
  { valeur: "yaml", libelle: "YAML" },
  { valeur: "markdown", libelle: "Markdown" },
  { valeur: "json", libelle: "JSON" },
  { valeur: "bash", libelle: "Bash" },
  { valeur: "ruby", libelle: "Ruby" },
  { valeur: "texte", libelle: "Texte" },
];
