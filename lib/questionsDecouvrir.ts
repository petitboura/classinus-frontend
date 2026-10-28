import type { QuestionReponse } from "./usagesDecouvrir";

export type LienQuestion = { texte: string; href: string };

export type QuestionDecouvrir = QuestionReponse & {
  liens?: LienQuestion[];
};

export type GroupeQuestionsDecouvrir = {
  titre: string;
  questions: QuestionDecouvrir[];
};

export const QUESTIONS_DECOUVRIR_BIBLIOTHEQUE: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Documents personnels",
    questions: [
      {
        question: "Qui peut accéder aux documents de ma bibliothèque personnelle ?",
        reponse:
          "La bibliothèque personnelle est réservée à ton compte. Classinus peut s'appuyer sur les documents que tu y ranges lorsque tu lui demandes de travailler à partir de tes ressources.",
      },
      {
        question: "Pourquoi utiliser une bibliothèque personnelle ?",
        reponse:
          "Elle te permet de réunir tes cours, exercices et autres fichiers dans des dossiers. Tu peux ensuite demander à Classinus de retrouver ou d'exploiter ces documents au lieu de repartir de zéro à chaque question.",
      },
      {
        question: "Les fichiers que j'envoie dans le chat sont-ils ajoutés à ma bibliothèque ?",
        reponse:
          "Les fichiers envoyés dans le chat sont ajoutés à ta bibliothèque personnelle selon le fonctionnement de l'application. Tu peux ensuite les retrouver dans tes documents.",
      },
      {
        question: "Comment Classinus traite-t-il un fichier ZIP ?",
        reponse:
          "Lorsqu'un fichier ZIP est pris en charge, Classinus en extrait les fichiers et les ajoute séparément dans un dossier dédié, afin que tu puisses les retrouver plus facilement.",
      },
    ],
  },
  {
    titre: "Catalogue public",
    questions: [
      {
        question: "Qu'est-ce que la bibliothèque publique de Classinus ?",
        reponse:
          "C'est un catalogue de ressources que les utilisateurs partagent avec la communauté. Tu peux rechercher des documents, consulter les informations sur la ressource et découvrir le profil de la personne qui l'a publiée.",
      },
      {
        question: "Puis-je partager un document avec les autres élèves ?",
        reponse:
          "Oui, à condition de disposer des droits nécessaires pour le partager. Ajoute une ressource avec un titre et les informations utiles pour permettre aux autres de la retrouver. Avant toute publication, vérifie les conditions d'utilisation et les droits d'auteur.",
        liens: [
          { texte: "Conditions générales d'utilisation", href: "/cgu" },
          { texte: "Politique de copyright", href: "/copyright" },
        ],
      },
      {
        question: "Comment évaluer une ressource partagée ?",
        reponse:
          "Tu peux consulter les informations de la ressource, noter le document et ouvrir le profil de la personne qui l'a partagé. Ces éléments t'aident à apprécier la ressource, sans remplacer la vérification de sa qualité et de sa pertinence pour ton cours.",
      },
    ],
  },
  {
    titre: "Dossiers du téléphone",
    questions: [
      {
        question: "Dois-je importer mes PDF un par un depuis mon téléphone ?",
        reponse:
          "Sur l'application mobile, tu peux désigner des dossiers du téléphone pour que Classinus les explore. Cette fonction évite d'avoir à sélectionner chaque fichier individuellement ; elle dépend des autorisations que tu accordes à l'application.",
      },
      {
        question: "Classinus peut-il réorganiser les dossiers de mon téléphone ?",
        reponse:
          "La fonction de bibliothèque mobile peut réorganiser les dossiers que tu as explicitement désignés, notamment en créant des sous-dossiers. Vérifie le dossier sélectionné avant de lancer une opération de rangement.",
      },
    ],
  },
];

export const QUESTIONS_DECOUVRIR_GENERAL: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Comprendre Classinus",
    questions: [
      {
        question: "Qu'est-ce que Classinus ?",
        reponse:
          "Classinus est une application d'étude avec IA. Elle réunit un chat, une bibliothèque de documents, des outils de recherche, des supports de révision et des fonctions pour apprendre à programmer.",
      },
      {
        question: "Que peut-on faire avec Classinus au-delà du chat ?",
        reponse:
          "Tu peux rechercher des livres, des PDF et des vidéos, travailler à partir de tes documents, créer des fiches de révision et des QCM, générer des animations, exécuter du Python dans le chat et personnaliser certaines réponses avec des skills.",
      },
      {
        question: "Puis-je choisir le modèle d'IA utilisé par Classinus ?",
        reponse:
          "Oui. Le chat présente les modèles disponibles, regroupés par fournisseur. Les modèles qui ne sont pas encore activés sont indiqués « Bientôt » et ne peuvent pas être sélectionnés.",
      },
      {
        question: "Classinus est-il destiné uniquement aux élèves ?",
        reponse:
          "Classinus propose un espace d'étude pour les élèves ainsi qu'un Bureau avec des outils de partage et de gestion de classe. Certaines fonctions du Bureau, notamment le programme et le suivi des signalements, sont réservées aux enseignants.",
      },
    ],
  },
];

export const QUESTIONS_DECOUVRIR_PERSONNALISER: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Skills personnelles et publiques",
    questions: [
      {
        question: "Qu'est-ce qu'une skill dans Classinus ?",
        reponse:
          "Une skill est un ensemble de consignes qui aide à orienter les réponses de Classinus. Tu peux créer ou modifier tes propres skills, par exemple pour demander des explications plus progressives ou un format de réponse particulier.",
      },
      {
        question: "Puis-je utiliser une skill créée par un autre élève ?",
        reponse:
          "Oui. Parcours le catalogue des skills publiques, consulte celle qui t'intéresse puis active-la. Une copie est ajoutée à tes skills personnelles ; tu peux ainsi l'adapter à tes besoins sans modifier l'original publié par son auteur.",
      },
      {
        question: "Les skills remplacent-elles les consignes de mon enseignant ?",
        reponse:
          "Non. Tes skills personnalisent tes échanges, mais elles ne remplacent pas les consignes ou règles de travail mises en place par ton enseignant.",
      },
    ],
  },
  {
    titre: "Mémoire",
    questions: [
      {
        question: "À quoi sert la mémoire de Classinus ?",
        reponse:
          "La mémoire regroupe certaines informations retenues au fil des conversations afin de mieux adapter les échanges, notamment sur ton parcours, ta façon d'apprendre et tes préférences.",
      },
      {
        question: "Puis-je consulter ou supprimer les informations de la mémoire ?",
        reponse:
          "Oui. Depuis la page Mémoire ou les paramètres prévus à cet effet, tu peux consulter les informations enregistrées, effacer une catégorie ou vider la mémoire. Lis les éléments affichés avant de confirmer une suppression.",
      },
      {
        question: "Puis-je importer ma mémoire, mes skills ou ma configuration depuis une autre IA ?",
        reponse:
          "Oui. Les pages Mémoire, Skills et Configuration ont chacune un bouton d'import, et un bandeau au dessus de la barre de saisie du chat y mène aussi. Tous font le même import. Le bouton ouvre l'autre IA avec un prompt déjà prêt. Elle te donne un zip, tu le déposes dans Classinus, qui range la mémoire, les skills et la configuration au bon endroit en arrière-plan, puis te prévient à la fin. Les applications connectées ne peuvent pas être reliées depuis l'import : Classinus en garde la liste pour te rappeler de les connecter quand tu discuteras avec lui.",
      },
    ],
  },
  {
    titre: "Applications connectées",
    questions: [
      {
        question: "Quelles applications puis-je relier à Classinus ?",
        reponse:
          "Tu peux relier GitHub, Notion, Higgsfield, Railway et Supabase. Chaque connexion se fait avec ton propre compte et seulement si tu l'autorises.",
      },
      {
        question: "Mes autorisations sont-elles partagées avec les autres utilisateurs ?",
        reponse:
          "Non. Les autorisations sont enregistrées séparément pour chaque utilisateur et chaque application. Aucun accès n'est partagé entre comptes.",
      },
      {
        question: "Comment retirer l'accès de Classinus à une application ?",
        reponse:
          "Ouvre Personnaliser puis Applications connectées, et utilise le bouton de déconnexion de l'application concernée. L'autorisation est alors retirée côté Classinus.",
      },
    ],
  },
];

export const QUESTIONS_DECOUVRIR_CONCENTRATION: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Contrôle de session",
    questions: [
      {
        question: "Que fait le contrôle de session ?",
        reponse:
          "Pendant la durée que tu choisis, le contrôle de session active Ne pas déranger et limite les sonneries et notifications. Pour l'utiliser, tu dois d'abord autoriser l'accès nécessaire dans les réglages système du téléphone.",
      },
      {
        question: "Le contrôle de session bloque-t-il les applications distrayantes ?",
        reponse:
          "Non. Il agit sur les interruptions et les notifications ; il ne bloque pas l'ouverture des applications. Tu gardes la responsabilité de ne pas ouvrir les applications qui te distraient.",
      },
    ],
  },
  {
    titre: "Temps d'écran",
    questions: [
      {
        question: "Que permet de voir l'outil Temps d'écran ?",
        reponse:
          "Sur Android, il affiche le temps passé dans les applications pour la journée en cours et l'historique des sept derniers jours. Il faut accorder l'autorisation système demandée pour que les données d'utilisation puissent être consultées.",
      },
    ],
  },
];

export const QUESTIONS_DECOUVRIR_BUREAU: GroupeQuestionsDecouvrir[] = [
  {
    titre: "Codes et programme",
    questions: [
      {
        question: "À quoi sert un code Classinus ?",
        reponse:
          "Un code permet de partager certains éléments de Classinus, comme un comportement, du contenu de bibliothèque ou un texte. Les personnes qui saisissent le code reçoivent les éléments associés à ce partage.",
      },
      {
        question: "Que se passe-t-il lorsque je saisis un code reçu ?",
        reponse:
          "Classinus récupère les éléments que la personne a associés au code. Le contenu reçu dépend donc du type de partage créé par son auteur.",
      },
      {
        question: "À quoi sert le programme pédagogique ?",
        reponse:
          "Réservé aux enseignants, le programme organise les notions à enseigner en matières, chapitres, parties et notions. L'enseignant peut préciser l'avancement, ajouter des sous-notions ou importer un document pour proposer une structure qu'il pourra vérifier et valider.",
      },
    ],
  },
  {
    titre: "Signalements et audit",
    questions: [
      {
        question: "Quelle différence entre Signalements et Audit hebdomadaire ?",
        reponse:
          "Signalements permet à l'enseignant d'examiner un problème remonté par un élève et d'en discuter avec Classinus. L'Audit hebdomadaire fournit un résumé périodique des signalements et met en évidence ceux qui demandent encore une correction. Ces outils sont réservés aux enseignants.",
      },
      {
        question: "Les signalements sont-ils traités automatiquement ?",
        reponse:
          "Non. L'enseignant peut ouvrir un signalement et utiliser Classinus pour l'examiner. La présence d'un signalement ne signifie pas qu'une correction a été décidée ou appliquée automatiquement.",
      },
    ],
  },
  {
    titre: "Éditeur et configuration",
    questions: [
      {
        question: "Quels langages peut-on exécuter dans l'éditeur de code ?",
        reponse:
          "Tu peux écrire du code dans plusieurs langages, mais l'exécution intégrée est actuellement prévue pour Python. L'éditeur permet aussi d'ouvrir et d'enregistrer des fichiers dans ta bibliothèque personnelle.",
      },
      {
        question: "Que peut faire le canal en direct dans l'éditeur ?",
        reponse:
          "Lorsque le canal en direct est activé, Classinus peut recevoir le contexte du code affiché et proposer des modifications dans l'éditeur. Vérifie les changements avant de les conserver.",
      },
      {
        question: "Que peut-on configurer dans Classinus ?",
        reponse:
          "La configuration permet de créer et modifier des procédures, des règles, des comportements et des styles. Ces éléments servent à guider la manière dont Classinus répond dans les situations prévues ; ils peuvent être activés, désactivés ou partagés selon les options disponibles.",
      },
    ],
  },
];
