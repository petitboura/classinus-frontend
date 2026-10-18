import { ROUTES_DECOUVRIR } from "./routesDecouvrir";

export type CarteDecouvrir = {
  slug: string;
  href: string;
  titre: string;
  description: string;
};

export const SECTIONS_DECOUVRIR: CarteDecouvrir[] = [
  {
    slug: "accueil",
    href: ROUTES_DECOUVRIR.accueilClassinus,
    titre: "Le coin des étudiants",
    description: "Pose tes questions, travaille à partir de tes cours et prépare des fiches, des QCM ou des animations pour réviser.",
  },
  {
    slug: "bibliotheque",
    href: ROUTES_DECOUVRIR.bibliotheque.accueil,
    titre: "Bibliothèque",
    description: "Retrouve tes documents personnels, explore les ressources partagées et accède aux dossiers que tu désignes sur mobile.",
  },
  {
    slug: "personnaliser",
    href: ROUTES_DECOUVRIR.personnaliser.accueil,
    titre: "Personnaliser Classinus",
    description: "Crée tes propres consignes, découvre les skills partagées et gère les informations conservées dans la mémoire.",
  },
  {
    slug: "concentration",
    href: ROUTES_DECOUVRIR.concentration.accueil,
    titre: "Concentration et temps d'écran",
    description: "Limite les interruptions pendant une session et consulte le temps passé dans les applications sur Android.",
  },
  {
    slug: "usages",
    href: ROUTES_DECOUVRIR.usages.accueil,
    titre: "Que faire avec Classinus ?",
    description: "Découvre comment rechercher des documents, apprendre à programmer, trouver des vidéos et réviser.",
  },
  {
    slug: "thonny",
    href: ROUTES_DECOUVRIR.thonny,
    titre: "Classinus dans Thonny",
    description: "Installe le plugin pour demander des analyses et des corrections de code Python dans l'éditeur Thonny.",
  },
  {
    slug: "bureau",
    href: ROUTES_DECOUVRIR.bureau.accueil,
    titre: "Bureau et outils de classe",
    description: "Partage des ressources par code, organise le programme pédagogique et consulte les outils réservés aux enseignants.",
  },
];

export const SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE: CarteDecouvrir[] = [
  {
    slug: "perso",
    href: ROUTES_DECOUVRIR.bibliotheque.perso,
    titre: "Bibliothèque personnelle",
    description: "Range tes cours et tes fichiers par dossier, puis demande à Classinus de travailler à partir de tes documents.",
  },
  {
    slug: "publique",
    href: ROUTES_DECOUVRIR.bibliotheque.publique,
    titre: "Bibliothèque publique",
    description: "Explore les ressources partagées par la communauté, consulte leurs informations et note celles que tu as utilisées.",
  },
  {
    slug: "telephone",
    href: ROUTES_DECOUVRIR.bibliotheque.telephone,
    titre: "Dossiers du téléphone",
    description: "Sur mobile, désigne les dossiers auxquels Classinus peut accéder pour retrouver et organiser tes fichiers.",
  },
];

export const SOUS_PAGES_DECOUVRIR_PERSONNALISER: CarteDecouvrir[] = [
  {
    slug: "mes-skills",
    href: ROUTES_DECOUVRIR.personnaliser.mesSkills,
    titre: "Mes skills",
    description: "Crée et ajuste des consignes personnelles pour orienter les réponses de Classinus selon tes besoins.",
  },
  {
    slug: "skills-publics",
    href: ROUTES_DECOUVRIR.personnaliser.skillsPublics,
    titre: "Skills publics",
    description: "Parcours les consignes publiées par d'autres élèves, consulte leur contenu et active une copie si elle te convient.",
  },
  {
    slug: "memoire",
    href: ROUTES_DECOUVRIR.personnaliser.memoire,
    titre: "Ma mémoire",
    description: "Consulte les informations retenues par Classinus et gère celles que tu souhaites conserver ou supprimer.",
  },
];

export const SOUS_PAGES_DECOUVRIR_CONCENTRATION: CarteDecouvrir[] = [
  {
    slug: "session",
    href: ROUTES_DECOUVRIR.concentration.session,
    titre: "Contrôle de session",
    description: "Active Ne pas déranger et limite les sonneries et notifications pendant la durée choisie.",
  },
  {
    slug: "temps-ecran",
    href: ROUTES_DECOUVRIR.concentration.tempsEcran,
    titre: "Temps d'écran",
    description: "Consulte le temps d'utilisation des applications aujourd'hui et sur les sept derniers jours, sur Android.",
  },
];

export const SOUS_PAGES_DECOUVRIR_BUREAU: CarteDecouvrir[] = [
  {
    slug: "programme",
    href: ROUTES_DECOUVRIR.bureau.programme,
    titre: "Programme pédagogique",
    description: "Structure les matières, chapitres et notions d'un code et suis leur état d'avancement. Réservé aux enseignants.",
  },
  {
    slug: "codes",
    href: ROUTES_DECOUVRIR.bureau.codes,
    titre: "Mes codes",
    description: "Crée un code pour partager les éléments que tu lui associes avec les personnes qui le saisiront.",
  },
  {
    slug: "entrer-code",
    href: ROUTES_DECOUVRIR.bureau.entrerCode,
    titre: "Entrer un code",
    description: "Saisis un code reçu pour récupérer le contenu que son auteur a choisi de partager.",
  },
  {
    slug: "audit",
    href: ROUTES_DECOUVRIR.bureau.audit,
    titre: "Audit hebdomadaire",
    description: "Consulte le récapitulatif hebdomadaire des signalements et repère ceux qui attendent une correction. Réservé aux enseignants.",
  },
  {
    slug: "signalements",
    href: ROUTES_DECOUVRIR.bureau.signalements,
    titre: "Signalements",
    description: "Examine les problèmes signalés par les élèves et échange avec Classinus pour les analyser. Réservé aux enseignants.",
  },
  {
    slug: "editeur",
    href: ROUTES_DECOUVRIR.bureau.editeur,
    titre: "Éditeur de code",
    description: "Écris du code, exécute les programmes Python pris en charge et enregistre tes fichiers dans ta bibliothèque.",
  },
  {
    slug: "configuration",
    href: ROUTES_DECOUVRIR.bureau.configuration,
    titre: "Configuration",
    description: "Définis des procédures, règles, comportements et styles pour guider les réponses de Classinus.",
  },
];
