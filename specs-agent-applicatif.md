# Project plan: Classinus application agent (Classinus can act inside the app)

[English version] · [Français](specs-agent-applicatif.fr.md)

Written on 15 September 2026, after an actual audit of `clovis-frontend` and `clovis-backend`. This file is intended to be picked up by one or more AIs working in parallel, each on a dedicated branch for its own task.

**Progress (16 September 2026):** tasks A, B, C, D, E, and F were added to the `chantier-agent-applicatif` branch (frontend and backend). Remaining: task G (guidance mode), the proof of concept limited to one section as decided in section 6 (still needs to be connected to a real app section), and visual verification on all three platforms (no one has opened the app with this code yet).

## 1. Decisions already approved by Bourama (do not reopen)

- Scope: Classinus can inspect the app state and act (click, navigate) like the user, but only inside the Classinus app itself, never elsewhere on the PC or phone.
- Two combined mechanisms: a structured action catalogue for common journeys, plus a generic fallback mode (DOM + selector) for everything else.
- Reuse the same system for a guidance mode (guided tour of a new feature), pausing at every step.
- Three platforms: web, native mobile (Capacitor), and PC. All three run the same Next.js code, so one system is sufficient.
- A visible virtual cursor is overlaid on the interface. It moves along a non-straight path, never a straight line, and visually simulates the click.
- Never tell Classinus that it can act on an element that is disabled, absent, or invisible on screen. The available-action list must always be calculated from the real current state, never learned once and reused as a static list.
- The interface state is continuously pushed to Classinus, not only reread at each conversation turn. This applies to autonomous actions and guidance mode.
- Two sensitivity levels coexist: some actions require confirmation and others do not. An action with no declared sensitivity is ALWAYS treated as sensitive by default.
- Confirmation for a sensitive action uses a dialog with a button, never a free-form question in chat.
- If an action fails midway (element disappeared, page changed), notify the student and retry. Some specific cases, such as an action with an effect independent of the screen (submit, send, save), may continue in the background even if the student changes page. Decide case by case; see section 5.
- There is no limit to the number of consecutive actions Classinus can perform without asking the student again. If an action fails in a chain, Classinus decides whether the remaining actions are independent of the failed action, using the same logic as consecutive tool calls in chat. If they are independent, continue; otherwise stop at that step without undoing completed work.
- Any new Supabase table or column for this project must be strictly additive. Never modify a table already used in production. Develop on a dedicated branch and merge into `main` only when the code is ready.

## 2. Audit findings (15 September 2026; recheck before coding if time has passed)

- **Existing real-time channel:** `lib/canalTempsReel.ts` (frontend WebSocket) and `core/canal_temps_reel.py` (backend). Currently used for native folder exploration (`poser_question_appareil`: the backend asks the open device a question and waits for its response in the same reasoning turn). This is the most natural foundation for continuous state updates and action execution, but **confirm with Bourama** whether to extend this channel or create a separate one dedicated to the application agent (see section 4, open decision).
- **Existing frontend event bus:** `lib/evenementsDonnees.ts`, a simple `CustomEvent` on `window` that refreshes sections when the AI changes data from chat. A different pattern (local, not network-based), but the same principle: one source of truth, never a manually maintained list.
- **Existing backend tool registry:** `core/registre_outils.py` (MCP server catalogue) and the Supabase `registre_outils_plateforme` table (tool availability by tool, category, and server). A known issue has already occurred and is documented: server-side cache lasts 24 hours. Use `forcer_rechargement_catalogue_outils` or restart Railway when a new tool must become visible immediately.
- **Frontend structure:** Next.js App Router (`app/(app)/...` for authenticated sections), components in `components/`, hooks/contexts in `lib/`. There is no existing mechanism for declaring action metadata directly on a component; task A must build it from scratch.
- **Repository convention:** never use an em dash in user-visible text (`CLAUDE.md`). Check this before delivering visible text.

## 3. Constraints that apply to every task below

- The virtual cursor must never move in a straight line.
- Undeclared sensitivity means sensitive by default.
- Confirmation uses a dialog with a button only.
- Never modify a Supabase table already used in production; additive changes only, on a dedicated branch.
- Never use an em dash in user-visible text.
- Any AI taking over a task below must read `djiguigne-standards-dev` and, for frontend work, `djiguigne-standards-frontend` before writing a single line of code.
- Never assume the audit in section 2 is still accurate. Recheck the actual repository state before starting.

## 4. Phase 0: shared foundation (sequential, must be decided before the rest)

- **0.1** Decide with Bourama whether to extend the existing real-time channel (`canal_temps_reel.py` / `canalTempsReel.ts`) to carry the new messages (pushed state and action execution request), or create a separate channel dedicated to the application agent. This blocks the start of tasks C and D.
- **0.2** Create a dedicated branch for the entire project in both `clovis-frontend` and `clovis-backend` (branch name to be confirmed with Bourama), separate from `main`, and merge only when ready, as done for the "image-to-large-model" project.

## 5. Tasks

Dependencies are noted. Tasks without shared dependencies can genuinely proceed in parallel.

### Task A: declare action metadata on frontend components

**Dependency:** none.

Allow a component (button, field, section) to declare in its own code an action name, description, activation condition, and sensitivity level (sensitive/non-sensitive; default to sensitive if omitted).

The goal is to obtain at any moment the list of actions that are actually mounted, visible, and active, without relying on a list learned in advance. It can be designed and tested with dummy components before being connected to the rest of the app.

### Task B: virtual cursor (frontend)

**Dependency:** none.

Create an overlay component that moves towards provided coordinates along a non-straight trajectory, stops, and visually simulates a click. It can be tested in isolation with hard-coded coordinates, which must be removed before the final merge and must never remain hard-coded in production.

### Task C: new MCP tool to trigger an action (backend)

**Dependency:** Phase 0.1.

Add a new tool exposed ONLY in student chat (never through the public MCP server, following the same rule as `verifier_consignes_code_actif`). It sends an action execution request to the active device through the channel selected in phase 0.1 and waits for the result.

Add the tool to `registre_outils_plateforme`. Immediately account for the known 24-hour cache issue: call `forcer_rechargement_catalogue_outils` or plan a restart.

### Task D: continuous interface-state updates (frontend + backend)

**Dependencies:** A (nothing can be reported without component declarations) and Phase 0.1 (channel).

Whenever an element declared in task A appears, disappears, or changes state (active/inactive), push a message through the selected channel.

Before coding, decide with Bourama which changes should be reported to avoid noise. Likely only mount/unmount and state changes for declared elements, never raw events such as typing or scrolling.

### Task E: confirmation dialog for sensitive actions (frontend)

**Dependency:** A, to identify declared sensitivity.

Create a generic modal dialog with one button, displayed whenever a sensitive or undeclared action is requested.

### Task F: generic DOM + selector fallback (frontend)

**Dependency:** A, to avoid duplicating an already structured action and reuse the same live verification logic.

This is a fallback for elements that do not yet declare an action. A mandatory double-check must happen immediately before the real click: does the element still exist, is it visible, and is it enabled? Checking only when the model decides is not sufficient.

### Task G: guidance mode / guided tour (frontend)

**Dependencies:** A, B, and D.

Reuse declared actions and the virtual cursor, but pause at every step. It can be implemented in parallel on its own branch, but it cannot be tested in real conditions until A, B, and D are in place.

## 6. Open decisions for Bourama before coding begins

1. Network channel (0.1): extend the existing one or create a new one?
2. Exact name and parameters for the new MCP tool (task C).
3. Behavior when an action "can continue in the background if the page changes" (case 2 in the failure discussion): should this be an extra parameter on every action (in task A metadata), or handled another way? Do not guess.
4. Scope of the first release: a proof of concept limited to one app section (for example, the library) before generalizing, or the whole app from the start?
5. Name of the shared project branch (0.2).

## 7. Reminder for any AI taking over this file

- Read `djiguigne-standards-dev` (and `djiguigne-standards-frontend` for frontend work) before writing code.
- Recheck the actual repository state before relying on the audit in section 2.
- Do not code without Bourama's explicit confirmation on the open decisions in section 6.
- Explain everything to Bourama in simple language, without unnecessary jargon. He does not have a traditional coding background.
