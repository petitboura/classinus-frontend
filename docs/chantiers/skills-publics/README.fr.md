# Skills publics (frontend)

[English version](README.md) · **Version française**

Chantier du 24 novembre 2026. Le côté backend est décrit dans le dépôt backend (`docs/chantiers/skills-publics/`).

## Ce qui change à l'écran

- **Catalogue des skills** (`components/ComportementsPublics.tsx`) : recherche, ajout à Mes skills, téléchargement, activité, aperçu. La liste ne porte plus le contenu, donc l'aperçu et le téléchargement lisent d'abord le détail. Envoyer un fichier .md crée maintenant un vrai skill dans Mes skills et le publie (description obligatoire, tirée de l'en-tête du fichier ou du champ commun). Si la publication échoue, le skill tout juste créé est supprimé pour ne rien laisser derrière.
- **Mes skills** (`components/SkillsIndependants.tsx`) : un badge « Public » dans la liste, et un bouton Publier / Retirer dans l'éditeur (enregistrer d'abord pour publier). L'action « Modifier dans Mes skills » du catalogue ouvre `/comportements?skill=ID`.
- **Supprimés :** `ModifierSkillPublicModal` et `ActionsSkillPublic` (la modification se fait dans l'éditeur personnel).
- **API :** `lib/api.ts` (`rechercherSkillsPublics`, `obtenirSkillPublic`, `ajouterSkillPublic`, `publierSkill`, `retirerSkillPublic`, `listerMisesAJourSkills`, `mettreAJourCopieSkill`). Codes d'erreur ajoutés dans `lib/erreurs.ts`, textes anglais dans `lib/i18n/interface.ts`.
- **Rafraîchissement du chat :** `gerer_comportement_public` rafraîchit la liste des skills.

## Volontairement pas construit

Pas de bandeau de mise à jour dans l'interface : l'IA prévient la personne et propose la mise à jour dans le chat, comme décidé. `listerMisesAJourSkills` et `mettreAJourCopieSkill` sont prêtes si un bandeau est voulu plus tard.
