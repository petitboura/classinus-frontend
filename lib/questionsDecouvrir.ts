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

// Page générale /decouvrir : aperçu des fonctions réellement présentes.
export const QUESTIONS_DECOUVRIR_GENERAL: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Découvrir Classinus",
    questions: [
      {
        question: "À quoi sert Classinus ?",
        reponse:
          "Classinus est une application d'études avec IA : tu peux poser des questions dans le chat, travailler à partir de tes documents, trouver des ressources et préparer des supports de révision comme des fiches, des QCM et des animations.",
      },
      {
        question: "Quelles parties de Classinus puis-je découvrir ?",
        reponse:
          "Les pages Découvrir présentent le coin des étudiants, la bibliothèque, la personnalisation de l'IA, les outils de concentration, différents usages du chat et le Bureau.",
      },
      {
        question: "Classinus sert-il uniquement à répondre à des questions ?",
        reponse:
          "Non. En plus du chat, Classinus propose une bibliothèque personnelle et publique, la recherche de documents et de vidéos, des outils de révision, la mémoire, des skills personnalisés et des outils pour gérer une classe.",
      },
    ],
  },
];

// Accueil : réponses alignées sur components/EcranAccueil.tsx.
export const QUESTIONS_DECOUVRIR_ACCUEIL: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Le coin des étudiants",
    questions: [
      {
        question: "À quoi sert l'écran d'accueil de Classinus ?",
        reponse:
          "Il donne accès au chat, aux raccourcis vers les sections de Classinus et à une liste d'activité récente, notamment les conversations et les documents ajoutés à la bibliothèque.",
      },
      {
        question: "Puis-je retrouver rapidement une conversation récente ?",
        reponse:
          "Oui, l'activité récente affiche les conversations récentes. En sélectionnant une conversation, tu peux la rouvrir dans le chat.",
      },
      {
        question: "Où retrouver les différentes fonctionnalités de Classinus ?",
        reponse:
          "Le tableau de bord présente des raccourcis vers les sections de l'application. Des raccourcis sont également disponibles depuis l'écran vide du chat.",
      },
    ],
  },
];

// Personnalisation : réponses alignées sur les aides Mes skills, Skills publics et Ma mémoire.
export const QUESTIONS_DECOUVRIR_PERSONNALISER: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Skills et consignes",
    questions: [
      {
        question: "À quoi servent les skills dans Classinus ?",
        reponse:
          "Les skills sont des consignes personnalisées qui guident la façon dont Classinus répond. Tes propres consignes s'ajoutent à celles que ton enseignant a déjà mises en place.",
      },
      {
        question: "Puis-je utiliser les skills publiées par d'autres élèves ?",
        reponse:
          "Oui. La section Skills publics permet de chercher des skills publiées par d'autres élèves et d'activer celles qui t'intéressent.",
      },
    ],
  },
  {
    titre: "Mémoire",
    questions: [
      {
        question: "Que retient la mémoire de Classinus ?",
        reponse:
          "La mémoire organise les informations retenues au fil des conversations en quatre catégories : identité, scolarité, apprentissage et préférences.",
      },
      {
        question: "Puis-je contrôler ce que Classinus retient ?",
        reponse:
          "Oui. Tu peux consulter ta mémoire et oublier une catégorie. Les Paramètres permettent aussi d'effacer toute la mémoire.",
      },
    ],
  },
];

// Concentration : réponses alignées sur les aides Contrôle de session et Temps d'écran.
export const QUESTIONS_DECOUVRIR_CONCENTRATION: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Contrôle de session",
    questions: [
      {
        question: "Que fait le contrôle de session ?",
        reponse:
          "Il coupe les sonneries et les notifications et active le mode Ne pas déranger pendant la durée choisie. Son activation nécessite le réglage système d'accessibilité du téléphone, en dehors de l'application.",
      },
      {
        question: "Le contrôle de session bloque-t-il les applications ?",
        reponse:
          "Non. La fonction décrite dans Classinus coupe les sonneries et notifications et active Ne pas déranger ; elle ne bloque pas l'ouverture des applications.",
      },
    ],
  },
  {
    titre: "Temps d'écran",
    questions: [
      {
        question: "Que montre le temps d'écran ?",
        reponse:
          "Il indique le temps passé aujourd'hui dans chaque application et permet de consulter l'historique des sept derniers jours.",
      },
    ],
  },
];

// Bureau : réponses alignées sur les pages de présentation et les aides du Bureau.
export const QUESTIONS_DECOUVRIR_BUREAU: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Codes et programme",
    questions: [
      {
        question: "À quoi sert un code Classinus ?",
        reponse:
          "Un enseignant ou un utilisateur peut créer un code et y partager du contenu. Les personnes qui entrent ce code reçoivent ce qui y est associé.",
      },
      {
        question: "À quoi sert le programme d'un code ?",
        reponse:
          "Le programme permet d'organiser les notions à enseigner pour un code et de suivre l'avancement des élèves, notion par notion. Cette fonction est réservée aux enseignants.",
      },
    ],
  },
  {
    titre: "Outils enseignants",
    questions: [
      {
        question: "Comment suivre les signalements des élèves ?",
        reponse:
          "Le Bureau propose une page Signalements pour consulter et traiter les signalements reçus, ainsi qu'un audit hebdomadaire qui en fait le résumé. Ces deux outils sont réservés aux enseignants.",
      },
      {
        question: "Le Bureau contient-il d'autres outils que le suivi de classe ?",
        reponse:
          "Oui. Il comprend aussi un éditeur pour écrire et exécuter du code, ainsi qu'une section Configuration pour définir des procédures, des règles, des comportements et des styles qui guident les réponses de Classinus.",
      },
    ],
  },
];
