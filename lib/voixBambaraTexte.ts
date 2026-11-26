// Préparation du texte lu à voix haute dans le mode vocal bambara. L'IA reçoit la consigne de ne
// rien écrire d'enrichi, mais ce qui reste de mise en forme (titres, gras, listes, liens, émojis)
// ne doit jamais être prononcé : on le retire avant d'envoyer le texte à la voix.
//
// Mise à jour du 25/11/2026 (demande de Bourama, page bambara de staging) : la voix lit tout ce qu'on lui donne, elle ne
// sait pas trier comme un lecteur. On entendait « jpg » et d'autres restes : noms de fichiers (photo.jpg), chemins,
// adresses sans « https:// » (www..., i.ytimg.com/...), repères de fichiers joints, balises HTML, adresses de données.
// Tout cela est maintenant retiré, avec les parenthèses et crochets qu'il laisse vides.

// Les types de fichiers qu'on ne doit jamais entendre. Une image ou une vidéo se montre à l'écran, elle ne se dit pas.
const EXTENSIONS_FICHIERS =
  "jpe?g|png|gif|webp|avif|svg|bmp|tiff?|heic|ico|mp4|webm|mov|m4v|avi|mkv|mp3|wav|ogg|m4a|aac|flac|pdf|docx?|xlsx?|pptx?|csv|zip|rar|7z|json|xml|txt|md|html?|glb";
// Les formats d'image et de vidéo seuls (« une image jpg ») : même ceux là ne se disent pas.
const EXTENSIONS_MEDIAS = "jpe?g|png|gif|webp|avif|svg|mp4|webm";

// Repères que le serveur ajoute pour un fichier joint ou généré, complets ou coupés en route à la fin du texte.
const REPERES_FICHIERS_VOIX =
  /\[(?:Image jointe|Audio joint|Vidéo jointe|Video jointe|Document joint|Fichier joint|Lien réel du fichier)\s*:[^\]]*(?:\]|$)/gi;
const ADRESSE_DONNEES = /data:[\w.+-]+\/[\w.+-]+(?:;[\w=.+-]+)*,[^\s)"']*/gi;
const BALISE_HTML = /<\/?[a-z][^>]*>/gi;
const BALISE_HTML_COUPEE = /<\/?[a-z][^>]*$/i;
// Fin d'adresse : jamais un signe de ponctuation, il appartient à la phrase et doit rester pour qu'elle se termine.
const ADRESSE_HTTP = /https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)\]]/gi;
const ADRESSE_SANS_PROTOCOLE =
  /(?<![\p{L}\p{N}@/.-])(?:www\.[^\s<>"']*[^\s<>"'.,;:!?)\]]|(?:[\p{L}\p{N}-]+\.)+[a-z]{2,}\/(?:[^\s<>"']*[^\s<>"'.,;:!?)\]])?)/giu;
const NOM_DE_FICHIER = new RegExp(
  "(?<![\\p{L}\\p{N}@])(?:[\\p{L}\\p{N}_.~%+@:-]*[\\\\/])*[\\p{L}\\p{N}_%~+@-]+(?:\\.[\\p{L}\\p{N}_%~+@-]+)*\\.(?:" +
    EXTENSIONS_FICHIERS +
    ")(?![\\p{L}\\p{N}_])(?:\\?[^\\s)\\]]*)?",
  "giu"
);
const EXTENSION_SEULE = new RegExp("\\.(?:" + EXTENSIONS_MEDIAS + ")(?![\\p{L}\\p{N}_])", "giu");
const FORMAT_MEDIA_SEUL = new RegExp("(?<![\\p{L}\\p{N}_])(?:" + EXTENSIONS_MEDIAS + ")(?![\\p{L}\\p{N}_])", "giu");

/** Retire la mise en forme et tout ce qui ne se prononce pas. */
export function nettoyerPourVoix(texte: string): string {
  return texte
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(REPERES_FICHIERS_VOIX, " ")
    .replace(ADRESSE_DONNEES, " ")
    .replace(BALISE_HTML, " ")
    .replace(BALISE_HTML_COUPEE, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(ADRESSE_HTTP, " ")
    .replace(/https?:\/\//gi, " ")
    .replace(ADRESSE_SANS_PROTOCOLE, " ")
    .replace(NOM_DE_FICHIER, " ")
    .replace(EXTENSION_SEULE, " ")
    .replace(FORMAT_MEDIA_SEUL, " ")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/[*`~]/g, "")
    .replace(/(?<![\p{L}\p{N}])_+(?=\S)/gu, "")
    .replace(/(?<=\S)_+(?![\p{L}\p{N}_])/gu, "")
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, " ")
    .replace(/[•·►▶→←↔✓✔✗✘■□▪▫●○★☆]/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/^[ \t]*[:;,.()[\]][ \t:;,.()[\]]*$/gm, "")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function couperSurEspaces(phrase: string, max: number): string[] {
  const morceaux: string[] = [];
  let reste = phrase.trim();
  while (reste.length > max) {
    let coupe = reste.lastIndexOf(" ", max);
    if (coupe <= 0) coupe = max;
    morceaux.push(reste.slice(0, coupe).trim());
    reste = reste.slice(coupe).trim();
  }
  if (reste) morceaux.push(reste);
  return morceaux;
}

/**
 * Découpe un texte en morceaux d'au plus `max` caractères, en coupant de préférence entre deux
 * phrases, pour que la voix commence à parler pendant que la suite est préparée.
 */
export function decouperEnMorceaux(texte: string, max: number): string[] {
  const limite = Math.max(20, Math.floor(max));
  const phrases = texte
    .split(/(?<=[.!?…])\s+|\n+/u)
    .map((p) => p.trim())
    .filter(Boolean);
  const morceaux: string[] = [];
  let courant = "";
  for (const phrase of phrases) {
    const parties = phrase.length > limite ? couperSurEspaces(phrase, limite) : [phrase];
    for (const partie of parties) {
      if (courant && courant.length + 1 + partie.length > limite) {
        morceaux.push(courant);
        courant = partie;
      } else {
        courant = courant ? `${courant} ${partie}` : partie;
      }
    }
  }
  if (courant) morceaux.push(courant);
  return morceaux;
}

// Lecture au fil de l'eau (23/11/2026, demande de Bourama) : la voix n'attend plus la fin de la réponse. Ce qui suit
// lit un texte qui s'écrit et rend, au fur et à mesure, les phrases terminées, prêtes à être confiées à la voix.

const FIN_DE_PHRASE = /(?<=[.!?…])\s+|\n+/gu;
const LIEN_MARKDOWN_COMPLET = /^\[[^\]]*\]\([^)]*\)/;

/**
 * Le début d'un texte encore en train de s'écrire qui ne changera plus quand la suite arrivera : sans un bloc de code
 * resté ouvert, ni un lien ou une image markdown dont la parenthèse de fin n'est pas encore là, ni une balise HTML
 * dont le « > » manque. Sans cela, un bout d'adresse ou de description pourrait être lu à voix haute avant d'être
 * retiré par le nettoyage.
 */
export function partieStable(brut: string): string {
  let fin = brut.length;
  if ((brut.match(/```/g) ?? []).length % 2 === 1) fin = brut.lastIndexOf("```");
  const crochet = fin > 0 ? brut.lastIndexOf("[", fin - 1) : -1;
  if (crochet >= 0 && !LIEN_MARKDOWN_COMPLET.test(brut.slice(crochet, fin))) {
    fin = crochet > 0 && brut[crochet - 1] === "!" ? crochet - 1 : crochet;
  }
  // Une balise HTML dont le « > » n'est pas encore arrivé attend aussi : son contenu (adresse, description) ne se lit pas.
  const ouverture = fin > 0 ? brut.lastIndexOf("<", fin - 1) : -1;
  if (ouverture >= 0 && /^<\/?[a-z]/i.test(brut.slice(ouverture, fin)) && !brut.slice(ouverture, fin).includes(">")) fin = ouverture;
  return brut.slice(0, fin);
}

function longueurCommune(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}

export type SuiteTexteVoix = {
  /** Texte brut cumulé de la réponse : rend les morceaux à lire maintenant, les phrases terminées depuis le dernier appel. */
  avancer: (brutCumule: string) => string[];
  /** Fin de la réponse : rend les morceaux restants, la dernière phrase comprise même sans point final. */
  finir: (brutFinal: string) => string[];
};

/**
 * Suit un texte qui s'écrit. Une phrase n'est rendue qu'une fois terminée (point, point d'exclamation ou
 * d'interrogation suivi d'un espace, ou retour à la ligne) et jamais deux fois : `finir` rend seulement ce qui n'a pas
 * encore été dit.
 */
export function suivreTexteVoix(texteMax: number): SuiteTexteVoix {
  // Le texte propre déjà confié à la voix, sans espace ni retour à la ligne à la fin : le nettoyage retire ceux de la fin
  // du texte, un `dit` qui en garderait ne serait plus le début du texte propre dès qu'un lien arrive après lui.
  let dit = "";
  return {
    avancer(brutCumule) {
      const propre = nettoyerPourVoix(partieStable(brutCumule));
      // Le début a changé (une mise en forme s'est complétée) : on attend la suite plutôt que de dire deux fois.
      if (!propre.startsWith(dit)) return [];
      const apres = propre.slice(dit.length);
      const reste = apres.trimStart();
      const decalage = apres.length - reste.length;
      let derniere: RegExpMatchArray | undefined;
      for (const m of reste.matchAll(FIN_DE_PHRASE)) derniere = m;
      if (!derniere || derniere.index === undefined) return [];
      dit = propre.slice(0, dit.length + decalage + derniere.index);
      return decouperEnMorceaux(reste.slice(0, derniere.index), texteMax);
    },
    finir(brutFinal) {
      const propre = nettoyerPourVoix(brutFinal);
      // Cas rare où le texte final ne commence plus comme ce qui a été dit : on ne reprend que ce qui diffère.
      const reste = propre.startsWith(dit) ? propre.slice(dit.length) : propre.slice(longueurCommune(propre, dit));
      dit = propre;
      return decouperEnMorceaux(reste, texteMax);
    },
  };
}
