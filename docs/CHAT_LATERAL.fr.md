# Chat collé à droite des pages

[English version](CHAT_LATERAL.md) · **Version française**

Demande du 28 novembre 2026. Sur les pages de l'app, le chat ne flotte plus par-dessus le contenu : il se colle à droite, pousse la page, et on l'élargit ou le rétrécit en tirant sa barre.

## Comportement

- Où il se colle : toutes les pages de l'app, sauf la page du chat elle-même (qui a sa propre interface), les pages des paramètres et la page des abonnements (où le chat reste en fenêtre flottante). Sur téléphone, et dans une fenêtre de moins de 768 px, le chat garde sa fenêtre flottante d'avant.
- Ouverture et fermeture : la colonne glisse depuis la droite (la largeur passe de 0 à la largeur choisie) et ressort à la fermeture. La page se rétrécit en conséquence.
- Le chat ne se ferme qu'avec son bouton Fermer. Naviguer ne le ferme jamais : quand on est sur la page du chat plein écran et qu'on clique une section ou une sous-section (barre latérale ou palette de commandes), le chat se colle à droite avec la même conversation et la section s'ouvre à gauche. Le chat part de toute la largeur de la fenêtre et rétrécit vers la droite pendant que la page s'ouvre. Aller dans les paramètres ou dans les abonnements ouvre le chat en fenêtre flottante. Sur téléphone ou dans une fenêtre étroite, la navigation reste celle d'avant.
- En-tête : même hauteur et même trait du bas que l'en-tête des pages (`components/EnTeteApp.tsx`), pour que les deux lignes se prolongent. L'en-tête du chat collé n'a ni logo ni nom : à gauche le titre de la conversation active (pris dans l'historique), toujours sur une seule ligne et coupé par des points de suspension s'il est long, vide pour une nouvelle conversation ; au centre le bouton du modèle, toujours centré et avec son nom en entier (sa liste s'ouvre sous l'en-tête, centrée) ; à droite les boutons d'action. Le bouton du modèle est aussi au centre de l'en-tête de la fenêtre flottante (paramètres, abonnements). Le chat plein écran garde le bouton en haut au milieu.
- Plein écran : le bouton en haut du chat collé (icône flèche vers la gauche) étire le chat vers la gauche sur toute la fenêtre, en poussant la page dehors, puis ouvre la page du chat plein écran. Pendant l'étirement, le contenu du chat suit la largeur de la colonne (c'est, avec l'animation d'arrivée, le seul cas où le contenu se recalcule pendant une animation). Le chat reste ouvert dans l'état de l'app : cliquer une section depuis le chat plein écran le recolle.
- Redimensionnement : tirer la barre au bord gauche du chat. Les flèches du clavier marchent aussi, et un double clic remet la largeur par défaut (420 px). Le chat ne descend jamais sous 340 px, et la page jamais sous 360 px.
- Mémorisé par compte : la largeur est enregistrée sur le profil (colonne `volet_chat_largeur` de `profiles`), donc identique sur chaque appareil. Elle est aussi gardée sur l'appareil pour s'afficher tout de suite, avant la réponse du profil.
- Les contrôles fixés à droite de l'écran (cloche, minuteurs, bouton Découvrir, boutons de la bibliothèque, bouton du journal d'actions de l'agent) se décalent de la largeur du chat, pour ne jamais passer dessous.
- Titre d'accueil du chat (« On veille ? », « La nuit, longue ou courte ? »...) : il ne s'écrit lettre par lettre qu'une seule fois, à l'ouverture de la page ou à l'ouverture du chat après l'avoir fermé. Coller le chat, l'étirer en plein écran, changer de page ou ouvrir une nouvelle conversation l'affiche d'un coup, sans le rejouer (`lib/revelationTitreAccueil.ts`).
- Barre latérale : même comportement sur toutes les pages, y compris le chat plein écran, parce que le chat est partout. Plus aucune fenêtre flottante de section : une section, une sous-section, Connecter Claude, Thonny ou un raccourci de l'écran vide du chat ouvrent la vraie page (depuis le chat plein écran, le chat se colle à droite). Seul l'historique des conversations (et le bouton Nouvelle conversation) ne s'affiche que sur le chat plein écran, puisque le chat collé a le sien dans son en-tête. Le rail déplié passe par-dessus la page partout, il ne la pousse plus dans le chat.
- Le bouton retour du navigateur ne ferme pas un chat collé : c'est une colonne de la page, pas une fenêtre. Sur la page du chat plein écran, le chat n'affiche aucune fenêtre, donc le retour navigue simplement.
- Passer d'une page aux paramètres ou aux abonnements (ou rétrécir la fenêtre) bascule vers la fenêtre flottante sans perdre la conversation : le chat n'est jamais démonté, seules ses classes changent.

## Où vit le code

- `lib/chatLateral.ts` : les règles (quelles pages, quels écrans, largeurs, durées, la variable CSS et la mémoire de la largeur sur l'appareil).
- `lib/useChatLateral.ts` : le hook (largeur, tirage, clavier, animation d'ouverture et de fermeture, étirement plein écran, arrivée depuis le chat plein écran, recul quand la fenêtre rétrécit, publication de la largeur dans `--dj-chat-lateral` sur `<html>`).
- `lib/useGarderLeChatOuvert.ts` : appelé juste avant de naviguer depuis le chat plein écran (barre latérale `components/AppSidebar.tsx`, palette de commandes `components/PaletteCommandes.tsx`). Il ouvre le chat et pose le repère d'arrivée pour que le chat collé parte de toute la largeur.
- `components/chat/CadreChatLateral.tsx` : l'enveloppe et la barre à tirer. Collé, c'est la colonne ; flottant, elle n'a aucune boîte (`display: contents`).
- `components/chat/ChatFlottant.tsx` : décide `docke` (ouvert, grand écran, page acceptée) et fait passer le panneau du chat entre la colonne et la fenêtre flottante.
- `app/globals.css` : `.dj-decale-chat`, la transition des contrôles décalés (aucune pendant qu'on tire la barre).
- Backend : `api/profiles.py` (`volet_chat_largeur` dans le profil et dans la mise à jour) et `migrations/2026_11_28_profiles_volet_chat_largeur.sql`.

## Ajouter un contrôle fixé à droite

Utiliser `right-[calc(<distance>+var(--dj-chat-lateral,0px))]` et la classe `dj-decale-chat`, pour que le contrôle suive le chat au lieu de glisser dessous.

## Couches

Le chat collé fait partie de la mise en page (pas de z-index). Le voile pendant le tirage utilise `z-[160]`, sous la couche de superposition de l'agent (`lib/couchesAgent.ts`).
