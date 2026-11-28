# Lecteur à côté du chat

[English version](LECTEUR_LATERAL.md) · **Version française**

Demande du 27 novembre 2026. Comme Claude, ChatGPT et Gemini, un fichier ouvert depuis la conversation pousse le chat vers la gauche et s'affiche à côté, pour continuer à discuter pendant qu'on lit.

## Comportement

- Un seul volet pour tous les contenus : PDF, livres numériques (EPUB, MOBI), Word, Excel, PowerPoint, texte, Markdown (vue formatée ou brute), code source (avec coloration et bouton Copier), notes de la bibliothèque, images, audio et vidéo.
- Cliquer sur un autre fichier remplace celui qui est déjà ouvert. Pas d'onglets.
- Sur ordinateur (fenêtre d'au moins 1024 px de large) : le volet est à droite du chat. Tirer la barre entre les deux l'élargit ou le rétrécit (les flèches du clavier marchent aussi, un double clic remet la largeur d'origine). La largeur choisie est mémorisée. Le chat ne descend jamais sous 340 px, le volet jamais sous 360 px.
- Le bouton plein écran transforme le volet en calque sur toute la fenêtre. Échap quitte le plein écran.
- Sur téléphone, ou dans une fenêtre de moins de 1024 px : le lecteur s'ouvre en plein écran avec une flèche de retour vers la conversation. Le bouton retour du téléphone le ferme.
- Images : les miniatures restent dans le chat, celle qu'on regarde est entourée de doré. Dans le volet, les flèches et une rangée de vignettes passent d'une image à l'autre de la même rangée ou galerie. Le balayage marche sur téléphone.
- Le volet se ferme quand on change de conversation.
- La ligne « Ouvert à droite » apparaît sur la carte du fichier tant qu'il est affiché dans le volet.
- Les fichiers que tu joins toi-même s'ouvrent dans le volet avec le bon aperçu : le type est déduit du nom du fichier (`components/chat/typeMimePieceJointe.ts`). Avant, seul le PDF le faisait ; Word, Excel, Markdown, EPUB et code affichaient « Aperçu non disponible ».

## Ouverture automatique

Demande du 28 novembre 2026. Quand une réponse se termine, le premier fichier qu'elle contient s'ouvre tout seul dans le volet, à la place de celui déjà ouvert.

- « Se termine » veut dire que la génération est finie et que le texte a fini de s'afficher. Cela ne se déclenche que pour une réponse arrivée en direct, jamais en ouvrant une ancienne conversation, ni pour une réponse que la personne a arrêtée.
- Premier fichier de la réponse : le premier dans l'ordre de lecture, parmi les documents, le code, les notes de la bibliothèque, les images, l'audio et la vidéo. Des images d'une même rangée s'ouvrent avec leurs voisines. Les autres fichiers restent des cartes.
- Ordinateur seulement (deux colonnes, fenêtre d'au moins 1024 px). Sur téléphone, le volet cacherait la réponse qui vient d'arriver, donc rien ne s'ouvre tout seul.
- Seuls les fichiers de notre propre stockage s'ouvrent d'eux-mêmes (générés ou enregistrés ici). Un fichier hébergé ailleurs, ou une image d'illustration trouvée sur le web, reste une carte à cliquer : l'ouvrir demanderait le relais du serveur et parfois une connexion.
- Réglage : Paramètres > Préférences > « Ouverture automatique du lecteur ». Actif par défaut, mémorisé par appareil (`lib/lecteurLateral.ts`, `useOuvertureAuto`).

## Où est le code

- `lib/lecteurLateral.ts` : la seule source de vérité (ce qui est ouvert, la largeur mémorisée, le seuil des deux colonnes). Tout ce qui veut ouvrir un fichier appelle `ouvrirDansLecteur()`. Elle renvoie `false` quand aucun volet n'est monté, et l'appelant garde alors son ancien comportement.
- `components/chat/VoletLecteur.tsx` : le volet lui-même (en-tête, barre à tirer, plein écran, calque téléphone). Monté seulement par `ChatSection.tsx`, la page du chat.
- `components/chat/ContenuFichierApercu.tsx` : choisit l'aperçu selon le type du fichier. Partagé par le volet et par la fenêtre des sources citées (`VisionneurPositionGlobal.tsx`).
- `components/chat/ContenuImagesLecteur.tsx` : le contenu image (zoom, vignettes, flèches).
- `components/chat/ContenuCode.tsx` : le contenu code source (même coloration que `FichierCode.tsx`).
- `components/chat/CarteFichierLecteur.tsx` : la carte partagée par les fichiers, le code et les notes de la bibliothèque.
- `components/chat/contenuLecteurFichier.ts` : la règle unique « ce fichier s'ouvre dans le volet » (utilisée par la carte et par l'ouverture automatique).
- Points d'ouverture : `FichierChip.tsx` (fichiers et images générées), `FichierCode.tsx` (code), `NoteTexteChip.tsx` (notes de la bibliothèque), `ImageMessage.tsx`, `GalerieImagesBulle.tsx`, `BulleMessage.tsx` (pièces jointes) et `VisionneurPositionGlobal.tsx` (l'événement « Ouvrir à cet endroit » des sources citées).
- Ouverture automatique : `components/chat/premierContenuReponse.ts` (trouve le premier fichier d'une réponse), `components/chat/useOuvertureAutoReponse.ts` (se déclenche à la fin de la réponse, branché dans `ChatIA.tsx`).

## Ce qui n'a pas changé

Là où le volet n'est pas monté (le chat flottant sur les autres pages, la fenêtre de superposition du PC), l'ancien comportement reste : le bloc dépliable dans le fil, la fenêtre d'image, la fenêtre média, la fenêtre des sources. Les fichiers en cours de jointure dans la barre de saisie s'ouvrent toujours dans leur propre fenêtre.

## Couches

Le calque du volet utilise `z-[160]`, sous la couche de l'agent (`lib/couchesAgent.ts`).
