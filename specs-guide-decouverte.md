# Specs : Guide de découverte de Clovis (chantier lancé le 16/09/2026, demande Bourama)

Ce document existe parce que plusieurs IA vont travailler sur ce chantier en
parallèle, chacune sur une étape distincte. Toujours relire ce fichier avant
de commencer une étape, ne jamais deviner un point marqué "ouvert" plus bas,
demander à Bourama si besoin.

## Contexte général

Bourama veut un guide interactif qui présente Clovis section par section à
un nouvel utilisateur, sans jamais afficher un long pavé de texte. Ce guide
s'appuie sur deux choses qui existent déjà en prod et qu'il ne faut pas
recréer :

1. **La base de connaissance Clovis** : table Supabase `documents`
   (`agent_id = 'clovis'`), 17 articles nommés `01-vue-ensemble.md` à
   `17-capacites-ia.md`, lus par l'outil `gerer_base_connaissance`. Voir la
   section "Correspondance des sections" plus bas pour la liste complète.
2. **La question riche dans le chat** (chantier du 15/09/2026) : Clovis peut
   écrire un bloc \`\`\`question\`\`\` (JSON, 8 types dont `choix_unique`,
   voir `lib/questionRiche.ts` et `components/chat/QuestionInteractive.tsx`
   dans `clovis-frontend`), affiché comme de vrais boutons/champs cliquables.
   Cliquer envoie une vraie phrase comme message suivant. C'est le mécanisme
   à utiliser pour TOUTE interaction du guide (Continuer, section
   précédente, choix d'une section, Essayer maintenant / Juste un exemple).
   Ne jamais construire un nouveau composant de boutons séparé pour le
   guide : réutiliser ce mécanisme existant.

Il existe aussi déjà un système de mode par conversation (mode pédagogique,
bouton + raccourci `/`, voir chantier "modes-pedagogiques-system-prompt").
Le guide doit être un mode supplémentaire de ce même système, pas un
mécanisme séparé.

## Règles validées par Bourama (ne jamais réinterpréter)

- Deux points d'entrée seulement : un bouton flottant, déplaçable, visible
  sur toutes les pages SAUF `/chat` ; et une entrée dans le menu `+` déjà
  existant du chat. Jamais de bouton séparé dans le chat lui même.
- Au déclenchement, Clovis propose lui même, via un bloc `question` de type
  `choix_unique`, deux options : "Je commence" et "Je veux comprendre une
  section".
- "Je commence" : parcours des 17 sections dans l'ordre fixe 01 à 17. Pas de
  vrai aléatoire. L'utilisateur peut à tout moment sauter à une autre
  section ou revenir en arrière, jamais un parcours strictement bloqué à
  avancer une par une.
- Chaque section est expliquée étape par étape (plusieurs messages courts),
  jamais un seul long texte.
- Section chat (correspond à l'article `02-chat.md` et surtout
  `17-capacites-ia.md`) : Clovis démontre absolument tout ce qu'il sait
  faire (modes, boutons, types de génération), regroupé par catégorie
  (Générer, Rechercher, Action app, Utilitaires), et pour chaque outil ou
  groupe propose à l'élève un choix entre "Essayer maintenant" (vraie
  exécution de l'outil) et "Juste un exemple" (démonstration décrite, sans
  exécution réelle).
- "Je veux comprendre une section" : la liste proposée à l'utilisateur
  utilise des libellés compréhensibles (voir tableau plus bas), jamais les
  noms de fichiers techniques de la base de connaissance.
- Rien dans le guide ne doit contourner les confirmations déjà obligatoires
  sur les actions sensibles (GitHub, Notion, Google Drive). Voir
  `04-recherche-et-connecteurs.md` et `16-integrations-externes.md`.

## Correspondance des sections (article de la base de connaissance -> libellé utilisateur)

| Article (table `documents`, agent `clovis`) | Libellé pour l'utilisateur |
|---|---|
| 01-vue-ensemble.md | Vue d'ensemble |
| 02-chat.md | Le chat |
| 03-generation.md | Génération de contenus |
| 04-recherche-et-connecteurs.md | Recherche et connecteurs |
| 05-bibliotheque.md | Bibliothèque personnelle |
| 06-memoire-et-profil.md | Mémoire et profil |
| 07-skills.md | Skills |
| 08-base-de-connaissance.md | Base de connaissance de Clovis |
| 09-bureau-enseignant.md | Bureau (enseignant) |
| 10-avancement-programme.md | Programme et avancement |
| 11-telephone.md | Dossiers du téléphone |
| 12-utilitaires.md | Utilitaires du chat |
| 13-outils-dynamiques.md | Outils dynamiques |
| 14-connecter-claude.md | Connecter Clovis dans Claude |
| 15-concentration.md | Concentration |
| 16-integrations-externes.md | Intégrations externes |
| 17-capacites-ia.md | Ce que Clovis sait faire |

Cette table doit être stockée quelque part de dynamique (voir étape 1), pas
codée en dur dans un composant, conformément à la règle générale de
dynamisme des standards de Bourama.

## Une seule branche pour tout le chantier

Toutes les étapes de ce chantier, backend comme frontend, se poussent sur
UNE SEULE branche dédiée nommée `guide-decouverte` (une par dépôt, donc
`guide-decouverte` sur `clovis-backend` ET sur `clovis-frontend`), jamais
une branche séparée par étape. Si la branche `guide-decouverte` du dépôt
concerné existe déjà, la récupérer et committer par dessus ; sinon la
créer à partir de `main` à jour.

## Étapes indépendantes

Chaque étape ci dessous peut être développée et poussée séparément, sans
attendre les autres. Une étape qui dépend du résultat d'une autre peut
quand même être poussée seule : elle restera simplement sans effet réel
jusqu'à ce que l'étape dont elle dépend soit poussée à son tour (jamais de
crash, jamais de comportement cassé pour l'utilisateur actuel).

### Étape 1 (backend, clovis-backend) : référentiel des sections du guide

Créer une petite table Supabase (proposition : `guide_sections`, colonnes
`nom_article`, `libelle_utilisateur`, `accroche_courte`, `ordre`) reprenant
le tableau ci dessus. Aucune dépendance, rien ne la consomme encore.

Point ouvert : nom exact de la table et de ses colonnes, à confirmer avec
Bourama avant de créer la migration si une autre IA arrive ici en premier.

### Étape 2 (backend) : mode de conversation "guide"

S'appuie sur le système existant de mode par conversation (mode
pédagogique). Ajouter une valeur de mode supplémentaire ("guide"),
stockée par conversation comme le mode pédagogique actuel.

Indépendante : peut être poussée même si rien ne l'active encore côté
frontend (testable en changeant la valeur manuellement en base, comme pour
tous les chantiers précédents).

### Étape 3 (backend, contenu du prompt) : instruction système du mode guide

Rédiger le texte d'instruction injecté au prompt quand le mode "guide" est
actif (voir étape 2). Ce texte doit dire à Clovis : s'appuyer sur
`gerer_base_connaissance` pour lire les 17 articles, utiliser un bloc
`question` de type `choix_unique` à chaque transition, ne jamais produire
un pavé de texte, respecter l'ordre fixe des sections en autorisant les
sauts, et pour la section chat appliquer la règle "Essayer maintenant" /
"Juste un exemple" par groupe d'outils.

Point ouvert, à trancher avant de rédiger : la liste proposée pour "je veux
comprendre une section" est elle un bloc `question` `choix_unique` généré
par Clovis lui même à partir de la table de l'étape 1 (pas de nouveau
composant frontend), ou une vraie liste d'interface séparée (menu, cartes)
codée côté frontend ? Ne pas deviner, demander à Bourama.

Dépend de l'étape 2 pour être branchée en production, mais le texte peut
être rédigé et stocké avant que l'étape 2 ne l'utilise réellement.

### Étape 4 (frontend, clovis-frontend) : bouton flottant

Composant flottant, déplaçable, position mémorisée par utilisateur,
affiché sur toutes les pages sauf `/chat`. Au clic, il doit déclencher le
mode "guide" (étape 2) sur une conversation puis ouvrir le chat.

Point ouvert : le clic ouvre une nouvelle conversation dédiée au guide, ou
active le mode guide sur la conversation en cours ? Ne pas deviner,
demander à Bourama.

Indépendante : peut être poussée avant même que le mode existe côté
backend, simplement sans effet réel tant que l'étape 2 n'est pas poussée.

### Étape 5 (frontend) : entrée "Guide" dans le menu `+` du chat

Même déclenchement que l'étape 4 (mode guide + ouverture du chat), mais
accessible depuis le menu `+` déjà existant du chat. Jamais de bouton
séparé affiché dans le chat lui même, règle explicite de Bourama.

Indépendante, même logique de dépendance que l'étape 4.

## Ce qui n'est PAS une étape séparée

La liste des sections affichée pour "je veux comprendre une section" et la
démonstration groupée des outils dans la section chat font partie du
contenu de l'instruction du mode guide (étape 3), pas d'un nouveau
composant d'interface, sauf si le point ouvert de l'étape 3 est tranché
dans l'autre sens par Bourama.
