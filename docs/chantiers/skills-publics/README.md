# Public skills (frontend)

**English version** · [Version française](README.fr.md)

Chantier of 24 November 2026. The backend side is described in the backend repository (`docs/chantiers/skills-publics/`).

## What changed on screen

- **Skills catalogue** (`components/ComportementsPublics.tsx`): search, add to My skills, download, activity, preview. The list no longer carries the content, so preview and download read the detail first. Uploading a .md file now creates a real skill in My skills and publishes it (a description is required, from the file header or the shared field). If publishing fails, the new skill is removed so nothing is left behind.
- **My skills** (`components/SkillsIndependants.tsx`): a "Public" badge in the list, and a Publish / Withdraw button in the editor (save first to publish). The catalogue "Edit in My skills" action opens `/comportements?skill=ID`.
- **Removed:** `ModifierSkillPublicModal` and `ActionsSkillPublic` (editing happens in the personal editor).
- **API:** `lib/api.ts` (`rechercherSkillsPublics`, `obtenirSkillPublic`, `ajouterSkillPublic`, `publierSkill`, `retirerSkillPublic`, `listerMisesAJourSkills`, `mettreAJourCopieSkill`). Error codes added in `lib/erreurs.ts`, English texts in `lib/i18n/interface.ts`.
- **Chat refresh:** `gerer_comportement_public` refreshes the Skills list.

## Not built on purpose

No update banner in the interface: the AI informs the user and proposes the update in chat, as decided. `listerMisesAJourSkills` and `mettreAJourCopieSkill` are ready if a banner is wanted later.
