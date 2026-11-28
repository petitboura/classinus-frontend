import { langageDeCode } from "./FichierCode";
import { TYPE_MIME_PAR_EXTENSION } from "./contenuLecteurFichier";

// Une pièce jointe envoyée ne connaît que sa catégorie large ("document") : le
// lecteur a besoin du type de fichier pour choisir le bon aperçu. On le déduit
// de l'extension du nom, ou à défaut de celle de l'adresse réelle (le nom peut
// être coupé ou sans extension, l'adresse garde toujours la sienne).
//
// Tout ce que le lecteur sait afficher est reconnu : PDF, livres (EPUB, MOBI), Word,
// Excel, PowerPoint, CSV, JSON, XML, LaTeX, markdown, texte et code source. Le reste
// garde un type générique non vide, pour que le lecteur ne le prenne pas pour un
// résultat web (carte de site) et affiche son repli "Aperçu non disponible" avec le
// téléchargement, qui reste dans l'appli.
const TYPE_GENERIQUE = "application/octet-stream";

function extensionDe(texte?: string): string {
  return texte?.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() ?? "";
}

function estExtensionConnue(extension: string): boolean {
  return (
    extension === "pdf" ||
    extension === "epub" ||
    extension === "mobi" ||
    extension === "txt" ||
    extension in TYPE_MIME_PAR_EXTENSION ||
    langageDeCode(extension) !== null
  );
}

export function infosFichierJoint(nom: string, adresse?: string): { typeMime: string; extension: string | null } {
  const extNom = extensionDe(nom);
  const extAdresse = extensionDe(adresse);
  const extension = estExtensionConnue(extNom) ? extNom : estExtensionConnue(extAdresse) ? extAdresse : null;
  if (!extension) return { typeMime: TYPE_GENERIQUE, extension: null };
  if (extension === "pdf") return { typeMime: "application/pdf", extension };
  if (extension === "txt") return { typeMime: "text/plain", extension };
  return { typeMime: TYPE_MIME_PAR_EXTENSION[extension] ?? TYPE_GENERIQUE, extension };
}
