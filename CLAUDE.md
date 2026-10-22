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

## Menus, listes et bulles ancrés : toujours via FlottantAncre

Règle voulue par Bourama (17/10/2026) : plus jamais de placement réglé au cas
par cas pour un menu, une liste déroulante, une bulle ou un volet qui s'ouvre
à côté d'un bouton. Tout passe par `components/FlottantAncre.tsx` (calcul dans
`lib/placementFlottant.ts`).

Ce que la règle garantit : le panneau s'ouvre du côté voulu s'il y a la place,
sinon de l'autre côté (vers le haut ou vers la gauche), sinon il se réduit et
défile à l'intérieur de lui-même. Il ne sort jamais de son contenant : la
fenêtre ou le panneau qui le porte, sinon l'écran réellement visible (clavier
du téléphone exclu). Il est rendu dans le corps de la page, donc aucun parent
ne peut le rogner ni le pousser à déborder.

Pour tout ajout :
- Ne jamais écrire `absolute top-full`, `bottom-full`, `right-0` ou une mesure
  `getBoundingClientRect` pour un panneau ancré. Utiliser `FlottantAncre`.
- Toute fenêtre ou panneau qui peut contenir un menu porte l'attribut
  `data-contenant-flottant` (déjà posé sur `PanneauFlottant` et les fenêtres de
  section). Un nouveau conteneur de ce type doit le porter aussi.
- Le clic à l'extérieur doit tester `innerRef.contains(cible)` en plus du
  bouton, car le panneau n'est plus un descendant DOM de son bouton.
- Le niveau (z-index) est géré par le composant, sous la couche de l'agent.

## Listes et cases à cocher : jamais de natif

Décision de Bourama (22/10/2026), à ne jamais défaire. Le navigateur dessine
lui-même les `<select>` et les `<input type="checkbox">`, sans notre thème.
- Liste déroulante : `SelectPersonnalise` (option `compact` pour les rangées serrées).
- Case à cocher : `CaseACocher`.
- Ne jamais écrire `<select>` ni `<input type="checkbox">` ailleurs que dans ces
  deux composants. `tests/verifier-composants-natifs.mjs` tourne avant chaque
  build (`prebuild`, et les builds Capacitor) et l'arrête avec le fichier et la
  ligne fautifs. Ne pas le contourner ni l'assouplir.
- Même logique pour la langue de l'interface : pas de pastille FR/EN flottante,
  le choix est dans Paramètres > Préférences et à la création du compte.
