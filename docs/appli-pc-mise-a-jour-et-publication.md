# Windows app: automatic updates and publishing

[English version] · [Français](appli-pc-mise-a-jour-et-publication.fr.md)

Written on 19 October 2026. This guide describes what has been prepared to publish the Classinus Windows app and update it automatically, as well as the remaining manual setup.

## What is already prepared

- **`MiseAJourPc` plugin** (`packages/capacitor-mise-a-jour-pc-electron)): uses `electron-updater` in Electron's main process. It checks 30 seconds after startup, then every 4 hours. It downloads updates in the background and never installs a prerelease or rolls back to an older version.
- **Installation:** the update is installed the next time Classinus fully exits (Quit from the tray icon, or Windows shutdown/restart), or immediately with the **Restart to install** button. Closing the window does not stop Classinus (`electron/arrierePlan.ts`), hence the button.
- **Classinus Update card** (`components/MiseAJourPcCarte.tsx`) in Settings, Preferences. It appears only in the installed PC app and shows the version, status, progress, and action button. The card's text is currently French and is not internationalized, like the other Settings cards.
- **Windows installer:** NSIS, per-user installation, no administrator rights required (`electron/electron-builder.config.js`). File name: `Classinus-Setup-X.Y.Z.exe`.
- **Publishing:** `.github/workflows/publier-pc.yml` builds the installer and publishes it in releases of the public `petitboura/classinus-updates-pc` repository. The installed app reads those releases; no token is embedded in the app.
- **Test:** `npm run test:mise-a-jour-pc` (update core, without Electron).
- **Bundled phone relay** (28 October 2026, decision D31): the workflow builds `Relais-Class-Tech.exe` from the `class-tech` repository (Python + PyInstaller) and includes it in the installer with default settings (`electron/relais-dist`, then `resources/relais` in the installed app). On startup, `electron/relais.ts` copies the new executable to `userData/relais` and creates `reglages.json` only on first launch, so student settings survive updates. The `RelaisPc` plugin (`packages/capacitor-relais-pc-electron`, `lib/relaisPc.ts`) launches the executable automatically when the app starts (29 October 2026, decision D37: no settings screen required), without a console window. It reads the local health page and stops the relay when the app exits. The **Phone relay** card (`components/RelaisPcCarte.tsx)) in Settings, Preferences, next to the update card, shows its status and the Start, Stop (manual fallback), and Health page actions. Test: `npm run test:relais-pc` (core, without Electron).

## One-time setup required

1. **Create the public `petitboura/classinus-updates-pc` repository**, with a README file. The repository must not be empty. It is used only to host releases.
2. **Create a GitHub token restricted to this repository** (fine-grained token, `classinus-updates-pc` repository, **Contents: Read and write** permission).
3. **In the `classinus-frontend` repository**, open Settings, Secrets and variables, Actions:
   - Add the `PC_RELEASES_TOKEN` secret with that token.
   - Confirm that `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` already exist (these are also used by mobile OTA) and point to **production**.
4. **Create a GitHub token with read-only access to the `class-tech` repository** (28 October 2026, bundled relay: fine-grained token, `class-tech` repository, **Contents: Read only** permission), then add it as the `CLASS_TECH_LECTURE` secret in `classinus-frontend` (same location). The workflow needs it to fetch the relay before building. Without it, publishing stops during configuration validation, before any build begins.

## Publish a version

After merging the branch into `main`, use an up-to-date clone of `main`:

```bash
git tag pc-v0.1.0
git push origin pc-v0.1.0
```

The workflow checks that the tag follows the `pc-vX.Y.Z` format, that its commit belongs to `main`, that configuration is complete, and that the target backend is not staging. It then builds the installer and creates a release in `classinus-updates-pc`. The app version is taken from the tag; no code change is required.

For automatic updates to run, the new version must be **higher** than the installed version (for example, 0.1.1 after 0.1.0).

## Test an update end to end

1. Publish `pc-v0.1.0`, download `Classinus-Setup-0.1.0.exe` from the release, and install it on a Windows PC.
2. Publish `pc-v0.1.1`.
3. Open Classinus, go to Settings, Preferences, and the **Classinus Update** card. Click **Check**. Version 0.1.1 downloads, then the **Restart to install** button appears.

Windows displays a SmartScreen warning on the first installation because the installer is not signed (see below).

## Build an installer without publishing it

On your Windows machine, from the repository root:

```bash
npm install
npm run build:capacitor
npx cap sync @capawesome/capacitor-electron
npm --prefix packages/capacitor-dossiers-electron run build
npm --prefix packages/capacitor-pont-natif-electron run build
npm --prefix packages/capacitor-superposition-electron run build
npm --prefix packages/capacitor-mise-a-jour-pc-electron run build
npm --prefix packages/capacitor-relais-pc-electron run build
cd electron
npm install
npm run pack
```

`npm run pack` never publishes (it uses `--publish never`). The installer is placed in `electron/dist`. Reminder: to test against the test backend, use `npm run build:capacitor:test` instead of `npm run build:capacitor`.

If the relay has not been built locally, the installer is produced WITHOUT the relay (a warning is shown during the build), and the Settings card displays **The phone relay is not included in this Classinus installation**. To test the relay locally, from the `class-tech` repository run `python relais/construire_exe.py` (with PyInstaller and `backend/requirements.txt` installed), then copy `dist-1clic/Relais-Class-Tech.exe` and `relais/reglages.json` into `electron/relais-dist` before running `npm run pack`.

## If a release is faulty

Automatic updates never roll back. Publish a higher version that fixes the issue, or delete the faulty release from `classinus-updates-pc` before devices download it.

## Known limitations

- **No Windows code signing:** SmartScreen warning during installation. Updates still work. To sign later, add signing configuration to `electron/electron-builder.config.js` without changing anything else.
- **First installer must be installed manually:** an app installed before the update plugin cannot update itself. The first installer containing the plugin must be downloaded from `classinus-updates-pc` releases.
- **The Download page** (`/telecharger`) has offered the Windows installer since 19 October 2026. On Windows, it reads the latest release from `classinus-updates-pc` (`lib/telechargementPc.ts`) and offers the `.exe` file with a note about the SmartScreen warning. Until a version is published, it displays an unavailable message. Mac and Linux users see a **Windows only** message and a phone QR code. The **Download for PC** item in the sidebar (just above Plus) appears only in a Windows browser (`lib/useProposerTelechargementPc.ts`), never on mobile or inside the installed app. The page is cached for about one minute, so a new release appears quickly.
- **No update badge** in the sidebar for the PC app. The existing badge (`lib/useMiseAJourDisponible.ts`) applies only to the Android APK.
- **Mobile OTA remains separate:** it runs on every push to `main` (`ota.yml`). The PC app is published only with a `pc-v...` tag.
