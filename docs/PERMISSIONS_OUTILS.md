# Tool permissions screen

[English version] · [Français](PERMISSIONS_OUTILS.fr.md)

Added on 25 November 2026. Backend rules and API: see `docs/PERMISSIONS_OUTILS.md` in the backend repository.

## What the person sees

Opening a connected app (Connections screen) or a custom MCP server shows a **Tool permissions** section in its panel. Tools are split in two categories: read-only, and write or delete. Each category and each tool has three choices: **Allow**, **Ask**, **Block**. A tool setting wins over its category setting; "Follow the category" removes the tool setting.

- Choosing Allow on the whole write category first shows a warning with "Allow anyway" and "Cancel".
- Actions that must always be confirmed (`AUTORISATION_PERMANENTE_INTERDITE` on the backend) have the Allow choice disabled.
- A change shows instantly (optimistic); the save runs in the background, rapid clicks keep only the last wanted value, and a failure restores the real settings and shows the error.
- Apps unknown to the backend (HTTP 404) show no section.

## Code

- `components/connexions/PermissionsOutils.tsx`: the section (`groupe` = app name, or `groupePermissionsServeurMcp(id)` for a custom server).
- `lib/api.ts`: `lirePermissionsOutils`, `reglerPermissionOutil`, types.
- Used by `PanneauConnexion.tsx` (connected apps only) and `CarteMcpPersonnalise.tsx`.
- It replaces the old "Always-allowed actions" list and the "Allow non-sensitive tools at once" checkbox of the custom server panel and form. The chat confirmation card keeps its "Always allow" button.
- Texts: French in the code, English in `lib/i18n/interface.ts`; error codes `OUTIL_BLOQUE` and `PERMISSIONS_OUTILS_*` in `lib/erreurs.ts`.
- Public help: `app/decouvrir/personnaliser/applications-connectees/page.tsx`.
