# Message d'attente du chat

[English version](MESSAGE_ATTENTE.md) · **Version française**

Demande du 27 novembre 2026.

## Ce que voit l'utilisateur

- Entre l'envoi d'une question et le premier signe de réponse (outil, réflexion ou texte), un court message s'affiche. Aucun nom d'agent n'y figure.
- Le texte change parmi douze : tous passent, dans un ordre mélangé, avant qu'un seul revienne (même d'un message à l'autre). Chacun reste entre 2 et 5 secondes, tirées au hasard (réglages `DUREE_ATTENTE_MIN_MS` et `DUREE_ATTENTE_MAX_MS`).
- Une seule animation, la même que la roue des outils : la nouvelle ligne monte de 5 px en apparaissant, l'ancienne monte de 5 px en s'estompant.
- Trois points sautillent toujours à la suite du texte.
- Si la personne a demandé à son appareil de réduire les animations, les mouvements sont remplacés par un simple fondu.
- Un lecteur d'écran n'entend qu'une seule annonce.

## Code

- `lib/messageAttente.ts` : les textes, la durée et le mélange.
- `components/IndicateurReflexion.tsx` : l'affichage.
- `tailwind.config.ts` : les animations (`dj-roue-fondu-entree` et `dj-roue-fondu-sortie`, partagées avec la roue des outils).
- `lib/i18n/interface.ts` : l'anglais des textes. Tout nouveau texte doit y avoir sa version anglaise.
