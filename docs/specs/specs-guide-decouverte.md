# Specifications: Classinus discovery guide (project started 16 September 2026, requested by Bourama)

[English version] · [Français](specs-guide-decouverte.fr.md)

Several AIs may work on different steps of this project in parallel. Always reread this file before starting a step. Never guess any item marked "open" below; ask Bourama if necessary.

## General context

Bourama wants an interactive guide that introduces Classinus to a new user one section at a time, without ever showing a long block of text.

The guide relies on two things that already exist in production and must not be rebuilt:

1. **Classinus knowledge base:** Supabase table `documents` (`agent_id = 'clovis'`), containing 17 articles named `01-vue-ensemble.md` through `17-capacites-ia.md`, read through the `gerer_base_connaissance` tool. See the "Section mapping" table below for the full list.
2. **Rich chat question** (project from 15 September 2026): Classinus can write a ```question``` block (JSON, eight types including `choix_unique`; see `lib/questionRiche.ts` and `components/chat/QuestionInteractive.tsx` in `clovis-frontend`). It is displayed as real clickable buttons and fields. Clicking sends a real sentence as the next message. This mechanism must be used for EVERY guide interaction (Continue, previous section, choosing a section, Try now / Just an example). Never build a separate button component for the guide; reuse the existing mechanism.

A conversation-level mode system already exists (pedagogical mode, plus button and `/` shortcut; see the "modes-pedagogiques-system-prompt" project). The guide must be an additional mode in that same system, not a separate mechanism.

## Rules approved by Bourama (never reinterpret)

- Only two entry points: a movable floating button visible on every page EXCEPT `/chat`, and an entry in the chat's existing `+` menu. Never add a separate button inside the chat itself.
- When triggered, Classinus itself proposes two choices through a `question` block of type `choix_unique`: **"I'll get started"** and **"I want to understand a section"**.
- **"I'll get started":** walk through all 17 sections in a fixed order from 01 to 17. No real randomization. The user may jump to another section or go backwards at any time. Navigation must not be locked to one-step-at-a-time progression.
- Explain every section step by step through several short messages, never one long text.
- **Chat section** (corresponds to article `02-chat.md` and especially `17-capacites-ia.md`): Classinus must demonstrate everything it can do (modes, buttons, generation types), grouped by category (Generate, Search, App actions, Utilities). For each tool or group, offer the student a choice between **"Try now"** (actually execute the tool) and **"Just an example"** (describe a demonstration without running the tool).
- **"I want to understand a section":** show user-friendly labels from the table below, never the technical filenames from the knowledge base.
- The guide must never bypass existing confirmation requirements for sensitive actions (GitHub, Notion, Google Drive). See `04-recherche-et-connecteurs.md` and `16-integrations-externes.md`.

## Section mapping (knowledge-base article → user-facing label)

| Article (table `documents`, agent `clovis`) | User-facing label |
|---|---|
| `01-vue-ensemble.md` | Overview |
| `02-chat.md` | The chat |
| `03-generation.md` | Content generation |
| `04-recherche-et-connecteurs.md` | Search and connectors |
| `05-bibliotheque.md` | Personal library |
| `06-memoire-et-profil.md` | Memory and profile |
| `07-skills.md` | Skills |
| `08-base-de-connaissance.md` | Classinus knowledge base |
| `09-bureau-enseignant.md` | Workspace (teacher) |
| `10-avancement-programme.md` | Programme and progress |
| `11-telephone.md` | Phone folders |
| `12-utilitaires.md` | Chat utilities |
| `13-outils-dynamiques.md` | Dynamic tools |
| `14-connecter-claude.md` | Connect Classinus to Claude |
| `15-concentration.md` | Focus |
| `16-integrations-externes.md` | External integrations |
| `17-capacites-ia.md` | What Classinus can do |

This table must be stored in a dynamic location (see step 1), not hard-coded in a component, in keeping with Bourama's general dynamic-data rule.

## One branch for the entire project

All steps, backend and frontend, must be pushed to **one dedicated branch** named `guide-decouverte` (one branch per repository: `guide-decouverte` in both `clovis-backend` and `clovis-frontend`). Never create a separate branch for each step.

If the relevant repository already has a `guide-decouverte` branch, check it out and commit on top of it. Otherwise, create it from the latest `main`.

## Independent steps

Each step below can be developed and pushed separately without waiting for the others. A step that depends on another can still be pushed on its own; it will simply have no real effect until the dependency is pushed too. It must never crash or break current user behavior.

### Step 1 (backend, `clovis-backend`): guide-section reference data

Create a small Supabase table (proposed name: `guide_sections`) with columns `nom_article`, `libelle_utilisateur`, `accroche_courte`, and `ordre`, based on the mapping above. No dependencies; nothing consumes the table yet.

Open decision: confirm the exact table and column names with Bourama before creating the migration, in case another AI reaches this step first.

### Step 2 (backend): conversation mode "guide"

Build on the existing conversation mode system (pedagogical mode). Add one more mode value ("guide"), stored per conversation like the current pedagogical mode.

This step is independent: it can be pushed even if the frontend does not activate it yet. It can be tested by changing the value manually in the database, as in previous projects.

### Step 3 (backend, prompt content): system instruction for guide mode

Write the system instruction injected into the prompt when "guide" mode is active (see step 2). It must tell Classinus to:

- Use `gerer_base_connaissance` to read the 17 articles.
- Use a `question` block of type `choix_unique` at every transition.
- Never output a long block of text.
- Respect the fixed section order while allowing the user to jump.
- For the chat section, apply the **Try now / Just an example** choice for every tool group.

Open decision before writing this prompt: should the list shown for "I want to understand a section" be a `question` / `choix_unique` block generated by Classinus from the table created in step 1 (no new frontend component), or a separate interface list (menu/cards) implemented in the frontend? Do not guess. Ask Bourama.

This step depends on step 2 to be enabled in production, but the instruction text can be written and stored before step 2 uses it.

### Step 4 (frontend, `clovis-frontend`): floating button

Create a movable floating component whose position is remembered per user and which appears on every page except `/chat`. Clicking it must activate guide mode (step 2) for a conversation and open the chat.

Open decision: should the click open a new conversation dedicated to the guide, or activate guide mode in the current conversation? Do not guess. Ask Bourama.

This step is independent and can be pushed before the backend mode exists. It will simply have no real effect until step 2 is pushed.

### Step 5 (frontend): "Guide" entry in the chat plus menu

Same trigger as step 4 (activate guide mode and open the chat), but accessible through the chat's existing `+` menu. Never add a separate visible button inside the chat; this is an explicit rule from Bourama.

This step is independent and has the same dependency behavior as step 4.

## What is NOT a separate step

The section list for "I want to understand a section" and the grouped tool demonstrations in the chat section belong to the guide-mode instruction content (step 3). They are not separate UI components, unless Bourama resolves the open question in step 3 in favor of a separate frontend component.
