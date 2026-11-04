# capacitor-superposition-electron

[English version] · [Français](README.fr.md)

Created on 27 September 2026 by Bourama for the "live channel leaves the app" project (see `plan-canal-en-direct-pc.md` at the repository root), Lot R.

Electron implementation of the Capacitor `SuperpositionAgent` plugin. It provides an IPC bridge between the main window (real WebSocket connection and the Classinus page DOM) and the system overlay window (frameless, transparent, always on top, and brought to the top every 500 ms; see `electron/main.ts`).

Main methods:

- `pousserEtat`: main window → overlay, converting cursor coordinates from page-local to absolute screen coordinates.
- `envoyerInteraction`: overlay → main window.
- `maintenirCapture`: the overlay reports that the user is pressing one of its elements. Electron determines the rest of click-through behavior by tracking pointer position, without receiving the PC's mouse-movement events.

Since 1 October 2026 (the permanent channel button, Lot W in the plan), the overlay remains visible after the main window pushes its first state. It is removed when `pousserEtat` is called with `retirer: true`. The plugin also exposes two methods for automatic startup with Windows: `lireDemarrageAutomatique` and `definirDemarrageAutomatique`.

Since 11 October 2026 (channel drawing tool), `definirModeCrayon` makes the overlay capture the mouse across the entire screen while the pen is active. `definirRaccourcisCrayon` registers three system shortcuts (show the pen, restore strokes, erase strokes) while the channel is active. They are forwarded to the page through the `crayon` event. The logic is in `electron/src/raccourcisCrayon.mts` and is tested by `npm run test:raccourcis-crayon`.

See the comments in `electron/src/plugin.mts` for implementation details, and `lib/superpositionElectron.ts` (repository root) for the exact shape of the state and interactions being transported.

The reason for keeping this as a separate local package rather than putting it directly in `electron/` is the same as for `capacitor-dossiers-electron` (Lot Q): `@capawesome/capacitor-electron` discovers plugins through the `"capacitor": {"electron": {"src": "..."}}` field in a dependency's `package.json`, not by scanning arbitrary files inside `electron/`.

## Build this package

```bash
cd packages/capacitor-superposition-electron
npm install
npm run build
```

This produces `electron/dist/plugin.mjs`. Rebuild it after every change to `electron/src/plugin.mts`.

## Test on your Windows machine

From the root of the `clovis-frontend` repository:

```powershell
npm install
npm run build:capacitor
npx cap sync @capawesome/capacitor-electron
npx cap run @capawesome/capacitor-electron
```

Lot R is complete when the Electron app is running and you open Notepad or any website in the foreground: the cursor, speech bubble, input bar, and action log must remain visible and usable above it.

## Focus and keyboard behavior (12 October 2026)

On Windows, the overlay window is created as non-focusable (`focusable: false` in `electron/main.ts`). Clicking the bubble, a button, or the pen normally reaches the overlay without activating it, so the window underneath does not lose focus.

`definirSaisieTexte({ actif })` makes the overlay focusable only while the student is typing in one of its text areas (the page calls it from `PageAgentSuperpositionClient.tsx` and `ControlesInteractionCanal.tsx`), then makes it non-focusable again.

Making the overlay non-focusable was not enough to restore activation to the underlying window. The diagnostic log from 18 October 2026 showed no focus loss. The plugin therefore records the active window before text entry and restores it afterward with `SetForegroundWindow` (`electron/src/focusPrecedent.mts`, Windows calls through the native `koffi` module).

If the student clicks another window in the meantime, nothing is restored. If `koffi` fails to load, the reason is written to the log (the `FOCUS` line) and the overlay continues to work as before. If the overlay itself loses focus, it becomes non-focusable again. There is no behavior change outside Windows.

Test: `npm run test:focus-precedent`.
