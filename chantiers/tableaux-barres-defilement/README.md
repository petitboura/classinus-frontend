# Chantier : tableaux alignés et barres de défilement

Demandé par Bourama le 27/11/2026. Branche de travail : staging.

## Ce qu'il veut

1. Tableaux : tous les tableaux ayant le même nombre de colonnes ont leurs colonnes alignées, dans le même message ou non, dans la même conversation ou non.
2. Barres de défilement, partout dans l'appli (chat, barre latérale, panneaux, listes, page) :
   - posées par-dessus le contenu, sans place réservée, plus de "trou" autour ;
   - collées au bord du conteneur le plus proche ;
   - petites flèches toujours visibles en haut et en bas (gauche et droite pour l'horizontal), cliquables ;
   - pareil sur téléphone : barre et flèches aussi.

## Lot 1 : tableaux (FAIT, poussé sur staging)

- Fichier : lib/useTableLargeur.ts. Toutes les colonnes d'un tableau ont maintenant la même largeur (mise en page fixe), donc deux tableaux de même nombre de colonnes s'alignent.
- Si une colonne contient un mot long qui ne tient pas, la largeur égale monte au minimum nécessaire et le tableau défile de gauche à droite, comme avant. Dans ce cas seulement, deux tableaux de même nombre de colonnes peuvent différer.
- À vérifier par Bourama en production : deux tableaux de 2 colonnes l'un sur l'autre, un tableau de 3 colonnes, un tableau de plus de 7 colonnes, la fiche tableau comparatif, sur ordinateur et téléphone.

## Lot 2 : barres de défilement (À FAIRE)

État du code lu le 27/11 :
- Style global dans app/globals.css (::-webkit-scrollbar, 10 px, piste et bordure du pouce de la couleur du fond, d'où l'effet de trou). Cette barre réserve sa place.
- Environ 92 zones de défilement dans 75 fichiers. Plusieurs masquent volontairement leur barre (classe dj-scrollbar-cachee, onglets, carrousels).
- Les barres natives ne s'affichent pas sur téléphone, et le CSS seul ne peut ni les superposer ni leur mettre des flèches sur téléphone.
- Conséquence : il faut un composant de barre maison (superposé, flèches, visible partout), appliqué automatiquement aux zones de défilement.

À trancher avec Bourama avant de coder : voir la question posée en fin de session du 27/11.
