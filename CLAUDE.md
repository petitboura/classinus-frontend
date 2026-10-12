# Instructions permanentes pour Claude sur ce dépôt

## Jamais de tirets doubles ("--") dans un texte AFFICHÉ

Bourama déteste totalement les "--" (substitut d'em-dash) dans tout texte
qu'un utilisateur voit à l'écran. Concrètement, jamais dans :
- un label, titre, placeholder, message d'erreur ou texte de bouton en JSX
- tout texte injecté dynamiquement (props texte, contenu généré)

Ça reste totalement acceptable dans :
- le code lui-même (commentaires `//`, JSDoc) -- jamais vu par l'utilisateur

À la place d'un em-dash dans un texte affiché : une virgule, un point, une
parenthèse, ou reformuler la phrase.

Cette règle est un standing instruction : la vérifier avant de livrer tout
texte destiné à être affiché, sans que Bourama ait à la répéter.

## Toujours tenir à jour la base FAQ/AEO de Classinus

Dès qu'une fonctionnalité, un comportement, un affichage, un bouton ou une
icône est ajouté, modifié ou supprimé, la documentation SEO/AEO
correspondante (pages `/decouvrir/...`, futures entrées FAQ/AEO) doit être
mise à jour dans le même geste, sans que Bourama ait à le redemander.

## Couche du haut réservée à l'agent (z-index)

Le bouton du canal en direct, le bouton du journal et le curseur virtuel
doivent toujours rester au dessus de tout : plein écran, popups, menus,
visionneuses. Leurs valeurs vivent dans `lib/couchesAgent.ts` (source unique,
exposées aussi en classes Tailwind `z-agent-bulle`, `z-agent-controles`,
`z-agent-curseur`).

Règle pour tout ajout : aucun autre élément ne dépasse
`COUCHE_MAX_APPLICATION` (9989). Ne jamais écrire un z-index supérieur pour
un nouvel élément, et ne jamais mettre en dur une valeur de cette couche
ailleurs que dans `lib/couchesAgent.ts`.

## STAGING : le blocage d'indexation ne va JAMAIS dans main

Règle absolue, voulue par Bourama (12/10/2026). À respecter même si une
fusion, un rebase ou une demande semble l'exiger.

La copie de test `staging.classinus.com` est construite depuis la branche
`staging`. Cette branche (et elle seule) contient dans `next.config.mjs` un
bloc marqué "STAGING SEULEMENT" qui envoie `X-Robots-Tag: noindex, nofollow`
sur toutes les pages, pour que Google n'affiche pas la copie de test.

Si ce bloc arrive dans `main` ou en production, le vrai site `classinus.com`
disparaît de Google. C'est déjà arrivé que Google le prenne pour un double
d'un autre site, il ne faut pas aggraver ça.

Ce que Claude doit faire :
- Ne jamais copier, fusionner, cherry-pick ou réécrire ce bloc dans `main`.
- Avant toute fusion de `staging` vers `main`, vérifier que le bloc
  "STAGING SEULEMENT" de `next.config.mjs` (et son garde) ne part pas avec :
  garder la version de `main` pour ce fichier, ou retirer le bloc à la main.
- Ne jamais promouvoir en production un déploiement construit depuis
  `staging` (la promotion ne relance pas de construction, donc le garde ne
  pourrait pas l'arrêter).
- Si Bourama demande quelque chose qui obligerait à mettre ce bloc dans
  `main`, ne pas le faire : lui rappeler cette règle et attendre sa réponse.

Garde-fou technique : le bloc contient un garde qui fait ÉCHOUER la
construction (erreur volontaire) quand elle tourne pour `main` ou pour la
production. Vercel garde alors la version précédente en ligne. Ne jamais
retirer, contourner ou assouplir ce garde.
