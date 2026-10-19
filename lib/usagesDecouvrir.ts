import { ROUTES_DECOUVRIR } from "./routesDecouvrir";

export type QuestionReponse = {
  question: string;
  reponse: string;
};

export type PointUsage = {
  titre: string;
  texte: string;
  /** Lien facultatif affiché sous le texte (vers une page /decouvrir qui détaille le point). */
  lien?: { href: string; libelle: string };
};

export type UsageDecouvrir = {
  slug: "pdf" | "coder" | "videos" | "etudier";
  href: string;
  titreCarte: string;
  resumeCarte: string;
  titrePage: string;
  titreH1: string;
  description: string;
  introduction: string;
  points: PointUsage[];
  questions: QuestionReponse[];
};

export const USAGES_DECOUVRIR: UsageDecouvrir[] = [
  {
    slug: "pdf",
    href: ROUTES_DECOUVRIR.usages.pdf,
    titreCarte: "Trouver des PDF et des livres",
    resumeCarte: "Explore plusieurs bibliothèques en ligne, le catalogue partagé et tes propres documents.",
    titrePage: "Trouver des PDF et des livres avec Classinus",
    titreH1: "Trouver des PDF et des livres avec Classinus",
    description:
      "Recherche des livres, des articles et des PDF avec Classinus : bibliothèques en ligne, catalogue partagé par les élèves, documents personnels et recherche sur le web.",
    introduction:
      "Tu cherches un cours, un livre ou un document pour approfondir une notion ? Classinus peut lancer des recherches dans plusieurs bibliothèques en ligne, consulter le catalogue partagé par les élèves et t'aider à retrouver tes propres fichiers. Tu peux ensuite lire certains documents directement dans le chat et poser des questions à leur sujet.",
    points: [
      {
        titre: "Interroger plusieurs bibliothèques en ligne",
        texte:
          "À la demande, l'IA peut rechercher des livres, des articles et des PDF dans Internet Archive, Gallica, HAL, arXiv, Zenodo, OpenAlex et Project Gutenberg. Les résultats indiquent leur source. Les conditions d'accès varient selon le document : certains sont libres, d'autres sont soumis à un prêt numérique ou à des restrictions.",
      },
      {
        titre: "Parcourir le catalogue partagé",
        texte:
          "La bibliothèque publique rassemble des ressources ajoutées par les élèves de Classinus. Tu peux rechercher un document, consulter les informations de la ressource, découvrir le profil de la personne qui l'a partagée et noter les contenus. Si tu ajoutes toi-même un fichier, assure-toi d'avoir le droit de le partager.",
      },
      {
        titre: "Retrouver tes documents personnels",
        texte:
          "Ta bibliothèque personnelle te permet de ranger tes fichiers par dossier. Tu peux demander à Classinus de s'appuyer sur ces documents pour travailler sur le contenu que tu étudies. Dans l'application mobile, tu peux aussi désigner des dossiers de ton téléphone, selon les autorisations accordées.",
      },
      {
        titre: "Compléter la recherche sur le web",
        texte:
          "Pour une question qui ne se limite pas à un fichier, Classinus peut rechercher des pages web et en lire le contenu. La recherche approfondie peut aider à croiser plusieurs sources ; vérifie toujours les documents et les références avant de les citer dans un travail.",
      },
      {
        titre: "Lire les documents dans la conversation",
        texte:
          "Les PDF et certains livres numériques, notamment aux formats EPUB et MOBI, peuvent s'ouvrir dans le lecteur intégré au chat. Tu peux ainsi passer de la recherche à la lecture sans quitter la conversation.",
      },
    ],
    questions: [
      {
        question: "Comment trouver des PDF de cours avec Classinus ?",
        reponse:
          "Demande à Classinus de rechercher un sujet ou un titre. Selon ta demande, il peut chercher dans plusieurs bibliothèques en ligne, dans le catalogue public partagé par les élèves, dans ta bibliothèque personnelle ou sur le web. Vérifie les conditions d'accès de chaque document.",
      },
      {
        question: "Quelles bibliothèques en ligne Classinus peut-il interroger ?",
        reponse:
          "La recherche peut couvrir Internet Archive, Gallica, HAL, arXiv, Zenodo, OpenAlex et Project Gutenberg. Les sources disponibles et les conditions d'accès dépendent du document recherché.",
      },
      {
        question: "Puis-je partager un PDF avec les autres élèves ?",
        reponse:
          "Oui. Tu peux ajouter une ressource au catalogue public si tu disposes des droits nécessaires pour la partager. Les autres élèves peuvent la retrouver, consulter ses informations et la noter.",
      },
      {
        question: "Les documents trouvés sont-ils tous gratuits ?",
        reponse:
          "Non. Les conditions varient selon la source et le document : certains sont librement accessibles, d'autres nécessitent un prêt numérique ou sont soumis à des restrictions. Consulte les informations d'accès indiquées pour chaque résultat.",
      },
    ],
  },
  {
    slug: "coder",
    href: ROUTES_DECOUVRIR.usages.coder,
    titreCarte: "Apprendre à coder",
    resumeCarte: "Pose des questions, comprends des exemples, exécute du Python et utilise le plugin Thonny-Classinus.",
    titrePage: "Apprendre à programmer avec Classinus",
    titreH1: "Apprendre à coder avec Classinus",
    description:
      "Apprends la programmation avec Classinus : explications et exemples de code, exécution de Python dans le chat et plugin Thonny-Classinus pour analyser ton programme dans l'éditeur.",
    introduction:
      "Pour apprendre à programmer, il ne suffit pas de récupérer du code : il faut comprendre ce qu'il fait et savoir repérer les erreurs. Avec Classinus, tu peux poser une question, demander un exemple commenté, exécuter du Python dans le chat ou utiliser le plugin Thonny-Classinus pour obtenir de l'aide directement dans ton éditeur.",
    points: [
      {
        titre: "Comprendre un concept ou une erreur",
        texte:
          "Décris ce que tu essaies de faire, partage un extrait de code ou copie un message d'erreur. Demande une explication étape par étape, puis vérifie que tu peux expliquer toi-même le rôle de chaque instruction.",
      },
      {
        titre: "Créer un exemple pour partir de quelque chose de concret",
        texte:
          "Classinus peut proposer des blocs de code et générer certains petits projets, notamment des sites que tu peux télécharger sous forme d'archive. Relis le résultat, adapte-le à ton objectif et teste-le avant de le réutiliser.",
      },
      {
        titre: "Exécuter du Python dans le chat",
        texte:
          "Les blocs Python pris en charge proposent une action Exécuter. Le programme s'exécute sur ton appareil dans l'environnement prévu par Classinus, sans te demander d'installer Python séparément. Cette exécution intégrée concerne Python, pas tous les langages que l'IA peut expliquer.",
      },
      {
        titre: "Travailler directement dans Thonny",
        texte:
          "Le plugin thonny-classinus ajoute un panneau Classinus à droite de l'éditeur Thonny. Tu peux demander une analyse, une correction ou une explication d'erreur, et choisir parmi les modèles d'IA disponibles dans le panneau. Le code et les informations d'exécution ne sont transmis que lorsque tu déclenches une action qui les envoie.",
        lien: { href: ROUTES_DECOUVRIR.thonny, libelle: "Voir le guide Thonny-Classinus" },
      },
      {
        titre: "Adapter les explications à ta manière d'apprendre",
        texte:
          "Les skills te permettent de définir des consignes personnelles, par exemple demander des explications progressives, des indices avant la solution ou des exemples commentés. Utilise-les pour guider les réponses, sans remplacer la vérification et les essais par toi-même.",
      },
    ],
    questions: [
      {
        question: "Comment apprendre à coder avec une IA dans Classinus ?",
        reponse:
          "Pose une question précise, partage ton code ou décris le résultat attendu. Classinus peut expliquer un concept, proposer un exemple et t'aider à comprendre une erreur. Pour progresser, teste les exemples et demande une explication des étapes plutôt que de copier une solution sans la comprendre.",
      },
      {
        question: "Puis-je exécuter du code directement dans Classinus ?",
        reponse:
          "Oui, l'exécution intégrée dans le chat prend en charge Python. Classinus peut aussi expliquer ou générer du code dans d'autres langages, mais cela ne signifie pas que ces langages peuvent être exécutés dans le chat.",
      },
      {
        question: "Dois-je installer Python pour lancer les exemples du chat ?",
        reponse:
          "L'exécution Python intégrée à Classinus est prévue pour fonctionner sur ton appareil sans installation séparée de Python. Pour exécuter un projet dans un autre environnement, les prérequis de cet environnement peuvent toutefois s'appliquer.",
      },
      {
        question: "Comment utiliser Classinus dans Thonny ?",
        reponse:
          "Dans Thonny 5.0 ou une version ultérieure, ouvre Outils puis Gérer les plugins, recherche thonny-classinus, installe-le et redémarre Thonny. Connecte ensuite ton compte Classinus dans le panneau ajouté à l'éditeur. Un guide pas à pas avec captures d'écran est disponible dans l'application. Les actions d'analyse et de correction n'envoient le code que lorsque tu les déclenches.",
      },
    ],
  },
  {
    slug: "videos",
    href: ROUTES_DECOUVRIR.usages.videos,
    titreCarte: "Trouver des vidéos",
    resumeCarte: "Recherche des vidéos sur un sujet et crée des animations explicatives à télécharger en MP4.",
    titrePage: "Trouver des vidéos éducatives avec Classinus",
    titreH1: "Trouver des vidéos pour apprendre avec Classinus",
    description:
      "Trouve des vidéos éducatives avec Classinus et regarde-les dans le chat. L'IA peut aussi créer des animations explicatives téléchargeables en vidéo MP4.",
    introduction:
      "Une vidéo peut rendre un mécanisme ou une notion plus facile à visualiser. Avec Classinus, demande des vidéos sur le sujet que tu étudies, lis les résultats dans la conversation ou colle un lien YouTube. Pour certains concepts, tu peux aussi demander une animation explicative et la télécharger en MP4.",
    points: [
      {
        titre: "Rechercher des vidéos sur un thème précis",
        texte:
          "Décris le sujet et le niveau qui t'intéressent. Classinus peut rechercher des vidéos et afficher des cartes avec les informations disponibles, comme le titre, la chaîne ou la durée. Les résultats dépendent de la recherche et des contenus accessibles.",
      },
      {
        titre: "Lire une vidéo sans quitter le chat",
        texte:
          "Les vidéos prises en charge s'ouvrent dans le lecteur intégré à la conversation. Tu peux également coller un lien YouTube dans le chat pour afficher son aperçu et le lire sur place.",
      },
      {
        titre: "Faire expliquer une notion par une animation",
        texte:
          "Demande une animation lorsque tu veux visualiser un phénomène, une transformation ou une idée abstraite. Les animations proposées disposent de commandes de lecture, de pause et de progression pour avancer à ton rythme.",
      },
      {
        titre: "Télécharger l'animation en MP4",
        texte:
          "Les animations prises en charge peuvent être téléchargées en vidéo MP4, au format horizontal 16:9 ou vertical 9:16. Choisis le format en fonction de l'écran sur lequel tu souhaites revoir la vidéo.",
      },
    ],
    questions: [
      {
        question: "Comment trouver une vidéo éducative avec Classinus ?",
        reponse:
          "Demande une vidéo sur un thème précis dans le chat. Classinus peut rechercher des vidéos, présenter les résultats et lire les contenus pris en charge directement dans la conversation. Les résultats dépendent de la recherche et des sources accessibles.",
      },
      {
        question: "Puis-je regarder une vidéo YouTube dans Classinus ?",
        reponse:
          "Les liens YouTube pris en charge peuvent afficher un aperçu et être lus dans le chat. Tu peux ainsi consulter la vidéo sans devoir ouvrir une nouvelle conversation ou quitter la page.",
      },
      {
        question: "Puis-je télécharger les animations créées par Classinus ?",
        reponse:
          "Oui. Les animations prises en charge peuvent être téléchargées au format vidéo MP4, en horizontal 16:9 ou en vertical 9:16.",
      },
    ],
  },
  {
    slug: "etudier",
    href: ROUTES_DECOUVRIR.usages.etudier,
    titreCarte: "Réviser et étudier",
    resumeCarte: "Transforme tes cours en fiches, QCM et animations, avec des outils pour lire, calculer et organiser ton travail.",
    titrePage: "Réviser et étudier avec Classinus : fiches, QCM et documents",
    titreH1: "Réviser et étudier avec Classinus",
    description:
      "Utilise Classinus pour étudier avec une IA : fiches de révision, QCM interactifs, animations, calcul symbolique, lecture de documents, mode vocal et outils de concentration.",
    introduction:
      "Classinus rassemble des outils pour travailler un cours de plusieurs façons : poser une question, consulter tes documents, créer une fiche de révision, t'entraîner avec un QCM ou visualiser une notion avec une animation. Tu peux choisir l'outil qui correspond à ton objectif, puis vérifier les réponses et retravailler les points que tu n'as pas encore compris.",
    points: [
      {
        titre: "Passer d'une question à une explication",
        texte:
          "Utilise le chat pour demander une définition, comparer deux notions ou détailler un raisonnement. Si la première réponse reste trop générale, précise ton niveau, le chapitre concerné et l'étape qui te pose problème.",
      },
      {
        titre: "Préparer des fiches de révision",
        texte:
          "Demande une fiche structurée à partir d'un sujet ou de documents. Classinus peut produire des documents de révision dans des formats tels que PDF, Word ou PowerPoint, selon le résultat demandé et les fonctions disponibles.",
      },
      {
        titre: "T'entraîner avec des QCM interactifs",
        texte:
          "Réponds aux questions dans le chat, puis consulte la correction et son explication. Utilise les erreurs comme point de départ pour demander un nouvel exemple ou revoir la notion concernée.",
      },
      {
        titre: "Visualiser une notion avec une animation",
        texte:
          "Pour les mécanismes difficiles à imaginer à partir d'un texte, demande une animation explicative. Les animations prises en charge peuvent être lues dans le chat et téléchargées en vidéo MP4.",
      },
      {
        titre: "Travailler avec tes documents",
        texte:
          "Ajoute tes cours à ta bibliothèque personnelle ou explore le catalogue partagé par les élèves. Tu peux demander à Classinus de s'appuyer sur ces ressources pour expliquer une notion ou retrouver un passage pertinent.",
      },
      {
        titre: "Utiliser la voix et les outils de calcul",
        texte:
          "Le mode vocal permet de parler à Classinus et d'écouter sa réponse. Pour les exercices adaptés, l'IA peut aussi aider avec le calcul symbolique ; un éditeur est disponible pour écrire des formules et des réactions chimiques.",
      },
      {
        titre: "Organiser ton temps de travail",
        texte:
          "Le contrôle de session peut activer Ne pas déranger pendant une durée choisie. Sur Android, l'outil Temps d'écran permet de consulter le temps passé dans les applications. Ces fonctions complètent ton organisation ; elles ne remplacent pas une méthode de travail adaptée.",
      },
    ],
    questions: [
      {
        question: "Comment réviser avec Classinus ?",
        reponse:
          "Commence par poser une question sur ton cours ou ajoute un document à ta bibliothèque. Tu peux ensuite demander une explication, une fiche de révision, un QCM interactif ou une animation. Pour vérifier tes acquis, essaie de répondre avant de consulter la correction.",
      },
      {
        question: "Classinus peut-il créer des fiches de révision et des QCM ?",
        reponse:
          "Oui. Classinus peut préparer des fiches de révision et des QCM interactifs avec correction et explication. Relis les contenus produits et compare-les à ton cours, en particulier pour les notions ou formules qui doivent être exactes.",
      },
      {
        question: "Puis-je parler à Classinus au lieu de taper ?",
        reponse:
          "Oui. Le mode vocal permet de dicter une demande et d'écouter la réponse. La disponibilité de la voix peut dépendre de l'appareil et de sa configuration.",
      },
      {
        question: "Classinus peut-il utiliser mes propres cours ?",
        reponse:
          "Oui. Tu peux ajouter tes documents à ta bibliothèque personnelle et demander à Classinus de s'appuyer dessus. Tu peux aussi consulter le catalogue public partagé par les élèves pour trouver d'autres ressources.",
      },
    ],
  },
];

export const QUESTIONS_GENERALES_CLASSINUS: QuestionReponse[] = [
  {
    question: "Qu'est-ce que Classinus ?",
    reponse:
      "Classinus est une application d'étude avec IA. Elle réunit un chat, une bibliothèque de documents personnels et partagés, des outils de recherche, des supports de révision, des fonctions de programmation et des outils pour organiser le travail.",
  },
  {
    question: "Classinus est-il un modèle d'intelligence artificielle ?",
    reponse:
      "Non. Classinus est une application qui donne accès à des modèles d'IA et les accompagne d'outils d'étude, de recherche, de documents et de révision. Le modèle utilisé dépend des options rendues disponibles dans l'application.",
  },
  {
    question: "Sur quels appareils puis-je utiliser Classinus ?",
    reponse:
      "Classinus est accessible dans un navigateur sur ordinateur et téléphone, et une application Android est également disponible. Certaines fonctions, comme le suivi du temps d'écran, sont limitées à Android.",
  },
  {
    question: "Classinus est-il uniquement destiné aux étudiants ?",
    reponse:
      "Classinus propose des outils pour apprendre et réviser, mais comprend aussi un Bureau avec des fonctions de partage et de gestion de classe, dont certaines sont réservées aux enseignants.",
  },
  {
    question: "Par où commencer dans Classinus ?",
    reponse:
      "Commence dans le chat : pose une question sur ton cours, demande une explication ou indique le document sur lequel tu veux travailler. Les raccourcis donnent accès aux autres outils.",
  },
  {
    question: "Que retrouve-t-on dans l'activité récente ?",
    reponse:
      "L'accueil peut afficher les conversations récentes et les fichiers récemment ajoutés à ta bibliothèque personnelle, afin que tu puisses reprendre rapidement un travail en cours.",
  },
  {
    question: "Comment rouvrir une conversation précédente ?",
    reponse:
      "Ouvre une conversation dans l'historique ou sélectionne-la dans l'activité récente pour revenir à son fil et poursuivre l'échange.",
  },
  {
    question: "Puis-je retrouver mes conversations précédentes ?",
    reponse:
      "Oui. Ouvre l'historique ou une conversation récente pour reprendre le fil et continuer ton travail. L'accueil peut aussi afficher les fichiers récemment ajoutés à ta bibliothèque personnelle.",
  },
  {
    question: "Comment choisir un modèle d'IA ?",
    reponse:
      "Dans le chat, ouvre le menu du modèle affiché en haut de la conversation. Les modèles disponibles sont regroupés par fournisseur ; seuls ceux qui sont activés peuvent être sélectionnés.",
  },
  {
    question: "Pourquoi certains modèles portent-ils la mention « Bientôt » ?",
    reponse:
      "Cette mention indique qu'un modèle est présenté dans l'interface, mais qu'il n'est pas encore activé pour être utilisé. Il reste indisponible à la sélection.",
  },
  {
    question: "Puis-je faire analyser mon code Python dans Thonny ?",
    reponse:
      "Oui. Le plugin thonny-classinus ajoute un panneau Classinus à Thonny. Tu peux demander une analyse, une correction ou une explication d'erreur. Le code n'est transmis que lorsque tu déclenches une action qui l'envoie.",
  },
  {
    question: "Classinus crée-t-il des fiches, des QCM et des animations ?",
    reponse:
      "Tu peux demander des fiches de révision, des QCM interactifs avec correction expliquée ou des animations explicatives. Certaines animations peuvent être téléchargées en MP4, selon les outils disponibles.",
  },
  {
    question: "Où trouver les pages de présentation de Classinus ?",
    reponse:
      "Dans l'application, le bouton en forme de boussole, en haut à droite, à gauche de l'horloge des minuteurs, ouvre la page Découvrir Classinus. Il n'apparaît pas dans le chat plein écran. Chaque page de présentation propose des boutons pour revenir au chat ou ouvrir la section dont elle parle.",
  },
];

export const RESUME_CLASSINUS = {
  nom: "Classinus",
  accroche: "Un espace pour apprendre, créer et progresser.",
  description:
    "Classinus est une application d'étude avec IA : pose des questions, recherche des documents et des vidéos, révise avec des fiches, des QCM et des animations, exécute du Python dans le chat ou utilise le plugin Thonny-Classinus pour obtenir de l'aide dans l'éditeur.",
  fonctions: [
    "Chat avec une IA pour poser des questions et travailler des notions de cours",
    "Choix parmi les modèles d'IA disponibles, regroupés par fournisseur ; les modèles non activés sont signalés « Bientôt »",
    "Bibliothèque personnelle et catalogue public de documents partagés par les élèves",
    "Recherche de livres et de PDF dans Internet Archive, Gallica, HAL, arXiv, Zenodo, OpenAlex et Project Gutenberg, ainsi que recherche de vidéos et de pages web",
    "Mode vocal pour dicter une demande et écouter la réponse",
    "Exécution de code Python directement dans le chat",
    "Plugin Thonny-Classinus : panneau intégré à Thonny pour analyser ou corriger du code Python et expliquer les erreurs ; l'envoi du code nécessite une action explicite",
    "Fiches de révision, QCM interactifs et animations téléchargeables en vidéo MP4",
    "Mémoire consultable et gérable, skills personnalisés et outils de concentration",
  ],
} as const;
