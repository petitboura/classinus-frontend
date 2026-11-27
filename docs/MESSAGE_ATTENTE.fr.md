# Message d'attente du chat

[English version](MESSAGE_ATTENTE.md) · **Version française**

Demande du 27 novembre 2026.

## Ce que voit l'utilisateur

- Entre l'envoi d'une question et le premier signe de réponse (outil, réflexion ou texte), un court message s'affiche. Aucun nom d'agent n'y figure.
- Le texte change au hasard parmi douze, sans jamais montrer le même deux fois de suite. Il reste entre 1 et 3,5 secondes.
- Chaque changement prend au hasard un style différent du précédent : la roue, les lettres une par une ou la vague.
- Trois points sautillent à la suite du texte et un reflet passe sur les lettres.
- Si la personne a demandé à son appareil de réduire les animations, les mouvements sont remplacés par un simple fondu.
- Un lecteur d'écran n'entend qu'une seule annonce.

## Code

- `lib/messageAttente.ts` : les textes, les styles, les durées et le tirage au hasard.
- `components/IndicateurReflexion.tsx` : l'affichage.
- `tailwind.config.ts` : les animations.
- `lib/i18n/interface.ts` : l'anglais des textes. Tout nouveau texte doit y avoir sa version anglaise.
