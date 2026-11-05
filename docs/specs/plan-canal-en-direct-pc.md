# Plan: move the live channel outside the app on PC

[English version] · [Français](plan-canal-en-direct-pc.fr.md)

Complete context for an AI implementing this project without asking Bourama basic questions again. All information below comes from an actual review of repository code, not assumptions. Still verify the current state of every referenced file before starting: this document dates from 27 September 2026, and Bourama works on several projects in parallel.

## Goal requested by Bourama

Today, Classinus can click and type, but only inside its own web page (the existing "live channel"). Bourama wants Classinus to act outside that page, across the entire PC (not just the browser), while keeping the following visible and functional regardless of which page or application is in the foreground:

- The virtual cursor and its speech bubble.
- The input bar and its controls (activation button, dictation, typing).
- The action log.

These three elements must be able to move over any page or application and remain above everything else. This requires a system-level overlay, not merely an overlay above a web page.

Decisions already approved by Bourama for this project:

- Scope: the entire PC, not just the browser.
- Chosen technology: Electron, confirmed instead of Tauri.
- No confirmation step before actions in this first phase. It will be added later; see the end of this document for the integration point.
- Build a robust solution from the beginning, not a disposable prototype.
- A feasibility test was completed and personally confirmed as successful by Bourama. A PowerShell script tested launching applications, keyboard input, screen reading, mouse control, and screenshots. Windows allows an installed program to perform these operations.

## Repositories involved

Two GitHub repositories under the `petitboura` account:

- Backend: formerly `clovis-backend`, now redirected to `petitboura/classinus-backend` (renamed 23–25 September 2026).
- Frontend: formerly `clovis-frontend`, similarly renamed to `petitboura/classinus-frontend`.

**Before cloning, verify the actual repository names** (GitHub redirects or a subsequent rename may have changed them again). These renames are recent and may have changed since this note was written.

## What already exists: the application-agent channel ("live channel")

This is the system Bourama calls the "live channel". It never targets one specific device: each request is broadcast to **all** open connections for the account at once (PC, browser, mobile), and the first connection that returns a real response (not "ignore") wins. The others silently ignore it.

### Backend: `core/canal_agent_applicatif.py` and `api/canal_agent_applicatif.py`

WebSocket route: `POST/WS /api/canal-agent-applicatif/ws` (file `api/canal_agent_applicatif.py`).

Exact handshake:

1. The client opens the WebSocket connection.
2. The client sends this as its first message: `{"auth_token": "<supabase_token>", "appareil_id": "<id>"}`. The token is never placed in the URL, so it cannot end up in proxy logs.
3. The backend validates the token through Supabase (`supabase.auth.get_user`). It closes the connection with code `4401` if the token is invalid or if no message arrives within 10 seconds.
4. `appareil_id`: an empty string (`""`) means a regular web/PC session; otherwise it is a native identifier specific to the device. **Important:** the connection key is `(user_id, appareil_id)`. A second connection using exactly the same key **replaces and closes** the first one (see `connecter()`). Therefore, if the Electron app opens a second connection dedicated to system actions (see Lot S below), it must use a different `appareil_id` from the main window. Otherwise the two connections will close each other.

After the handshake, the backend accepts three client message shapes:

- `{"id": ..., "resultat": ...}`: resolves the pending request with the matching ID (`recevoir_reponse`).
- `{"etat_actions": [...]}`: replaces the state of clickable elements pushed by this connection (`mettre_a_jour_etat_actions`).
- `{"message_etudiant": "...", "id_message": "..."}`: a message from the student while Classinus is acting (`accuser_message_etudiant`).

Functions that send a request **to** the frontend and wait for a response (all based on `_diffuser_et_attendre`, which broadcasts to every connection for the `user_id` and waits for the first valid response, with status thresholds at 5 and 15 seconds and timeout at 30 seconds):

- `demander_execution_action(user_id, action_id, on_statut)` sends `{"id", "action_id"}`.
- `demander_clic_generique(user_id, selecteur, description, on_statut)` sends `{"id", "selecteur_generique", "description"}`.
- `demander_pointage_action(user_id, action_id, on_statut)` sends `{"id", "montrer_action_id"}` (moves the cursor only; it does not execute anything).
- `demander_ecriture_champ(user_id, action_id, texte, on_statut)` sends `{"id", "action_id", "texte_a_ecrire"}`.

Functions that broadcast without waiting for a response:

- `pousser_texte_clovis(user_id, texte, duree_secondes=None)` sends `{"texte_clovis": texte}` (plus optional `duree_secondes`) to all connections. It is displayed in the speech bubble. The `dire_a_l_etudiant` tool (`core/outils_action_agent.py`) calls it while a turn is running.
- `demander_ouverture_canal(user_id, conversation_id, texte_suite)` is specific to the demo and is not central to this project.

The system is designed to be extended easily. Each new capability can reuse `_diffuser_et_attendre` with a new field name in the broadcast message, without changing the receive loop (`api/canal_agent_applicatif.py`). That loop already accepts any `{"id", "resultat"}` response, regardless of the original request type.

### Frontend: `lib/canalAgentApplicatif.ts` and visual components

This is a `"use client"` file, so it runs in the browser. `initialiserCanalAgentApplicatif()` initializes it once and opens/closes the connection based on tab visibility and the Supabase session state.

The client calculates `appareil_id` in `obtenirAppareilIdPourCanal()`: if `Capacitor.isNativePlatform()` is false (a regular web browser), it returns `""`. Otherwise, it calls the Capacitor plugin named `"Dossiers"` and its `obtenirInfosAppareil()` method, which returns `{appareilId: string}`.

**This mechanism already exists and is ready for any native platform, not just mobile.** If the Electron app uses Capacitor and reports `isNativePlatform() = true`, this code will work without modification, provided that an Electron native plugin with the same name exposes the same method (see Lot Q).

The eight message shapes recognized from the backend by `traiterMessage` are:

1. `{"accuse_message_etudiant": id, "pris_en_compte": bool}`
2. `{"message_etudiant_renvoye": string}`
3. `{"texte_clovis": string, "duree_secondes"?: number}` → speech bubble.
4. `{"ouvrir_canal_en_direct": {...}}`
5. `{"id", "action_id", "texte_a_ecrire"}` → simulated typing in a field.
6. `{"id", "action_id"}` → click.
7. `{"id", "selecteur_generique", "description"}` → generic click using a CSS selector.
8. `{"id", "montrer_action_id"}` → cursor pointing only.

All click/typing requests target DOM elements inside the Classinus page itself. They are identified by a `data-agent-id` attribute added automatically by a generic scan (`lib/scanElementsInteractifs.ts`, outside this project's scope). **This is the current limitation:** nothing can click outside that page.

Visual components involved, all in `clovis-frontend/components/`:

- `CurseurVirtuelAgent.tsx`: the cursor, positioned with `position: fixed`, `z-index: 10000`, and reading its state from the React context `ContexteCurseurVirtuel` (`lib/contexteCurseurVirtuel.tsx`). It can be dragged with the mouse when no action is running.
- `BulleDialogueAgent.tsx`: the speech bubble next to the cursor.
- `CanalEnDirectFlottant.tsx`: the floating group at the bottom left (activation button and `ControlesInteractionCanal.tsx`, which contains the input/dictation bar), positioned with `position: fixed`, `z-index: 65`, and draggable through `lib/useDeplacable.ts`.
- `BoutonJournalAgent.tsx`: the action-log button.
- All these visuals read state from the React contexts `ContexteCurseurVirtuel` and `ContexteCanalEnDirect` (`lib/contexteCanalEnDirect.tsx`). Those contexts are updated by `lib/canalAgentApplicatif.ts` as WebSocket messages arrive.

**Essential point to understand before continuing:** these are ordinary React `<div>` elements positioned with CSS inside a single page. They already float above that page's content (as Bourama requested and obtained on 19–20 September 2026), but not above the rest of the screen. As soon as the user changes tab, website, or application, they disappear with the browser window that contains them. That is exactly what this project must solve.

## Work packages

The packages follow the letter-based convention already used in the code. A, B, C, D, F, G, I, J, K, L, M, N, and P are already taken. Continue with Q, R, S, and T. Each package is a separate commit/PR and must end in a working state that can be tested independently.

Actual dependency order (the packages are not entirely independent, but each is a complete and verifiable deliverable): Q first (foundation), then R and S in either order once Q has been pushed, and T after both R and S.

---

### Lot Q: Electron shell and a PC-specific device identifier

**Goal:** run `clovis-frontend` inside a real installed Electron window with its own device identifier (not `""`), without changing any functional behavior. Nothing new is visible to the student in this package; it establishes the foundation.

**Work required:**

1. Add an `electron/` directory at the root of `clovis-frontend`, alongside `android/` and `ios/`. As with those projects, Electron is built directly in this repository rather than a separate repository (Bourama's decision on 25 August 2026; see the mobile project). Use the Capacitor Electron platform (`@capacitor-community/electron`), which loads the same static export generated by `npm run build:capacitor`. See the existing conditional logic in `next.config.mjs`, already used for Android/iOS.
2. Create a native Capacitor plugin named exactly `Dossiers`, matching the name already called by the web code in `obtenirAppareilIdPourCanal()` (`lib/canalAgentApplicatif.ts`). It must expose at least `obtenirInfosAppareil()`, returning `{appareilId: string}`. Generate the identifier as a UUID once, on first launch, and store it in a local file in Electron's `userData` directory. Follow the same approach as mobile `IdentifiantAppareil.kt` / `.swift` (`clovis-mobile`, 5 September 2026).
3. Do not modify `lib/canalAgentApplicatif.ts`. The code calling `Capacitor.isNativePlatform()` and the `Dossiers` plugin already exists and must work unchanged once Electron is recognized as a native platform.

**Completion criteria:** launch Electron, sign in with an account, and confirm that the application-agent channel opens with a non-empty `appareil_id`. This can be checked with a temporary log in backend `connecter()`, which must then be removed. Also confirm that an existing regular click (Lot F, generic click) works identically inside the Electron window.

**Out of scope:** no overlay window and no actions outside the Classinus page.

---

### Lot R: system overlay window (cursor, bubble, input bar, and log above everything)

**Depends on:** Lot Q, because Electron must be running.

**Goal:** keep the three elements requested by Bourama visible and active even when another application or website is in the foreground.

**Work required:**

1. In Electron's main process, open a **second** `BrowserWindow` in addition to the main window displaying `clovis-frontend`. It must be frameless (`frame: false`), transparent (`transparent: true`), always on top (`alwaysOnTop: true`, using the highest level available on Windows), and must not capture clicks where nothing is displayed. Toggle `setIgnoreMouseEvents` dynamically based on the active region.
2. Load a dedicated, minimal page in this overlay window (for example, a new route such as `app/(app)/agent-superposition/page.tsx` in `clovis-frontend`). Reuse `CurseurVirtuelAgent.tsx`, `BulleDialogueAgent.tsx`, `CanalEnDirectFlottant.tsx`, and `BoutonJournalAgent.tsx` as they are; do not rewrite them.
3. Solve the state-sharing problem. These components read their state from React contexts (`ContexteCurseurVirtuel`, `ContexteCanalEnDirect`) populated by `lib/canalAgentApplicatif.ts`, which runs in the **main** window (the one holding the real WebSocket connection and Classinus page DOM). The overlay window is a separate renderer and cannot access those contexts directly.

   Add an Electron IPC bridge: `ipcMain` in the main process relays messages between the two renderer windows, exposed through a secure preload script, with no direct `nodeIntegration` in the renderer. Every state change pushed into `ContexteCurseurVirtuel` or `ContexteCanalEnDirect` in the main window must be forwarded to the overlay. Every user interaction with the overlay (dragging the cursor, typing in the input bar, clicking the channel button) must travel back to the main window, which calls the existing functions (`envoyerMessageEtudiant`, etc.) exactly as if the user had interacted with the regular page.
4. Add a simple way to distinguish the Electron overlay window from normal web/mobile operation, so the bridge is enabled without changing other environments. Check `Capacitor.getPlatform() === "electron"` or an equivalent. Verify the actual value exposed by the Capacitor Electron plugin documentation when implementing this; do not guess the exact API name.

**Completion criteria:** with the Electron app running, open Notepad or any website in the foreground. The cursor, bubble, input bar, and log must remain visible and usable above it, exactly as they are inside the Classinus page today. Existing actions (clicking inside the Classinus page, Lot F) must continue to work and must be visible in the overlay even when the main Classinus window is not in the foreground.

**Out of scope:** still no real actions outside the Classinus page. This package is visual and relays state only; it gives Classinus no new ability to act on the rest of the PC.

---

### Lot S: new system-level action executor (screen click, keyboard, app launch, screen reading)

**Depends on:** Lot Q (device identifier). It does not functionally depend on Lot R; it can be tested without the visual overlay using logs, but it is only useful to the student once R is in place.

**Goal:** give Classinus the ability to perform real actions outside its own page, at operating-system level.

**Electron-side work (main Node process):**

1. Open a **second WebSocket connection** to `/api/canal-agent-applicatif/ws`, separate from the main window's connection (which remains dedicated to DOM clicks inside the Classinus page). This second connection runs in regular Node JavaScript using the `ws` library, not in a Capacitor renderer, because it needs system access that the browser blocks.

   Use an `appareil_id` **different** from the main window's identifier. Recall that two connections with the same `(user_id, appareil_id)` replace and close each other on the backend (see `connecter()`). For example, use the Lot Q UUID with a distinctive suffix.
2. Retrieve the Supabase session token (`auth_token`) from the already signed-in main window and pass it to the main process through IPC. Never store it in clear text on disk beyond what the existing app already does.
3. Use a cross-platform system-control library for Node (for example, `@nut-tree/nut-js`) to move the mouse and click exact screen coordinates, type with the keyboard, and launch an application through a normal process. For screen reading, a screenshot tool (for example, `screenshot-desktop`) is the simplest starting point. More detailed reading of open windows (window names and displayed text) can use native Windows APIs (UI Automation). Decide whether to add that based on the real difficulty encountered at implementation time, rather than deciding in advance here.

**Backend work** (additive only, in `clovis-backend/core/canal_agent_applicatif.py`; do not change existing code):

```python
async def demander_action_systeme(user_id: str, type_action: str, parametres: dict, on_statut=None) -> Any | None:
    """
    Same principle as demander_execution_action, but for actions outside
    the Classinus page DOM (screen-coordinate click, keyboard input,
    application launch, screen reading). Broadcasts
    {action_systeme, parametres} to all active connections. The dedicated
    Electron system connection (Lot S) executes the action; other
    connections (main web/DOM window and mobile) naturally ignore it
    because they do not recognize this message type.
    """
    correlation_id = str(uuid.uuid4())
    return await _diffuser_et_attendre(
        user_id,
        {"id": correlation_id, "action_systeme": type_action, "parametres": parametres},
        on_statut,
        on_timeout_log=f"action_systeme={type_action}",
    )
```

No change is required in `api/canal_agent_applicatif.py`: its receive loop already accepts any `{"id", "resultat"}` response, regardless of the original request type.

**Model tools:** add a new file or extend `core/outils_action_agent.py` to expose tools such as `cliquer_ecran(x, y)`, `taper_clavier(texte)`, `ouvrir_application(nom)`, and `lire_ecran()`. Each tool calls `demander_action_systeme` with the corresponding `type_action` and `parametres`.

**Completion criteria:** ask Classinus through chat to open Notepad and type a specific sentence, without the student touching anything. It must happen on the real screen, and the result must return to the model.

**Out of scope:** no confirmation before actions yet (see Bourama's decision below), and no unified visual logging with DOM actions yet (Lot T).

---

### Lot T: unify the log and speech bubble for DOM and system actions

**Depends on:** both Lot R (visual overlay) and Lot S (system actions) must be complete.

**Goal:** actions outside the page (Lot S) appear in the same log and bubble as actions inside the page (existing behavior), with no visible difference to the student.

**Work required:**

1. Immediately before sending the `{"id", "resultat"}` response for a system action (Lot S, Electron main process), also send an IPC event to the overlay window (Lot R) describing the action in one short sentence, such as "Classinus clicked on the screen", "Classinus opened Notepad", or "Classinus typed text". Follow the existing web implementation used by `pousserJournalDepuisAgent` / `mettreAJourJournalDepuisAgent` for DOM actions (`lib/contexteCanalEnDirect.tsx`).
2. Reuse backend `pousser_texte_clovis` without modification for spoken narration in the bubble. This mechanism is already generic and broadcasts to all connections. It will work for system actions just as it does for DOM actions, provided that the overlay window (Lot R) displays it correctly.

**Completion criteria:** from the student's point of view, a system action (Lot S) and a regular DOM action (existing behavior) produce exactly the same kind of log entry and bubble comment.

---

## Deliberately out of scope for now

- **Confirmation before sensitive actions:** Bourama decided to leave this out of the first phase. The natural integration point for later is backend `demander_action_systeme` (before broadcasting) and/or the Electron main process (before executing the action in Lot S). Add a list of sensitive actions (opening a payment site, deleting a file, etc.) and pause until the student explicitly approves through the overlay.
- **Mac:** this plan prioritizes Windows, matching Bourama's work environment. Extending to Mac requires Accessibility/Screen Recording permissions specific to that OS and a paid Apple Developer account, which Bourama did not have at the time.
- **Detailed screen reading (window names and exact displayed text):** deliberately left open for Lot S so the implementation can decide based on actual difficulty. Start with a simple screenshot; add Windows UI Automation if required.

## Lot V: read the contents of the window (completed 28 September 2026)

The detailed screen reading left open in Lot S has been implemented. `lire_ecran` reads the foreground window as text using Windows UI Automation (a PowerShell script launched from Electron's main process), without sending any image to the model.

See the **Lot V** section in `docs/platforms/electron/packages/capacitor-pont-natif-electron/README.md` and `plan-canal-en-direct-pc-lot-v.md` if that file exists in the repository.

On the backend, the four PC tools are now registered in `core/registre_outils.py` under category `agent_pc`, and are offered to the model only when a PC system connection is open (`core/main.py`, `a_connexion_systeme_pc`).

## Lot W: permanent live-channel button (completed 1 October 2026)

Bourama requested that the live channel can be activated at any time, even when the Classinus window is closed. The activation button is now the only overlay element displayed permanently. Other buttons appear with a transition when the channel becomes active.

- **Main window is hidden instead of closed** (`electron/arrierePlan.ts`). The close button hides the window; the app keeps running, and a tray icon near the clock offers **Open Classinus** and **Quit Classinus**. The main window holds the real channel connection; destroying it would disconnect the channel. If the tray icon cannot be created, closing the window exits the app as before.
- **Overlay remains permanently visible** (`plugin.mts`, `afficherSuperpositionPermanente`). It appears as soon as the main window pushes its first state and is removed when the main window exits AppShell (sign-out), so an inactive button does not remain on screen. This replaces the decision from 28 September 2026, when the overlay was hidden while the channel was inactive.
- **Only one PC button:** AppShell no longer mounts `CanalEnDirectFlottant` on Electron; only the overlay's button exists.
- **Adjustable idle opacity** (`lib/opaciteBoutonCanal.ts`, `components/ReglageOpaciteBoutonCanal.tsx`). A discreet control appears beside the button once the channel is active, with a live preview on the button. Opacity never drops below 15%; default is 50%, and it becomes 100% on hover and while the channel is active. The setting is stored locally in the overlay.
- **Start with Windows** (`electron/demarrage.ts`, `lancementSession.ts`). Enabled by default on the first launch of the installed app. It can be disabled in Settings > Preferences (`components/DemarrageAutomatiqueCarte.tsx`, plugin methods `lireDemarrageAutomatique` / `definirDemarrageAutomatique`). The app starts with the `--lancement-session` argument: no main window and no splash screen; only the button appears.

Known limitations: if the student is not signed in, AppShell is not mounted and the button appears only after signing in. Fully quitting the app (Quit in the tray icon) also removes the button.

## Authorization policy before release (frontend completed 18 October 2026; server work remains)

Bourama confirmed all these decisions on 18 October 2026:

- Classinus must ask the student for permission to view the screen, type, open an application, and click.
- **Normal application:** three buttons:
  - **Allow this time only:** applies to the entire current task in that application, including clicks. No question before every click.
  - **Always allow for this app:** remembered.
  - **Deny.**
  There is never a global "always allow" option.
- **Sensitive or unidentified application:** only two buttons, **Allow this time only** and **Deny**. The question is repeated before EVERY action, including clicks, and a risk warning appears above the buttons. Even if the student selected "always" for the app or browser, a sensitive page (detected through its title) asks again.
- Sensitive areas include money and payments, passwords, private messages, computer settings, computer commands, official documents, and health. The server supplies the list.
- Classinus is REQUIRED to request permission itself before an action it recognizes as sensitive (pay, delete, send). It uses the `demander_autorisation` action with two buttons every time.
- "Always allow" choices are stored on the student's account.
- Separate the behavior (PC application and website, this section) from the conditions (server-side rules that can be changed remotely without a new app version).

### Completed on the frontend (branch `feature/canal-en-direct-pc`)

- `electron/src/politiqueAutorisation.mts`: behavior for deciding, remembering, and writing the question text. Pure module, tested by `npm run test:politique-autorisation`.
- `plugin.mts`: connected to `lire_ecran`, `taper_clavier` (including background typing), `appuyer_touches` (Win+R is always sensitive), `ouvrir_application`, `cliquer_ecran`, and the new `demander_autorisation` action. One-time approvals are cleared at the beginning and end of every task (`armerArretGlobal`, `desarmerArretGlobal`, stop).
- `applicationsProtegees.mts`: the request now contains `boutons` and `risque`; the response is a choice (`cette_fois`, `toujours_appli`, `refuser`). Older boolean `true` and `false` responses are still supported.
- Bubble: `BandeauAutorisationAgent.tsx` displays the received buttons and warning. The website and PC app remain compatible in both directions, including an older version of one with a newer version of the other.
- Automatic reading is decided by the server and never asks a question. Without approval, it returns nothing and directs Classinus to `lire_ecran`, which requests permission.

### Switch: nothing changes until the server sends this block

Without `parametres.autorisation`, the PC application keeps its previous behavior. Only applications in `applications_protegees` request permission, with two buttons.

The server enables the new policy by adding the following block to the parameters of each PC action:

```json
{
  "autorisation": {
    "active": true,
    "applications_sensibles": ["powershell", "cmd"],
    "mots_titre_sensibles": ["banque", "paypal"],
    "applications_toujours": ["notepad"],
    "message_risque": "...",
    "message_risque_action": "...",
    "actions": ["lire", "ecrire", "ouvrir", "cliquer"]
  }
}
```

The values are:

- `applications_sensibles`: program names.
- `mots_titre_sensibles`: words in a window title, including browser page titles.
- `applications_toujours`: apps for which the student selected "always allow" on their account.
- `message_risque` and `message_risque_action`: optional custom warning text.
- `actions`: optional action list; all actions are enabled by default.

### Remaining server work (intentionally not done)

1. Send the `autorisation` block above with every PC action. Lists must be remotely configurable.
2. Store "always allow" choices on the account (table keyed by student and application, with a way to revoke them) and return them in `applications_toujours`. Until this is implemented, "always" lasts only until the PC app closes. The PC app already calls an integration point (`creerAccords({ surToujours })` in `plugin.mts`), currently empty. Use it to notify the server of a new choice.
3. Give Classinus the `demander_autorisation` tool (`{ texte }`) and add an instruction requiring it before every sensitive action. It must stop if the student refuses.
4. Define the message Classinus receives when automatic reading is not authorized. See `MESSAGE_LECTURE_NON_AUTORISEE` in `plugin.mts`.

### Known production issues to monitor

- A bank or messaging service open in Chrome is recognized only through the window title.
- Every click reads part of the screen to identify the target application. Measure the resulting latency.
- Reading happens locally before the permission question, but nothing is sent to Classinus before approval.
