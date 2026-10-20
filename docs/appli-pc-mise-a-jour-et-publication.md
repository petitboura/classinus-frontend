# Appli PC (Windows) : mise à jour automatique et publication

Écrit le 19/10/2026. Ce guide décrit ce qui a été préparé pour publier l'appli PC
de Classinus et la mettre à jour toute seule, et ce qu'il reste à faire à la main.

## Ce qui a été préparé

- **Plugin `MiseAJourPc`** (`packages/capacitor-mise-a-jour-pc-electron`) : utilise
  `electron-updater` dans le processus principal d'Electron. Il vérifie 30 secondes
  après le démarrage, puis toutes les 4 heures. Il télécharge en arrière-plan, sans
  jamais installer de préversion ni revenir à une version plus ancienne.
- **Installation** : au prochain vrai arrêt de Classinus (quitter depuis l'icône près
  de l'horloge, arrêt ou redémarrage de Windows), ou tout de suite avec le bouton
  « Redémarrer pour installer ». Fermer la fenêtre n'arrête pas Classinus
  (`electron/arrierePlan.ts`), d'où le bouton.
- **Carte « Mise à jour de Classinus »** (`components/MiseAJourPcCarte.tsx`), dans
  Paramètres, Préférences. Elle n'apparaît que dans l'appli PC installée. Elle
  montre la version, l'état, la progression et le bouton. Les textes sont en
  français sans i18n, comme les autres cartes des Paramètres.
- **Installeur Windows** : NSIS, par utilisateur, sans droits administrateur
  (`electron/electron-builder.config.js`). Fichier : `Classinus-Setup-X.Y.Z.exe`.
- **Publication** : le workflow `.github/workflows/publier-pc.yml` construit et
  publie l'installeur dans les releases du dépôt public `petitboura/classinus-updates-pc`.
  L'appli installée lit ces releases : aucun jeton n'est embarqué dans l'appli.
- **Test** : `npm run test:mise-a-jour-pc` (noyau de mise à jour, sans Electron).

## À faire une seule fois (toi)

1. **Créer le dépôt public `petitboura/classinus-updates-pc`**, avec un fichier README (le
   dépôt ne doit pas être vide). Il sert uniquement à héberger les releases.
2. **Créer un jeton GitHub limité à ce seul dépôt** (jeton à granularité fine,
   dépôt `classinus-updates-pc`, permission « Contents : Read and write »).
3. **Dans le dépôt `classinus-frontend`**, Settings, Secrets and variables, Actions :
   - ajouter le secret `PC_RELEASES_TOKEN` avec ce jeton ;
   - vérifier que les variables `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `NEXT_PUBLIC_APP_URL` existent déjà (ce sont
     celles de l'OTA mobile) et valent bien la **production**.

## Publier une version

Après la fusion de la branche dans `main`, depuis un clone à jour de `main` :

```
git tag pc-v0.1.0
git push origin pc-v0.1.0
```

Le workflow vérifie que l'étiquette a la forme `pc-vX.Y.Z`, que le commit est dans
`main`, que la configuration est complète et que le backend visé n'est pas le
staging. Il construit ensuite l'installeur et crée la release dans `classinus-updates-pc`.
La version de l'appli est prise dans l'étiquette : rien à modifier dans le code.

Pour que la mise à jour automatique se déclenche, la nouvelle version doit être
**plus grande** que celle installée (0.1.1 après 0.1.0, par exemple).

## Tester la mise à jour pour de vrai

1. Publier `pc-v0.1.0`, télécharger `Classinus-Setup-0.1.0.exe` depuis la release,
   l'installer sur un PC Windows.
2. Publier `pc-v0.1.1`.
3. Ouvrir Classinus, aller dans Paramètres, Préférences, carte « Mise à jour de
   Classinus », cliquer sur « Vérifier ». La version 0.1.1 se télécharge, puis le
   bouton « Redémarrer pour installer » apparaît.

Windows affiche un avertissement SmartScreen à la première installation : l'installeur
n'est pas signé (voir plus bas).

## Construire un installeur sans rien publier

Sur ta machine Windows, depuis la racine du dépôt :

```
npm install
npm run build:capacitor
npx cap sync @capawesome/capacitor-electron
npm --prefix packages/capacitor-dossiers-electron run build
npm --prefix packages/capacitor-pont-natif-electron run build
npm --prefix packages/capacitor-superposition-electron run build
npm --prefix packages/capacitor-mise-a-jour-pc-electron run build
cd electron
npm install
npm run pack
```

`npm run pack` ne publie jamais (option `--publish never`). L'installeur est dans
`electron/dist`. Rappel : pour tes tests contre le backend de test, utiliser
`npm run build:capacitor:test` à la place de `npm run build:capacitor`.

## Si une version est mauvaise

La mise à jour automatique ne revient jamais en arrière. Publier une version plus
grande qui corrige le problème, ou supprimer la release défectueuse dans
`classinus-updates-pc` avant que les appareils ne la téléchargent.

## Limites connues

- **Pas de signature Windows** : avertissement SmartScreen à l'installation. Les
  mises à jour fonctionnent quand même. Pour signer plus tard, ajouter la
  signature dans `electron/electron-builder.config.js`, sans rien changer d'autre.
- **Premier installeur à la main** : une appli déjà installée avant le plugin ne
  peut pas se mettre à jour toute seule. Le premier installeur à jour se télécharge
  dans les releases de `classinus-updates-pc`.
- **La page Télécharger** (`/telecharger`) propose l'installeur Windows depuis le
  19/10/2026. Sur Windows, elle lit la dernière release de `classinus-updates-pc`
  (`lib/telechargementPc.ts`) et propose le fichier `.exe`, avec une note sur
  l'avertissement SmartScreen. Tant qu'aucune version n'est publiée, elle affiche
  un message d'indisponibilité. Mac et Linux voient un message « Windows
  seulement » et un QR pour le téléphone. Le bouton « Télécharger pour PC » de
  la barre latérale (juste avant la ligne Classinus) n'apparaît que dans un
  navigateur sur Windows (`lib/useProposerTelechargementPc.ts`), jamais sur
  mobile ni dans l'appli installée. La page est mise en cache environ une minute : une nouvelle version
  publiée apparaît donc rapidement.
- **Pas de pastille** de mise à jour dans la barre latérale pour l'appli PC (celle
  qui existe, `lib/useMiseAJourDisponible.ts`, ne concerne que l'APK Android).
- **L'OTA mobile reste séparée** : elle se déclenche à chaque push sur `main`
  (`ota.yml`). L'appli PC se publie uniquement avec une étiquette `pc-v...`.
