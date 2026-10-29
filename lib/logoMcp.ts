// Logo d'une MCP personnalisée (28/10/2026, demande Bourama). Deux calculs, aucun enregistrement :
// - le site dont on tire le logo, déduit de l'adresse du serveur (elle change, le logo suit) ;
// - les lettres affichées quand le site n'a pas d'icône : la première lettre en majuscule, puis les
//   deux premières, puis trois, tant qu'un autre serveur de la personne commence pareil.
// Le calcul du site existe aussi côté backend (core/domaines_affichage.py, domaine_site_serveur) pour
// les lignes d'outils du chat : garder les deux listes identiques.

// Domaines publics à deux niveaux (co.uk...) : le site est alors les trois derniers morceaux.
const SUFFIXES_DEUX_NIVEAUX = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au", "co.jp", "co.nz", "co.za",
  "com.br", "com.tn", "org.tn", "gov.tn", "com.mx", "com.cn", "co.in", "com.tr",
]);

// Plateformes d'hébergement : le sous-domaine est le vrai site, on le garde entier.
const HEBERGEURS = [
  "vercel.app", "onrender.com", "railway.app", "netlify.app", "github.io", "pages.dev", "workers.dev",
  "herokuapp.com", "fly.dev", "supabase.co", "azurewebsites.net", "cloudfunctions.net", "run.app",
  "ngrok.app", "ngrok.io", "trycloudflare.com", "web.app", "firebaseapp.com", "amazonaws.com",
];

/** Site dont on affiche le logo (mcp.linear.app donne linear.app), ou "" si rien d'exploitable (adresse IP...). */
export function domaineSiteMcp(adresse: string | null | undefined): string {
  if (!adresse) return "";
  let hote: string;
  try {
    hote = new URL(adresse).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
  if (!hote.includes(".") || hote.includes(":") || /^\d+(\.\d+){3}$/.test(hote)) return "";
  if (HEBERGEURS.some((h) => hote === h || hote.endsWith(`.${h}`))) return hote;
  const morceaux = hote.split(".");
  const garde = SUFFIXES_DEUX_NIVEAUX.has(morceaux.slice(-2).join(".")) ? 3 : 2;
  return morceaux.slice(-garde).join(".");
}

const LETTRES_MAX = 3;

// Lettres et chiffres seulement, sans accents, en majuscules (un caractère = un point de code).
function lettresDe(nom: string): string[] {
  return Array.from(nom.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "").toLocaleUpperCase());
}

/**
 * Lettres du logo de secours : "L" pour Linear, "LI" si un autre serveur commence aussi par L,
 * "LIN" si un autre commence par LI, et ainsi de suite (trois lettres au plus).
 * `autresNoms` : les noms des autres serveurs de la personne, sans celui-ci.
 */
export function initialesMcp(nom: string, autresNoms: string[] = []): string {
  const miennes = lettresDe(nom);
  if (miennes.length === 0) return "?";
  const autres = autresNoms.map(lettresDe).filter((l) => l.length > 0);
  const plafond = Math.min(LETTRES_MAX, miennes.length);
  for (let n = 1; n <= plafond; n++) {
    const debut = miennes.slice(0, n).join("");
    if (n === plafond || !autres.some((a) => a.slice(0, n).join("") === debut)) return debut;
  }
  return miennes.slice(0, plafond).join("");
}

/**
 * Lettre de secours du logo d'un site visé par un outil du chat (29/10/2026) : la première lettre
 * du nom du site, en majuscule ("N" pour netlify-mcp.netlify.app, "W" pour fr.wikipedia.org).
 */
export function lettreDeSite(domaine: string): string {
  const site = domaineSiteMcp(`https://${domaine}`);
  // Un nom accentué (école.fr) est converti en code interne (xn--...) par le navigateur : on garde alors
  // le nom d'origine pour que la lettre soit "E" et non "X".
  const utile = !site || site.startsWith("xn--") ? domaine.trim().replace(/^www\./i, "") : site;
  return lettresDe(utile)[0] ?? "?";
}
