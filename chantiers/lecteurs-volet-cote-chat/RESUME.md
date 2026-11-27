# Lecteurs en volet à côté du chat

- **Statut** : en attente d'une décision de Bourama (maquette Figma à valider, un point ouvert sur les onglets)
- **Dernière mise à jour** : 2026-11-27
- **Dépôts concernés** : classinus-frontend (le backend n'a pas été regardé, à confirmer)
- **Branche(s)** : aucune créée pour l'instant, aucun code écrit

## Le but, en langage clair
Bourama juge les lecteurs de Classinus « complètement nuls ». Il veut qu'ils fassent comme les autres IA : le lecteur s'ouvre **à côté du chat**, le chat est poussé sur le côté, et on agrandit simplement en élargissant le volet. Cela concerne tous les contenus : fichiers (PDF, livres, Word, Excel, texte), audio et vidéo, images, animation.

## Ce qui est déjà fait
- État des lieux du code des lecteurs, lu dans classinus-frontend au commit 2fb0b11 : voir `etat-des-lieux.md`.
- Recherche en ligne sur la façon dont Claude (Artifacts) et ChatGPT (Canvas) font : voir `maquette-et-recherches.md`.
- Maquette Figma à quatre écrans (PC volet ouvert, PC volet élargi, téléphone plein écran, image dans le volet avec vignettes) : lien dans `maquette-et-recherches.md`.
- Aucun code modifié dans les dépôts.

## Ce qui reste à faire
1. Faire valider la maquette par Bourama et trancher les points ouverts ci-dessous.
2. Créer une branche depuis `main` dans classinus-frontend.
3. Monter un seul volet lecteur au niveau de l'application, avec une barre de séparation qu'on tire et dont la largeur est mémorisée.
4. Brancher chaque lecteur sur ce volet, puis retirer les anciennes présentations (dépliage dans le fil, fenêtres flottantes, plein écran séparé, visionneuses d'image dupliquées).
5. Prévoir le téléphone et le mobile natif, mettre à jour les squelettes de chargement, les textes traduits et la documentation SEO/AEO (règles de CLAUDE.md).

## Décisions prises par Bourama
- Les lecteurs doivent se placer à côté du chat, le pousser, et s'agrandir en élargissant, « comme tous les IA ».
- Cela vaut pour tous les contenus (réponse « pour tous ceux »).
- Il a demandé de chercher en ligne et d'utiliser les skills de design et Figma.

## Points ouverts
- Quand un fichier est déjà ouvert et qu'on en clique un autre : il remplace le premier ou on a des onglets dans le volet ?
- Téléphone : le lecteur en plein écran avec une flèche de retour est une proposition, pas encore validée.
- Widgets interactifs et blocs de code : suivent-ils le même volet ou restent-ils dans le fil ? Pas tranché explicitement.
- Le grand plein écran actuel est-il supprimé au profit de l'élargissement du volet ? Proposé, pas validé.

## Pour l'IA qui reprend ce chantier
- Relire le code réel avant d'agir (le dépôt a pu changer depuis le 27/11/2026) : composants listés dans `etat-des-lieux.md`.
- Respecter CLAUDE.md du dépôt : z-index de la couche agent (`lib/couchesAgent.ts`, ne jamais dépasser `COUCHE_MAX_APPLICATION`), menus ancrés via `FlottantAncre`, pas de contrôles natifs, aucun double tiret dans les textes visibles.
- Ne rien coder sans que Bourama ait validé le plan.
