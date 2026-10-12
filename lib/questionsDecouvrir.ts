import type { QuestionReponse } from "./usagesDecouvrir";

// Chantier SEO/AEO de Classinus, phase questions et réponses (12/10/2026,
// demande Bourama). Les questions que se pose vraiment quelqu'un sur une
// section, affichées en accordéon sur la page mère de cette section
// (components/AccordeonQuestionsDecouvrir.tsx) et reprises dans le balisage
// Google "FAQPage".
//
// Règles d'écriture, validées par Bourama : une vraie question (jamais un
// simple nom de section), une réponse qui commence tout de suite par la
// réponse, et rien qui ne décrive pas une fonction réelle de l'appli. Les
// textes viennent des pages /decouvrir et des aides de l'appli
// (lib/aideSections.tsx), déjà validés. Une fonction modifiée dans l'appli se
// corrige ici dans le même geste (voir CLAUDE.md).
//
// Une section n'ajoute son jeu de questions ici qu'APRÈS son SEO (ses pages
// /decouvrir existent déjà).

export type LienQuestion = { texte: string; href: string };

export type QuestionDecouvrir = QuestionReponse & {
  // Liens affichés sous la réponse. Absents du texte du balisage Google, qui
  // ne garde que la réponse en texte simple.
  liens?: LienQuestion[];
};

export type GroupeQuestionsDecouvrir = {
  titre: string;
  questions: QuestionDecouvrir[];
};

// Bibliothèque : jeu validé par Bourama le 12/10/2026.
export const QUESTIONS_DECOUVRIR_BIBLIOTHEQUE: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Documents personnels",
    questions: [
      {
        question: "Qui peut voir les documents de ma bibliothèque personnelle ?",
        reponse:
          "Toi seul. Les documents que tu ajoutes dans ta bibliothèque personnelle sont personnels, et Classinus peut les consulter pendant une conversation.",
      },
      {
        question: "À quoi sert la bibliothèque personnelle ?",
        reponse:
          "Elle sert surtout à rester dans ton programme : en s'appuyant dessus, Classinus reste sur ce que tu étudies vraiment, plutôt que d'aller chercher ailleurs.",
      },
      {
        question: "Ce que j'envoie dans le chat est-il gardé ?",
        reponse:
          "Oui, tout ce que tu envoies dans le chat se retrouve automatiquement dans ta bibliothèque personnelle.",
      },
      {
        question: "Que se passe-t-il si j'envoie un fichier .zip ?",
        reponse:
          "Il est déplié automatiquement : chaque fichier à l'intérieur est ajouté séparément, dans un dossier créé pour l'occasion.",
      },
    ],
  },
  {
    titre: "Bibliothèque publique",
    questions: [
      {
        question: "Qu'est-ce que la bibliothèque publique ?",
        reponse:
          "Un catalogue de documents partagé par tous les élèves de Classinus, que l'IA peut aussi fouiller pour toi.",
      },
      {
        question: "Puis-je partager un document avec les autres élèves ?",
        reponse:
          "Oui, en ajoutant un fichier, un lien ou une note, avec un nom et une description pour que les autres le retrouvent. En publiant, tu garantis détenir les droits sur le contenu.",
        liens: [
          { texte: "CGU", href: "/cgu" },
          { texte: "Politique de copyright", href: "/copyright" },
        ],
      },
      {
        question: "Comment savoir quelle ressource est la meilleure ?",
        reponse:
          "Les élèves notent chaque ressource, et tu peux consulter le profil de la personne qui l'a partagée.",
      },
    ],
  },
  {
    titre: "Dossiers du téléphone",
    questions: [
      {
        question: "Dois-je envoyer mes PDF un par un ?",
        reponse:
          "Non, sur l'appli mobile tu peux désigner des dossiers de ton téléphone, et Classinus les explore sans copier tes fichiers.",
      },
      {
        question: "Classinus peut-il ranger les dossiers de mon téléphone ?",
        reponse:
          "Oui, il peut les réorganiser en sous dossiers, uniquement ceux que tu lui as désignés.",
      },
    ],
  },
];
