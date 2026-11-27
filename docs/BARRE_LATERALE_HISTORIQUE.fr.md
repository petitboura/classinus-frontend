# Barre latérale : historique dans la barre, chat poussé vers la droite

[English version](BARRE_LATERALE_HISTORIQUE.md) · **Version française**

Demande du 27 novembre 2026.

## Ce que voit l'utilisateur (ordinateur, page du chat)

- **L'historique des conversations s'affiche directement dans la barre latérale**, sous les icônes de navigation (Tableau de bord, Bureau, Bibliothèque...), au lieu d'une fenêtre flottante ouverte depuis un bouton « Historique ». Les icônes restent en haut et toujours visibles ; la liste prend tout l'espace restant au milieu et défile seule ; S'abonner, Plus et le profil restent en bas. La liste garde les conversations épinglées, le renommage, la suppression et le chargement de la suite au défilement. Un petit bouton à côté du titre « Historique » ouvre l'historique en plein écran.
- **La barre ouverte pousse le chat vers la droite.** La barre s'ouvre au survol, comme avant, mais ne recouvre plus le chat : le chat se rétrécit de la même largeur, avec une transition fluide.
- **Un rail étroit d'icônes reste visible quand la barre est fermée.** Il n'y a pas de bouton « Historique » : le survol ouvre la barre et la liste apparaît.
- **Le haut et le bas de la liste se fondent** tant qu'il reste des conversations de ce côté ; chaque fondu disparaît une fois au bout.
- **Au survol d'une conversation** (souris), une bulle montre son nom complet et, en dessous, la date complète avec le jour et l'heure.
- **Une conversation du jour** affiche le temps écoulé (« à l'instant », « il y a 12 min », « il y a 3 h ») au lieu d'une date, sur la ligne et dans la bulle ; il se met à jour chaque minute.
- **La barre reste ouverte pendant la modification d'une conversation** (menu des trois points ouvert, champ de renommage, confirmation de suppression), même si la souris la quitte. Elle se replie quand la modification est finie et que la souris est partie.

Sur un écran très peu haut, la liste garde une hauteur minimale et c'est toute la barre qui défile : rien ne se superpose.

## Sur téléphone

- **La liste des conversations est affichée directement dans le menu**, sous les sections, sans bouton « Historique ». Elle prend la place restante, défile seule et se fond en haut et en bas ; Plus et le profil restent en bas.
- **Un appui long sur une conversation** montre la bulle (nom complet et date) au dessus de la ligne ; elle se ferme quand on touche ailleurs ou qu'on fait défiler. Un appui court ouvre la conversation.

## Ce qui ne change pas

- Sur téléphone, le menu reste un tiroir dessiné par dessus le chat.
- Les pages autres que le chat gardent l'ancien comportement : la barre ouverte est dessinée par-dessus la page, qui ne bouge pas.

## Où ça se passe

- `components/AppSidebar.tsx` : la boîte `data-rail-lateral` réserve la largeur de la barre. Dans le chat (`contexteChat`), elle suit l'état ouvert ou fermé de la barre, ce qui pousse le chat. Le bouton flottant du canal en direct la suit automatiquement (`lib/useDecalageRailLateral.ts`).
- `components/chat/ListeHistorique.tsx` : la propriété `onOccupe` prévient la barre quand une ligne est en cours de modification ; la propriété `fondu` active les fondus du haut et du bas (style `dj-fondu-vertical` dans `app/globals.css`).
- `components/chat/BulleFil.tsx` : la bulle de survol d'une conversation.
- `lib/datesHistorique.ts` : les dates des lignes et de la bulle, en français et en anglais.

## Compromis connu

Comme la barre s'ouvre au survol et pousse le chat, la largeur du chat change à chaque entrée ou sortie de la souris dans la barre. C'est le choix explicite de Bourama (27 novembre 2026).
