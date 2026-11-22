// Pays proposés dans le champ de numéro de téléphone (20/11/2026, demande de Bourama : tous les pays et tous
// les indicatifs du monde). Liste tirée des données de référence des numéros de téléphone (libphonenumber) :
// 245 pays et territoires, le pays principal d'un indicatif partagé en premier. Seuls le code du pays (norme
// ISO) et l'indicatif sont écrits ici. Le nom affiché vient d'Intl.DisplayNames dans la langue de
// l'interface (voir nomDuPays dans lib/listeAttente.ts), donc rien n'est à traduire à la main. Le serveur
// ne contrôle pas cette liste : il garde le code du pays et le numéro tels qu'ils arrivent.
//
// indicatif : les chiffres mis dans le numéro quand on choisit le pays (sans le +). Pour un territoire du
//   +1 qui a un seul indicatif régional, il l'inclut (Bahamas : "1242").
// prefixes : les débuts de numéro qui font reconnaître le pays quand l'indicatif est partagé (Jersey :
//   "441534", les Bahamas : "1242"). Absent : l'indicatif seul suffit.
// Un pays ajouté ici doit aussi l'être dans components/abonnements/DrapeauPays.tsx.

export type PaysTelephone = { code: string; indicatif: string; prefixes?: string[] };

export const PAYS_TELEPHONE: readonly PaysTelephone[] = [
  { code: "US", indicatif: "1" },
  { code: "AG", indicatif: "1268" },
  { code: "AI", indicatif: "1264" },
  { code: "AS", indicatif: "1684" },
  { code: "BB", indicatif: "1246" },
  { code: "BM", indicatif: "1441" },
  { code: "BS", indicatif: "1242" },
  { code: "CA", indicatif: "1", prefixes: ["1204", "1226", "1236", "1249", "1250", "1257", "1263", "1289", "1306", "1343", "1354", "1365", "1367", "1368", "1382", "1403", "1416", "1418", "1431", "1437", "1438", "1450", "1468", "1474", "1506", "1514", "1519", "1548", "1579", "1581", "1584", "1587", "1604", "1613", "1639", "1647", "1672", "1683", "1705", "1709", "1742", "1753", "1778", "1780", "1782", "1807", "1819", "1825", "1867", "1873", "1879", "1902", "1905"] },
  { code: "DM", indicatif: "1767" },
  { code: "DO", indicatif: "1", prefixes: ["1809", "1829", "1849"] },
  { code: "GD", indicatif: "1473" },
  { code: "GU", indicatif: "1671" },
  { code: "JM", indicatif: "1", prefixes: ["1658", "1876"] },
  { code: "KN", indicatif: "1869" },
  { code: "KY", indicatif: "1345" },
  { code: "LC", indicatif: "1758" },
  { code: "MP", indicatif: "1670" },
  { code: "MS", indicatif: "1664" },
  { code: "PR", indicatif: "1", prefixes: ["1787", "1939"] },
  { code: "SX", indicatif: "1721" },
  { code: "TC", indicatif: "1649" },
  { code: "TT", indicatif: "1868" },
  { code: "VC", indicatif: "1784" },
  { code: "VG", indicatif: "1284" },
  { code: "VI", indicatif: "1340" },
  { code: "RU", indicatif: "7" },
  { code: "KZ", indicatif: "7", prefixes: ["76", "77"] },
  { code: "EG", indicatif: "20" },
  { code: "ZA", indicatif: "27" },
  { code: "GR", indicatif: "30" },
  { code: "NL", indicatif: "31" },
  { code: "BE", indicatif: "32" },
  { code: "FR", indicatif: "33" },
  { code: "ES", indicatif: "34" },
  { code: "HU", indicatif: "36" },
  { code: "IT", indicatif: "39" },
  { code: "VA", indicatif: "39", prefixes: ["3906698"] },
  { code: "RO", indicatif: "40" },
  { code: "CH", indicatif: "41" },
  { code: "AT", indicatif: "43" },
  { code: "GB", indicatif: "44" },
  { code: "GG", indicatif: "44", prefixes: ["441481"] },
  { code: "IM", indicatif: "44", prefixes: ["441624"] },
  { code: "JE", indicatif: "44", prefixes: ["441534"] },
  { code: "DK", indicatif: "45" },
  { code: "SE", indicatif: "46" },
  { code: "NO", indicatif: "47" },
  { code: "SJ", indicatif: "47", prefixes: ["4779"] },
  { code: "PL", indicatif: "48" },
  { code: "DE", indicatif: "49" },
  { code: "PE", indicatif: "51" },
  { code: "MX", indicatif: "52" },
  { code: "CU", indicatif: "53" },
  { code: "AR", indicatif: "54" },
  { code: "BR", indicatif: "55" },
  { code: "CL", indicatif: "56" },
  { code: "CO", indicatif: "57" },
  { code: "VE", indicatif: "58" },
  { code: "MY", indicatif: "60" },
  { code: "AU", indicatif: "61" },
  { code: "CC", indicatif: "61", prefixes: ["6189162"] },
  { code: "CX", indicatif: "61", prefixes: ["6189164"] },
  { code: "ID", indicatif: "62" },
  { code: "PH", indicatif: "63" },
  { code: "NZ", indicatif: "64" },
  { code: "SG", indicatif: "65" },
  { code: "TH", indicatif: "66" },
  { code: "JP", indicatif: "81" },
  { code: "KR", indicatif: "82" },
  { code: "VN", indicatif: "84" },
  { code: "CN", indicatif: "86" },
  { code: "TR", indicatif: "90" },
  { code: "IN", indicatif: "91" },
  { code: "PK", indicatif: "92" },
  { code: "AF", indicatif: "93" },
  { code: "LK", indicatif: "94" },
  { code: "MM", indicatif: "95" },
  { code: "IR", indicatif: "98" },
  { code: "SS", indicatif: "211" },
  { code: "MA", indicatif: "212" },
  { code: "EH", indicatif: "212", prefixes: ["2125288", "2125289"] },
  { code: "DZ", indicatif: "213" },
  { code: "TN", indicatif: "216" },
  { code: "LY", indicatif: "218" },
  { code: "GM", indicatif: "220" },
  { code: "SN", indicatif: "221" },
  { code: "MR", indicatif: "222" },
  { code: "ML", indicatif: "223" },
  { code: "GN", indicatif: "224" },
  { code: "CI", indicatif: "225" },
  { code: "BF", indicatif: "226" },
  { code: "NE", indicatif: "227" },
  { code: "TG", indicatif: "228" },
  { code: "BJ", indicatif: "229" },
  { code: "MU", indicatif: "230" },
  { code: "LR", indicatif: "231" },
  { code: "SL", indicatif: "232" },
  { code: "GH", indicatif: "233" },
  { code: "NG", indicatif: "234" },
  { code: "TD", indicatif: "235" },
  { code: "CF", indicatif: "236" },
  { code: "CM", indicatif: "237" },
  { code: "CV", indicatif: "238" },
  { code: "ST", indicatif: "239" },
  { code: "GQ", indicatif: "240" },
  { code: "GA", indicatif: "241" },
  { code: "CG", indicatif: "242" },
  { code: "CD", indicatif: "243" },
  { code: "AO", indicatif: "244" },
  { code: "GW", indicatif: "245" },
  { code: "IO", indicatif: "246" },
  { code: "AC", indicatif: "247" },
  { code: "SC", indicatif: "248" },
  { code: "SD", indicatif: "249" },
  { code: "RW", indicatif: "250" },
  { code: "ET", indicatif: "251" },
  { code: "SO", indicatif: "252" },
  { code: "DJ", indicatif: "253" },
  { code: "KE", indicatif: "254" },
  { code: "TZ", indicatif: "255" },
  { code: "UG", indicatif: "256" },
  { code: "BI", indicatif: "257" },
  { code: "MZ", indicatif: "258" },
  { code: "ZM", indicatif: "260" },
  { code: "MG", indicatif: "261" },
  { code: "RE", indicatif: "262" },
  { code: "YT", indicatif: "262", prefixes: ["262269", "262639"] },
  { code: "ZW", indicatif: "263" },
  { code: "NA", indicatif: "264" },
  { code: "MW", indicatif: "265" },
  { code: "LS", indicatif: "266" },
  { code: "BW", indicatif: "267" },
  { code: "SZ", indicatif: "268" },
  { code: "KM", indicatif: "269" },
  { code: "SH", indicatif: "290" },
  { code: "TA", indicatif: "290" },
  { code: "ER", indicatif: "291" },
  { code: "AW", indicatif: "297" },
  { code: "FO", indicatif: "298" },
  { code: "GL", indicatif: "299" },
  { code: "GI", indicatif: "350" },
  { code: "PT", indicatif: "351" },
  { code: "LU", indicatif: "352" },
  { code: "IE", indicatif: "353" },
  { code: "IS", indicatif: "354" },
  { code: "AL", indicatif: "355" },
  { code: "MT", indicatif: "356" },
  { code: "CY", indicatif: "357" },
  { code: "FI", indicatif: "358" },
  { code: "AX", indicatif: "358", prefixes: ["35818"] },
  { code: "BG", indicatif: "359" },
  { code: "LT", indicatif: "370" },
  { code: "LV", indicatif: "371" },
  { code: "EE", indicatif: "372" },
  { code: "MD", indicatif: "373" },
  { code: "AM", indicatif: "374" },
  { code: "BY", indicatif: "375" },
  { code: "AD", indicatif: "376" },
  { code: "MC", indicatif: "377" },
  { code: "SM", indicatif: "378" },
  { code: "UA", indicatif: "380" },
  { code: "RS", indicatif: "381" },
  { code: "ME", indicatif: "382" },
  { code: "XK", indicatif: "383" },
  { code: "HR", indicatif: "385" },
  { code: "SI", indicatif: "386" },
  { code: "BA", indicatif: "387" },
  { code: "MK", indicatif: "389" },
  { code: "CZ", indicatif: "420" },
  { code: "SK", indicatif: "421" },
  { code: "LI", indicatif: "423" },
  { code: "FK", indicatif: "500" },
  { code: "BZ", indicatif: "501" },
  { code: "GT", indicatif: "502" },
  { code: "SV", indicatif: "503" },
  { code: "HN", indicatif: "504" },
  { code: "NI", indicatif: "505" },
  { code: "CR", indicatif: "506" },
  { code: "PA", indicatif: "507" },
  { code: "PM", indicatif: "508" },
  { code: "HT", indicatif: "509" },
  { code: "GP", indicatif: "590" },
  { code: "BL", indicatif: "590" },
  { code: "MF", indicatif: "590" },
  { code: "BO", indicatif: "591" },
  { code: "GY", indicatif: "592" },
  { code: "EC", indicatif: "593" },
  { code: "GF", indicatif: "594" },
  { code: "PY", indicatif: "595" },
  { code: "MQ", indicatif: "596" },
  { code: "SR", indicatif: "597" },
  { code: "UY", indicatif: "598" },
  { code: "CW", indicatif: "599", prefixes: ["5999"] },
  { code: "BQ", indicatif: "599", prefixes: ["5993", "5994", "5997"] },
  { code: "TL", indicatif: "670" },
  { code: "NF", indicatif: "672" },
  { code: "BN", indicatif: "673" },
  { code: "NR", indicatif: "674" },
  { code: "PG", indicatif: "675" },
  { code: "TO", indicatif: "676" },
  { code: "SB", indicatif: "677" },
  { code: "VU", indicatif: "678" },
  { code: "FJ", indicatif: "679" },
  { code: "PW", indicatif: "680" },
  { code: "WF", indicatif: "681" },
  { code: "CK", indicatif: "682" },
  { code: "NU", indicatif: "683" },
  { code: "WS", indicatif: "685" },
  { code: "KI", indicatif: "686" },
  { code: "NC", indicatif: "687" },
  { code: "TV", indicatif: "688" },
  { code: "PF", indicatif: "689" },
  { code: "TK", indicatif: "690" },
  { code: "FM", indicatif: "691" },
  { code: "MH", indicatif: "692" },
  { code: "KP", indicatif: "850" },
  { code: "HK", indicatif: "852" },
  { code: "MO", indicatif: "853" },
  { code: "KH", indicatif: "855" },
  { code: "LA", indicatif: "856" },
  { code: "BD", indicatif: "880" },
  { code: "TW", indicatif: "886" },
  { code: "MV", indicatif: "960" },
  { code: "LB", indicatif: "961" },
  { code: "JO", indicatif: "962" },
  { code: "SY", indicatif: "963" },
  { code: "IQ", indicatif: "964" },
  { code: "KW", indicatif: "965" },
  { code: "SA", indicatif: "966" },
  { code: "YE", indicatif: "967" },
  { code: "OM", indicatif: "968" },
  { code: "PS", indicatif: "970" },
  { code: "AE", indicatif: "971" },
  { code: "IL", indicatif: "972" },
  { code: "BH", indicatif: "973" },
  { code: "QA", indicatif: "974" },
  { code: "BT", indicatif: "975" },
  { code: "MN", indicatif: "976" },
  { code: "NP", indicatif: "977" },
  { code: "TJ", indicatif: "992" },
  { code: "TM", indicatif: "993" },
  { code: "AZ", indicatif: "994" },
  { code: "GE", indicatif: "995" },
  { code: "KG", indicatif: "996" },
  { code: "UZ", indicatif: "998" },
];

const PAR_CODE = new Map(PAYS_TELEPHONE.map((p) => [p.code, p]));

export function paysParCode(code: string): PaysTelephone | null {
  return PAR_CODE.get(code) ?? null;
}

function prefixesDe(pays: PaysTelephone): readonly string[] {
  return pays.prefixes ?? [pays.indicatif];
}

/** Indicatif tel qu'on le lit : "+221", ou "+1 242" pour un territoire du +1 à indicatif régional unique. */
export function affichageIndicatif(pays: PaysTelephone): string {
  return pays.indicatif.length === 4 && pays.indicatif.startsWith("1")
    ? `+1 ${pays.indicatif.slice(1)}`
    : `+${pays.indicatif}`;
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

/** Longueur du plus long début connu du pays qui colle au numéro, ou 0. */
function meilleurePrefixe(pays: PaysTelephone, nombre: string): number {
  let meilleur = 0;
  for (const p of prefixesDe(pays)) if (nombre.startsWith(p) && p.length > meilleur) meilleur = p.length;
  return meilleur;
}

/**
 * Pays qui correspond au début d'un numéro écrit avec son indicatif (ex. "+221 77..." donne SN). Prend le
 * début le plus long qui colle ; à égalité, garde le pays déjà choisi (le +1 est commun à plusieurs pays),
 * sinon le premier de la liste. Le pays déjà choisi est aussi gardé tant que le numéro est en train de
 * s'écrire vers un de ses débuts (+1 puis +12 puis +1242 pour les Bahamas). Retourne null si rien ne
 * correspond.
 */
export function paysDepuisNumero(valeur: string, paysActuel: string): PaysTelephone | null {
  if (!valeur.trimStart().startsWith("+")) return null;
  const nombre = chiffres(valeur);
  if (nombre === "") return null;
  const actuel = paysParCode(paysActuel);
  let meilleur: PaysTelephone | null = null;
  let longueur = 0;
  for (const p of PAYS_TELEPHONE) {
    const l = meilleurePrefixe(p, nombre);
    if (l > longueur) {
      meilleur = p;
      longueur = l;
    }
  }
  if (actuel) {
    if (longueur > 0 && meilleurePrefixe(actuel, nombre) === longueur) return actuel;
    if (prefixesDe(actuel).some((p) => p.startsWith(nombre))) return actuel;
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

/**
 * Numéro sans son indicatif, avec les espaces tapés par la personne : "+221 77 12 34" avec l'indicatif
 * "221" donne "77 12 34". Retourne null si le numéro ne commence pas par cet indicatif.
 */
export function partieLocale(valeur: string, indicatif: string): string | null {
  let lus = 0;
  let i = 0;
  for (; i < valeur.length && lus < indicatif.length; i++) {
    const c = valeur[i];
    if (c === "+" || c === " ") continue;
    if (c !== indicatif[lus]) return null;
    lus++;
  }
  return lus === indicatif.length ? valeur.slice(i).trimStart() : null;
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
