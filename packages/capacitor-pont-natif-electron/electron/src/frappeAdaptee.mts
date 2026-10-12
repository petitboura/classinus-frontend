// Frappe du texte adaptée à l'application au premier plan.
//
// La vitesse de frappe est au maximum partout : les essais récents montrent que le
// Bloc-notes et Thonny reçoivent le texte correctement. Seul reste adapté le traitement
// de l'indentation : les éditeurs de code ajoutent tout seuls des espaces après chaque
// retour à la ligne, ce qui s'additionne à ceux écrits par l'agent. Pour ces éditeurs,
// l'indentation ajoutée est effacée avant d'écrire la ligne suivante.

import type { ResultatCombinaison } from "./gardeClavier.mjs";
import type { Collage } from "./collageFrappe.mjs";

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
// l'ordinateur reçoit un raccourci clavier (le tiret long devient Ctrl+T, par exemple).
// Tous les caractères au delà du jeu latin de base (code supérieur à 255) sont concernés,
// alors que les accents français courants (é, è, à, ç...) passent sans problème.
// Ces caractères ne sont donc pas tapés : ils sont collés (voir collageFrappe.mts).
// Le texte est d'abord nettoyé : les caractères de contrôle cachés et les caractères
// invisibles de largeur nulle sont supprimés.
export function nettoyerTexteFrappe(texte: string): string {
  return texte
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

type SegmentTexte = { special: boolean; texte: string };

// Découpe une ligne en suites de caractères tapables et de caractères à coller.
// Par caractères entiers : un emoji ne doit jamais être coupé en deux.
export function segmenterLigne(ligne: string): SegmentTexte[] {
  const segments: SegmentTexte[] = [];
  for (const caractere of Array.from(ligne)) {
    const special = caractere.codePointAt(0)! > 255;
    const dernier = segments[segments.length - 1];
    if (dernier && dernier.special === special) dernier.texte += caractere;
    else segments.push({ special, texte: caractere });
  }
  return segments;
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
  // Colle les caractères que la frappe ne sait pas envoyer. Sans lui, ils sont remplacés par "?".
  collage?: Collage;
  // Demandé avant chaque bloc, chaque collage et chaque retour à la ligne (12/10/2026) :
  // renvoie faux quand le clavier n'est plus dans la fenêtre voulue (l'étudiant est parti
  // ailleurs). La frappe s'arrête alors tout de suite, sans rien écrire dans l'autre fenêtre.
  fenetreToujoursBonne?: () => Promise<boolean>;
}): Promise<
  | { ok: true; profil: string; tapes: number }
  | { ok: false; erreur: string; tapes: number; fenetreChangee?: boolean }
> {
  const { clavier, garde, entree, maj, debut, texte, titreFenetre, collage } = options;
  const arretDemande = options.arretDemande ?? (() => false);
  const fenetreToujoursBonne = options.fenetreToujoursBonne ?? (async () => true);
  // Nombre de caractères réellement écrits (un retour à la ligne compte pour un).
  let tapes = 0;
  const FENETRE_CHANGEE = { ok: false as const, erreur: "fenetre changee", fenetreChangee: true };
  const profil = choisirProfilFrappe(titreFenetre);
  clavier.config.autoDelayMs = profil.delaiToucheMs;

  try {
    const lignes = nettoyerTexteFrappe(texte).split(/\r\n|\r|\n/);
    for (let i = 0; i < lignes.length; i++) {
      for (const segment of segmenterLigne(lignes[i])) {
        if (arretDemande()) return { ok: false, erreur: "arret demande", tapes };
        if (segment.special) {
          if (!(await fenetreToujoursBonne())) return { ...FENETRE_CHANGEE, tapes };
          if (!collage) {
            const remplacement = "?".repeat(Array.from(segment.texte).length);
            await garde.exclusif(() => clavier.type(remplacement));
            tapes += Array.from(segment.texte).length;
            continue;
          }
          collage.preparer();
          const resultat = await collage.coller(segment.texte);
          if (!resultat.ok) return { ok: false, erreur: resultat.erreur, tapes };
          tapes += Array.from(segment.texte).length;
          continue;
        }
        const caracteres = Array.from(segment.texte);
        for (let pos = 0; pos < caracteres.length; pos += TAILLE_BLOC_FRAPPE) {
          if (arretDemande()) return { ok: false, erreur: "arret demande", tapes };
          if (!(await fenetreToujoursBonne())) return { ...FENETRE_CHANGEE, tapes };
          const bloc = caracteres.slice(pos, pos + TAILLE_BLOC_FRAPPE).join("");
          await garde.exclusif(() => clavier.type(bloc));
          tapes += Array.from(bloc).length;
        }
      }
      if (i === lignes.length - 1) break;
      if (arretDemande()) return { ok: false, erreur: "arret demande", tapes };
      if (!(await fenetreToujoursBonne())) return { ...FENETRE_CHANGEE, tapes };
      await garde.exclusif(() => clavier.type(entree));
      tapes += 1;
      if (profil.pauseApresEntreeMs > 0) await attendre(profil.pauseApresEntreeMs);
      // L'éditeur vient d'ajouter son indentation : Maj+Début la sélectionne, la ligne
      // suivante la remplace. Inutile si cette ligne est vide (rien à écrire par-dessus).
      if (profil.effacerIndentationAuto && lignes[i + 1]) {
        // Maj+Début est un raccourci : jamais envoyé dans une autre fenêtre que la bonne.
        if (!(await fenetreToujoursBonne())) return { ...FENETRE_CHANGEE, tapes };
        const resultat = await garde.combinaison([maj, debut]);
        if (!resultat.ok) return { ok: false, erreur: resultat.erreur, tapes };
      }
    }
    return { ok: true, profil: profil.nom, tapes };
  } finally {
    collage?.restaurer();
  }
}
