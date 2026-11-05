> [English version](./PLATEFORMES.md) · **Version française**

# Plateformes Classinus

## Web

Le frontend Web est une application Next.js. Le build standard conserve le fonctionnement serveur de Next.js et constitue la cible Web du dépôt.

Configuration principale : `next.config.mjs`, `package.json` et les variables décrites dans [.env.local.example](../.env.local.example).

## Android et iOS

Les applications mobiles sont produites depuis ce dépôt avec Capacitor. Elles réutilisent l’interface Web et ajoutent les capacités natives nécessaires à chaque système.

```bash
npm run build:capacitor
```

Le script génère l’export statique dans `out/`, puis lance `npx cap sync`. Les projets natifs se trouvent dans `android/` et `ios/`.

La compilation finale nécessite les outils de la plateforme : Android Studio pour Android et Xcode sur macOS pour iOS.

Le build de test dédié est `npm run build:capacitor:test`. Il cible l’environnement de test configuré dans `next.config.mjs` et ne doit pas être utilisé pour une publication de production.

## Windows

L’application Windows repose sur Electron. Le projet et son processus principal se trouvent dans `electron/` ; les extensions Capacitor spécifiques au bureau sont dans `packages/`.

La construction et la publication de l’installeur, les mises à jour et le relais téléphone sont documentés dans [Publication et mise à jour de l’application PC](appli-pc-mise-a-jour-et-publication.md).

## Publication mobile

Le suivi de conformité, les permissions et les tâches de publication sont recensés dans [Suivi de soumission aux stores](soumission-stores.md). Ce document est une checklist datée : vérifier chaque point auprès des consoles Google Play et App Store avant une nouvelle soumission.
