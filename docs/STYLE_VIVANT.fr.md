# Le style vivant de l'attente et de la réflexion

[English version](STYLE_VIVANT.md) · **Version française**

Style choisi le 27 novembre 2026. Cette fiche le garde comme information, pour le comprendre ou le reprendre ailleurs.

## L'idée

Pendant que Classinus travaille, l'écran doit sembler vivant. Le mouvement ne suit jamais un rythme régulier, deux formes identiques ne se suivent pas, et tout se calme quand le travail est fini.

## Les ingrédients

| Ingrédient | Ce que l'on voit | Réglage |
| --- | --- | --- |
| Rythme irrégulier | Un changement tantôt rapide, tantôt lent | Au hasard : 1 s, 1,4 s, 1,9 s, 2,6 s ou 3,5 s |
| Jamais de répétition | Le nouveau choix diffère toujours du précédent | Textes, styles et icônes |
| Reflet | Une lumière passe de lettre en lettre | Cycle de 2,2 s, décalage de 60 ms par lettre |
| Trois points | Ils sautillent à tour de rôle après le texte | Cycle de 1,3 s, saut de 4 px, décalage de 150 ms |

## Les textes

Des phrases très courtes, à la première personne ou imagées, sans aucun nom.

| Français | Anglais |
| --- | --- |
| Je réfléchis | Thinking it through |
| Ça mijote | Gently simmering |
| Les idées arrivent | Ideas coming in |
| Je creuse | Digging deeper |
| Un petit instant | Just a moment |
| Petite étincelle | A little spark |
| Les neurones chauffent | Neurons warming up |
| Je fais le lien | Connecting the dots |
| Je rassemble tout | Pulling it together |
| Mise en ordre | Sorting it out |
| Ça prend forme | Taking shape |
| Je peaufine | Polishing it up |

## Les trois façons de changer de texte

Chaque changement en tire une au hasard, différente de la précédente.

| Style | Le nouveau texte | L'ancien texte |
| --- | --- | --- |
| Roue | La ligne entière monte par le bas en 0,38 s | Elle glisse vers le haut en s'estompant, 0,38 s |
| Lettres | Les lettres apparaissent une par une, toutes les 38 ms | Il disparaît aussitôt |
| Vague | Après 120 ms, les lettres montent une à une, toutes les 25 ms, avec un petit rebond | Ses lettres s'envolent une à une, toutes les 18 ms |

## Les icônes de la réflexion

Tant que la réflexion est en cours, l'icône change au même rythme irrégulier, avec un court fondu. La première est elle aussi tirée au hasard.

| Icône | Nom dans la bibliothèque Lucide | Mouvement |
| --- | --- | --- |
| Étincelle | `Sparkle` | Grossit et pivote, 1,8 s |
| Ampoule | `Lightbulb` | S'allume et s'adoucit, 1,6 s |
| Atome | `Atom` | Tourne, 4 s par tour |
| Orbite | `Orbit` | Tourne, 4 s par tour |
| Points reliés | `Waypoints` | Tourne, 4 s par tour |
| Plume | `Feather` | Se balance comme si elle écrivait, 1,1 s |
| Trois points | Dessin maison | Sautillent à tour de rôle |

Quand la réflexion est finie, il reste toujours l'ampoule, immobile.

## Le confort de lecture

- Si la personne a demandé à son appareil de réduire les animations, les mouvements s'arrêtent. Le texte d'attente change avec un simple fondu et les icônes changent sans mouvement.
- Pour le message d'attente, un lecteur d'écran n'entend qu'une seule annonce.

## Où il sert aujourd'hui

- [Message d'attente du chat](MESSAGE_ATTENTE.fr.md) : textes, une seule animation et points.
- [Ligne d'outils](LIGNE_OUTILS_ROUE.fr.md) : les icônes de la réflexion.

Les réglages se trouvent dans `lib/messageAttente.ts`, `components/IndicateurReflexion.tsx`, `components/chat/IconeReflexion.tsx` et `tailwind.config.ts`. Si l'un change, cette fiche change avec lui.
