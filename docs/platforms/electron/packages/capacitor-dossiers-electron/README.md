# capacitor-dossiers-electron

[English version] · [Français](README.fr.md)

Created on 27 September 2026 by Bourama as part of the "live channel leaves the app" project (see `docs/specs/plan-canal-en-direct-pc.md` in docs/specs/), Lot Q.

Electron implementation of the Capacitor `Dossiers` plugin, currently limited to `obtenirInfosAppareil()`. It returns the PC's persistent device identifier, which `core/canal_agent_applicatif.py` in the backend uses with the `(user_id, appareil_id)` key to distinguish an Electron window from a regular browser tab.

The web code was not changed: `lib/canalAgentApplicatif.ts` already calls this plugin by name whenever `Capacitor.isNativePlatform()` is true (which the Electron platform reports natively).

The other `Dossiers` plugin methods already available on Android/iOS (designated-folder management) are not implemented here. That is a separate project and was not requested at the time.

## Why this is a separate local package instead of a file in `electron/`

`@capawesome/capacitor-electron` discovers plugin implementations by scanning project dependencies for a `"capacitor": {"electron": {"src": "..."}}` field in their `package.json`. It does not scan arbitrary files placed in `electron/`. That is why this local package is referenced from the repository root `package.json` through `"file:./packages/capacitor-dossiers-electron"`.

## Build this package

```bash
cd packages/capacitor-dossiers-electron
npm install
npm run build
```

This produces `electron/dist/plugin.mjs`, the exact path expected by the plugin contract. Rebuild it after every change to `electron/src/plugin.mts`; this is not automatic.

## Test on your Windows machine

From the root of the `clovis-frontend` repository:

```powershell
npm install
npm run build:capacitor
npx cap sync @capawesome/capacitor-electron
npx cap run @capawesome/capacitor-electron
```

To confirm that everything is connected, launch the Electron app and sign in. On the web side, `Capacitor.getPlatform()` must return `"electron"` (check the DevTools console in the window). A temporary log in `connecter()` (`clovis-backend/core/canal_agent_applicatif.py`) can confirm that the received `appareil_id` is no longer an empty string.
