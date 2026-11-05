# APK signing (the `externe` flavor): one-time setup

[English version] · [Français](README-SIGNATURE.fr.md)

Migrated from `clovis-mobile/android/README-SIGNATURE.md` (25 August 2026): this Capacitor project (`clovis-frontend/android/`) is **the same app** (`com.clovis.app`) as the one in `clovis-mobile`. If a key has already been generated there, **reuse the same `.jks` file** rather than creating a new one. Different keys would prevent updates from installing over the existing app.

**Confirmed by Bourama on 22 September 2026: signing is already configured.** The app has been published several times and updates have already been delivered through GitHub Releases. This means a working `.jks` file and `keystore.properties` already exist somewhere on his machine. The file has never been and must never be stored in this repository (see section 2). Nothing needs to be generated or decided: reuse exactly the key used for previous releases.

The `play` flavor is signed automatically by Google (Play App Signing) at release time. No action is required here for that flavor. This document applies only to `externe`, which is distributed outside Google Play and must therefore be signed manually, **always with the same key**, so updates install over the existing app without requiring uninstallation.

## 1. Generate the key once

Keep it safe. Skip this step if it has already been completed in `clovis-mobile`.

On your machine (requires the JDK, included with Android Studio):

```bash
keytool -genkeypair -v -keystore clovis-mobile-release.jks \
  -alias clovis-mobile -keyalg RSA -keysize 2048 -validity 10000
```

Choose a strong password and **store it in a password manager**. If you lose this file or its password, you will never be able to update the existing app for students who already installed it. They would have to uninstall and reinstall the app.

## 2. Never commit this file

`clovis-mobile-release.jks` must **never** be included in a Git repository, public or private. Keep it outside the `clovis-mobile/` and `clovis-frontend/` directories, for example in a separate folder on your machine or in a secrets manager.

## 3. Configure `keystore.properties`

Copy `android/keystore.properties.example` to `android/keystore.properties` (already listed in `.gitignore`, so it will never be pushed). Fill in the real values: path to the `.jks`, passwords, and alias. Use the same values as `clovis-mobile` if reusing the same key.

## 4. For every new version

Since 21 October 2026, publishing is automated (see **Android app: APK publishing** in the main README and `.github/workflows/publier-android.yml`):

1. Update `versionName` and `versionCode` in `android/version-app.properties` (this is the single source of truth; `build.gradle` reads the values from this file) and merge the change into `main`. `versionName` must match the release tag without the leading `v` (tag `v1.6.0` means `versionName=1.6.0`).
2. Push the `v1.6.0` tag on that commit. The workflow builds the signed APK, checks that it uses the same key as the previous release, then creates a release in `petitboura/classinus-frontend` (the repository checked by `VerificateurMiseAJour.kt` and the `/telecharger` page).

The signing key stays in GitHub secrets (`ANDROID_KEYSTORE_BASE64` and the three related values), never in the repository.

The app checks for a release newer than the installed version itself (see `VerificateurMiseAJour.kt`), so there is no need to notify students manually.
