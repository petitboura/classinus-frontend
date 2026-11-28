# Chat collé à droite des pages

[English version](CHAT_LATERAL.md) · **Version française**

Demande du 28 novembre 2026. Sur les pages de l'app, le chat ne flotte plus par-dessus le contenu : il se colle à droite, pousse la page, et on l'élargit ou le rétrécit en tirant sa barre.

## Comportement

- Où il se colle : toutes les pages de l'app, sauf la page du chat elle-même (qui a sa propre interface) et les pages des paramètres. Sur téléphone, et dans une fenêtre de moins de 768 px, le chat garde sa fenêtre flottante d'avant.
- Ouverture et fermeture : la colonne glisse depuis la droite (la largeur passe de 0 à la largeur choisie) et ressort à la fermeture. La page se rétrécit en conséquence.
- Redimensionnement : tirer la barre au bord gauche du chat. Les flèches du clavier marchent aussi, et un double clic remet la largeur par défaut (420 px). Le chat ne descend jamais sous 340 px, et la page jamais sous 360 px.
- Mémorisé par compte : la largeur est enregistrée sur le profil (colonne `volet_chat_largeur` de `profiles`), donc identique sur chaque appareil. Elle est aussi gardée sur l'appareil pour s'afficher tout de suite, avant la réponse du profil.
- Les contrôles fixés à droite de l'écran (cloche, minuteurs, bouton Découvrir, boutons de la bibliothèque, bouton du journal d'actions de l'agent) se décalent de la largeur du chat, pour ne jamais passer dessous.
- Le bouton retour du navigateur ne ferme pas un chat collé : c'est une colonne de la page, pas une fenêtre.
- Passer d'une page aux paramètres (ou rétrécir la fenêtre) bascule vers la fenêtre flottante sans perdre la conversation : le chat n'est jamais démonté, seules ses classes changent.

## Où vit le code

- `lib/chatLateral.ts` : les règles (quelles pages, quels écrans, largeurs, durées, la variable CSS et la mémoire de la largeur sur l'appareil).
- `lib/useChatLateral.ts` : le hook (largeur, tirage, clavier, animation d'ouverture et de fermeture, recul quand la fenêtre rétrécit, publication de la largeur dans `--dj-chat-lateral` sur `<html>`).
- `components/chat/CadreChatLateral.tsx` : l'enveloppe et la barre à tirer. Collé, c'est la colonne ; flottant, elle n'a aucune boîte (`display: contents`).
- `components/chat/ChatFlottant.tsx` : décide `docke` (ouvert, grand écran, page acceptée) et fait passer le panneau du chat entre la colonne et la fenêtre flottante.
- `app/globals.css` : `.dj-decale-chat`, la transition des contrôles décalés (aucune pendant qu'on tire la barre).
- Backend : `api/profiles.py` (`volet_chat_largeur` dans le profil et dans la mise à jour) et `migrations/2026_11_28_profiles_volet_chat_largeur.sql`.

## Ajouter un contrôle fixé à droite

Utiliser `right-[calc(<distance>+var(--dj-chat-lateral,0px))]` et la classe `dj-decale-chat`, pour que le contrôle suive le chat au lieu de glisser dessous.

## Couches

Le chat collé fait partie de la mise en page (pas de z-index). Le voile pendant le tirage utilise `z-[160]`, sous la couche de superposition de l'agent (`lib/couchesAgent.ts`).
