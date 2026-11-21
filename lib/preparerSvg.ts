import { PALETTES, type Palette, type ThemeIframe } from "@/lib/paletteIframe";

// Préparation d'un dessin SVG écrit par le modèle (bloc ```svg du chat).
//
// Le dessin est affiché comme une IMAGE (balise img), jamais injecté dans la
// page : une image SVG ne peut exécuter aucun script ni charger aucune
// ressource extérieure, quoi que contienne le code. Le nettoyage ci-dessous
// ajoute une seconde protection, utile surtout si le dessin sort un jour de
// l'image (téléchargement, partage).
//
// Trois étapes, toutes sur du texte :
//   1. réparer ce qu'un modèle oublie souvent (espace de noms, entités HTML) ;
//   2. nettoyer : retirer tout ce qui peut exécuter du code ou appeler un site ;
//   3. résoudre les couleurs du thème (var(--dj-...)) en vraies couleurs, car
//      une image est un document séparé qui n'hérite d'aucune variable de la
//      page (même principe que le widget, voir lib/paletteIframe.ts).
//
// Les étapes 1 et 2 ne dépendent pas du thème et se font une seule fois
// (preparerSvg). L'étape 3 se refait à chaque changement de thème
// (appliquerThemeSvg), sans relire le code du modèle.

const NS_SVG = "http://www.w3.org/2000/svg";
const NS_XLINK = "http://www.w3.org/1999/xlink";

// Un dessin au delà de cette taille n'est pas un dessin raisonnable : on le refuse.
const TAILLE_MAX_CARACTERES = 400_000;

// Dimensions de repli quand le dessin n'en annonce aucune.
const LARGEUR_PAR_DEFAUT = 640;
const HAUTEUR_PAR_DEFAUT = 360;

const POLICE_PAR_DEFAUT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// Éléments qui exécutent du code, intègrent une page ou un média extérieur.
const BALISES_RETIREES = new Set(["script", "foreignobject", "iframe", "object", "embed", "audio", "video", "canvas"]);

export type SvgPrepare = {
  svg: string;
  largeur: number;
  hauteur: number;
  titre: string | null;
};

function reparer(source: string): string {
  let texte = source.trim();
  // Le XML ne connaît que cinq entités nommées : &nbsp; et consorts feraient
  // échouer tout le dessin.
  texte = texte.replace(/&nbsp;/g, "&#160;");
  texte = texte.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;");
  // Un navigateur n'affiche une image SVG que si l'espace de noms est déclaré.
  const original = texte;
  texte = texte.replace(/<svg(?=[\s>\/])([^>]*)>/i, (balise, attributs: string) => {
    let ajout = "";
    if (!/\sxmlns\s*=/.test(attributs)) ajout += ` xmlns="${NS_SVG}"`;
    if (/xlink:/.test(original) && !/xmlns:xlink\s*=/.test(attributs)) ajout += ` xmlns:xlink="${NS_XLINK}"`;
    return ajout ? `<svg${ajout}${attributs}>` : balise;
  });
  return texte;
}

function nettoyerStyle(texte: string): string {
  return texte.replace(/@import[^;]*;?/gi, "").replace(/url\(\s*(['"]?)(?!#)[^)]*\)/gi, "none");
}

function nettoyerAttributs(element: Element) {
  for (const attribut of Array.from(element.attributes)) {
    const nom = attribut.name.toLowerCase();
    const valeur = attribut.value.trim();

    // onclick, onload, onmouseover...
    if (nom.startsWith("on")) {
      element.removeAttribute(attribut.name);
      continue;
    }
    // Un lien ne peut viser qu'un élément du même dessin ou une image intégrée.
    if (nom === "href" || nom === "xlink:href") {
      const sur = valeur.startsWith("#") || /^data:image\/(png|jpe?g|gif|webp);/i.test(valeur);
      if (!sur) element.removeAttribute(attribut.name);
      continue;
    }
    // url(#degrade) est normal, url(https://...) est un appel extérieur.
    if (/url\(\s*['"]?\s*(?!#)/i.test(valeur)) {
      element.removeAttribute(attribut.name);
    }
  }
}

function nettoyerArbre(parent: Element) {
  for (const enfant of Array.from(parent.children)) {
    if (BALISES_RETIREES.has(enfant.localName.toLowerCase())) {
      enfant.remove();
      continue;
    }
    nettoyerAttributs(enfant);
    if (enfant.localName.toLowerCase() === "style" && enfant.textContent) {
      enfant.textContent = nettoyerStyle(enfant.textContent);
    }
    nettoyerArbre(enfant);
  }
}

function lireLongueur(valeur: string | null): number {
  if (!valeur || !/^\s*[\d.]+(px)?\s*$/.test(valeur)) return 0;
  const nombre = parseFloat(valeur);
  return Number.isFinite(nombre) && nombre > 0 ? nombre : 0;
}

function lireDimensions(racine: Element): { largeur: number; hauteur: number; aViewBox: boolean } {
  const boite = (racine.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
  if (boite.length === 4 && boite.every(Number.isFinite) && boite[2] > 0 && boite[3] > 0) {
    return { largeur: boite[2], hauteur: boite[3], aViewBox: true };
  }
  const largeur = lireLongueur(racine.getAttribute("width"));
  const hauteur = lireLongueur(racine.getAttribute("height"));
  if (largeur && hauteur) return { largeur, hauteur, aViewBox: false };
  return { largeur: LARGEUR_PAR_DEFAUT, hauteur: HAUTEUR_PAR_DEFAUT, aViewBox: false };
}

// Renvoie null si le code n'est pas un dessin SVG valide (encore en cours
// d'écriture par le modèle, ou réellement cassé). L'appelant attend que le
// texte arrête de changer avant d'en conclure qu'il est cassé.
export function preparerSvg(source: string): SvgPrepare | null {
  if (!source || source.length > TAILLE_MAX_CARACTERES) return null;
  try {
    const doc = new DOMParser().parseFromString(reparer(source), "image/svg+xml");
    const racine = doc.documentElement;
    if (!racine || racine.localName !== "svg" || doc.getElementsByTagName("parsererror").length > 0) return null;

    nettoyerAttributs(racine);
    nettoyerArbre(racine);

    // Taille naturelle : sans elle, une image SVG n'a pas de dimensions propres
    // et le navigateur lui en invente. Le viewBox garantit la mise à l'échelle.
    const { largeur, hauteur, aViewBox } = lireDimensions(racine);
    if (!aViewBox) racine.setAttribute("viewBox", `0 0 ${largeur} ${hauteur}`);
    racine.setAttribute("width", String(largeur));
    racine.setAttribute("height", String(hauteur));

    // Valeurs de départ quand le modèle n'a rien précisé : texte et formes
    // prennent la couleur du texte du thème au lieu de noir sur fond sombre.
    if (!racine.hasAttribute("fill")) racine.setAttribute("fill", "var(--dj-texte)");
    if (!racine.hasAttribute("color")) racine.setAttribute("color", "var(--dj-texte)");
    if (!racine.hasAttribute("font-family")) racine.setAttribute("font-family", POLICE_PAR_DEFAUT);

    const titre = doc.getElementsByTagName("title")[0]?.textContent?.trim() || null;
    return { svg: new XMLSerializer().serializeToString(racine), largeur, hauteur, titre };
  } catch (e) {
    console.warn("Dessin SVG illisible dans Classinus :", e);
    return null;
  }
}

// Noms de variables que le modèle peut employer, et la couleur du thème qui leur répond.
const CLES_PALETTE: Record<string, keyof Palette> = {
  fond: "fond",
  surface: "surface",
  texte: "texte",
  muet: "muet",
  "texte-muet": "muet",
  bordure: "bordure",
  accent: "accent",
  degrade: "accent",
  "sur-accent": "surAccent",
  a: "a",
  b: "b",
  c: "c",
  d: "d",
};

// Remplace chaque var(--dj-...) par la vraie couleur du thème. Une variable
// inconnue prend sa valeur de repli si elle en a une, sinon la couleur du texte.
export function appliquerThemeSvg(svg: string, theme: ThemeIframe): string {
  const palette = PALETTES[theme];
  return svg.replace(/var\(\s*--dj-([a-z0-9-]+)\s*(?:,\s*([^()]*?))?\s*\)/gi, (_m, nom: string, repli?: string) => {
    const cle = CLES_PALETTE[nom.toLowerCase()];
    return cle ? palette[cle] : repli?.trim() || palette.texte;
  });
}

export function adresseImageSvg(svg: string): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
