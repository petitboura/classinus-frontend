# Classinus platforms

[English version] · [Français](PLATEFORMES.fr.md)

## Web

The web frontend is a Next.js application. The standard build retains Next.js server behavior and is the web target of this repository.

Main configuration: `next.config.mjs`, `package.json`, and the variables listed in [.env.local.example](../.env.local.example).

## Android and iOS

The mobile apps are built from this repository with Capacitor. They reuse the web interface and add the native capabilities required by each operating system.

```bash
npm run build:capacitor
```

The script generates the static export in `out/` and then runs `npx cap sync`. The native projects are in `android/` and `ios/`.

Final compilation requires the platform tools: Android Studio for Android and Xcode on macOS for iOS.

The dedicated test build is `npm run build:capacitor:test`. It targets the test environment configured in `next.config.mjs` and must not be used for a production release.

## Windows

The Windows app is built with Electron. The project and its main process are in `electron/`; desktop-specific Capacitor extensions are in `packages/`.

The installer build and release process, updates, and phone relay are documented in [Windows app publishing and updates](appli-pc-mise-a-jour-et-publication.md).

## Mobile release

Compliance, permissions, and release tasks are tracked in [Store submission tracking](soumission-stores.md). This is a dated checklist: verify every item in the Google Play and App Store consoles before a new submission.
