# capacitor-pont-natif-electron

[English version] · [Français](README.fr.md)

Created on 27 September 2026 by Bourama for the "live channel leaves the app" project (see `plan-canal-en-direct-pc.md` at the repository root), Lot S.

Electron implementation of the Capacitor `PontNatif` plugin. It uses the same plugin name as Android/iOS and is already called automatically by the web code (see `lib/supabase.ts`: `enregistrerToken` runs whenever the Supabase session changes, so no web-side change is required).

On Electron, `enregistrerToken` opens and maintains a **second WebSocket connection** to `clovis-backend`, dedicated to system actions (screen clicks, keyboard, application launching, and screen reading). It is separate from the main window's connection, which remains dedicated to clicks inside the Classinus page.

The click implementation tries Windows UI Automation and native Windows buttons without moving the mouse. `@nut-tree-fork/nut-js` is used for keyboard input and for the announced mouse fallback. Screen reading is text-based.

## Build this package

`capacitor-dossiers-electron` must be built first because this package reuses its `obtenirAppareilIdPc` function:

```bash
cd packages/capacitor-dossiers-electron && npm run build
cd ../capacitor-pont-natif-electron && npm install && npm run build
```

This produces `electron/dist/plugin.mjs`. Rebuild it after every change to `electron/src/plugin.mts`.

## Desktop and taskbar (4 October 2026)

The same `lire_ecran` tool can also read the desktop and the taskbar through its `zone` parameter: `"fenetre"` (default), `"barre_des_taches"`, or `"bureau"`.

The script locates the Windows Explorer windows by their classes (`Shell_TrayWnd`, `Progman`, `WorkerW`) and reads them like any other window, using the same element and coordinate format.

The desktop is read automatically when the student is looking at it (desktop in the foreground, or no other open window while the Classinus window is hidden). This had not been verified on a real Windows machine when this note was written. Check it during the first real test, especially whether desktop icons are hosted by `Progman` or `WorkerW` on that Windows version.

## Lot V: reading the foreground window with UI Automation

The `lire_ecran` operation no longer takes a screenshot. Following Bourama's decision on 28 September 2026, no image is sent to the model because image processing is too expensive.

Instead, it reads the foreground window as text using Windows UI Automation. A small PowerShell script is launched by `electron/src/lectureFenetreWindows.mts`. It is read-only and does not display another window.

The result contains the window title, application name, titles of other open windows, and visible elements (text, buttons, fields and their values, checkboxes, tabs, etc.), including screen coordinates for `cliquer_ecran`. Password field values are never read.

Classinus windows are identified by their process (`process.pid`): the main window is redirected to `lire_page`. When the overlay has focus, its Win32 handle is excluded and the visible window immediately underneath is read. Before a system keystroke or click, focus is restored to the target window.

The backend sends the limits (element count, text lengths, and timeout) with every request through `core/outils_action_agent_pc.py`. They are configured only there. If reading fails (PowerShell missing or blocked, or timeout), at least the title is returned in `titre_seul` mode.

Long text (documents and multiline fields) is read through the native COM UI Automation API (`IUIAutomation`, the script's `LectureTexteCom` class), not through the .NET wrapper `TextPatternRange.GetText()`, which crashes Windows PowerShell with an access violation on Windows 11. COM method order and GUIDs were checked against the Windows SDK's `uiautomationclient.h`. This had not yet been verified on a real Windows machine when the note was written.

### Open menus

An open menu, context menu, or dropdown list is a separate window and is absent from the foreground window's tree. The script therefore reads auxiliary windows positioned ABOVE the target window first (class `#32768`, or the same process with a tool/owned/untitled window, a title containing `Popup`, or `ComboLBox`). It reads up to six such windows.

Their elements are marked with `zone: "menu ouvert"`, and the result includes `menu_ouvert: true`.

### Keyboard input

`taper_clavier` writes into the window named by the model through the `cible` parameter (pure module `cibleSaisie.mts`, 12 October 2026). Without a target, or if the foreground window is not the requested one, no text is entered.

Before each text block, paste, newline, or internal shortcut, three signals are checked again:

1. The window identifier is unchanged.
2. The title still matches the target (to detect a tab switch).
3. The pointer has not moved by more than 60 pixels (to detect a field change in the same window; Classinus does not move the pointer while typing).

If the student takes control during typing, input stops immediately and Classinus is told how many characters have already been entered.

Test: `npm run test:cible-saisie`.

`appuyer_touches` (pure module `touchesClavier.mts`) presses individual keys and shortcuts such as `ctrl+c`, `alt+tab`, `win+d`, `enter`, and `ctrl+a ctrl+c`, just like a user. Unknown keys are rejected, keys are always released (Ctrl is never left pressed), and each shortcut is announced in the log before execution.

### Safety fallback

If PowerShell exits unexpectedly without returning anything (for example, a Windows crash while reading long document or field text, exit code 3221225477), the read is retried once without the long-text portion.

Classinus then receives the window structure (buttons, menus, and short fields) with `texte_long_ignore: true`. No retry occurs after a timeout.

### Priority real-machine tests

Test on Bourama's machine first:

- Notepad with a sentence entered: the text must be read.
- Chrome on any page: determine whether the page content is read or only the toolbar. Browsers build a complete accessibility tree only when an accessibility tool requests it; this behavior has not yet been confirmed.
- Display scaling at 100% and then 150%: do the coordinates returned to the AI point to the correct element for `cliquer_ecran`? The script declares itself DPI-aware through `SetProcessDPIAware` to align with the mouse, but agreement with `nut-js` has not been verified.
- A filled password field: its value must never appear.
- An application that exposes no accessibility information: it must return a clean `titre_seul` response.

`screenshot-desktop` is no longer used by this package. Its dependency may be removed from `package.json` (decision pending with Bourama).

## Items to verify during the first real test on Bourama's machine

- The renderer passes the API destination through `enregistrerToken({token, apiUrl})). The system channel and chat therefore use the same server, including in staging. Without `apiUrl`, the fallback is `CLASSINUS_API_URL`, then `https://api.classinus.com`.
- `@nut-tree-fork/nut-js` and `screenshot-desktop` contain platform-specific precompiled native modules. If a native module fails to load when the packaged app starts, rebuild it with `electron-rebuild` or an equivalent tool. This was not tested in this work because the Linux sandbox had no real Electron runtime; only TypeScript compilation was verified.
- `ouvrir_application` starts an executable with `spawn` and acknowledges startup immediately, without waiting for the process to exit.

## Lot T: system-action log and speech bubble

For each executed system action (click, keyboard input, application launch, screen read), this plugin emits an `actionSysteme` event to the main window:

- `debut`: a short sentence, for example "Classinus opened Notepad", before execution.
- `fin`: the result status, either `succes` or `erreur`, after execution.

The main window (`lib/superpositionElectron.ts`, `useJournalActionsSysteme`) creates a log entry and a speech-bubble sentence, exactly as it does for a click inside the page. The overlay receives these through the state snapshot introduced in Lot R.

Completion criterion on your machine: ask Classinus to open Notepad and write a sentence. With Notepad in the foreground, the log and overlay bubble must show the same types of entries as for an action inside the page.

## Independent click and announced fallback

When a classic Win32 or WinForms button exposes no UIA pattern, its handle and native class are checked before sending `BM_CLICK`. This path does not depend on the Windows pointer. Other incompatible controls use the announced mouse fallback described below.

`cliquer_ecran` first moves the drawn cursor to the target, then attempts a UI Automation action (button, checkbox, selection, menu, or field focus). No mouse driver is loaded on this path.

If no compatible action is available, the overlay displays **"I can't click this with my cursor alone. I'll use your cursor now."** before clicking with the real mouse, without asking the student to approve it. The pointer is restored to its original position unless the student has taken control. The overlay allows the click to pass through during the entire operation.

A UIA click that started but whose result is uncertain is never repeated, to prevent duplicate actions. Internal confirmations only concern the overlay display; no approval button is shown.

## What the student has circled (11 October 2026, channel pen, Lot 3)

The `lireElementsEntoures({ zones })` method receives one rectangle for each drawn stroke (pixels in the overlay page; see `lib/zonesCrayon.ts`). It converts them to screen pixels using the overlay window origin and zoom, plus the screen scale. It reads the foreground window using the same mechanism as `lire_ecran` and returns all read elements. Elements whose positions fall within a zone are marked `entoure` (the large model receives everything, with circled content first).

For a field or document whose text can be read (known window handle), the exact text under the stroke is read word by word and returned in `texte_entoure` (`LectureTexteCom.LireZone`, new code; normal reading is unchanged).

Without a handle (some browsers), only the field is marked as circled, not the words.

Conversion and selection logic live in `electron/src/zonesCrayon.mts` and are tested by `npm run test:zones-crayon`. On the website, see `lib/lectureEntoureCrayon.ts`. The Send button in the channel input field (`components/ControlesInteractionCanal.tsx`) calls it when a drawing is pending; see `lib/envoiCrayon.ts`.

Screen conversion and real reading had not been verified on an actual Windows machine when this was written. Check them during the first test, especially with display scaling at 125% or 150%.

## Background typing (12 October 2026)

When the window targeted by `taper_clavier` (the `cible` parameter) is NOT in the foreground, `ecritureArrierePlan.mts` writes text directly into its text field through UI Automation (`ValuePattern`). It appends to the end of the field without bringing the window to the foreground and without using the keyboard or mouse.

Safe failures before the marker file is created return `indisponible`. After the marker file is created, any failure returns `incertain` and the operation is never replayed.

Protected applications require student approval before writing.

Since 18 October 2026, a broader authorization policy exists for viewing, writing, opening, and clicking, with three buttons. It remains disabled unless the server sends `parametres.autorisation`. See the **Authorizations before release** section in `plan-canal-en-direct-pc.md`.

If the application does not support background writing (missing field, multiple fields without focus, or field not editable through accessibility), Classinus announces the fallback, brings the window to the foreground, and types without pausing. The student can stop it with Escape.

If the target window cannot be found, nothing happens and Classinus is notified. If the target is already in the foreground, the existing character-by-character typing behavior remains unchanged.

Test: `npm run test:ecriture-arriere-plan`. The PowerShell script itself can only be verified on a real Windows machine.

## Reading a background window (13 October 2026)

`lire_ecran` accepts a `fenetre_cible` parameter (the window title as displayed on screen, or the application name).

The window is selected from visible open windows (excluding Classinus), using the same matching logic as `ecritureArrierePlan.mts`: titles are compared without accents or case, and an exact title is preferred when multiple windows match.

If no window or more than one window matches, reading stops and returns the list of readable windows. It never chooses arbitrarily and never falls back to the foreground window.

A minimized window in the taskbar is not listed because its content cannot be read. The target is not brought to the foreground: UI Automation reads the background window without interacting with it. Open menus are not read because they belong to the foreground window.

The result includes `fenetre_visee: true`. Element coordinates are not clickable while the target is in the background, because a click would land on the foreground window. This option cannot be combined with `zone`.

Test: `npm run test:lecture-fenetre-visee`. The PowerShell script itself can only be verified on a real Windows machine.

## Clicking a classic Windows button without bringing its window to the foreground (13 October 2026)

For a classic Win32 button (the `BoutonWindows` action in `clicWindows.mts`), clicking uses `BM_CLICK` and the window is not brought to the foreground. The student keeps focus in the current window.

The only exception is a Windows dialog box (class `#32770`), which is activated before the click because Microsoft documents that `BM_CLICK` can fail on an inactive dialog.

Other actions (Invoke, Toggle, selection, expansion) are unchanged.

Known limitation: the click is coordinate-based, and the topmost window at that location is selected. A button fully hidden behind another window cannot be reached this way.

Test: `npm run test:clic-sans-premier-plan`. The test itself can only be verified on a real Windows machine.
