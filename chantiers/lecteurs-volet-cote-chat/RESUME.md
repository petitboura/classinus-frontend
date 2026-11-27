# Lecteurs en volet à côté du chat

- **Statut** : code écrit sur la branche `volet-lecteur`, en attente de vérification par Bourama avant fusion dans `main`
- **Dernière mise à jour** : 2026-11-27 (après-midi)
- **Dépôts concernés** : classinus-frontend (le backend n'a pas été regardé, à confirmer)
- **Branche(s)** : `volet-lecteur` (classinus-frontend), depuis `main` du 27/11/2026

## Le but, en langage clair
Bourama juge les lecteurs de Classinus « complètement nuls ». Il veut qu'ils fassent comme les autres IA : le lecteur s'ouvre **à côté du chat**, le chat est poussé sur le côté, et on agrandit simplement en élargissant le volet. Cela concerne tous les contenus : fichiers (PDF, livres, Word, Excel, texte), audio et vidéo, images, animation.

## Ce qui est déjà fait
- État des lieux du code des lecteurs, lu dans classinus-frontend au commit 2fb0b11 : voir `etat-des-lieux.md`.
- Recherche en ligne sur la façon dont Claude (Artifacts) et ChatGPT (Canvas) font : voir `maquette-et-recherches.md`.
- Maquette Figma à quatre écrans (PC volet ouvert, PC volet élargi, téléphone plein écran, image dans le volet avec vignettes) : lien dans `maquette-et-recherches.md`.
- Volet lecteur construit le 27/11/2026 sur la branche `volet-lecteur` : un seul volet pour PDF, livres, Word, Excel, PowerPoint, texte, markdown, images (avec vignettes et flèches), audio et vidéo. Détail du fonctionnement et des fichiers : `docs/LECTEUR_LATERAL.md`.
- Textes en français et en anglais, documentation (FR et EN) et question FAQ/AEO ajoutées.
- Non vérifié à l'écran : le code a été écrit sans pouvoir lancer l'application ni le build complet dans la session. À vérifier sur l'aperçu Vercel de la branche.

## Ce qui reste à faire
1. Faire vérifier le volet à l'écran par Bourama (PC, fenêtre étroite, téléphone, mobile natif) sur l'aperçu de la branche.
2. Fusionner dans `main` seulement après son accord.
3. Retirer les anciennes présentations (dépliage dans le fil, fenêtres flottantes, visionneuses d'image dupliquées) : elles servent encore là où le volet n'est pas monté (chat flottant sur les autres pages, fenêtre de superposition du PC). À décider avec Bourama.
4. Brancher l'animation guidée, les widgets et les blocs de code si Bourama le veut (non fait).
5. Les fichiers en cours de jointure dans la barre de saisie s'ouvrent toujours dans leur fenêtre (non fait, à confirmer).

## Décisions prises par Bourama
- 27/11/2026 : un fichier cliqué remplace celui déjà ouvert, pas d'onglets.
- 27/11/2026 : on garde l'agrandissement en tirant la barre ET le bouton plein écran.
- 27/11/2026 : « go il faut builder ».
- Les lecteurs doivent se placer à côté du chat, le pousser, et s'agrandir en élargissant, « comme tous les IA ».
- Cela vaut pour tous les contenus (réponse « pour tous ceux »).
- Il a demandé de chercher en ligne et d'utiliser les skills de design et Figma.

## Points ouverts
- Téléphone : le lecteur en plein écran avec une flèche de retour est une proposition de Claude, non contestée au moment du « go », à confirmer. Même présentation dans une fenêtre de moins de 1024 px (choix de Claude, à confirmer).
- Widgets interactifs et blocs de code : suivent-ils le même volet ou restent-ils dans le fil ? Pas tranché, restés dans le fil.

## Pour l'IA qui reprend ce chantier
- Relire le code réel avant d'agir (le dépôt a pu changer depuis le 27/11/2026) : composants listés dans `etat-des-lieux.md`.
- Respecter CLAUDE.md du dépôt : z-index de la couche agent (`lib/couchesAgent.ts`, ne jamais dépasser `COUCHE_MAX_APPLICATION`), menus ancrés via `FlottantAncre`, pas de contrôles natifs, aucun double tiret dans les textes visibles.
- Ne rien fusionner dans `main` sans l'accord de Bourama.
