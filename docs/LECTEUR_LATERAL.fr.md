# Lecteur à côté du chat

[English version](LECTEUR_LATERAL.md) · **Version française**

Demande du 27 novembre 2026. Comme Claude, ChatGPT et Gemini, un fichier ouvert depuis la conversation pousse le chat vers la gauche et s'affiche à côté, pour continuer à discuter pendant qu'on lit.

## Comportement

- Un seul volet pour tous les contenus : PDF, livres numériques (EPUB, MOBI), Word, Excel, PowerPoint, texte, Markdown (vue formatée ou brute), images, audio et vidéo.
- Cliquer sur un autre fichier remplace celui qui est déjà ouvert. Pas d'onglets.
- Sur ordinateur (fenêtre d'au moins 1024 px de large) : le volet est à droite du chat. Tirer la barre entre les deux l'élargit ou le rétrécit (les flèches du clavier marchent aussi, un double clic remet la largeur d'origine). La largeur choisie est mémorisée. Le chat ne descend jamais sous 340 px, le volet jamais sous 360 px.
- Le bouton plein écran transforme le volet en calque sur toute la fenêtre. Échap quitte le plein écran.
- Sur téléphone, ou dans une fenêtre de moins de 1024 px : le lecteur s'ouvre en plein écran avec une flèche de retour vers la conversation. Le bouton retour du téléphone le ferme.
- Images : les miniatures restent dans le chat, celle qu'on regarde est entourée de doré. Dans le volet, les flèches et une rangée de vignettes passent d'une image à l'autre de la même rangée ou galerie. Le balayage marche sur téléphone.
- Le volet se ferme quand on change de conversation.
- La ligne « Ouvert à droite » apparaît sur la carte du fichier tant qu'il est affiché dans le volet.

## Où est le code

- `lib/lecteurLateral.ts` : la seule source de vérité (ce qui est ouvert, la largeur mémorisée, le seuil des deux colonnes). Tout ce qui veut ouvrir un fichier appelle `ouvrirDansLecteur()`. Elle renvoie `false` quand aucun volet n'est monté, et l'appelant garde alors son ancien comportement.
- `components/chat/VoletLecteur.tsx` : le volet lui-même (en-tête, barre à tirer, plein écran, calque téléphone). Monté seulement par `ChatSection.tsx`, la page du chat.
- `components/chat/ContenuFichierApercu.tsx` : choisit l'aperçu selon le type du fichier. Partagé par le volet et par la fenêtre des sources citées (`VisionneurPositionGlobal.tsx`).
- `components/chat/ContenuImagesLecteur.tsx` : le contenu image (zoom, vignettes, flèches).
- Points d'ouverture : `FichierChip.tsx` (fichiers et images générées), `ImageMessage.tsx`, `GalerieImagesBulle.tsx`, `BulleMessage.tsx` (pièces jointes) et `VisionneurPositionGlobal.tsx` (l'événement « Ouvrir à cet endroit » des sources citées).

## Ce qui n'a pas changé

Là où le volet n'est pas monté (le chat flottant sur les autres pages, la fenêtre de superposition du PC), l'ancien comportement reste : le bloc dépliable dans le fil, la fenêtre d'image, la fenêtre média, la fenêtre des sources. Les fichiers en cours de jointure dans la barre de saisie s'ouvrent toujours dans leur propre fenêtre.

## Couches

Le calque du volet utilise `z-[160]`, sous la couche de l'agent (`lib/couchesAgent.ts`).
