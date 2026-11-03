# Développement du frontend

## Prérequis

- Node.js et npm.
- Un backend Classinus accessible.
- Un projet Supabase autorisé pour l’environnement de travail.

Pour compiler les applications natives, installer aussi les outils de la plateforme : Android Studio pour Android, Xcode sur macOS pour iOS.

## Installation

```bash
npm install
```

Copier le fichier de configuration :

```bash
cp .env.local.example .env.local
```

Sous Windows PowerShell :

```powershell
Copy-Item .env.local.example .env.local
```

Renseigner au minimum `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `NEXT_PUBLIC_APP_URL`.

Ne pas placer de clé privée ou de secret de fournisseur dans une variable `NEXT_PUBLIC_*` : ces valeurs sont intégrées au code envoyé au navigateur.

## Lancer l’application

```bash
npm run dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000).

L’API doit être démarrée séparément. Voir le [guide de développement du backend](https://github.com/petitboura/classinus-backend/blob/main/docs/DEVELOPPEMENT.md).

## Build et vérifications

```bash
npm run build
npm start
```

Le script `prebuild` exécute automatiquement les vérifications des composants natifs et des couleurs de thème avant le build Next.js.

Commandes de vérification disponibles :

```bash
npm run test:composants-natifs
npm run test:couleurs-theme
npm run test:connexions
npm run test:i18n
npm run audit:i18n
```

D’autres scripts ciblent des fonctionnalités précises. La liste complète se trouve dans `package.json`.

## Builds natifs

```bash
npm run build:capacitor
npm run build:capacitor:test
```

Ces scripts construisent l’export statique puis exécutent la synchronisation Capacitor. La compilation finale Android/iOS se fait ensuite dans les outils natifs. La seconde commande utilise la cible de test prévue par `next.config.mjs).

## Repères en cas de problème

- API inaccessible : vérifier `NEXT_PUBLIC_API_URL), puis le service backend.
- Authentification : vérifier l’URL et la clé publique Supabase de l’environnement.
- Différence Web / mobile : vérifier les conditions `CAPACITOR_BUILD` dans `next.config.mjs`.
- Différence Web / Windows : vérifier les extensions Capacitor locales et la couche Electron.
