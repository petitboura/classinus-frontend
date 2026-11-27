# Tableaux alignés et barres de défilement

- **Statut** : en cours (lot 1 tableaux poussé sur staging, lot 2 barres de défilement à faire)
- **Dernière mise à jour** : 2026-11-27
- **Dépôts concernés** : classinus-frontend (le backend n'est pas concerné)
- **Branche(s)** : `staging` (lot 1 déjà dedans) ; aucune branche dédiée pour le lot 2 pour l'instant

## Le but, en langage clair
1. **Tableaux** : deux tableaux de deux colonnes l'un sur l'autre n'étaient pas alignés. Tous les tableaux ayant le même nombre de colonnes doivent avoir leurs colonnes alignées, dans le même message ou non, dans la même conversation ou non.
2. **Barres de défilement** : elles ont l'air d'être « dans un trou » (la barre réserve sa place, avec une bordure de la couleur du fond autour du pouce). Bourama les veut **par-dessus** le contenu, collées au bord du conteneur le plus proche, avec de **petites flèches toujours visibles** en haut et en bas (gauche et droite pour l'horizontal), cliquables, « comme tout le monde ». Partout dans l'appli : chat, barre latérale, panneaux, listes, page.

## Ce qui est déjà fait
- **Lot 1, tableaux (poussé sur staging)** : `lib/useTableLargeur.ts`. Toutes les colonnes d'un tableau ont maintenant la même largeur (mise en page fixe), donc deux tableaux de même nombre de colonnes s'alignent. Si une colonne contient un mot long qui ne tient pas, la largeur égale monte au minimum nécessaire et le tableau défile de gauche à droite, comme avant. Dans ce cas seulement, deux tableaux de même nombre de colonnes peuvent différer.
- **État des lieux des barres** (lu au commit `d1bf1fd` de main et sur staging) :
  - Style global dans `app/globals.css` (`::-webkit-scrollbar`, 10 px, piste et bordure du pouce de la couleur du fond, d'où l'effet de trou). Aucune flèche n'est stylée.
  - Environ 92 zones de défilement dans 75 fichiers. Plusieurs masquent volontairement leur barre (classe `dj-scrollbar-cachee`, onglets, carrousels, filtres, cartes de paliers).
  - Les cadres isolés (`components/chat/WidgetSandbox.tsx`, `components/chat/animation/construireDocumentAnimation.ts`) ont leur propre style de barre.
  - Les barres natives ne s'affichent pas sur téléphone, et le CSS seul ne peut ni les superposer ni leur mettre des flèches sur téléphone. Il faut donc un composant de barre maison (superposé, flèches, visible partout), appliqué automatiquement aux zones de défilement.

## Ce qui reste à faire
1. Faire vérifier le lot 1 par Bourama en production (voir points ouverts).
2. Trancher les points ouverts du lot 2, puis proposer un plan et attendre son accord.
3. Créer le composant de barre maison (superposé, sans place réservée, flèches toujours visibles, cliquables) et l'appliquer partout.
4. Penser aux règles de CLAUDE.md : z-index de la couche agent (`lib/couchesAgent.ts`), pas de contrôles natifs, aucun double tiret ni tiret long dans les textes, textes traduits, mobile natif, squelettes de chargement, documentation.

## Décisions prises par Bourama
- Barres posées par-dessus le contenu et collées au bord de la zone qui défile.
- Petites flèches en haut et en bas, **toujours visibles**.
- **Partout** dans l'application.
- Même chose sur téléphone : barre et flèches aussi (noté dans la fiche du 27/11, à reconfirmer s'il y a un doute car la question avait d'abord paru floue).
- Tous les tableaux de même nombre de colonnes alignés, **même message ou non, même conversation ou non, deux colonnes ou plus**.

## Points ouverts
- À vérifier par Bourama en production : deux tableaux de 2 colonnes l'un sur l'autre, un tableau de 3 colonnes, un tableau de plus de 7 colonnes, la fiche tableau comparatif, sur ordinateur et téléphone.
- Cadres isolés (widgets, animations) et rangées qui cachent volontairement leur barre (images, onglets, carrousels) : concernés par « partout » ? À confirmer.
- Un maintien sur une flèche fait-il défiler en continu ? À confirmer.
- Cas du mot long qui empêche l'alignement de deux tableaux : acceptable tel quel, ou faut-il une autre règle (retour à la ligne forcé dans les cases) ?

## Pour l'IA qui reprend ce chantier
- Relire le code réel avant d'agir : `app/globals.css`, `lib/useTableLargeur.ts`, `components/chat/TableauMessage.tsx`.
- Ne rien coder du lot 2 sans que Bourama ait validé le plan.
- Le fichier `chantiers/README.md` (liste des chantiers) existe sur `main` mais pas sur `staging` : ne pas le recréer à l'aveugle, vérifier l'état des branches avant d'ajouter la ligne de ce chantier.
