# Tableaux alignés et barres de défilement

- **Statut** : en cours (lot 1 tableaux revu le 28/11 et poussé sur staging, lot 2 barres de défilement à faire)
- **Dernière mise à jour** : 2026-11-28
- **Dépôts concernés** : classinus-frontend (le backend n'est pas concerné)
- **Branche(s)** : `staging` (lot 1 déjà dedans) ; aucune branche dédiée pour le lot 2 pour l'instant

## Le but, en langage clair
1. **Tableaux** : chaque tableau et chaque colonne s'adaptent à leur contenu, sans trait vertical entre les colonnes. L'idée du 27/11 (toutes les colonnes de même largeur pour aligner deux tableaux de même nombre de colonnes) a été abandonnée le 28/11 par Bourama : un seul mot long (par exemple un jeton de 170 caractères) élargissait toutes les colonnes à sa largeur.
2. **Barres de défilement** : elles ont l'air d'être « dans un trou » (la barre réserve sa place, avec une bordure de la couleur du fond autour du pouce). Bourama les veut **par-dessus** le contenu, collées au bord du conteneur le plus proche, avec de **petites flèches toujours visibles** en haut et en bas (gauche et droite pour l'horizontal), cliquables, « comme tout le monde ». Partout dans l'appli : chat, barre latérale, panneaux, listes, page.

## Ce qui est déjà fait
- **Lot 1, tableaux (revu le 28/11, poussé sur staging)** : `lib/useTableLargeur.ts` est revenu à la version d'avant le commit `447c023` (mise en page automatique : chaque colonne prend la largeur de son contenu, le tableau défile de gauche à droite en fondu seulement s'il ne tient pas). Dans `app/globals.css`, le bloc `.dj-table-chat` n'a plus de trait vertical entre les colonnes : il reste seulement les lignes horizontales entre les rangées, sans cadre extérieur. Cela vaut aussi pour la fiche tableau comparatif, qui utilise la même classe. Les tableaux gardent la largeur de la colonne de texte (`width: 100%`), comme avant.
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
- Tableaux (décision du 28/11, remplace celle du 27/11 sur l'alignement) : **chaque tableau s'adapte à son contenu et chaque colonne aussi**, **sans trait vertical** entre les colonnes. Les colonnes de même largeur pour aligner deux tableaux ne sont plus voulues.

## Points ouverts
- À vérifier par Bourama sur staging : un tableau avec un jeton très long (colonnes adaptées au contenu, défilement en fondu si besoin), un tableau de 3 colonnes, un tableau de plus de 7 colonnes, la fiche tableau comparatif, sur ordinateur et téléphone.
- Un tableau court doit-il garder la pleine largeur de la colonne de texte (comme avant) ou se réduire à la largeur de son contenu ? Gardé pleine largeur pour l'instant, à confirmer.
- Cadres isolés (widgets, animations) et rangées qui cachent volontairement leur barre (images, onglets, carrousels) : concernés par « partout » ? À confirmer.
- Un maintien sur une flèche fait-il défiler en continu ? À confirmer.

## Pour l'IA qui reprend ce chantier
- Relire le code réel avant d'agir : `app/globals.css`, `lib/useTableLargeur.ts`, `components/chat/TableauMessage.tsx`.
- Ne rien coder du lot 2 sans que Bourama ait validé le plan.
- Le fichier `chantiers/README.md` (liste des chantiers) existe sur `main` mais pas sur `staging` : ne pas le recréer à l'aveugle, vérifier l'état des branches avant d'ajouter la ligne de ce chantier.
