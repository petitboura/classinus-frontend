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
