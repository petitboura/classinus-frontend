import Link from "next/link";

// Créé le 01/09/2026, correctif (Bourama : "les descriptions de section,
// c'est pas la norme mobile, trouve où ça doit aller").
//
// Norme trouvée (Android Developers / Material Design, guide "Settings") :
// pas de paragraphe permanent sous un titre d'écran -- si une explication
// plus longue est nécessaire, elle va sur un second écran, accessible
// depuis un point d'entrée dédié. Motif exact retenu (eBay/Balsamiq,
// "infotip") : petit bouton "i" à côté du titre, qui ouvre une bulle
// courte avec un lien "En savoir plus" vers ce second écran.
//
// Ce fichier est la SOURCE UNIQUE des textes : la bulle (texteCourt) et
// la page Aide et support (texteComplet) lisent le même id ici, pour ne
// jamais avoir deux versions du même texte qui divergent avec le temps.
// ParametresAide.tsx (ex-EspaceParametres.tsx, devenue sa propre page le
// 19/09/2026) lit ce registre pour construire la liste des rubriques de
// "Aide et support", et pour savoir sur quelle rubrique scroller/ouvrir
// quand on y arrive via ?aide=<id> (lien "En savoir plus" depuis une
// bulle).
//
// texteCourt/texteComplet en React.ReactNode, pas juste string (passage
// en .tsx le 02/09/2026, suite audit Bourama sur les 6 écrans oubliés du
// premier passage) : la rubrique "bibliotheque-publique" porte un rappel
// légal avec liens cliquables (CGU, politique de copyright) qui doit
// suivre le texte tel quel, pas être réduit à du texte brut.
export type RubriqueAide = {
  id: string;
  titre: string;
  texteCourt: React.ReactNode;
  texteComplet: React.ReactNode;
};

export const RUBRIQUES_AIDE: RubriqueAide[] = [
  {
    id: "accessibilite",
    titre: "Accessibilité",
    texteCourt: "Autorise Classinus à lire et agir dans les apps que tu choisis, une par une.",
    texteComplet:
      "Autorise Classinus à lire et agir dans les apps que tu choisis, une par une. Le service d'accessibilité de Classinus doit être activé dans les réglages système du téléphone pour que ça fonctionne. Tu contrôles précisément quelles apps sont autorisées, et un journal garde la trace de ce que Classinus y a lu ou fait.",
  },
  {
    id: "audit-corrections",
    titre: "Audit hebdomadaire",
    texteCourt: "Une fois par semaine, un résumé des signalements de tes élèves, même s'il n'y en a aucun.",
    texteComplet:
      "Chaque semaine, Classinus t'envoie un résumé des signalements reçus de tes élèves, même s'il n'y en a aucun. Les signalements encore en attente sont listés en priorité, avec un accès direct pour les corriger.",
  },
  {
    // 20/09/2026, demande Bourama : tableau de bord par code, phase 1
    // (voir components/AuditComplet.tsx). Les points qui demandent un
    // nouveau suivi (temps d'utilisation, niveau des élèves, notions
    // les plus demandées) ne sont pas encore là -- à ne pas décrire ici
    // tant qu'ils ne sont pas construits.
    id: "audit-complet-code",
    titre: "Audit complet",
    texteCourt: "Le tableau de bord d'un de tes codes : activité, signalements, outils et affichages utilisés.",
    texteComplet:
      "Choisis un de tes codes pour voir son tableau de bord : combien d'élèves rattachés l'utilisent vraiment, le nombre de conversations et de questions, les heures où ils sont le plus actifs, les outils et affichages les plus utilisés, et les modes pédagogiques (Socratique, Professeur, Tuteur, Examinateur) qu'ils choisissent le plus dans leurs échanges avec Classinus. Les chiffres se mettent à jour automatiquement.",
  },
  {
    // Chantier "canal en direct" (19/09/2026) : bouton flottant en bas à
    // gauche, et entrée dans le menu du chat.
    id: "canal-en-direct",
    titre: "Canal en direct",
    texteCourt: "Reste en contact avec Classinus pendant qu'il agit dans l'app, à la voix ou à l'écrit.",
    texteComplet:
      "Le canal en direct te permet de rester en contact avec Classinus pendant qu'il agit dans l'app. Active le avec le bouton rond en bas à gauche de l'écran, ou depuis le menu du chat. Une fois actif, deux boutons apparaissent : un micro pour dicter et un crayon pour écrire. Pour la dictée, tu peux choisir entre le moteur de ton navigateur et Whisper, quand ton navigateur sait le faire. Ce que tu écris ou dictes est envoyé à Classinus, qui te répond dans une bulle près de son curseur, sans ouvrir le chat. Sa réponse s'affiche comme dans le chat et se referme seule : clique sur son curseur pour la faire réapparaître. Quand il a juste une information à te donner, un petit message apparaît au même endroit. Il choisit lui même combien de temps ce message reste affiché selon sa longueur, et il peut attendre que tu aies fini de lire avant de continuer. Un petit bouton en bas à droite garde la liste de ce que Classinus a fait pendant la session. Le canal en direct repart de zéro à chaque ouverture de l'app.",
  },
  {
    id: "controle-session",
    titre: "Contrôle de session",
    // 19/09/2026, demande Bourama : le bouton "i" passe de l'écran à la
    // page (Concentration fonctionne comme Personnaliser Clovis). Le texte
    // court est aligné sur celui que l'écran affichait jusqu'ici.
    texteCourt: "Coupe les sonneries et notifications, et active Ne pas déranger pendant la durée choisie.",
    texteComplet:
      "Coupe les sonneries et notifications, et active Ne pas déranger le temps de ta session de travail. L'activation se fait dans les réglages système (Accessibilité), en dehors de l'app.",
  },
  {
    // Partie 5 (06/09/2026, chantier "confiance pédagogique") : côté
    // élève, sur le drapeau qui apparaît sous une réponse de Classinus.
    id: "corrections-elve",
    titre: "Signaler un problème",
    texteCourt:
      "Sous une réponse de Classinus, le drapeau propose deux choix : une notion ou une méthode incorrecte (ton prof recevra ce message pour corriger directement dans le chat), ou un comportement général mal réglé (transmis pour supervision, rien à faire de ton côté).",
    texteComplet:
      "Sous une réponse de Classinus, le drapeau propose deux choix : une notion ou une méthode incorrecte (ton prof recevra ce message pour corriger directement dans le chat, et tu seras notifié une fois traité), ou un comportement général mal réglé (transmis pour supervision, rien à faire de ton côté). Entièrement séparé du pouce en l'air/en bas juste à côté, qui sert uniquement à noter la réponse.",
  },
  {
    // Côté prof, sur la section "Corrections" du Bureau.
    id: "corrections-prof",
    titre: "Corrections",
    texteCourt:
      "Les signalements de tes élèves sur une notion ou une méthode incorrecte. Clique sur « Corriger » pour ouvrir une conversation déjà préparée avec le contexte, où tu n'as plus qu'à taper ou dicter ta correction.",
    texteComplet:
      "Les signalements de tes élèves sur une notion ou une méthode incorrecte apparaissent ici, dans l'onglet « À corriger ». Clique sur « Corriger » pour ouvrir une conversation neuve déjà préparée avec le contexte (question et réponse mise en cause), où tu n'as plus qu'à taper ou dicter ta correction à Classinus. Une fois traitée, elle apparaît dans « Traitées » : tu peux la désactiver temporairement, l'éditer, la dupliquer, ou la supprimer. Ton élève reçoit une notification dès que sa correction est traitée. Les signalements de comportement général (distincts de ceux-ci) ne sont pas affichés dans le Bureau : ils sont transmis directement pour supervision.",
  },
  {
    id: "diffuser",
    titre: "Diffuser",
    texteCourt: "Ajouté à la bibliothèque de chacun de ceux qui ont entré ce code, privé à ce lien.",
    texteComplet:
      "Diffuser ajoute le contenu choisi à la bibliothèque personnelle de chacun de ceux qui ont entré ce code précis. C'est privé à ce lien : seuls ceux qui ont le code y ont accès.",
  },
  {
    id: "entrer-code",
    titre: "Entrer un code",
    texteCourt: "Quelqu'un t'a donné un code ? Entre-le ici pour recevoir tout ce qu'il partage.",
    texteComplet:
      "Si quelqu'un t'a donné un code, entre-le ici pour recevoir tout ce qu'il partage : comportement, bibliothèque, ou texte, selon ce que la personne y a mis.",
  },
  {
    id: "ecrire-matiere",
    titre: "Écrire une matière",
    texteCourt: "Choisis une matière et écris ce que Classinus doit savoir ou comment il doit répondre.",
    texteComplet:
      "Choisis une matière et écris ce que Classinus doit savoir ou comment il doit répondre. Un code se génère à l'enregistrement : partage-le, il débloque exactement ce texte pour celui qui l'entre.",
  },
  {
    id: "rappels",
    titre: "Rappels",
    texteCourt: "Notifications, rappels programmés et événements de calendrier.",
    texteComplet:
      "Regroupe les notifications classiques, les rappels programmés à une heure précise, et les événements ajoutés au calendrier du téléphone. Nécessite l'app mobile Classinus.",
  },
  {
    // Minuteurs du chat (20/09/2026, demande Bourama) : bouton horloge en
    // haut à droite du chat.
    id: "minuteurs",
    titre: "Minuteurs",
    texteCourt: "Lance un minuteur qui ne bloque rien. Classinus peut aussi en lancer un de lui même et agir quand il se termine.",
    texteComplet:
      "Dans le chat, le bouton horloge en haut à droite te permet de lancer un minuteur : une durée rapide ou celle que tu choisis. Classinus peut aussi en lancer un de lui même quand c'est utile, par exemple pour une révision chronométrée, et il agit quand le minuteur se termine, par exemple en te proposant un quiz. Un minuteur ne bloque jamais rien : tu peux continuer à discuter, changer de page, ajouter ou retirer 5 minutes, ou l'arrêter. Pour qu'il ne gêne pas, tu peux le réduire en petite pastille ou le masquer, puis le retrouver avec le bouton horloge. Le bouton Voir la suite prévue montre ce que Classinus fera à la fin. Si l'app est fermée quand le minuteur se termine, tu reçois une notification.",
  },
  {
    id: "temps-ecran",
    titre: "Temps d'écran",
    texteCourt: "Temps passé aujourd'hui dans chaque app, et les 7 derniers jours.",
    texteComplet:
      "Affiche le temps passé aujourd'hui dans chaque app installée, avec un historique sur les 7 derniers jours. Nécessite l'app mobile Classinus (Android uniquement pour l'instant).",
  },
  {
    id: "mes-codes",
    titre: "Mes codes",
    texteCourt: "Crée un code et partage-le : tous ceux qui l'entrent reçoivent ce que tu y mets.",
    texteComplet:
      "Crée un code et partage-le : tous ceux qui l'entrent reçoivent tout ce que tu y mets (comportement, bibliothèque, texte). Modifiable après coup, tout le monde voit la mise à jour dès qu'elle est faite.",
  },
  {
    id: "programme-notions",
    titre: "Programme",
    // 19/09/2026, demande Bourama : le bouton "i" passe de la carte à la
    // page (Bureau fonctionne comme Personnaliser Clovis). Le texte court
    // est aligné sur celui que la carte affichait jusqu'ici, qui décrit
    // les quatre niveaux du programme (matière, chapitre, partie, notion).
    texteCourt: "Organise le programme (matière > chapitre > partie > notion) et coche l'avancement.",
    texteComplet:
      "Organise les notions à enseigner pour un code, avec des sous-notions si besoin (renommer, fusionner, réordonner, supprimer). Chaque notion a un statut que tu coches toi-même : à venir, en cours, ou acquis. Tu peux aussi importer un document (sommaire, plan de cours) pour proposer une structure de départ, à valider avant de l'appliquer.",
  },
  // 19/09/2026, demande Bourama : rubrique de la page Signalements de
  // Bureau. La carte l'annonçait déjà (rubriqueId "signalements-prof")
  // mais elle n'existait pas ici, donc "En savoir plus" ne menait nulle
  // part. Texte repris de la carte, avec une virgule à la place du
  // double trait d'union. La rubrique "corrections-prof" plus haut décrit
  // l'ancien fonctionnement (bouton "Corriger"), elle n'est pas touchée.
  {
    id: "signalements-prof",
    titre: "Signalements",
    texteCourt:
      "Un élève a signalé un problème sur une réponse de Classinus. Clique sur « Discuter » pour ouvrir une conversation avec Classinus et échanger sur ce cas, à ton rythme, rien n'est automatique, rien n'est traité sans toi.",
    texteComplet:
      "Un élève a signalé un problème sur une réponse de Classinus. Clique sur « Discuter » pour ouvrir une conversation avec Classinus et échanger sur ce cas, à ton rythme, rien n'est automatique, rien n'est traité sans toi.",
  },
  // Les 6 rubriques suivantes ajoutées le 02/09/2026 -- écrans oubliés du
  // premier passage du 01/09 (signalé par Bourama), textes repris tels
  // quels des paragraphes fixes qu'ils remplacent, sans reformulation.
  {
    id: "bibliotheque-perso",
    titre: "Bibliothèque",
    texteCourt: "Les documents ajoutés ici sont personnels : toi seul y as accès, et Classinus peut les consulter pendant une conversation.",
    texteComplet:
      "Les documents ajoutés ici sont personnels : toi seul y as accès, et Classinus peut les consulter pendant une conversation.",
  },
  {
    id: "bibliotheque-publique",
    titre: "Bibliothèque publique",
    texteCourt: (
      <>
        Un catalogue de documents partagé par tout le monde : ajoute un fichier, un lien ou une note avec un nom et
        une description pour que les autres le retrouvent facilement. En publiant, tu garantis détenir les droits sur
        ce contenu, voir les{" "}
        <Link href="/cgu" className="underline hover:text-dj-texte">
          CGU
        </Link>{" "}
        et la{" "}
        <Link href="/copyright" className="underline hover:text-dj-texte">
          politique de copyright
        </Link>
        .
      </>
    ),
    texteComplet: (
      <>
        Un catalogue de documents partagé par tout le monde : ajoute un fichier, un lien ou une note avec un nom et
        une description pour que les autres le retrouvent facilement. En publiant, tu garantis détenir les droits sur
        ce contenu, voir les{" "}
        <Link href="/cgu" className="underline hover:text-dj-texte">
          CGU
        </Link>{" "}
        et la{" "}
        <Link href="/copyright" className="underline hover:text-dj-texte">
          politique de copyright
        </Link>
        .
      </>
    ),
  },
  {
    id: "mes-skills",
    titre: "Mes skills",
    texteCourt:
      "Tes consignes perso pour Classinus, en plus de ce que ton enseignant a déjà mis en place. Tu peux en ajouter plusieurs, clique sur l'une d'elles pour l'ouvrir en grand et la modifier tranquillement.",
    texteComplet:
      "Tes consignes perso pour Classinus, en plus de ce que ton enseignant a déjà mis en place. Tu peux en ajouter plusieurs, clique sur l'une d'elles pour l'ouvrir en grand et la modifier tranquillement.",
  },
  {
    id: "skills-publics",
    titre: "Skills publics",
    texteCourt:
      "Des comportements publiés par d'autres étudiants. Active celui qui t'intéresse : une copie s'ajoute directement dans « Mes comportements », prête à l'emploi.",
    texteComplet:
      "Des comportements publiés par d'autres étudiants. Clique sur l'un d'eux pour voir son contenu complet avant de l'activer. Active celui qui t'intéresse : une copie s'ajoute directement dans « Mes comportements », prête à l'emploi. Si c'est toi qui l'as publié, tu peux le retirer du catalogue à tout moment.",
  },
  {
    id: "connecter-claude",
    titre: "Utiliser Classinus dans Claude",
    texteCourt:
      "Connecte ton compte Classinus à Claude pour que Claude puisse utiliser ce que tu as dans Classinus (ta mémoire, tes skills, ta bibliothèque) directement dans vos conversations. Ça se fait une seule fois.",
    texteComplet:
      "Connecte ton compte Classinus à Claude pour que Claude puisse utiliser ce que tu as dans Classinus (ta mémoire, tes skills, ta bibliothèque) directement dans vos conversations. Ça se fait une seule fois.",
  },
  {
    id: "memoire",
    titre: "Ma mémoire",
    texteCourt:
      "Résumé de ce que Classinus retient de tes conversations passées, pour personnaliser vos échanges. Se met à jour automatiquement au fil des discussions, tu peux aussi le corriger ou l'effacer toi-même ici.",
    texteComplet:
      "Résumé de ce que Classinus retient de tes conversations passées, pour personnaliser vos échanges. Se met à jour automatiquement au fil des discussions, tu peux aussi le corriger ou l'effacer toi-même ici.",
  },
];

export function trouverRubriqueAide(id: string): RubriqueAide | undefined {
  return RUBRIQUES_AIDE.find((r) => r.id === id);
}
