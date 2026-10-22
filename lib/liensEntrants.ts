// Liens qui ouvrent Classinus (21/10/2026, demande de Bourama : un lien de
// Classinus doit ouvrir l'appli, pas le navigateur, sur téléphone et sur PC).
//
// Trois sortes de liens arrivent dans l'appli :
// 1. Android : un lien https://classinus.com/... touché dans un email, un
//    message ou une page. Android l'envoie à l'appli grâce aux "App Links"
//    (intent-filter dans AndroidManifest.xml, fichier de vérification
//    public/.well-known/assetlinks.json).
// 2. PC : un lien classinus://app/... Windows l'envoie à l'appli installée
//    (protocole enregistré par electron/capacitor.electron.config.ts). Un
//    lien https ne peut pas ouvrir une appli de bureau : c'est le bandeau
//    "Ouvrir dans Classinus" (components/BandeauOuvrirDansAppli.tsx) qui
//    fabrique ce lien depuis le navigateur.
// 3. Les liens classinusmobile:// (retour de la connexion Google, des
//    connecteurs) ont leurs propres écouteurs : ce fichier les ignore.
//
// Ce fichier est pur (aucun accès au navigateur ni à Supabase) pour être
// testé tel quel (tests/verifier-liens-entrants.mjs). L'écoute et la
// navigation sont dans components/EcouteurLiensEntrants.tsx.
import {
  adresseOuvertureDossierPublic,
  adresseOuvertureFichierPublic,
  adresseOuvertureSkillPublic,
} from "@/lib/ouvertureParUrl";

/** Protocole de l'appli PC. Doit rester identique à electron/capacitor.electron.config.ts (vérifié par le test). */
export const SCHEMA_LIEN_APPLI = "classinus";

/** Faux "hôte" des liens classinus://app/chemin. */
export const HOTE_LIEN_APPLI = "app";

/**
 * Pages qui ne s'ouvrent jamais dans l'appli, même si le lien vient de
 * classinus.com.
 * - /oauth : le consentement du connecteur Claude. La personne y arrive depuis
 *   le navigateur ou l'appli de Claude et doit y repartir : l'ouvrir dans
 *   l'appli casserait le retour vers Claude.
 * - /agent-superposition, /dev-demo-question : écrans internes, jamais
 *   partagés.
 * Cette liste est lue par le test, qui vérifie que AndroidManifest.xml ne
 * déclare aucune de ces pages.
 */
export const PREFIXES_NON_OUVERTS_DANS_APPLI = ["/oauth", "/agent-superposition", "/dev-demo-question"] as const;

export type LienEntrant = {
  /** Chemin interne de l'appli, avec ses paramètres (?fichier=...), toujours commençant par "/". */
  chemin: string;
  /** Partie après le #, y compris le "#" (vide s'il n'y en a pas). */
  hash: string;
};

/** Hôte du site, tiré de NEXT_PUBLIC_APP_URL (source unique, comme le reste de l'appli). */
function hotesDuSite(): string[] {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return [];
  try {
    return [new URL(base).host.toLowerCase()];
  } catch {
    return [];
  }
}

function estNonOuvertDansAppli(chemin: string): boolean {
  return PREFIXES_NON_OUVERTS_DANS_APPLI.some((p) => chemin === p || chemin.startsWith(`${p}/`));
}

// Anciennes adresses de partage (/bibliotheque/ID, /dossiers/ID, /skills/ID) :
// sur le site, ces pages renvoient vers l'adresse actuelle (voir
// lib/ouvertureParUrl.ts). Dans l'appli installée ces pages n'existent pas
// (export statique), on fait donc la même traduction ici.
const SEGMENTS_RESERVES = new Set(["perso", "publique", "telephone", "placeholder"]);

function traduireAncienneAdresse(chemin: string): string | null {
  const m = /^\/(bibliotheque|dossiers|skills)\/([^/]+)$/.exec(chemin);
  if (!m || SEGMENTS_RESERVES.has(m[2])) return null;
  let id: string;
  try {
    id = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  if (m[1] === "bibliotheque") return adresseOuvertureFichierPublic(id);
  if (m[1] === "dossiers") return adresseOuvertureDossierPublic(id);
  return adresseOuvertureSkillPublic(id);
}

/**
 * Lit un lien reçu par l'appli et renvoie où aller dans l'appli, ou null si ce
 * lien n'est pas pour nous (autre site, autre protocole, page exclue, chemin
 * louche). Ne lève jamais.
 *
 * Anti-redirection : on ne renvoie qu'un chemin interne ("/..."), jamais une
 * adresse complète ni un chemin commençant par "//".
 */
export function lireLienEntrant(brut: string, hotes: string[] = hotesDuSite()): LienEntrant | null {
  let url: URL;
  try {
    url = new URL(brut);
  } catch {
    return null;
  }

  if (url.protocol === "https:") {
    if (!hotes.includes(url.host.toLowerCase())) return null;
  } else if (url.protocol === `${SCHEMA_LIEN_APPLI}:`) {
    if (url.hostname.toLowerCase() !== HOTE_LIEN_APPLI) return null;
  } else {
    return null;
  }

  const pathname = url.pathname === "" ? "/" : url.pathname;
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) return null;
  if (pathname.split("/").some((segment) => segment === "..")) return null;
  if (estNonOuvertDansAppli(pathname)) return null;

  const ancienne = traduireAncienneAdresse(pathname);
  if (ancienne) return { chemin: ancienne, hash: "" };

  return { chemin: `${pathname}${url.search}`, hash: url.hash };
}

/** Lien classinus://app/... à partir d'un chemin du site (pour le bandeau du navigateur PC). */
export function adresseOuvertureAppliPc(cheminEtParametres: string): string {
  const chemin = cheminEtParametres.startsWith("/") ? cheminEtParametres : `/${cheminEtParametres}`;
  return `${SCHEMA_LIEN_APPLI}://${HOTE_LIEN_APPLI}${chemin}`;
}
