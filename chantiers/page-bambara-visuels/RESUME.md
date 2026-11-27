# Page bambara : images et vidéos façon Google

- **Statut** : en cours (l'essentiel est dans staging ; une partie attend une décision de Bourama, voir « Points ouverts »)
- **Dernière mise à jour** : 2026-11-27
- **Dépôts concernés** : classinus-frontend et classinus-backend (le résumé côté backend est dans `classinus-backend/chantiers/page-bambara-visuels/`)
- **Branche(s)** : `staging` (front et back) pour ce qui est fait ; `feature/galerie-images-multiples-sources` (front et back) pour la partie « affichage progressif », pas encore dans staging

## Le but, en langage clair
Sur la page bambara, l'utilisateur ne sait pas lire : l'écran ne montre que des images et des vidéos. Bourama voulait que ce soit beau et abondant, « comme chez Google » : une attente soignée pendant la recherche, des résultats bien rangés, et beaucoup de résultats montrés.

## Ce qui est déjà fait (vérifié dans les dépôts, dans staging)
- **Effet d'attente** : des cases grises dont une lueur douce traverse la surface, qui ont la forme exacte des résultats à venir (`components/bambara/EffetConstruction.tsx`, classe `.bb-case` dans `bambara.css`). Remplace l'ancienne trame de points et les coins de viseur.
- **Images en rangées de hauteur égale**, largeurs selon la forme de chaque photo, coins légèrement arrondis (`components/bambara/rangeesImages.ts`, `CarteVisuelBambara.tsx`, `.bb-rangees-images`). Les rangées font 7,5 rem sur téléphone, 10 rem sur écran moyen, 12 rem sur grand écran.
- **Vidéos** : grille 16:9, 2 par ligne (3 sur grand écran) avec bouton de lecture ; lecture sur toute la largeur au toucher. Aucun texte visible.
- **Galerie multi-sources fusionnée dans staging** : côté front, 5 commits (galerie adaptative, provenance sur chaque image, aperçus des vidéos hors YouTube, vidéos de plusieurs plateformes regroupées) ; côté back, 17 commits (recherche d'images et de vidéos multi-sources, pagination), avec la consigne vidéo corrigée pour garder la règle du 08/11 (l'IA choisit, rien ne s'affiche tout seul).
- **Règle « la quantité compte autant que la qualité »**, pour la page bambara seulement : note C dans `core/prompt_voix_bambara.py` (backend). Le filtre du modèle sert à écarter le hors sujet, pas à choisir les meilleurs ; dès qu'une image ou vidéo correspond, il la montre ; il rappelle l'outil avec `page=2` s'il en reste peu. Les consignes générales de `rechercher_image` et `rechercher_video` restent celles de toute la plateforme (une première version générale a été annulée par un revert).

## Ce qui reste à faire
1. Décider du sort du commit « Affichage progressif des images et vidéos sur la page bambara » (voir Points ouverts).
2. Regarder le rendu réel sur staging, sur téléphone et sur PC, avec de vraies photos (seule une maquette a été vue).
3. Vérifier que les clés d'API des nouvelles sources d'images sont dans les variables de staging (voir `docs/RECHERCHE_IMAGE.fr.md` côté backend) ; sans clé, la source est ignorée.

## Décisions prises par Bourama
- « Les effets sont ultra nuls, fais comme chez Google » : il a choisi les deux, l'effet d'attente ET la mise en page des résultats comme Google.
- Résultats comme Google Images : rangées de hauteur égale, largeurs différentes, petit espace, coins légèrement arrondis ; vidéos comme Google Vidéos. Cela remplace sa décision du 18/11 (carrés tous pareils).
- La règle de quantité est « surtout pour la page bambara », pas pour toute la plateforme.
- La galerie multi-sources (images avec provenance, vidéos de plusieurs plateformes) est fusionnée dans staging pour toute la plateforme, en respectant ce qui était plus récent.

## Points ouverts
- Le commit « Affichage progressif des images et vidéos sur la page bambara » (front `7d5ddf26`, back `82fceb5`, 22/11 au soir) est sur les deux branches `feature/galerie-images-multiples-sources` et n'est pas dans staging. Côté back il ajoute `core/medias_progressifs.py` (environ 400 lignes) et modifie la recherche d'images et de vidéos. À examiner avec Bourama avant de fusionner. Ces branches contiennent aussi une fusion de staging du 22/11 : ne pas les fusionner telles quelles sans vérifier ce qu'elles apportent par rapport à staging aujourd'hui.
- Bourama veut-il aussi limiter la galerie multi-sources (hors règle de quantité) à la page bambara ? Question posée, pas de réponse.
- Deux tests étaient déjà en échec sur staging avant ce chantier : `tests/verifier-echapper-montants.mjs` (front) et `test_voix_bambara.py` (back, import introuvable).

## Pour l'IA qui reprend ce chantier
- Fais un `git fetch` et compare `origin/staging` avec `origin/feature/galerie-images-multiples-sources` (front et back) avant tout : d'autres sessions ont modifié la page bambara en parallèle (boutons du haut, historique, appli Maame, Soloba).
- Ne touche pas à la mise en page des résultats sans demander : elle a déjà été changée plusieurs fois le 22/11.
- Vérifie le rendu sur un vrai déploiement de staging avant de dire que c'est terminé.
- Le token GitHub se trouve dans la page Notion « Github Token ».
