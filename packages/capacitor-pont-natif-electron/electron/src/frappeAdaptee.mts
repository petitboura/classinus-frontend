// Frappe du texte adaptée à l'application au premier plan.
//
// La vitesse de frappe est au maximum partout : les essais récents montrent que le
// Bloc-notes et Thonny reçoivent le texte correctement. Seul reste adapté le traitement
// de l'indentation : les éditeurs de code ajoutent tout seuls des espaces après chaque
// retour à la ligne, ce qui s'additionne à ceux écrits par l'agent. Pour ces éditeurs,
// l'indentation ajoutée est effacée avant d'écrire la ligne suivante.

import type { ResultatCombinaison } from "./gardeClavier.mjs";

export type ProfilFrappe = {
  nom: string;
  // Attente entre deux touches.
  delaiToucheMs: number;
  // Attente après chaque retour à la ligne, le temps que l'éditeur calcule son indentation.
  pauseApresEntreeMs: number;
  // L'éditeur indente tout seul : on efface ce qu'il a ajouté avant d'écrire la ligne.
  effacerIndentationAuto: boolean;
};

export const DELAI_RAPIDE_MS = 4;

// La frappe est envoyée par petits blocs de caractères pour pouvoir s'arrêter entre deux
// blocs (arrêt global, voir arretGlobal.mts) : un seul gros morceau ne peut pas être
// interrompu en plein milieu.
export const TAILLE_BLOC_FRAPPE = 20;

const PROFIL_RAPIDE: ProfilFrappe = {
  nom: "rapide",
  delaiToucheMs: DELAI_RAPIDE_MS,
  pauseApresEntreeMs: 0,
  effacerIndentationAuto: false,
};

// Du plus précis au plus général : "notepad++" doit passer avant "notepad".
const PROFILS_CONNUS: { motifs: string[]; profil: ProfilFrappe }[] = [
  {
    motifs: ["thonny", "notepad++"],
    profil: { nom: "editeur de code", delaiToucheMs: DELAI_RAPIDE_MS, pauseApresEntreeMs: 60, effacerIndentationAuto: true },
  },
  {
    motifs: ["bloc-notes", "notepad"],
    profil: { nom: "editeur de texte simple", delaiToucheMs: DELAI_RAPIDE_MS, pauseApresEntreeMs: 0, effacerIndentationAuto: false },
  },
];

export function choisirProfilFrappe(titreFenetre: string | null): ProfilFrappe {
  if (!titreFenetre) return PROFIL_RAPIDE;
  const titre = titreFenetre.toLowerCase();
  for (const { motifs, profil } of PROFILS_CONNUS) {
    if (motifs.some((motif) => titre.includes(motif))) return profil;
  }
  return PROFIL_RAPIDE;
}

// Certains caractères sont mal envoyés par la bibliothèque de frappe : au lieu de la lettre,
// l'ordinateur reçoit un raccourci clavier. Le tiret long devient Ctrl+T (nouvel onglet ou
// terminal selon l'application), le tiret moyen deviendrait Ctrl+S (enregistrer), etc.
// Tous les caractères au delà du jeu latin de base (code supérieur à 255) sont concernés,
// alors que les accents français courants (é, è, à, ç...) passent sans problème.
// Le texte est donc nettoyé avant d'être tapé : les signes typographiques courants sont
// remplacés par leur équivalent simple, tout autre caractère à risque devient un point
// d'interrogation (visible, pour que l'erreur se voie), et les caractères de contrôle
// cachés sont supprimés.
const REMPLACEMENTS_TYPOGRAPHIQUES: [RegExp, string][] = [
  [/[\u2010-\u2015\u2212]/g, "-"],
  [/[\u2018\u2019\u201A\u201B\u2032]/g, "'"],
  [/[\u201C\u201D\u201E\u201F\u2033]/g, '"'],
  [/\u2026/g, "..."],
  [/[\u2022\u00B7\u25AA\u25CF]/g, "-"],
  [/\u2192/g, "->"],
  [/\u2190/g, "<-"],
  [/\u0153/g, "oe"],
  [/\u0152/g, "OE"],
  [/\u20AC/g, "EUR"],
  [/[\u2000-\u200A\u202F\u205F\u3000]/g, " "],
  [/[\u200B-\u200D\uFEFF]/g, ""],
];

export function nettoyerTexteFrappe(texte: string): string {
  let propre = texte;
  for (const [motif, remplacement] of REMPLACEMENTS_TYPOGRAPHIQUES) {
    propre = propre.replace(motif, remplacement);
  }
  propre = propre.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  // Les paires de substitution (emoji, etc.) comptent pour un seul caractère à remplacer.
  return Array.from(propre, (caractere) => (caractere.codePointAt(0)! > 255 ? "?" : caractere)).join("");
}

type ClavierDeFrappe = {
  config: { autoDelayMs: number };
  type(...entrees: unknown[]): Promise<unknown>;
};

type GardeDeFrappe = {
  exclusif<T>(action: () => Promise<T>): Promise<T>;
  combinaison(touches: number[]): Promise<ResultatCombinaison>;
};

type ToucheNumerique = number;

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Écrit le texte tel quel, chaque saut de ligne devenant un vrai appui sur Entrée.
// Renvoie une erreur lisible si un raccourci interne n'a pas pu être relâché.
export async function taperTexteAdapte(options: {
  clavier: ClavierDeFrappe;
  garde: GardeDeFrappe;
  entree: ToucheNumerique;
  maj: ToucheNumerique;
  debut: ToucheNumerique;
  texte: string;
  titreFenetre: string | null;
  // Vrai quand l'étudiant a demandé l'arrêt : la frappe s'arrête avant le bloc suivant.
  arretDemande?: () => boolean;
}): Promise<{ ok: true; profil: string } | { ok: false; erreur: string }> {
  const { clavier, garde, entree, maj, debut, texte, titreFenetre } = options;
  const arretDemande = options.arretDemande ?? (() => false);
  const profil = choisirProfilFrappe(titreFenetre);
  clavier.config.autoDelayMs = profil.delaiToucheMs;

  const lignes = nettoyerTexteFrappe(texte).split(/\r\n|\r|\n/);
  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];
    if (ligne) {
      // Par caractères entiers : un emoji ne doit pas être coupé en deux.
      const caracteres = Array.from(ligne);
      for (let pos = 0; pos < caracteres.length; pos += TAILLE_BLOC_FRAPPE) {
        if (arretDemande()) return { ok: false, erreur: "arret demande" };
        const bloc = caracteres.slice(pos, pos + TAILLE_BLOC_FRAPPE).join("");
        await garde.exclusif(() => clavier.type(bloc));
      }
    }
    if (i === lignes.length - 1) break;
    if (arretDemande()) return { ok: false, erreur: "arret demande" };
    await garde.exclusif(() => clavier.type(entree));
    if (profil.pauseApresEntreeMs > 0) await attendre(profil.pauseApresEntreeMs);
    // L'éditeur vient d'ajouter son indentation : Maj+Début la sélectionne, la ligne
    // suivante la remplace. Inutile si cette ligne est vide (rien à écrire par-dessus).
    if (profil.effacerIndentationAuto && lignes[i + 1]) {
      const resultat = await garde.combinaison([maj, debut]);
      if (!resultat.ok) return { ok: false, erreur: resultat.erreur };
    }
  }
  return { ok: true, profil: profil.nom };
}
