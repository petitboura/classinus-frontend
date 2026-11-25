import { ROUTES_DECOUVRIR } from "./routesDecouvrir";
import type { UsageDecouvrir } from "./usagesDecouvrir";

// Usages qui font le cœur de Classinus (25/11/2026, demande Bourama) : agents,
// connecteurs et création de documents. Ils passent avant la recherche de
// documents, le développement, les vidéos et l'étude, pour que la présentation
// décrive d'abord une plateforme d'accès aux modèles d'IA et à leurs outils.
// Ce fichier est assemblé dans USAGES_DECOUVRIR (lib/usagesDecouvrir.ts), la
// même source que les pages /decouvrir, /llms.txt et le plan du site.
// Chaque affirmation reprend une fonction déjà décrite ailleurs dans les pages
// /decouvrir ou dans la fiche RESUME_CLASSINUS.
export const USAGES_PLATEFORME_DECOUVRIR: UsageDecouvrir[] = [
  {
    slug: "agents",
    href: ROUTES_DECOUVRIR.usages.agents,
    titreCarte: "Créer et personnaliser des agents",
    resumeCarte: "Donne à Classinus tes consignes, tes règles et ta mémoire pour qu'il travaille à ta façon.",
    titrePage: "Créer et personnaliser des agents IA avec Classinus",
    titreH1: "Créer et personnaliser des agents avec Classinus",
    description:
      "Personnalise le comportement de Classinus : consignes personnelles, règles et styles de configuration, mémoire et choix du modèle d'IA, pour adapter l'IA à tes tâches.",
    introduction:
      "Un assistant générique ne connaît ni ta façon de travailler ni tes habitudes. Avec Classinus, tu peux écrire tes consignes, définir des règles et des styles, gérer ce que l'assistant retient et choisir le modèle d'IA qui répond. Relis toujours les résultats avant de t'y appuyer.",
    points: [
      {
        titre: "Écrire tes propres consignes",
        texte:
          "Crée et ajuste des consignes personnelles pour orienter les réponses de Classinus selon tes besoins.",
        lien: { href: ROUTES_DECOUVRIR.personnaliser.mesSkills, libelle: "Voir le guide Mes skills" },
      },
      {
        titre: "Définir des règles et des styles",
        texte:
          "Dans la configuration, définis des procédures, des règles, des comportements et des styles pour guider les réponses de Classinus.",
        lien: { href: ROUTES_DECOUVRIR.personnaliser.configuration, libelle: "Voir le guide Configuration" },
      },
      {
        titre: "Garder la main sur la mémoire",
        texte:
          "Consulte les informations retenues par Classinus et choisis celles que tu souhaites conserver ou supprimer.",
        lien: { href: ROUTES_DECOUVRIR.personnaliser.memoire, libelle: "Voir le guide Ma mémoire" },
      },
      {
        titre: "Choisir le modèle d'IA",
        texte:
          "Dans le chat, ouvre le menu du modèle affiché en haut de la conversation. Les modèles disponibles sont regroupés par fournisseur ; seuls ceux qui sont activés peuvent être sélectionnés.",
      },
    ],
    questions: [
      {
        question: "Comment personnaliser Classinus ?",
        reponse:
          "Ouvre Personnaliser Classinus : tu peux écrire tes propres consignes, définir des règles et des styles dans la configuration et gérer les informations conservées dans la mémoire.",
      },
      {
        question: "Puis-je supprimer ce que Classinus retient ?",
        reponse:
          "Oui. La mémoire te permet de consulter les informations retenues et de choisir celles que tu souhaites conserver ou supprimer.",
      },
      {
        question: "Les consignes remplacent-elles la vérification des réponses ?",
        reponse:
          "Non. Les consignes orientent les réponses, mais une réponse d'IA peut contenir des erreurs. Vérifie les sources, le code et les résultats avant de t'y appuyer.",
      },
    ],
  },
  {
    slug: "connecteurs",
    href: ROUTES_DECOUVRIR.usages.connecteurs,
    titreCarte: "Connecter tes applications et tes outils",
    resumeCarte: "Relie Classinus à tes applications, à tes propres serveurs MCP ou à Claude, avec des autorisations que tu gères.",
    titrePage: "Connecter des applications et des serveurs MCP à Classinus",
    titreH1: "Connecter tes applications et tes outils à Classinus",
    description:
      "Relie Classinus à des applications et des services, ajoute tes propres serveurs MCP ou utilise Classinus depuis Claude, avec des autorisations gérées depuis ton compte.",
    introduction:
      "Une IA est plus utile quand elle peut travailler avec tes outils. Classinus propose des connecteurs vers des applications et des services, accepte tes propres serveurs MCP et peut aussi être utilisé depuis Claude. Tu gères les autorisations depuis ton compte.",
    points: [
      {
        titre: "Connecter les applications proposées",
        texte:
          "Connecte les applications et services proposés, comme GitHub, Notion, Railway ou Supabase, puis gère les autorisations depuis ton compte.",
        lien: {
          href: ROUTES_DECOUVRIR.personnaliser.applicationsConnectees,
          libelle: "Voir le guide Applications connectées",
        },
      },
      {
        titre: "Ajouter tes propres serveurs MCP",
        texte:
          "Si tu disposes d'un serveur MCP, tu peux l'ajouter pour que Classinus puisse travailler avec tes propres outils et services.",
      },
      {
        titre: "Utiliser Classinus depuis Claude",
        texte: "Le connecteur dédié permet d'utiliser Classinus depuis Claude.",
        lien: { href: "/connecter-claude", libelle: "Voir le guide de connexion" },
      },
      {
        titre: "Agir sur des services compatibles",
        texte:
          "Dans le chat, certains outils peuvent agir sur des services compatibles, comme GitHub, Notion ou Google Drive, après configuration et autorisation.",
      },
    ],
    questions: [
      {
        question: "Que peut-on connecter à Classinus ?",
        reponse:
          "Classinus propose des connecteurs vers des applications et des services, comme GitHub, Notion, Railway ou Supabase. Tu peux aussi ajouter tes propres serveurs MCP. La liste exacte des connecteurs disponibles est indiquée dans l'application.",
      },
      {
        question: "Qu'est-ce que MCP ?",
        reponse:
          "MCP est le sigle de Model Context Protocol, un protocole qui permet à une IA de se connecter à des outils et à des services. Dans Classinus, tu peux ajouter tes propres serveurs MCP depuis la page Applications connectées.",
      },
      {
        question: "Puis-je utiliser Classinus depuis Claude ?",
        reponse:
          "Oui. Un connecteur dédié permet d'utiliser Classinus depuis Claude. Le guide de connexion détaille les étapes.",
      },
    ],
  },
  {
    slug: "documents",
    href: ROUTES_DECOUVRIR.usages.documents,
    titreCarte: "Créer des documents et des fichiers",
    resumeCarte: "Génère et exporte des PDF, Word, Excel, PowerPoint, LaTeX, CSV et JSON.",
    titrePage: "Créer des documents et des fichiers avec Classinus",
    titreH1: "Créer des documents et des fichiers avec Classinus",
    description:
      "Crée et exporte des documents PDF, Word, Excel, PowerPoint, LaTeX, CSV et JSON avec Classinus, et range tes fichiers dans ta bibliothèque personnelle.",
    introduction:
      "Un rapport, un tableau, une présentation ou un fichier de données : décris ce que tu veux obtenir et Classinus peut produire le document dans le format adapté, selon les outils disponibles. Relis toujours le résultat avant de le partager.",
    points: [
      {
        titre: "Choisir le bon format",
        texte:
          "Classinus peut créer et exporter des documents PDF, Word, Excel, PowerPoint, LaTeX, CSV et JSON, selon ta demande et les outils disponibles.",
      },
      {
        titre: "Partir de tes contenus",
        texte:
          "Envoie des documents, des images, du code ou des médias dans la conversation, puis demande à Classinus de créer ou de modifier un document à partir de ce contenu.",
      },
      {
        titre: "Ranger tes fichiers",
        texte:
          "Importe et organise tes documents dans ta bibliothèque personnelle, puis demande à Classinus de les retrouver, les analyser ou de travailler à partir de leur contenu.",
        lien: { href: ROUTES_DECOUVRIR.bibliotheque.perso, libelle: "Voir la bibliothèque personnelle" },
      },
      {
        titre: "Chercher avant de rédiger",
        texte:
          "Pour appuyer un document sur des sources, demande à Classinus de rechercher sur le web ou dans plusieurs bibliothèques en ligne, puis vérifie les références avant de t'y appuyer.",
        lien: { href: ROUTES_DECOUVRIR.usages.pdf, libelle: "Voir le guide de recherche de documents" },
      },
    ],
    questions: [
      {
        question: "Quels formats de documents Classinus peut-il créer ?",
        reponse:
          "Classinus peut créer des documents PDF, Word, Excel, PowerPoint, LaTeX, CSV et JSON. Les formats disponibles dépendent de la demande et des outils activés.",
      },
      {
        question: "Puis-je modifier un document que j'ai déjà ?",
        reponse:
          "Oui. Tu peux envoyer un document dans la conversation et demander à Classinus de le modifier ou de s'appuyer sur son contenu, selon les outils disponibles.",
      },
      {
        question: "Faut-il vérifier les documents créés ?",
        reponse:
          "Oui. Une réponse d'IA peut contenir des erreurs. Relis le contenu, les chiffres et les références avant de partager le document.",
      },
    ],
  },
];
