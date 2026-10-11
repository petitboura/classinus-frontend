// Crayon du canal PC, lot 4 (11/10/2026, demande Bourama) : la phrase envoyée au grand
// modèle pour dire ce que l'étudiant a entouré, et le message dit dans la bulle quand
// rien n'est lisible. Module pur, sans React ni Electron.

import type { ElementEntoure, ErreurLectureEntouree, LectureEntouree } from "@/lib/lectureEntoureCrayon";

export const TEXTE_BULLE_RIEN_LISIBLE = "Pour l'instant je ne vois pas les images, donc certains écrans ne sont pas exploitables.";
export const TEXTE_BULLE_FENETRE_CLASSINUS = "Je ne peux pas encore lire ce que tu entoures dans Classinus lui-même.";
export const TEXTE_BULLE_LECTURE_IMPOSSIBLE = "Je n'ai pas réussi à lire ce que tu as entouré.";

const NB_MAX_ELEMENTS_DANS_LA_PHRASE = 10;
const LONGUEUR_MAX_NOM = 80;
const LONGUEUR_MAX_VALEUR = 120;
const LONGUEUR_MAX_TITRE = 60;

export type PhraseCrayon = {
  // Message envoyé au grand modèle, question de l'étudiant comprise.
  message: string;
  // Texte que Classinus dit dans sa bulle, seulement quand rien n'est lisible.
  messageBulle: string | null;
};

function couper(texte: string, max: number): string {
  const propre = texte.replace(/\s+/g, " ").trim();
  return propre.length > max ? `${propre.slice(0, max).trimEnd()}…` : propre;
}

function decrireElement(e: ElementEntoure): string | null {
  if (e.valeur_masquee) return `${e.type} masqué`;
  const nom = couper(e.nom, LONGUEUR_MAX_NOM);
  const valeur = couper(e.valeur ?? "", LONGUEUR_MAX_VALEUR);
  if (nom && valeur && valeur !== nom) return `${e.type} « ${nom} » contenant « ${valeur} »`;
  if (nom) return `${e.type} « ${nom} »`;
  if (valeur) return `${e.type} contenant « ${valeur} »`;
  return null;
}

function decrireElements(elements: ElementEntoure[]): { liste: string[]; reste: number } {
  const vus = new Set<string>();
  const liste: string[] = [];
  let reste = 0;
  for (const e of elements) {
    const description = decrireElement(e);
    if (!description || vus.has(description)) continue;
    vus.add(description);
    if (liste.length < NB_MAX_ELEMENTS_DANS_LA_PHRASE) liste.push(description);
    else reste += 1;
  }
  return { liste, reste };
}

function ajouterQuestion(phrase: string, question: string): string {
  const propre = question.trim();
  return propre ? `${phrase}\n\n${propre}` : phrase;
}

/** Null quand il n'y a rien à envoyer (aucun trait dessiné). */
export function composerPhraseCrayon(
  lecture: LectureEntouree | ErreurLectureEntouree,
  question: string
): PhraseCrayon | null {
  if ("erreur" in lecture) {
    if (lecture.erreur === "aucun_trait") return null;
    return {
      message: ajouterQuestion("L'étudiant a entouré un endroit de l'écran.", question),
      messageBulle: TEXTE_BULLE_LECTURE_IMPOSSIBLE,
    };
  }

  const titre = lecture.titre_fenetre_active ? couper(lecture.titre_fenetre_active, LONGUEUR_MAX_TITRE) : "";
  const dansLaFenetre = titre ? ` dans la fenêtre « ${titre} »` : "";

  if (lecture.fenetre_classinus) {
    return {
      message: ajouterQuestion("L'étudiant a entouré un endroit de l'écran, dans Classinus.", question),
      messageBulle: TEXTE_BULLE_FENETRE_CLASSINUS,
    };
  }

  const { liste, reste } = decrireElements(lecture.elements);
  if (liste.length === 0) {
    return {
      message: ajouterQuestion(`L'étudiant a entouré un endroit de l'écran${dansLaFenetre}.`, question),
      messageBulle: TEXTE_BULLE_RIEN_LISIBLE,
    };
  }

  const suite = reste === 0 ? "" : reste === 1 ? " et un autre élément" : ` et ${reste} autres éléments`;
  return {
    message: ajouterQuestion(`L'étudiant a entouré${dansLaFenetre} : ${liste.join(", ")}${suite}.`, question),
    messageBulle: null,
  };
}
