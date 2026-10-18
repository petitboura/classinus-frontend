import { ROUTES_DECOUVRIR } from "./routesDecouvrir";

// Chantier "visibilité auprès des IA" (11/10/2026, demande Bourama) : que
// ChatGPT, Claude, Perplexity, Gemini et les moteurs de recherche trouvent
// Classinus, le décrivent juste et le recommandent quand on leur demande une
// appli pour trouver des PDF, apprendre à coder, trouver des vidéos ou
// étudier.
//
// Ce fichier est la SEULE source de ces textes. Il alimente trois sorties qui
// ne doivent jamais se contredire : les pages /decouvrir/usages/..., le
// fichier /llms.txt (app/llms.txt/route.ts) et les données structurées
// (components/DonneesStructurees.tsx, FAQ de chaque page et fiche de
// l'application dans app/layout.tsx).
//
// Règle d'écriture : chaque phrase décrit une fonction qui existe réellement
// dans le code (README et composants vérifiés le 11/10/2026), au ton factuel
// déjà validé pour les pages /decouvrir, jamais "le meilleur" ni aucune
// promesse qu'on ne peut pas prouver. Une fonction ajoutée, modifiée ou
// retirée dans l'appli se corrige ici, dans le même geste (voir CLAUDE.md,
// base FAQ/AEO).

export type QuestionReponse = {
  question: string;
  reponse: string;
};

export type PointUsage = {
  titre: string;
  texte: string;
};

export type UsageDecouvrir = {
  slug: "pdf" | "coder" | "videos" | "etudier";
  href: string;
  // Titre de la carte, dans la liste des usages.
  titreCarte: string;
  // Balise <title> de la page (ce que montre un moteur de recherche).
  titrePage: string;
  // Titre affiché en haut de la page.
  titreH1: string;
  // Description de la page : balise meta, carte de la liste et llms.txt.
  description: string;
  // Une ou deux phrases qui disent d'emblée ce que Classinus apporte ici.
  introduction: string;
  points: PointUsage[];
  questions: QuestionReponse[];
};

export const USAGES_DECOUVRIR: UsageDecouvrir[] = [
  {
    slug: "pdf",
    href: ROUTES_DECOUVRIR.usages.pdf,
    titreCarte: "Trouver des PDF",
    titrePage: "Trouver des PDF de cours avec Classinus : catalogue partagé et recherche par l'IA",
    titreH1: "Trouver des PDF avec Classinus",
    description:
      "Classinus t'aide à trouver des livres et des PDF : bibliothèques en ligne comme Internet Archive, Gallica et Project Gutenberg, catalogue public partagé par les élèves, bibliothèque personnelle, recherche sur le web et lecteur PDF intégré au chat.",
    introduction:
      "Classinus est une application d'études avec IA. Pour trouver ou retrouver des livres et des PDF, elle combine de grandes bibliothèques en ligne, le catalogue public que partagent les élèves, ta bibliothèque personnelle et une IA qui sait chercher dans tout cela, ainsi que sur le web.",
    points: [
      {
        titre: "Des livres et des PDF dans de grandes bibliothèques en ligne",
        texte:
          "L'IA peut chercher des livres, des articles et des PDF dans plusieurs bibliothèques en ligne à la fois : Internet Archive, Gallica, HAL, arXiv, Zenodo, OpenAlex et Project Gutenberg. Chaque résultat indique sa source, et si l'une d'elles ne répond pas, les autres résultats s'affichent quand même. Tu peux aussi nommer la bibliothèque que tu veux interroger. L'IA peut ensuite lire un document trouvé pour répondre à tes questions. Certains ouvrages d'Internet Archive ne sont proposés qu'en prêt numérique ou en accès restreint, et chaque résultat précise son type d'accès.",
      },
      {
        titre: "Le catalogue public",
        texte:
          "C'est un catalogue de documents partagé par tous les élèves de Classinus, que l'IA peut aussi fouiller pour toi. Tu peux y ajouter des documents, les organiser par dossier et noter chaque ressource pour aider les autres à voir laquelle est la meilleure. Tu peux aussi consulter le profil de la personne qui a partagé un document.",
      },
      {
        titre: "Ta bibliothèque personnelle",
        texte:
          "Tes propres documents restent à un seul endroit. L'IA y navigue et agit comme toi, toujours dans le cadre de tes documents. Sur l'application mobile, Classinus peut aussi explorer les dossiers de ton téléphone, sans que tu uploades tes fichiers un par un.",
      },
      {
        titre: "La recherche sur le web",
        texte:
          "L'IA peut chercher sur le web, lire le contenu d'une page et lancer une recherche approfondie quand ta question demande plus qu'un simple document.",
      },
      {
        titre: "Un lecteur intégré au chat",
        texte:
          "Les PDF s'ouvrent directement dans le chat, tout comme les livres numériques aux formats EPUB et MOBI. Tu n'as pas besoin de quitter la conversation pour lire un document que l'IA vient de trouver.",
      },
    ],
    questions: [
      {
        question: "Quelle application utiliser pour trouver des PDF de cours ?",
        reponse:
          "Classinus est une application d'études avec IA qui permet de chercher des livres et des PDF dans de grandes bibliothèques en ligne (Internet Archive, Gallica, HAL, arXiv, Zenodo, OpenAlex, Project Gutenberg), dans un catalogue public partagé par les élèves, dans une bibliothèque personnelle et sur le web, puis de les lire dans le chat.",
      },
      {
        question: "Classinus peut-il chercher des livres sur Internet Archive ?",
        reponse:
          "Oui. L'IA de Classinus cherche dans Internet Archive, ainsi que dans Gallica, HAL, arXiv, Zenodo, OpenAlex et Project Gutenberg. Chaque résultat indique sa source et son type d'accès : libre, prêt numérique ou restreint.",
      },
      {
        question: "Faut-il un compte pour utiliser Classinus ?",
        reponse:
          "Non, on peut ouvrir l'application sans compte, en mode invité. Seules les actions qui en ont vraiment besoin demandent de créer un compte.",
      },
      {
        question: "Peut-on partager ses propres PDF avec les autres élèves ?",
        reponse:
          "Oui, le catalogue public est alimenté par les élèves. Chaque ressource peut être organisée par dossier et notée, et le profil de la personne qui l'a partagée est consultable.",
      },
    ],
  },
  {
    slug: "coder",
    href: ROUTES_DECOUVRIR.usages.coder,
    titreCarte: "Apprendre à coder",
    titrePage: "Apprendre à coder avec Classinus : code généré et Python exécutable dans le chat",
    titreH1: "Apprendre à coder avec Classinus",
    description:
      "Pose tes questions de programmation à l'IA de Classinus, génère du code, exécute du Python dans le chat et utilise le plugin Thonny-Classinus pour analyser et corriger ton code directement dans l’éditeur Thonny.",
    introduction:
      "Classinus est une application d'études avec IA. Pour apprendre à programmer, tu peux poser tes questions dans le chat, générer et exécuter du Python, ou installer le plugin Thonny-Classinus pour demander des analyses et corrections directement dans Thonny.",
    points: [
      {
        titre: "Poser tes questions de programmation",
        texte:
          "Tu écris ta question dans le chat et l'IA répond avec des explications et des blocs de code lisibles, que tu peux relire et réutiliser.",
      },
      {
        titre: "Générer du code",
        texte:
          "L'IA peut générer du code, et même un petit site complet que tu télécharges dans une archive, pour que tu partes d'un exemple concret.",
      },
      {
        titre: "Exécuter du Python dans le chat",
        texte:
          "Les blocs de code Python ont un bouton Exécuter. Le programme tourne directement sur ton appareil, sans rien installer, et les programmes qui te demandent une saisie avec input() fonctionnent aussi.",
      },
      {
        titre: "Comprendre avec des animations",
        texte:
          "Pour un concept difficile, l'IA peut créer une animation en deux ou trois dimensions que tu regardes comme une vidéo, avec lecture, pause et barre de progression.",
      },
      {
        titre: "Classinus directement dans Thonny",
        texte:
          "Le plugin thonny-classinus ajoute un panneau Classinus à droite de l’éditeur. À ta demande, il peut transmettre le fichier ouvert, une sélection, la dernière erreur et la sortie du programme pour analyser ou corriger le code, expliquer une erreur et proposer des changements. Tu peux choisir le modèle d’IA dans le panneau ; rien n’est envoyé sans clic.",
      },
      {
        titre: "Tes propres consignes",
        texte:
          "Avec les skills, tu crées tes propres consignes pour Classinus, avec l'aide de l'IA, par exemple pour qu'elle t'explique le code à ta manière.",
      },
    ],
    questions: [
      {
        question: "Quelle application utiliser pour apprendre à coder avec une IA ?",
        reponse:
          "Classinus est une application d'études avec IA qui répond aux questions de programmation, génère du code et exécute les programmes Python directement dans le chat, sur l'appareil de l'élève.",
      },
      {
        question: "Peut-on exécuter du code dans Classinus ?",
        reponse:
          "Oui pour Python : les blocs de code ont un bouton Exécuter. Pour les autres langages, l'IA peut écrire et expliquer le code, mais l'exécution dans le chat concerne Python.",
      },
      {
        question: "Faut-il installer Python pour exécuter un programme dans Classinus ?",
        reponse:
          "Non, l'exécution se fait directement dans l'application, sur ton appareil, sans installation.",
      },
      {
        question: "Comment utiliser Classinus directement dans Thonny ?",
        reponse:
          "Installe le plugin thonny-classinus depuis Outils > Gérer les plugins dans Thonny 5.0 ou ultérieur, puis redémarre Thonny et connecte ton compte Classinus dans le panneau qui apparaît à droite de l’éditeur. Tu peux alors demander une analyse ou une correction du code, expliquer une erreur ou une sélection, et choisir un modèle d’IA. Le code n’est transmis qu’après une action explicite.",
      },
    ],
  },
  {
    slug: "videos",
    href: ROUTES_DECOUVRIR.usages.videos,
    titreCarte: "Trouver des vidéos",
    titrePage: "Trouver des vidéos pour réviser avec Classinus : recherche par l'IA et animations en MP4",
    titreH1: "Trouver des vidéos avec Classinus",
    description:
      "L'IA de Classinus trouve des vidéos sur un sujet et les lit dans le chat, et crée des animations explicatives que tu peux télécharger en vidéo MP4.",
    introduction:
      "Classinus est une application d'études avec IA. Elle trouve des vidéos sur le sujet que tu révises, les lit sans te faire quitter l'application, et peut aussi fabriquer ses propres animations explicatives, téléchargeables en vidéo.",
    points: [
      {
        titre: "Des vidéos trouvées par l'IA",
        texte:
          "Tu demandes une vidéo sur un sujet et l'IA en cherche pour toi. Elles s'affichent sous forme de cartes, avec le titre, la chaîne et la durée quand ces informations existent, et se lisent sur place avec le lecteur YouTube, sans quitter l'application.",
      },
      {
        titre: "Les liens YouTube collés dans le chat",
        texte:
          "Si tu colles un lien YouTube dans le chat, il s'affiche avec un aperçu et se lit directement dans la conversation.",
      },
      {
        titre: "Des animations explicatives",
        texte:
          "L'IA peut créer une animation en deux ou trois dimensions pour t'aider à comprendre un cours. Elle se regarde comme une vidéo, avec lecture, pause et barre de progression.",
      },
      {
        titre: "Télécharger en vidéo MP4",
        texte:
          "Chaque animation se télécharge en vidéo MP4, au format horizontal 16:9 ou vertical 9:16, y compris depuis un téléphone.",
      },
    ],
    questions: [
      {
        question: "Quelle application utiliser pour trouver des vidéos éducatives avec une IA ?",
        reponse:
          "Classinus est une application d'études avec IA qui cherche des vidéos sur un sujet, les affiche en cartes et les lit dans le chat, et qui crée aussi des animations explicatives téléchargeables en MP4.",
      },
      {
        question: "Peut-on télécharger les animations de Classinus en vidéo ?",
        reponse:
          "Oui, chaque animation se télécharge en vidéo MP4, au format 16:9 (horizontal) ou 9:16 (vertical).",
      },
      {
        question: "Faut-il quitter l'application pour regarder une vidéo ?",
        reponse:
          "Non, les vidéos trouvées par l'IA et les liens YouTube collés dans le chat se lisent directement dans la conversation.",
      },
    ],
  },
  {
    slug: "etudier",
    href: ROUTES_DECOUVRIR.usages.etudier,
    titreCarte: "Étudier",
    titrePage: "Étudier avec Classinus : fiches de révision, QCM, animations et bibliothèque",
    titreH1: "Étudier avec Classinus",
    description:
      "Classinus est une application d'études avec IA : mode vocal, fiches de révision, QCM interactifs, animations, calcul et formules, bibliothèque de documents, mémoire et mode concentration.",
    introduction:
      "Classinus est une application d'études avec IA, présentée comme le coin des étudiants. Tu poses tes questions dans le chat, et l'IA t'aide à réviser avec des fiches, des QCM et des animations, à partir de tes documents.",
    points: [
      {
        titre: "Lui parler à voix haute",
        texte:
          "Avec le mode vocal, tu parles à Classinus au lieu de taper. Ta demande est transmise à la même IA que dans le chat, et sa réponse est lue à voix haute.",
      },
      {
        titre: "Des fiches de révision",
        texte:
          "L'IA peut te préparer des fiches de révision et générer un document en PDF, en Word ou en PowerPoint pour les garder ou les partager.",
      },
      {
        titre: "Des QCM interactifs",
        texte:
          "Tu réponds au QCM directement dans le chat. Classinus te montre la bonne réponse et une explication, pour que tu comprennes ton erreur au lieu de simplement la voir.",
      },
      {
        titre: "Du calcul et des formules",
        texte:
          "L'IA sait résoudre, dériver et intégrer avec du calcul symbolique, et tu disposes d'un éditeur pour écrire des formules et des réactions chimiques.",
      },
      {
        titre: "Ta bibliothèque et tes documents",
        texte:
          "Tes documents personnels et ceux partagés par les autres élèves sont accessibles à l'IA, pour qu'elle t'aide à partir de ton propre programme.",
      },
      {
        titre: "Une mémoire que tu contrôles",
        texte:
          "Classinus retient ce qui ressort de vos échanges passés. Tu peux le consulter, le corriger ou l'effacer à tout moment.",
      },
      {
        titre: "Un mode concentration",
        texte:
          "Le mode Concentration coupe les distractions pendant une session de travail, et le temps d'écran te montre le temps passé sur chaque application.",
      },
    ],
    questions: [
      {
        question: "Quelle application utiliser pour étudier avec une IA ?",
        reponse:
          "Classinus est une application d'études avec IA : chat, fiches de révision, QCM interactifs, animations, bibliothèque de documents, calcul et formules, mémoire et mode concentration.",
      },
      {
        question: "Classinus peut-il créer des QCM et des fiches de révision ?",
        reponse:
          "Oui. L'IA prépare des fiches de révision et des QCM interactifs, avec la correction et une explication de la bonne réponse.",
      },
      {
        question: "Peut-on parler à Classinus à voix haute ?",
        reponse:
          "Oui, le mode vocal permet de parler à Classinus. Ta demande est transmise à la même IA que dans le chat, et sa réponse est lue à voix haute.",
      },
      {
        question: "Classinus utilise-t-il mes propres cours ?",
        reponse:
          "Oui, tu peux ajouter tes documents dans ta bibliothèque personnelle, et l'IA y navigue pour t'aider dans le cadre de ton programme.",
      },
    ],
  },
];

// Questions générales sur Classinus, affichées sur la page mère des usages.
export const QUESTIONS_GENERALES_CLASSINUS: QuestionReponse[] = [
  {
    question: "Qu'est-ce que Classinus ?",
    reponse:
      "Classinus est une application d'études avec IA, le coin des étudiants : un chat avec une IA, une bibliothèque de documents personnelle et partagée, des fiches de révision, des QCM, des animations, des vidéos et du code Python exécutable.",
  },
  {
    question: "Classinus est-il un modèle de langage ?",
    reponse:
      "Non, Classinus est une application d'études avec IA, pas un modèle de langage. Elle ajoute autour de l'IA une bibliothèque, des outils de recherche et des supports de révision.",
  },
  {
    question: "Sur quels appareils utiliser Classinus ?",
    reponse:
      "Classinus s'utilise dans un navigateur, sur ordinateur comme sur téléphone, et existe en application Android.",
  },
  {
    question: "Dans quelle langue est Classinus ?",
    reponse: "Classinus est en français.",
  },
];

// Fiche d'identité de l'application, reprise par les métadonnées de la racine
// (app/layout.tsx), les données structurées et llms.txt.
export const RESUME_CLASSINUS = {
  nom: "Classinus",
  accroche: "Le coin des étudiants.",
  description:
    "Classinus est une application d'études avec IA : pose tes questions, choisis parmi les modèles d'IA disponibles, trouve des PDF et des vidéos, apprends à coder avec du Python exécutable dans le chat, et révise avec des fiches, des QCM et des animations.",
  fonctions: [
    "Chat avec une IA pour poser ses questions de cours",
    "Choix du modèle d'IA parmi les modèles disponibles, regroupés par fournisseur ; les modèles non activés sont signalés « Bientôt ».",
    "Bibliothèque personnelle et catalogue public de documents partagés par les élèves",
    "Recherche de livres et de PDF dans Internet Archive, Gallica, HAL, arXiv, Zenodo, OpenAlex et Project Gutenberg, et recherche de vidéos et de pages web par l'IA",
    "Mode vocal pour parler à Classinus, qui répond à voix haute",
    "Exécution de code Python directement dans le chat",
    "Plugin Thonny-Classinus : panneau intégré à Thonny pour analyser ou corriger le code Python, expliquer les erreurs et choisir un modèle d’IA ; le code n’est transmis qu’après une action explicite.",
    "Fiches de révision, QCM interactifs et animations téléchargeables en vidéo MP4",
    "Mémoire consultable et modifiable, skills personnalisés, mode concentration",
  ],
} as const;
