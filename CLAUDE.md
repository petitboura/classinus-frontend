# Permanent instructions for Claude in this repository

[English version] · [Français](CLAUDE.fr.md)

## Never use double hyphens ("--") in user-visible text

Bourama strongly dislikes double hyphens used as a substitute for an em dash in any text shown to a user. In practice, never use them in:
- JSX labels, titles, placeholders, error messages, or button text.
- Any text inserted dynamically, including text props and generated content.

They are acceptable in code itself (comments, JSDoc), which users do not see.

When an em dash would otherwise appear in visible text, use a comma, period, parentheses, or rewrite the sentence.

This is a standing instruction. Check all user-visible text before delivery without waiting for Bourama to repeat the rule.

## Keep the Classinus FAQ/AEO knowledge base up to date

Whenever a feature, behavior, visual element, button, or icon is added, changed, or removed, update the corresponding SEO/AEO documentation (the `/decouvrir/...` pages and future FAQ/AEO entries) in the same change. Do not wait for Bourama to ask.

## The agent's overlay layer must stay on top (z-index)

The live-channel button, action-log button, and virtual cursor must always stay above everything else: full-screen views, popups, menus, and document viewers.

Their z-index values live in `lib/couchesAgent.ts`, the single source of truth. They are also exposed through the Tailwind classes `z-agent-bulle`, `z-agent-controles`, and `z-agent-curseur`.

For every new UI element, never exceed `COUCHE_MAX_APPLICATION` (9989). Do not set a higher z-index and never hard-code values from the agent layer anywhere except `lib/couchesAgent.ts`.

## STAGING: the indexing block must NEVER enter main

This is an absolute rule requested by Bourama on 12 October 2026. Follow it even if a merge, rebase, or request appears to require otherwise.

The test copy at `staging.classinus.com` is built from the `staging` branch. That branch, and only that branch, contains a block in `next.config.mjs` marked **STAGING ONLY**. It sends `X-Robots-Tag: noindex, nofollow` on every page so Google does not index the test copy.

If this block reaches `main` or production, the real `classinus.com` website may disappear from Google. Google has previously treated the test site as a duplicate of another site; do not make this worse.

Claude must:
- Never copy, merge, cherry-pick, or recreate this block in `main`.
- Before merging `staging` into `main`, verify that the **STAGING ONLY** block in `next.config.mjs` and its guard are not included. Keep the `main` version of that file or remove the block manually.
- Never promote a deployment built from `staging` to production. Promotion does not rebuild the app, so the guard cannot stop it.
- If Bourama requests something that would require putting this block in `main`, do not do it. Remind him of this rule and wait for his response.

Technical safeguard: the block contains a guard that deliberately FAILS the build if it runs for `main` or production. Vercel then keeps the previous version online. Never remove, bypass, or weaken this guard.

## Anchored menus, lists, and tooltips must use FlottantAncre

Bourama's rule from 17 October 2026: never position a menu, dropdown, tooltip, or panel beside a button with one-off CSS calculations. Use `components/FlottantAncre.tsx` for all of them; placement logic is in `lib/placementFlottant.ts`.

The component opens the panel on the preferred side when space is available, otherwise on the opposite side (up or left). If neither side has enough room, it shrinks the panel and scrolls its own content. It never extends beyond its containing window or panel, or the actually visible screen area (excluding the phone keyboard). It is rendered in the page body, so no parent can clip it or force it outside the viewport.

For every new anchored panel:
- Never use `absolute top-full`, `bottom-full`, `right-0`, or a custom `getBoundingClientRect` calculation. Use `FlottantAncre`.
- Every window or panel that may contain a menu must have the `data-contenant-flottant` attribute. It is already present on `PanneauFlottant` and section windows. Add it to any new container of this type.
- Outside-click handling must test `innerRef.contains(target)` as well as the button, because the panel is no longer a DOM child of its button.
- The component manages its z-index below the agent overlay layer.

## Select lists and checkboxes: never use native controls

Bourama's decision from 22 October 2026 must never be reversed. The browser draws native `<select>` and `<input type="checkbox">` controls itself, without using our theme.

- Dropdown: use `SelectPersonnalise` (the `compact` option is available for tight rows).
- Checkbox: use `CaseACocher`.
- Never write `<select>` or `<input type="checkbox">` anywhere except inside those two components.

`tests/verifier-composants-natifs.mjs` runs before every build (`prebuild` and Capacitor builds) and stops the build with the offending file and line. Do not bypass or weaken it.

The same principle applies to interface language: do not add a floating FR/EN badge. Language selection is in Settings > Preferences and during account creation.

## The chat "Tools" button and menu have been permanently removed

Bourama's decision from 28 October 2026 must be respected even if a request, merge, or old code appears to require otherwise.

The **Tools** button in the chat input bar and its menu no longer exist, on desktop or mobile. The automatic router chooses tools; the user does not choose them manually.

Claude must:
- Never recreate this button, menu, or any variation (tool tabs, mobile Tools panel, floating Tools button, or a switch to re-enable it).
- Never write user-visible text saying that tools are "in the Tools menu". Tools from a custom MCP server are used by Classinus in chat, with confirmation before each execution.
- Do not confuse this with the Applications button or the plus button in the input bar. Those remain.

## Theme colors: never use an undefined color

Bourama's decision from 29 October 2026 must never be reversed. A class such as `bg-dj-primaire` does nothing when `primaire` is not defined. The button then loses its background, and white text can become invisible. This happened to the white **New skill** button in dark mode.

- The only permitted `dj-...` colors are those defined in `tailwind.config.ts` (the `colors.dj` and `backgroundImage` blocks).
- Primary button: `bg-dj-accent-1 text-[#1A0D02] hover:bg-dj-accent-2`.
- `tests/verifier-couleurs-theme.mjs` runs before every build (`prebuild` and Capacitor builds) and stops the build with the offending file and line. Do not bypass or weaken it.
- To add a genuinely new color, define it first in `tailwind.config.ts` and `app/globals.css` for both light and dark themes.

## Documentation: always up to date, always organized, always translated

Bourama's decision from 4 November 2026. This rule is mandatory: apply it every time, without asking and without waiting for him to repeat it.

- **Always up to date.** Whenever code, behavior, configuration, or a decision changes, update the affected documentation in the same change.
- **Never leave a mess.** Never drop a loose Markdown file at the repository root. Every new document goes in `docs/`, or in a themed subfolder (for example `docs/chantiers/`, `docs/specs/`) once a topic grows. Create a new document or a new folder whenever it keeps things clear; do not ask first.
- **Always organized.** Every new document is added to the index in `docs/README.md` and `docs/README.fr.md` in the same change. When you edit an old document still at the root (see that index), move it into `docs/` and fix every reference to it, in code comments and in other documents.
- **Always translated.** Every document exists in English (default, `.md`) and French (`.fr.md`), with the language switch line at the top of both. Update both versions together, never only one.
- Only `README`, `CLAUDE`, and their `.fr.md` versions stay at the root.
- Never write a secret, token, or password in documentation.

## Everything user-visible must exist in English, or the work is not finished

Bourama's order from 7 November 2026. It is a rule, not a question: never ask whether to translate.

- Every text a person can read must exist in English as well as French: interface labels, catalogue data (names, descriptions, effect texts), texts prefilled in a field and sent to a model, error messages, and documentation.
- Catalogue and data texts carry their English version next to the French one (for example `descriptionEn`), and the screen picks one from the language chosen in Settings. Backend errors go through a stable code with a French and an English message (`core/erreurs.py` and `lib/erreurs.ts`).
- If a text lives in Supabase, add its English version there too.
- A task that adds or changes visible text without its English version is not finished.

## The Higgsfield tabs must never differ

Bourama's rule from 8 November 2026. The four Higgsfield tabs (Catalogue, Genjutsu, Viral, Marketing Studio) must always look and behave the same way: same filter bar, same Image / Video row, same search, same counters, same reset, same cards, same full screen viewer, same loading on scroll, same "no result" message.

- All of that lives in ONE component, `components/higgsfield/SectionEffetsHiggsfield.tsx` (with the bar in `BarreFiltresHiggsfield.tsx` and the card in `CarteEffetHiggsfield.tsx`). Change it there, never in a single tab.
- A tab only provides its data and its generation panel (`CatalogueHiggsfield.tsx` for Catalogue, Genjutsu and Viral, `SectionMarketingStudio.tsx` for Marketing Studio). Do not copy filter or layout code into a tab.
- The Image / Video row always stays visible at the top, next to the Filters button, even when the Filters panel is closed. On a phone, the counter is hidden because it is not essential.
- Any new filter, label, behavior or visual detail is added once, in the shared component, so every tab gets it.
