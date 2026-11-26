# Ligne d'outils : la roue, les notes de l'IA et la réflexion

[English version](LIGNE_OUTILS_ROUE.md) · **Version française**

Demande du 25 novembre 2026. La partie backend (l'outil `commenter` et l'événement `commentaire`) est décrite dans le dépôt backend, `docs/chantiers/LIGNE_OUTILS_COMMENTAIRE.fr.md`.

## Ce que voit l'utilisateur

- **Une seule ligne, repliée par défaut.** Dès qu'il y a deux lignes ou plus (outils ou notes), l'activité des outils tient sur une seule ligne. Pendant que l'IA travaille, chaque nouvelle ligne remplace la précédente comme une roue qui tourne vers le haut : la nouvelle monte par le bas, l'ancienne glisse vers le haut en s'estompant.
- **Aucune durée minimale pour un outil.** Des outils appelés en même temps se remplacent vite (environ 170 ms d'écart). Une note de l'IA reste plus longtemps, selon sa longueur (de 1,4 s à 4,5 s), pour qu'on ait le temps de la lire.
- **Une seule ligne de texte.** Le texte est coupé par « ... » quand il est trop long (surtout sur mobile) au lieu de passer à la ligne. La liste dépliée, elle, passe toujours à la ligne.
- **Notes.** Une note de l'IA est une ligne à part entière avec une icône point à la place de l'icône d'outil. Elle ne casse pas un groupe et n'est jamais comptée comme un outil.
- **Tant que la réponse n'est pas finie** (outil en cours, réflexion, texte ou confirmation en attente), la dernière ligne reste affichée jusqu'à ce que la suivante la remplace. La roue ne repasse jamais par une ligne déjà montrée (26 novembre 2026).
- **Quand la réponse est finie.** La roue devient « N outils utilisés », repliée, comme avant. Un clic déplie la liste complète, outils et notes dans l'ordre. Le shimmer d'une ligne indique que son outil tourne encore ; il n'y a ni compteur ni mention « en cours » ou « terminé ».
- **Réflexion (26 novembre 2026).** Chaque phase de réflexion du modèle est une ligne de la roue, à sa place réelle entre les outils et les notes, avec une icône de cerveau. Il n'y a plus de bloc unique en haut. Le titre est un mot de la famille de la réflexion, deux points, puis la première phrase de ce que pense le modèle : « Réflexion : Je vais d'abord lire le fichier de configuration. » (en anglais : « Reasoning: ... »). Le mot change d'une réflexion à l'autre (français : Réflexion, Raisonnement, Analyse, Pensée ; anglais : Reasoning, Thinking, Analysis, Reflection), choisi d'après le numéro de la réflexion dans le message pour ne jamais changer pendant que le texte s'écrit. Si le texte commence par un titre en gras écrit par le modèle, ce titre devient le titre de la ligne. Le titre scintille tant que le modèle réfléchit. Une réflexion n'est jamais comptée comme un outil. Dans la liste dépliée, un clic sur la ligne montre le texte brut de la réflexion.
- **Un seul outil sans note** garde l'affichage simple.

## Code

- `components/chat/OutilResultatBulle.tsx` : construit la liste ordonnée (lignes d'outils fusionnées quand le même outil se répète, notes entre elles), choisit entre roue, résumé et affichage simple.
- `components/chat/RoueOutils.tsx` : la roue (minuteurs, animations `dj-roue-entree` et `dj-roue-sortie` dans `tailwind.config.ts`).
- `components/chat/LigneCommentaire.tsx` : la ligne de note dans la liste dépliée.
- `components/chat/ChatIA.tsx` : reçoit l'événement `commentaire` par la même file que les outils, donc le texte en cours finit d'abord, et enregistre un segment `commentaire`.
- `components/chat/BulleMessage.tsx` : type de segment `commentaire` et regroupement d'une suite d'outils, de notes et de phases de réflexion.
- `components/chat/LigneReflexion.tsx` : la ligne de réflexion dans la liste dépliée (titre, clic pour lire le texte brut).
- `lib/titreReflexion.ts` : construit le titre (mot, puis première phrase, nettoyée de la mise en forme et des tirets longs, 160 caractères au plus).
- `components/chat/RaisonnementBulle.tsx` : l'ancien bloc unique, maintenant réservé aux anciens messages enregistrés sans segments.
- `lib/i18n/interface.ts` : anglais de « N outil(s) utilisé(s) ». Les notes sont écrites par l'IA dans la langue de la conversation et ne sont jamais traduites. Le mot du titre de réflexion suit la langue de l'interface ; la phrase qui le suit est le texte du modèle.
