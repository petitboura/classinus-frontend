# Écran des permissions des outils

[English version](PERMISSIONS_OUTILS.md) · [Français]

Ajouté le 25 novembre 2026. Règles et API côté serveur : voir `docs/PERMISSIONS_OUTILS.md` dans le dépôt backend.

## Ce que voit la personne

Ouvrir une application connectée (écran Connexions) ou un serveur MCP personnalisé affiche, dans son panneau, une section **Permissions des outils**. Les outils sont rangés en deux catégories : lecture seule, et écrit ou supprime. Chaque catégorie et chaque outil a trois choix : **Autoriser**, **Demander**, **Bloquer**. Le réglage d'un outil l'emporte sur celui de sa catégorie ; « Suivre la catégorie » retire le réglage de l'outil.

- Choisir Autoriser sur toute la catégorie qui écrit affiche d'abord un avertissement avec « Autoriser quand même » et « Annuler ».
- Les actions qui doivent toujours être confirmées (`AUTORISATION_PERMANENTE_INTERDITE` côté backend) ont le choix Autoriser désactivé.
- Un changement s'affiche tout de suite (mise à jour optimiste) ; l'enregistrement part en arrière-plan, des clics rapides ne gardent que la dernière valeur voulue, et un échec remet les vrais réglages et affiche l'erreur.
- Une application inconnue du backend (HTTP 404) n'affiche aucune section.

## Code

- `components/connexions/PermissionsOutils.tsx` : la section (`groupe` = nom de l'application, ou `groupePermissionsServeurMcp(id)` pour un serveur personnalisé).
- `lib/api.ts` : `lirePermissionsOutils`, `reglerPermissionOutil`, types.
- Utilisé par `PanneauConnexion.tsx` (applications connectées seulement) et `CarteMcpPersonnalise.tsx`.
- Remplace l'ancienne liste « Actions toujours autorisées » et la case « Autoriser d'un coup les outils non sensibles » du panneau et du formulaire des serveurs personnalisés. La carte de confirmation du chat garde son bouton « Toujours autoriser ».
- Textes : français dans le code, anglais dans `lib/i18n/interface.ts` ; codes d'erreur `OUTIL_BLOQUE` et `PERMISSIONS_OUTILS_*` dans `lib/erreurs.ts`.
- Aide publique : `app/decouvrir/personnaliser/applications-connectees/page.tsx`.
