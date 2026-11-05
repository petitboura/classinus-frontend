> [English version](./CARTOGRAPHIE_TECHNIQUE.md) · **Version française**

# Cartographie technique du frontend

Ce document est une carte de navigation du code : il aide à trouver le bon fichier sans transformer la documentation en journal de développement.

## Trouver rapidement le bon endroit

| Besoin | Point de départ |
|---|---|
| Page ou URL | **app/** |
| Navigation générale | **components/AppShell.tsx**, **components/AppSidebar.tsx** |
| Chat, saisie, messages | **components/chat/** |
| État partagé et logique cliente | **lib/** |
| Bibliothèque, notes, comportements | **app/(app)/** et composants associés |
| Connexions externes | **components/connexions/**, **lib/connexionsApplis.ts** |
| Android et iOS | **components/mobile/**, **android/**, **ios/** |
| Application Windows | **electron/**, **packages/*-electron/** |
| Couleurs et thème | **app/globals.css**, **lib/useTheme.ts** |
| Tests de non-régression | **tests/** |

## 1. Organisation générale

| Dossier | Rôle |
|---|---|
| **app/** | routes, pages et layouts Next.js |
| **components/** | interface visible et interactions |
| **lib/** | logique cliente, accès aux services et état partagé |
| **public/** | logos, icônes, polices et ressources statiques |
| **android/**, **ios/** | projets natifs Capacitor |
| **electron/** | intégration de l’application Windows |
| **packages/** | extensions Capacitor locales, notamment pour Electron |
| **tests/** | vérifications automatisées |

Le frontend communique avec l’API Classinus pour les opérations métier. Il ne doit pas embarquer les secrets des fournisseurs IA.

## 2. Routes et écrans

Le dossier **app/** utilise l’App Router de Next.js.

| Zone | Emplacement |
|---|---|
| Application connectée | **app/(app)/** |
| Connexion et inscription | **app/connexion/**, **app/inscription/** |
| Pages publiques de découverte | **app/decouvrir/** |
| Espace public | **app/mon-espace/** |
| Retour et consentement OAuth | **app/oauth/** |
| Téléchargements | **app/telecharger/** |
| Pages légales | **app/cgu/**, **app/confidentialite/**, **app/copyright/** |
| Superposition de l’agent PC | **app/agent-superposition/** |

Les chemins sont également centralisés dans les fichiers **lib/routes*.ts**. Avant de créer une URL, vérifier si une route ou une fonction de navigation existe déjà.

## 3. Composants

Le dossier **components/** regroupe les éléments visuels par fonctionnalité.

| Dossier ou composant | Responsabilité |
|---|---|
| **chat/** | conversation, saisie, messages, pièces jointes et rendu |
| **mobile/** | navigation et contrôles mobiles |
| **voix/** | interface de la voix en direct |
| **connexions/** | cartes et écrans de connexion aux services |
| **bureau/** | éléments de l’espace Bureau |
| **higgsfield/** | interface des fonctions Higgsfield |
| **icons/** et **icones/** | icônes |
| **AppShell.tsx**, **AppSidebar.tsx** | structure et navigation générale |
| **InteractionGlobale.tsx** | fournisseurs et interactions qui persistent entre les pages |
| **Logo.tsx**, **ThemeToggle.tsx** | identité visuelle et changement de thème |

La plupart des pages de **app/(app)/** délèguent leur interface à un composant. Chercher le composant rendu par la page avant de modifier le layout global.

## 4. Logique cliente

Le dossier **lib/** contient la logique réutilisée entre les écrans.

| Domaine | Fichiers de repère |
|---|---|
| Appels API | **api.ts**, **reponseApi.ts** |
| Authentification | **supabase.ts**, **authFallback.ts** |
| Chat | **contexteChat.tsx**, **repriseFluxChat.ts** |
| Navigation | **routesApp.ts** et autres **routes*.ts** |
| Thème | **useTheme.ts**, **couleursIcones.ts** |
| Temps réel | **canalTempsReel.ts**, **canalAgentApplicatif.ts** |
| Voix | **geminiLive.ts**, **contexteVoixDirecte.tsx** |
| Minuteurs | **minuteurs.ts**, **contexteMinuteurs.tsx** |
| Mises à jour | **miseAJourOta.ts**, **miseAJourPcElectron.ts** |
| Traductions | **lib/i18n/** |

Les contextes et hooks partagés coordonnent l’état entre plusieurs composants. Éviter de recréer localement un état déjà disponible.

## 5. Plateformes

**Web.** Le site utilise le build Next.js standard. Configuration : **next.config.mjs**.

**Android et iOS.** Capacitor réutilise l’interface du frontend dans les projets **android/** et **ios/**. La configuration se trouve dans **capacitor.config.ts**. Les éléments propres aux mobiles se trouvent dans **components/mobile/** et les extensions dans **packages/**.

**Windows.** Electron est configuré dans **electron/**. Les extensions propres au bureau sont dans **packages/capacitor-*-electron/**. Les fonctions PC — relais, superposition, mises à jour et accès natif — sont réparties entre ces paquets et les modules correspondants de **lib/**.

## 6. Identité visuelle

- Styles globaux : **app/globals.css**.
- Thème et couleurs partagés : **lib/useTheme.ts** et les utilitaires de **lib/**.
- Logo : **components/Logo.tsx** et ressources de **public/**.
- Markdown dans les messages du chat : le style de chaque élément (citations, titres 4 à 6, listes imbriquées, listes de tâches, ligne horizontale, notes de bas de page, blocs dépliables, touches de clavier, texte surligné) est dans **app/globals.css**, sous le conteneur `.dj-markdown` commun au chat, au canal en direct et aux aperçus de skills. Les éléments qui demandent du code (cases des listes de tâches, liens internes au message comme les renvois de notes) sont dans **components/chat/composantsMarkdownRiches.tsx**. La liste blanche des balises HTML est dans **components/chat/BulleMessage.tsx** (`SCHEMA_SANITIZE`) : une balise doit y être ajoutée avant de pouvoir être stylée. Le clic sur un renvoi de note ne fait défiler que la zone des messages, via **lib/defilerDansConteneur.ts** ; ne jamais utiliser `scrollIntoView` pour cela, car il fait aussi défiler la page figée et décale la barre de saisie. Le document lui-même est verrouillé tant que la coque de l'appli est montée (`.dj-coque-appli` dans **components/AppShell.tsx**, règles dans **app/globals.css**) : `html` en `overflow: hidden`, `body` en `position: relative; height: 100dvh; overflow: clip`, donc rien ne peut faire défiler la page par code. Seules les zones internes comme `main` défilent. Les pages hors coque gardent leur défilement normal.

Réutiliser les conventions visuelles existantes. Après une évolution, vérifier les thèmes clair et sombre ainsi que les formats d’écran concernés.

## 7. Tests

Les tests sont dans **tests/** et leurs commandes dans **package.json**. Les vérifications automatiques avant le build comprennent **test:composants-natifs** et **test:couleurs-theme**.

D’autres scripts couvrent notamment le chat, les connexions, l’internationalisation, le canal PC, les mises à jour, le relais et les interactions natives. Exécuter les tests liés à la modification avant de valider un changement.

## Guides associés

- [Architecture](ARCHITECTURE.md)
- [Développement et commandes](DEVELOPPEMENT.md)
- [Plateformes et builds](PLATEFORMES.md)
- [Publication et mise à jour PC](appli-pc-mise-a-jour-et-publication.md)
- [Suivi des stores](soumission-stores.md)
