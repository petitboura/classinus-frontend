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

// Page générale /decouvrir : uniquement les fonctions décrites dans les pages publiques.
export const QUESTIONS_DECOUVRIR_GENERAL: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Découvrir Classinus",
    questions: [
      {
        question: "Qu'est-ce que Classinus ?",
        reponse:
          "Classinus est une application d'études avec IA. Tu peux poser tes questions dans le chat, travailler à partir de tes documents, rechercher des ressources et préparer des supports de révision comme des fiches, des QCM et des animations.",
      },
      {
        question: "Quelles fonctionnalités puis-je découvrir ?",
        reponse:
          "Les pages Découvrir présentent le chat et l'accueil étudiant, la bibliothèque personnelle et publique, la personnalisation par skills et mémoire, les outils de concentration, les usages pour trouver des PDF ou des vidéos et apprendre à coder, ainsi que le Bureau.",
      },
      {
        question: "Classinus sert-il uniquement à discuter avec une IA ?",
        reponse:
          "Non. En plus du chat, Classinus propose une bibliothèque de documents, des recherches de ressources, des fiches de révision, des QCM interactifs, des animations, l'exécution de Python dans le chat et des outils pour personnaliser les réponses de l'IA.",
      },
    ],
  },
];

// Accueil : aligné sur EcranAccueil, qui affiche les raccourcis et l'activité récente réelle.
export const QUESTIONS_DECOUVRIR_ACCUEIL: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Le coin des étudiants",
    questions: [
      {
        question: "À quoi sert l'écran d'accueil de Classinus ?",
        reponse:
          "Il permet d'ouvrir le chat, d'accéder aux sections de Classinus depuis les raccourcis et de retrouver une activité récente.",
      },
      {
        question: "Que contient l'activité récente de l'accueil ?",
        reponse:
          "Elle rassemble les conversations récentes et les fichiers récemment ajoutés à ta bibliothèque personnelle. L'accueil affiche jusqu'à huit éléments, classés du plus récent au plus ancien.",
      },
      {
        question: "Puis-je rouvrir une conversation depuis l'accueil ?",
        reponse:
          "Oui. Sélectionne une conversation dans l'activité récente pour la rouvrir dans le chat.",
      },
      {
        question: "Comment choisir un modèle d'IA dans Classinus ?",
        reponse:
          "Clique sur le nom du modèle en haut du chat. Le menu regroupe les modèles disponibles par fournisseur ; ton choix sert aux prochains messages selon les modèles proposés par le serveur.",
      },
      {
        question: "Que signifie la mention « Bientôt » à côté d'un modèle ?",
        reponse:
          "Ce modèle n'est pas encore disponible dans Classinus. Il apparaît grisé et ne peut pas être sélectionné tant qu'il n'est pas activé.",
      },
      {
        question: "Classinus peut-il analyser mon code directement dans Thonny ?",
        reponse:
          "Oui. Installe le plugin thonny-classinus pour afficher un panneau Classinus à droite de l'éditeur Thonny. Tu peux lui demander d'analyser ou de corriger ton code Python, d'expliquer une erreur ou une sélection, et de tenir compte de la sortie du programme. Rien n'est envoyé sans action de ta part.",
      },
      {
        question: "Puis-je choisir le modèle d'IA dans le panneau Classinus de Thonny ?",
        reponse:
          "Oui. Le bouton Modèle du panneau affiche les modèles disponibles, regroupés par fournisseur. Dans Réglages, tu peux aussi choisir la longueur de réponse, l'effort, le mode pédagogique et les modes ressources.",
      },
    ],
  },
];

// Personnalisation : alignée sur les pages Mes skills, Skills publics et Ma mémoire.
export const QUESTIONS_DECOUVRIR_PERSONNALISER: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Skills personnelles et publiques",
    questions: [
      {
        question: "Que puis-je personnaliser dans Classinus ?",
        reponse:
          "Tu peux créer tes propres skills, reprendre des skills publiées par d'autres élèves et consulter ou effacer la mémoire que Classinus construit au fil de vos conversations.",
      },
      {
        question: "À quoi servent Mes skills ?",
        reponse:
          "Une skill est une consigne personnelle donnée à Classinus, en plus de celles que ton enseignant a déjà mises en place. Tu peux en créer et en modifier à tout moment, avec l'aide de l'IA.",
      },
      {
        question: "Comment utiliser une skill publiée par un autre élève ?",
        reponse:
          "Tu peux chercher des skills dans le catalogue public avec l'aide de l'IA, consulter le contenu complet d'une skill puis l'activer. Une copie est alors ajoutée à tes propres skills. Si tu as publié une skill, tu peux la retirer du catalogue public.",
      },
    ],
  },
  {
    titre: "Mémoire",
    questions: [
      {
        question: "Quelles informations contient la mémoire de Classinus ?",
        reponse:
          "Elle organise les informations retenues au fil des conversations en quatre catégories : identité, scolarité, apprentissage et préférences, afin de personnaliser les échanges.",
      },
      {
        question: "Puis-je consulter ou effacer la mémoire de Classinus ?",
        reponse:
          "Oui. Tu peux consulter la mémoire, effacer une catégorie entière ou tout effacer, depuis la page Mémoire ou les Paramètres. Chaque effacement demande une double confirmation.",
      },
    ],
  },
];

// Concentration : alignée sur les pages Contrôle de session et Temps d'écran.
export const QUESTIONS_DECOUVRIR_CONCENTRATION: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Contrôle de session",
    questions: [
      {
        question: "Que fait le contrôle de session ?",
        reponse:
          "Pendant la durée choisie, il coupe les sonneries et les notifications et active Ne pas déranger. Son activation doit être autorisée dans les réglages système du téléphone, dans Accessibilité, en dehors de Classinus.",
      },
      {
        question: "Le contrôle de session bloque-t-il les applications ?",
        reponse:
          "Non. La fonction décrite par Classinus coupe les sonneries et notifications et active Ne pas déranger ; elle ne bloque pas l'ouverture des applications.",
      },
    ],
  },
  {
    titre: "Temps d'écran",
    questions: [
      {
        question: "Que montre le temps d'écran ?",
        reponse:
          "Il affiche le temps passé aujourd'hui dans chaque application installée sur ton téléphone et l'historique des sept derniers jours. Cette fonction nécessite l'application mobile Classinus et est actuellement disponible sur Android uniquement.",
      },
    ],
  },
];

// Bureau : réponses vérifiées contre les pages publiques des sept outils et le registre d'aide.
export const QUESTIONS_DECOUVRIR_BUREAU: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Codes et programme",
    questions: [
      {
        question: "À quoi servent les codes Classinus ?",
        reponse:
          "Un code permet de partager un comportement, du contenu de bibliothèque ou un texte. Les personnes qui entrent le code reçoivent ce qui y est associé, et les changements faits ensuite sont partagés avec elles.",
      },
      {
        question: "Que se passe-t-il quand j'entre un code reçu ?",
        reponse:
          "Tu reçois ce que la personne a associé au code : un comportement, du contenu de bibliothèque ou un texte, selon ce qu'elle a partagé.",
      },
      {
        question: "À quoi sert le programme d'un code ?",
        reponse:
          "Réservé aux enseignants, le programme organise les notions à enseigner pour un code, avec une structure matière, chapitre, partie et notion. Tu peux ajouter des sous-notions, définir chaque statut comme à venir, en cours ou acquis, et importer un document pour proposer une structure à valider.",
      },
    ],
  },
  {
    titre: "Signalements et audit",
    questions: [
      {
        question: "Quelle est la différence entre Signalements et Audit hebdomadaire ?",
        reponse:
          "Dans Signalements, l'enseignant ouvre une conversation avec Classinus pour discuter d'un problème signalé par un élève ; rien n'est traité automatiquement sans lui. L'Audit hebdomadaire envoie chaque semaine un résumé des signalements, même s'il n'y en a aucun, en mettant en avant ceux qui attendent une correction. Il permet aussi d'ouvrir le tableau de bord détaillé d'un code. Ces outils sont réservés aux enseignants.",
      },
    ],
  },
  {
    titre: "Éditeur et Configuration",
    questions: [
      {
        question: "Que peut-on faire dans l'éditeur de code ?",
        reponse:
          "Tu peux écrire du code dans différents langages, mais le bouton Exécuter ne prend en charge que Python pour l'instant. Tu peux ouvrir et enregistrer des fichiers dans ta bibliothèque personnelle. Quand le canal en direct est activé, Classinus peut voir le code, te conseiller et écrire directement dans l'éditeur.",
      },
      {
        question: "Que permet la Configuration de Classinus ?",
        reponse:
          "Elle sert à créer et modifier quatre types d'éléments : des procédures (étapes à suivre), des règles (consignes courtes), des comportements (réaction à un cas précis) et des styles (ton à reproduire). Tu peux les activer ou les désactiver, les partager avec un code ou les publier dans le catalogue public.",
      },
    ],
  },
];
