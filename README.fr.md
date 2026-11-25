> [English version](./README.md) · **Version française**

![Classinus](public/logo-classinus.webp)

# Classinus — Frontend

Le dépôt du frontend de **[Classinus](https://classinus.com)** : l’interface de l’assistant IA et de l’espace de travail, accessible sur le Web et distribuée aussi sous forme d’applications installables.

Le même socle d’interface alimente le navigateur, les applications mobiles Android/iOS et l’application Windows.

[Site officiel](https://classinus.com) · [Dépôt backend](https://github.com/petitboura/classinus-backend)

## Ce que contient l’application

- **Assistant IA** : conversations, modèles et outils connectés.
- **Espace personnel** : bibliothèque de fichiers, notes, historique et personnalisation.
- **Contenus multimédias** : aperçu de documents, images, audio, vidéo et contenus interactifs.
- **Connexions** : intégrations avec des services externes et des serveurs MCP.
- **Applications installables** : Android et iOS avec Capacitor, Windows avec Electron.

## Technologies

Next.js 14 · React 18 · TypeScript · Tailwind CSS · Supabase JS · Capacitor 8 · Electron

## Démarrage local

Prérequis : Node.js et npm.

```bash
npm install
```

Copier `.env.local.example` vers `.env.local`, puis renseigner les valeurs nécessaires :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL de l’API Classinus |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publique anon de Supabase |
| `NEXT_PUBLIC_APP_URL` | URL du frontend |

Lancer le serveur de développement :

```bash
npm run dev
```

L’application est alors disponible sur `http://localhost:3000`. Le backend doit être accessible à l’adresse définie dans `NEXT_PUBLIC_API_URL`.

## Installer Classinus sur téléphone (PWA)

L'appli APK n'est plus proposée. Sur Android et iPhone, Classinus s'installe depuis le navigateur. Le bouton flottant déplaçable (`components/BoutonFlottantTelecharger.tsx`) et le bouton de la barre latérale (`components/BoutonInstaller.tsx`) ouvrent la fenêtre d'installation du téléphone, ou à défaut la page des étapes (`components/PanneauInstallation.tsx`). Sur cette page, « Je n'arrive pas à l'installer » masque pour de bon le bouton flottant sur le téléphone ; le bouton de la barre latérale reste. L'état est partagé dans `lib/installationWeb.ts`, qui n'appelle volontairement jamais `preventDefault()` sur la proposition d'installation, pour que Chrome garde son propre bandeau. Rien de cela ne s'applique sur ordinateur, dans une appli native ou sur Maame.

## Maame (appli installable faite de la page bambara)

Maame est la page bambara servie sur sa propre adresse (`maame.classinus.com`), avec son nom et son logo en noir et blanc, installable depuis le navigateur du téléphone (PWA, Android). Sur cette adresse, la racine `/` ouvre directement la page bambara (`rewrites` dans `next.config.mjs`), le manifeste et le titre de l'onglet sont ceux de Maame (`app/manifest.ts`, `app/bambara/layout.tsx`), et il n'y a ni inscription ni connexion : un compte anonyme est créé en silence à la première ouverture et gardé sur le téléphone (`components/bambara/PageBambaraClient.tsx`). Le début de l'adresse est défini dans `lib/maame.ts` et doit rester identique dans `public/maame-hote.js` et `next.config.mjs`. Les icônes sont dans `public/maame/` (le visage dans son cercle, sans le mot). Le logo n'est pas affiché dans la page elle même : une seule animation d'ouverture (`components/bambara/OuvertureMaame.tsx`) l'amène du milieu de l'écran jusqu'au bouton du haut à gauche, où il remplace l'icône menu. Demande que « Allow anonymous sign-ins » soit activé dans le projet Supabase.

## Commandes utiles

| Commande | Usage |
|---|---|
| `npm run dev` | serveur local |
| `npm run build` | build Web de production |
| `npm start` | servir le build Web |
| `npm run build:capacitor` | build statique et synchronisation Capacitor |
| `npm run build:capacitor:test` | build Capacitor ciblant l’environnement de test configuré |
| `npm run test:composants-natifs` | vérification des composants natifs |
| `npm run test:couleurs-theme` | vérification des couleurs et du thème |

Le script de build exécute aussi les vérifications définies dans `prebuild`.

## Documentation

Index complet : [English](docs/README.md) · [Français](docs/README.fr.md).


| Guide | Contenu |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | rôle du frontend, organisation du code et échanges avec le backend |
| [Développement](docs/DEVELOPPEMENT.md) | installation, configuration, commandes et tests |
| [Plateformes](docs/PLATEFORMES.md) | Web, Android, iOS et Windows |
| [Cartographie technique](docs/CARTOGRAPHIE_TECHNIQUE.md) | inventaire transféré de l’ancien README, référence datée |
| [Publication PC](docs/appli-pc-mise-a-jour-et-publication.md) | fabrication et mise à jour de l’application Windows |
| [Suivi des stores](docs/soumission-stores.md) | checklist mobile, à revalider avant toute soumission |
| [Mode vocal bambara](docs/VOIX_BAMBARA.fr.md) | chaîne micro, Soloni, IA, voix Gemini, et question « bambara ou autre » |

## Dépôts liés

- **Frontend — ce dépôt :** [petitboura/classinus-frontend](https://github.com/petitboura/classinus-frontend)
- **Backend API :** [petitboura/classinus-backend](https://github.com/petitboura/classinus-backend)

Les détails d’implémentation restent dans `docs/` et dans le code concerné. Ce README sert de point d’entrée au projet.
