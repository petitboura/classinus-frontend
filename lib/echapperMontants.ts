// Montants d'argent et LaTeX (14/11/2026, demande Bourama).
//
// Problème : remark-math lit tout texte placé entre deux "$" comme une formule.
// Un message comme "0.01$/min (0.60$/h)" voyait donc le texte entre les deux "$"
// rendu en maths (espaces perdus, gras cassé, chiffres en italique).
//
// Principe : avant le rendu, on écrit "\$" à la place du "$" d'un montant. En
// Markdown, "\$" donne un "$" ordinaire que remark-math n'utilise pas comme
// délimiteur. Les vraies formules ne sont pas touchées.
//
// Cette fonction est une heuristique. Elle suit ce que ferait remark-math : elle
// retient si une formule est ouverte et ne touche alors pas au "$" qui la ferme.
// Un "$" est un montant dans deux cas seulement :
//   1. "$" suivi d'un nombre, puis d'une fin de montant : "$5", "$3.50/h", "$20 - $30",
//      "$5k". Pas un montant : "$5x", "$2 + 3$", "$7 - 3 = 4$", "$5$", "$2(x+1)$".
//   2. "$" précédé d'un nombre isolé : "0.01$/min", "3,50 $". Pas un montant si le
//      nombre suit un signe de maths ("x=5$", "a_1$", "x^2$").
// Sont laissés tels quels : le code (blocs et en ligne), les blocs "$$...$$", un "$"
// déjà échappé, et tout "$" qui ferme une formule ouverte plus haut dans le paragraphe.

const SEGMENTS_CODE = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`)/;

// Taille maximale lue autour d'un "$" pour reconnaître un nombre.
const FENETRE = 24;

// Caractères qui, juste avant un nombre, montrent qu'on est dans une formule.
const AVANT_NOMBRE_MATHS = /[A-Za-z0-9=^_+\-\\{}$.,<>]/;

// Caractères qui, juste après un "$" de fermeture de montant, montrent une formule.
const APRES_DOLLAR_MATHS = /[A-Za-z0-9\\$_^{]/;

// Signes qui, après un nombre, montrent une formule ("$2 + 3$", "$5 = x$").
// L'étoile n'en fait pas partie : "**$5**" est un montant en gras.
const OPERATEURS_MATHS = /[=+^_\\<>≤≥×÷|{}]/;

const ESPACES = /[   ]/;

// Fin d'un nombre qui commence à `debut` (chiffres, séparateurs . et ,), ou -1.
function finNombre(texte: string, debut: number): number {
  const trouve = /^\d+(?:[.,]\d+)*/.exec(texte.slice(debut, debut + FENETRE));
  return trouve ? debut + trouve[0].length : -1;
}

// "$" suivi d'un nombre : vrai si c'est un montant ("$5", "$3.50/h", "$20 - $30").
function estMontantDollarAvant(texte: string, indexDollar: number): boolean {
  const debut = indexDollar + 1;
  let fin = finNombre(texte, debut);
  if (fin < 0) return false;

  // Suffixe usuel d'un montant ("$5k", "$2M"), seulement s'il n'est pas suivi d'une lettre.
  if (/[kKMB]/.test(texte[fin] ?? "") && !/[A-Za-z]/.test(texte[fin + 1] ?? "")) fin += 1;

  const suivant = texte[fin];
  if (suivant === undefined || suivant === "\n") return true;
  // Une lettre, "(" ou "$" collés au nombre : formule ("$5x$", "$2(x+1)$", "$5$").
  if (/[A-Za-z\\$(]/.test(suivant)) return false;
  if (OPERATEURS_MATHS.test(suivant)) return false;

  // Espaces puis un signe : formule, sauf un tiret suivi d'un autre montant ("$20 - $30").
  let i = fin;
  while (i < texte.length && ESPACES.test(texte[i])) i += 1;
  const apresEspaces = texte[i];
  if (apresEspaces === undefined || apresEspaces === "\n") return true;
  if (OPERATEURS_MATHS.test(apresEspaces)) return false;
  if (apresEspaces === "-" || apresEspaces === "–") {
    let j = i + 1;
    while (j < texte.length && ESPACES.test(texte[j])) j += 1;
    return texte[j] === "$";
  }
  return true;
}

// "$" précédé d'un nombre isolé : vrai si c'est un montant ("0.01$/min", "3,50 $").
function estMontantDollarApres(texte: string, indexDollar: number): boolean {
  let finAvant = indexDollar;
  // Style français : une seule espace entre le nombre et le "$".
  if (finAvant > 0 && ESPACES.test(texte[finAvant - 1])) finAvant -= 1;

  const fenetre = texte.slice(Math.max(0, finAvant - FENETRE), finAvant);
  const trouve = /\d+(?:[.,]\d+)*$/.exec(fenetre);
  if (!trouve) return false;

  const debutNombre = finAvant - trouve[0].length;
  const avantNombre = debutNombre > 0 ? texte[debutNombre - 1] : undefined;
  if (avantNombre !== undefined && AVANT_NOMBRE_MATHS.test(avantNombre)) return false;

  const suivant = texte[indexDollar + 1];
  return suivant === undefined || !APRES_DOLLAR_MATHS.test(suivant);
}

export function echapperMontants(texte: string): string {
  if (!texte.includes("$")) return texte;

  let resultat = "";
  let formuleOuverte = false; // un "$" ouvrant attend son "$" fermant
  let blocOuvert = false; // à l'intérieur d'un bloc "$$...$$"

  // split avec un groupe capturant : les indices impairs sont les morceaux de code.
  const morceaux = texte.split(SEGMENTS_CODE);
  for (let m = 0; m < morceaux.length; m += 1) {
    const segment = morceaux[m];
    if (m % 2 === 1) {
      resultat += segment;
      continue;
    }

    for (let i = 0; i < segment.length; i += 1) {
      const c = segment[i];

      // Un saut de paragraphe referme toute formule restée ouverte.
      if (c === "\n" && /^[ \t]*\n/.test(segment.slice(i + 1))) formuleOuverte = false;

      if (c !== "$") {
        resultat += c;
        continue;
      }

      // Bloc "$$...$$" : on l'ouvre ou le ferme sans rien changer à son contenu.
      if (segment[i + 1] === "$") {
        blocOuvert = !blocOuvert;
        formuleOuverte = false;
        resultat += "$$";
        i += 1;
        continue;
      }
      if (blocOuvert) {
        resultat += c;
        continue;
      }

      // Déjà échappé par le modèle : on ne touche à rien.
      if (segment[i - 1] === "\\") {
        resultat += c;
        continue;
      }

      // Le "$" qui ferme une formule ouverte plus haut n'est jamais un montant.
      if (formuleOuverte) {
        formuleOuverte = false;
        resultat += c;
        continue;
      }

      // Les positions sont lues dans le texte entier du segment, "resultat" n'est
      // jamais relu : il peut contenir des "\" ajoutés.
      if (estMontantDollarAvant(segment, i) || estMontantDollarApres(segment, i)) {
        resultat += "\\$";
      } else {
        formuleOuverte = true;
        resultat += c;
      }
    }
  }

  return resultat;
}
