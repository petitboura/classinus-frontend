# PC channel verification

[English version] · [Français](README-canal-pc.fr.md)

`npm run test:canal-pc` exercises the real reading/scanning modules, channel lifecycle, native plugin, Python WebSocket route, and the `lire_ecran` result sent to the model. Only external boundaries are simulated: test session, React contexts, Win32/PowerShell, and the nut-js driver.

## Setup

Requirements: Node 24 and the backend checkout for branch `fix/canal-pc-lecture-complete` in the neighboring `classinus-backend` directory.

```bash
npm ci --ignore-scripts
npx playwright install chromium
python -m pip install fastapi uvicorn websockets
npm run test:canal-pc
```

`BACKEND_REPO`, `PYTHON`, `CHROMIUM_PATH`, and `CHROMIUM_ARGS` can be used to select the checkout, Python interpreter, and local browser.

The test checks page text and values, masked passwords, visible popups, exclusion of channel buttons, an offline mirror, a hidden but reachable Electron renderer, a hidden web tab that is closed and reconnected, the system connection using the same API, launching an app without waiting for it to exit, native errors returned without losing the request, UI Automation reading independently of the mouse/keyboard driver, and preservation of text and coordinates by the backend. The LLM itself is not called.

## Additional test on Windows

With an active Windows desktop session:

```powershell
node tests/verifier-uia-windows.mjs
```

This second test creates a real WinForms window and uses actual PowerShell/UI Automation reading. It verifies text, buttons, values, passwords, a window underneath the overlay, and focus restoration. The GitHub workflow **Windows PC reading** also runs TypeScript builds.

## After a change

Rebuild the three local plugins (`npm run build` in `packages/capacitor-dossiers-electron`, then `packages/capacitor-pont-natif-electron` and `packages/capacitor-superposition-electron`), run the Capacitor build and Electron sync again, then package the app.

An already installed application keeps its old code until it is rebuilt. Builds on this branch always target the existing test backend, which must include Lot V (structured UIA reading) and the Electron CORS origin.

## Core screen-vision rule (permanent)

The AI must not miss anything visible, whether or not a component explicitly registers itself. The four rules (details in `REGLE_VISION_ECRAN`, backend `core/profils_agents.py`, sent with every message) are enforced by code:

1. Every visible element is listed, button by button, with a name. On the website this is handled by `lib/structureEcran.ts` (fallback names from referenced labels, icons, and position) and `lib/scanElementsInteractifs.ts` (elements that respond to clicks without a role, with disabled buttons marked). On PC, unnamed buttons remain in the reading with their automation ID and help text, while text content has a separate limit so it cannot crowd out buttons.
2. Windows and panels are identified by their structure (`zoneDeLElement`, UIA panels, and floating windows above the target). The AI opens a panel before clicking inside it.
3. An enlarge or full-screen button indicates what it enlarges.
4. `lire_ecran` also reads floating windows that remain on top; `lire_page` ends with a list of visible windows and panels.

Backend safeguard: `test_regle_vision_ecran.py` fails if a rule disappears from the prompt or if an element line loses its ending.
