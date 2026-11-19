// Pays proposés dans le champ de numéro de téléphone (19/11/2026, demande de Bourama) : les 54 pays
// d'Afrique, plus les pays hors Afrique déjà proposés avant (France, Belgique, Suisse, Canada, États-Unis,
// Royaume-Uni, Allemagne, Espagne, Italie). Seuls le code du pays (norme ISO) et son indicatif sont écrits
// ici. Le nom affiché vient d'Intl.DisplayNames dans la langue de l'interface (voir nomDuPays dans
// lib/listeAttente.ts), donc rien n'est à traduire à la main. Le serveur ne contrôle pas cette liste : il
// garde le code du pays et le numéro tels qu'ils arrivent.

export type PaysTelephone = { code: string; indicatif: string };

const AFRIQUE: PaysTelephone[] = [
  { code: "DZ", indicatif: "213" },
  { code: "AO", indicatif: "244" },
  { code: "BJ", indicatif: "229" },
  { code: "BW", indicatif: "267" },
  { code: "BF", indicatif: "226" },
  { code: "BI", indicatif: "257" },
  { code: "CV", indicatif: "238" },
  { code: "CM", indicatif: "237" },
  { code: "CF", indicatif: "236" },
  { code: "TD", indicatif: "235" },
  { code: "KM", indicatif: "269" },
  { code: "CG", indicatif: "242" },
  { code: "CD", indicatif: "243" },
  { code: "CI", indicatif: "225" },
  { code: "DJ", indicatif: "253" },
  { code: "EG", indicatif: "20" },
  { code: "GQ", indicatif: "240" },
  { code: "ER", indicatif: "291" },
  { code: "SZ", indicatif: "268" },
  { code: "ET", indicatif: "251" },
  { code: "GA", indicatif: "241" },
  { code: "GM", indicatif: "220" },
  { code: "GH", indicatif: "233" },
  { code: "GN", indicatif: "224" },
  { code: "GW", indicatif: "245" },
  { code: "KE", indicatif: "254" },
  { code: "LS", indicatif: "266" },
  { code: "LR", indicatif: "231" },
  { code: "LY", indicatif: "218" },
  { code: "MG", indicatif: "261" },
  { code: "MW", indicatif: "265" },
  { code: "ML", indicatif: "223" },
  { code: "MR", indicatif: "222" },
  { code: "MU", indicatif: "230" },
  { code: "MA", indicatif: "212" },
  { code: "MZ", indicatif: "258" },
  { code: "NA", indicatif: "264" },
  { code: "NE", indicatif: "227" },
  { code: "NG", indicatif: "234" },
  { code: "RW", indicatif: "250" },
  { code: "ST", indicatif: "239" },
  { code: "SN", indicatif: "221" },
  { code: "SC", indicatif: "248" },
  { code: "SL", indicatif: "232" },
  { code: "SO", indicatif: "252" },
  { code: "ZA", indicatif: "27" },
  { code: "SS", indicatif: "211" },
  { code: "SD", indicatif: "249" },
  { code: "TZ", indicatif: "255" },
  { code: "TG", indicatif: "228" },
  { code: "TN", indicatif: "216" },
  { code: "UG", indicatif: "256" },
  { code: "ZM", indicatif: "260" },
  { code: "ZW", indicatif: "263" },
];

const HORS_AFRIQUE: PaysTelephone[] = [
  { code: "FR", indicatif: "33" },
  { code: "BE", indicatif: "32" },
  { code: "CH", indicatif: "41" },
  { code: "US", indicatif: "1" },
  { code: "CA", indicatif: "1" },
  { code: "GB", indicatif: "44" },
  { code: "DE", indicatif: "49" },
  { code: "ES", indicatif: "34" },
  { code: "IT", indicatif: "39" },
];

export const PAYS_TELEPHONE: readonly PaysTelephone[] = [...AFRIQUE, ...HORS_AFRIQUE];

const PAR_CODE = new Map(PAYS_TELEPHONE.map((p) => [p.code, p]));

export function paysParCode(code: string): PaysTelephone | null {
  return PAR_CODE.get(code) ?? null;
}

/** Drapeau d'un pays, dessiné à partir de son code (deux lettres). */
export function drapeauDuPays(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Ne garde que le plus, les chiffres et les espaces ; le plus n'est gardé qu'en tête. */
export function nettoyerSaisie(brut: string): string {
  const avecPlus = brut.trimStart().startsWith("+");
  const reste = brut.replace(/[^\d ]/g, "").replace(/ {2,}/g, " ");
  return (avecPlus ? "+" : "") + reste;
}

function chiffres(valeur: string): string {
  return valeur.replace(/\D/g, "");
}

/**
 * Pays qui correspond au début d'un numéro écrit avec son indicatif (ex. "+221 77..." donne SN). Garde le
 * pays déjà choisi quand le numéro commence bien par son indicatif (le +1 est commun au Canada et aux
 * États-Unis). Sinon prend l'indicatif le plus long qui colle. Retourne null si rien ne correspond.
 */
export function paysDepuisNumero(valeur: string, paysActuel: string): PaysTelephone | null {
  if (!valeur.trimStart().startsWith("+")) return null;
  const nombre = chiffres(valeur);
  if (nombre === "") return null;
  const actuel = paysParCode(paysActuel);
  if (actuel && nombre.startsWith(actuel.indicatif)) return actuel;
  let meilleur: PaysTelephone | null = null;
  for (const p of PAYS_TELEPHONE) {
    if (nombre.startsWith(p.indicatif) && (!meilleur || p.indicatif.length > meilleur.indicatif.length)) meilleur = p;
  }
  return meilleur;
}

/** Partie du numéro après l'indicatif du pays (chiffres seulement). */
export function chiffresApresIndicatif(valeur: string, code: string): string {
  const pays = paysParCode(code);
  const nombre = chiffres(valeur);
  if (!pays || !nombre.startsWith(pays.indicatif)) return nombre;
  return nombre.slice(pays.indicatif.length);
}

/** Numéro complet quand on change de pays : le nouvel indicatif remplace l'ancien, le reste est gardé. */
export function numeroApresChoixPays(valeur: string, ancienCode: string, nouveauCode: string): string {
  const nouveau = paysParCode(nouveauCode);
  if (!nouveau) return valeur;
  const ancien = paysParCode(ancienCode);
  const nombre = chiffres(valeur);
  let local = nombre;
  if (ancien && nombre.startsWith(ancien.indicatif)) local = nombre.slice(ancien.indicatif.length);
  // Sans pays reconnu, un numéro qui commence par + n'est qu'un début d'indicatif : il est remplacé.
  else if (valeur.trimStart().startsWith("+")) local = "";
  return `+${nouveau.indicatif} ${local}`;
}
