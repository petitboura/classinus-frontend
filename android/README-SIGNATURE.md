# Signature de l'APK (flavor `externe`) — à faire une seule fois

Porté depuis `clovis-mobile/android/README-SIGNATURE.md` (25/08/2026) : ce
projet Capacitor (`clovis-frontend/android/`) est **la même app**
(`com.clovis.app`) que celle de `clovis-mobile`, donc si une clé a déjà été
générée là-bas, **réutilise le même fichier `.jks`** plutôt que d'en créer un
nouveau — deux clés différentes empêcheraient toute mise à jour de
s'installer par-dessus l'app existante.

**Confirmé par Bourama (22/09/2026) : la signature est déjà en place.**
L'app a déjà été publiée plusieurs fois et des mises à jour ont déjà été
livrées via GitHub Releases, ce qui veut dire qu'un `.jks` et un
`keystore.properties` fonctionnels existent déjà quelque part sur sa
machine (ce fichier n'a jamais été et ne sera jamais dans ce dépôt, voir
partie 2). Rien à générer ni à trancher : réutiliser tel quel ce qui a déjà
servi aux publications précédentes.

Le flavor `play` sera signé automatiquement par Google (App Signing) au
moment de la publication sur le Play Store, rien à faire ici pour lui. Ce
document concerne uniquement `externe`, distribué hors Play Store, qui doit
donc être signé "à la main", **toujours avec la même clé** pour que les
mises à jour s'installent par-dessus l'app existante sans désinstallation.

## 1. Générer la clé (une seule fois, à garder précieusement — sauter si déjà fait côté clovis-mobile)

Sur ta machine (nécessite le JDK, fourni avec Android Studio) :

```
keytool -genkeypair -v -keystore clovis-mobile-release.jks \
  -alias clovis-mobile -keyalg RSA -keysize 2048 -validity 10000
```

Choisis un mot de passe solide, et **note-le dans un gestionnaire de mots de
passe** : si tu perds ce fichier ou ce mot de passe, tu ne pourras plus
jamais mettre à jour l'app existante chez les étudiants qui l'ont déjà
installée, il faudra leur faire tout désinstaller/réinstaller.

## 2. Ne JAMAIS committer ce fichier

`clovis-mobile-release.jks` ne doit **jamais** se retrouver dans un dépôt Git
(public). Garde-le en dehors des dossiers `clovis-mobile/` et
`clovis-frontend/`, par exemple dans un dossier séparé sur ta machine, ou
dans un gestionnaire de secrets.

## 3. Configurer `keystore.properties`

Copie `android/keystore.properties.example` vers `android/keystore.properties`
(déjà dans `.gitignore`, ne sera jamais poussé), et remplis les vraies
valeurs (chemin vers le `.jks`, mots de passe, alias) — les mêmes valeurs que
côté `clovis-mobile` si tu réutilises la même clé.

## 4. À chaque nouvelle version

Depuis le 21/10/2026, la publication est automatique (voir la section "Appli
Android : publication de l'APK" du README principal et
`.github/workflows/publier-android.yml`) :
1. Mettre `versionName` et `versionCode` à jour dans
   `android/version-app.properties` (le seul endroit : `build.gradle` les lit dans
   ce fichier) et le mettre dans `main`. `versionName` doit être identique à
   l'étiquette de la release sans le "v" (étiquette `v1.6.0` = `versionName=1.6.0`).
2. Pousser l'étiquette `v1.6.0` sur ce commit. Le workflow construit l'APK signé,
   vérifie qu'il est signé avec la même clé que la release précédente, puis crée la
   release sur `petitboura/classinus-frontend` (dépôt interrogé par
   `VerificateurMiseAJour.kt` et par la page `/telecharger`).

La clé de signature reste la même : elle est conservée en secrets GitHub
(`ANDROID_KEYSTORE_BASE64` et les trois autres), jamais dans le dépôt.

L'app vérifie elle-même s'il existe une release plus récente que celle
installée (voir `VerificateurMiseAJour.kt`) : pas la peine d'en informer
les étudiants manuellement.
