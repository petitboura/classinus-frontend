# Barre latérale : historique dans la barre, chat poussé vers la droite

[English version](BARRE_LATERALE_HISTORIQUE.md) · **Version française**

Demande du 27 novembre 2026.

## Ce que voit l'utilisateur (ordinateur, page du chat)

- **L'historique des conversations s'affiche directement dans la barre latérale**, sous les icônes de navigation (Tableau de bord, Bureau, Bibliothèque...), au lieu d'une fenêtre flottante ouverte depuis un bouton « Historique ». Les icônes restent en haut et toujours visibles ; la liste prend tout l'espace restant au milieu et défile seule ; S'abonner, Plus et le profil restent en bas. La liste garde les conversations épinglées, le renommage, la suppression et le chargement de la suite au défilement. Un petit bouton à côté du titre « Historique » ouvre l'historique en plein écran.
- **La barre ouverte pousse le chat vers la droite.** La barre s'ouvre au survol, comme avant, mais ne recouvre plus le chat : le chat se rétrécit de la même largeur, avec une transition fluide.
- **Un rail étroit d'icônes reste visible quand la barre est fermée.** Il n'y a pas de bouton « Historique » : le survol ouvre la barre et la liste apparaît.
- **Le bas de la liste se fond** tant qu'il reste des conversations plus bas ; le fondu disparaît une fois tout en bas.
- **La barre reste ouverte pendant la modification d'une conversation** (menu des trois points ouvert, champ de renommage, confirmation de suppression), même si la souris la quitte. Elle se replie quand la modification est finie et que la souris est partie.

Sur un écran très peu haut, la liste garde une hauteur minimale et c'est toute la barre qui défile : rien ne se superpose.

## Ce qui ne change pas

- Le mobile garde son tiroir par-dessus le chat, avec le bouton « Historique » et sa liste flottante.
- Les pages autres que le chat gardent l'ancien comportement : la barre ouverte est dessinée par-dessus la page, qui ne bouge pas.

## Où ça se passe

- `components/AppSidebar.tsx` : la boîte `data-rail-lateral` réserve la largeur de la barre. Dans le chat (`contexteChat`), elle suit l'état ouvert ou fermé de la barre, ce qui pousse le chat. Le bouton flottant du canal en direct la suit automatiquement (`lib/useDecalageRailLateral.ts`).
- `components/chat/ListeHistorique.tsx` : la propriété `onOccupe` prévient la barre quand une ligne est en cours de modification ; la propriété `fonduBas` active le fondu du bas (style `dj-fondu-bas` dans `app/globals.css`).

## Compromis connu

Comme la barre s'ouvre au survol et pousse le chat, la largeur du chat change à chaque entrée ou sortie de la souris dans la barre. C'est le choix explicite de Bourama (27 novembre 2026).
