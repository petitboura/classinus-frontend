// Lecture du bloc ```serveurmcp``` écrit par l'IA (27/10/2026, demande de Bourama). Tout ce que l'IA
// écrit ici est traité comme une simple suggestion : on ne garde que des adresses HTTPS bien formées,
// des textes courts et au plus quelques étapes. Le caractère officiel de l'adresse n'est jamais pris
// dans ce bloc : il est décidé par le backend (voir sonderMcpPersonnalise dans lib/api.ts).

export type PropositionServeurMcp = {
  nom: string;
  /** Adresse du serveur MCP, ou null si l'IA n'en a pas trouvé. */
  url: string | null;
  /** Site officiel de l'outil, sert seulement à comparer les domaines côté backend. */
  siteOfficiel: string | null;
  /** Page du site qui annonce cette adresse. */
  source: string | null;
  jeton: { lien: string | null; etapes: string[] } | null;
};

const NOM_MAX = 80;
const ETAPE_MAX = 300;
const ETAPES_MAX = 8;

/** Adresse HTTPS sans identifiants, ou null. */
export function adresseHttps(valeur: unknown): string | null {
  if (typeof valeur !== "string" || !valeur.trim()) return null;
  try {
    const adresse = new URL(valeur.trim());
    if (adresse.protocol !== "https:" || adresse.username || adresse.password || !adresse.hostname.includes(".")) return null;
    adresse.hash = "";
    return adresse.href;
  } catch {
    return null;
  }
}

/** Nom d'hôte à montrer à côté d'un lien, sans "www.". */
export function hoteAffiche(adresse: string | null): string {
  if (!adresse) return "";
  try {
    return new URL(adresse).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Pendant le streaming le JSON est incomplet : null tant qu'il n'est pas entier et lisible.
export function lirePropositionServeurMcp(code: string): PropositionServeurMcp | null {
  let brut: unknown;
  try {
    brut = JSON.parse(code);
  } catch {
    return null;
  }
  if (!brut || typeof brut !== "object") return null;
  const b = brut as Record<string, unknown>;
  const nom = typeof b.nom === "string" ? b.nom.trim().slice(0, NOM_MAX) : "";
  if (!nom) return null;

  let jeton: PropositionServeurMcp["jeton"] = null;
  if (b.jeton && typeof b.jeton === "object") {
    const j = b.jeton as Record<string, unknown>;
    const etapes = Array.isArray(j.etapes)
      ? j.etapes.filter((e): e is string => typeof e === "string" && !!e.trim()).map((e) => e.trim().slice(0, ETAPE_MAX)).slice(0, ETAPES_MAX)
      : [];
    jeton = { lien: adresseHttps(j.lien), etapes };
  }

  return {
    nom,
    url: adresseHttps(b.url),
    siteOfficiel: adresseHttps(b.site_officiel),
    source: adresseHttps(b.source),
    jeton,
  };
}
