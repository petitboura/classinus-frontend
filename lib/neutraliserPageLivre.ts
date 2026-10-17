// Filtre appliqué à chaque page d'un livre numérique (EPUB, MOBI) avant son
// affichage par la liseuse (components/VisionneurLivre.tsx).
//
// Pourquoi : un livre venu d'un site externe est un contenu non fiable. La
// bibliothèque de lecture (public/foliate-js) affiche chaque page dans une
// iframe qui a les mêmes droits que Classinus (allow-same-origin et
// allow-scripts, imposés par un défaut de WebKit). Un script caché dans une
// page pourrait donc lire la session de la personne. Ce filtre retire tout ce
// qui peut s'exécuter ou sortir de la page, et pose une règle de sécurité
// (Content-Security-Policy) qui interdit aussi ce qu'il aurait oublié.
//
// Ce qui reste : le texte, les images, les polices et les styles du livre,
// tous déjà convertis en adresses internes (blob:) par la bibliothèque.

const NS_XHTML = "http://www.w3.org/1999/xhtml";

// Règle posée dans chaque page HTML. Tout est interdit sauf ce que le livre
// contient lui-même (blob: et data:). Les styles en ligne restent permis, ils
// sont indispensables à la mise en page.
const REGLE_SECURITE = [
  "default-src 'none'",
  "img-src blob: data:",
  "style-src 'unsafe-inline' blob: data:",
  "font-src blob: data:",
  "media-src blob: data:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

const TYPES_PAGE_HTML = new Set(["application/xhtml+xml", "text/html"]);
const TYPES_PAGE = new Set([...TYPES_PAGE_HTML, "image/svg+xml"]);

// Éléments retirés : code, contenus embarqués (pages web, plugins), et ce qui
// peut rediriger ou changer la base des adresses.
const SELECTEUR_RETIRES = "script, iframe, frame, frameset, object, embed, applet, base";

// Attributs qui portent une adresse : retirés s'ils commencent par javascript:.
const ATTRIBUTS_ADRESSE = new Set(["href", "src", "action", "formaction", "xlink:href", "data", "poster"]);

function valeurDangereuse(valeur: string): boolean {
  // Les espaces et caractères de contrôle sont ignorés par les navigateurs
  // devant le protocole ("java\tscript:" fonctionne), on les enlève avant de
  // comparer.
  const nette = valeur.replace(/[\u0000-\u0020\u007f-\u009f]/g, "").toLowerCase();
  return nette.startsWith("javascript:") || nette.startsWith("vbscript:");
}

function nettoyerAttributs(element: Element) {
  for (const attribut of Array.from(element.attributes)) {
    const nom = attribut.name.toLowerCase();
    if (nom.startsWith("on") || nom === "srcdoc") {
      element.removeAttributeNode(attribut);
    } else if (ATTRIBUTS_ADRESSE.has(nom) && valeurDangereuse(attribut.value)) {
      element.removeAttributeNode(attribut);
    }
  }
}

function poserRegleSecurite(doc: Document) {
  const racine = doc.documentElement;
  if (!racine || racine.localName.toLowerCase() !== "html") return;

  // Une balise meta de redirection ou une règle de sécurité du livre ne doit
  // jamais passer.
  for (const meta of Array.from(doc.querySelectorAll("meta"))) {
    if (meta.hasAttribute("http-equiv")) meta.remove();
  }

  let tete: Element | null = null;
  for (const enfant of Array.from(racine.children)) {
    if (enfant.localName.toLowerCase() === "head") {
      tete = enfant;
      break;
    }
  }
  if (!tete) {
    tete = doc.createElementNS(NS_XHTML, "head");
    racine.insertBefore(tete, racine.firstChild);
  }

  const regle = doc.createElementNS(NS_XHTML, "meta");
  regle.setAttribute("http-equiv", "Content-Security-Policy");
  regle.setAttribute("content", REGLE_SECURITE);
  tete.insertBefore(regle, tete.firstChild);
}

// Renvoie la page filtrée. Un type qui n'est pas une page (image, police...)
// est rendu tel quel : il n'a rien d'exécutable. Une page illisible devient une
// page vide plutôt que d'être laissée sans filtre.
export function neutraliserPageLivre(texte: string, typeMime: string): string {
  const type = typeMime.split(";")[0].trim().toLowerCase();
  if (!TYPES_PAGE.has(type)) return texte;

  const doc = new DOMParser().parseFromString(texte, type as DOMParserSupportedType);
  if (!doc.documentElement || doc.querySelector("parsererror")) return "";

  for (const element of Array.from(doc.querySelectorAll(SELECTEUR_RETIRES))) element.remove();
  for (const element of Array.from(doc.querySelectorAll("*"))) nettoyerAttributs(element);
  poserRegleSecurite(doc);

  if (type === "text/html") return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  return new XMLSerializer().serializeToString(doc);
}

// Vrai si ce type est une page que neutraliserPageLivre transforme.
export function estPageLivre(typeMime: string): boolean {
  return TYPES_PAGE.has(typeMime.split(";")[0].trim().toLowerCase());
}
