# Liste d'attente des modèles « Bientôt »

[English version](LISTE_ATTENTE_MODELES.md) · **Version française**

Ajoutée le 16 novembre 2026 à la demande de Bourama. Une fausse porte mesure la demande réelle avant de brancher Claude, GPT et Gemini. Dans le sélecteur de modèles en haut du chat, ces modèles restent grisés avec un **verrou** (le mot « Bientôt » n'existe plus depuis le 17 novembre 2026) et ne sont jamais sélectionnables. Les modèles frontière (groupe 1) portent un badge **Max** à la place du verrou, sur la même ligne grisée. Un clic dessus ouvre la page `/abonnements`, une vraie page (depuis le 18 novembre 2026, avant c'était une fenêtre avec son propre défilement) qui est, depuis le 19 novembre 2026, une page de paiement : chaque carte de palier a son bouton **Payer**. Le formulaire de liste d'attente, la mention « aucun paiement » et les états d'inscription ont disparu de cette page (les tables, les routes et le code de `lib/listeAttente.ts` n'ont pas bougé). Le bouton Payer n'est pas encore relié à un service de paiement : il ne fait rien pour l'instant. Le côté serveur est décrit dans la documentation du backend (`docs/chantiers/LISTE_ATTENTE_MODELES.fr.md`).

## Ce que voit la personne

1. Elle ouvre le sélecteur de modèles. C'est la première étape de l'entonnoir (`selecteur_ouvert`), notée seulement quand le sélecteur montre au moins un modèle « Bientôt ».
2. Elle clique sur un modèle grisé (`modele_grise_clique`). Le sélecteur se ferme et la page `/abonnements?modele=...&nom=...` s'ouvre (`formulaire_ouvert`). Un visiteur sans compte la voit aussi ; le compte n'est demandé qu'au moment de rejoindre la liste, par la fenêtre « Compte requis ». Ouverte par une adresse directe, sans modèle, la page envoie la valeur `page_abonnements` comme modèle.
3. La page montre un squelette pendant le chargement, puis, sous un seul titre (sans introduction ni titres de section, depuis le 19 novembre 2026) : les trois paliers en cartes côte à côte, présentées comme sur la page de tarification de Claude (nom, courte phrase, prix en grand, crédit mensuel, bouton « Payer », puis la liste de ce qui est inclus), puis un tableau de comparaison des paliers (composant `TableauComparaison.tsx`, comme celui de Claude : une colonne par palier, une ligne par fonction, deux sections, Fonctionnalités et Modèles et crédit ; une coche veut dire inclus, sinon « Non », une courte valeur comme « Illimités », ou « Bientôt »).
4. Le modèle présent dans l'adresse (`modele`, `nom`) n'est plus lu par la page, et la page ne note plus l'étape `formulaire_ouvert`.
5. Les nouveaux textes (clés `attente_abo_titre` et `attente_abo_payer`, français et anglais, dans `textes_modeles_llm`) viennent du serveur. Ils gardent le préfixe `attente_` parce que c'est celui que le backend renvoie.

La page défile comme n'importe quelle page, avec un bouton « Retour » en haut qui ramène au chat. Sur ordinateur, les trois cartes de palier sont sur une ligne ; sur téléphone elles s'empilent, et chaque carte garde le même contenu. Le bouton de la carte est le bouton Payer de ce palier. À partir du deuxième palier, la liste commence par « Tout ce qui est inclus dans <palier précédent>, plus : » et ne montre que ce qui s'ajoute. Ces textes sont les clés `attente_palier_<prix>_accroche`, `_inclus_titre` et `_inclus`. Il n'y a pas de barre collée en bas (retirée le 19 novembre 2026).

## Où se trouvent les choses

| Fichier | Rôle |
| --- | --- |
| `app/(app)/abonnements/page.tsx` | La route `/abonnements`. |
| `components/abonnements/PageAbonnements.tsx` | La page de paiement : cartes de palier avec leur bouton Payer et tableau de comparaison, avec son état de chargement. |
| `components/chat/CartePalierListeAttente.tsx` | Une carte de palier : nom, phrase, prix, crédit, bouton Payer, liste de ce qui est inclus et badge facultatif. |
| `components/chat/SelecteurModeleHaut.tsx` | Le sélecteur : un modèle grisé ouvre maintenant la page des abonnements, et les premières étapes de l'entonnoir sont notées ici. |
| `lib/listeAttente.ts` | Les appels au serveur, les étapes de l'entonnoir, la source (web, android, ios, pc) et la liste des pays. |
| `lib/erreurs.ts` | Les codes d'erreur `LISTE_ATTENTE_*`, en français et en anglais. |

## Rien n'est écrit en dur

- Les paliers (prix et crédit mensuel) viennent du serveur, de la table `paliers_liste_attente`.
- Tous les textes du formulaire viennent du serveur, de `textes_modeles_llm` (clés qui commencent par `attente_`), en français et en anglais. Si une clé manque dans la langue choisie, le texte français est utilisé ; une clé brute n'est jamais affichée. Le tableau de comparaison vient des sections de `attente_comp_ordre` : `attente_comp_<id>_titre` et `attente_comp_<id>_lignes`, une ligne par `|`, écrite `libellé#valeur palier 1#valeur palier 2#valeur palier 3` (une valeur est `oui`, `non`, `bientot` ou un court texte ; `{credit}` est remplacé par le crédit mensuel du palier). Les anciennes clés `attente_cap_*` et `attente_palier_<prix>_points` ne sont plus lues. Un badge facultatif sur un palier vient de `attente_palier_<prix>_badge` : sans texte, pas de badge.
- Les noms de pays viennent du navigateur (`Intl.DisplayNames`) dans la langue de l'interface, donc aucun n'est traduit à la main. Seuls les codes ISO des pays proposés sont dans `lib/listeAttente.ts`.

## Les étapes de l'entonnoir ne bloquent jamais

`noterEtapeListeAttente` ignore toute erreur, y compris l'absence de compte. Une note qui échoue ne ralentit ni n'interrompt jamais la personne. La dernière étape, `inscription_validee`, est écrite par le serveur quand l'inscription réussit ; le client ne peut pas l'envoyer.

## Verrou et badge Max

`SelecteurModeleHaut.tsx` montre une icône de verrou sur chaque modèle verrouillé, sauf les modèles du groupe 1 où le badge Max prend sa place. L'info-bulle et son nom accessible viennent du backend (`libelles_bientot`, le texte de la clé `bientot`, maintenant « Disponible avec un abonnement »). Ce badge, à droite à la place du verrou, vient de `libelles_badge` (texte `badge_groupe_1`, « Max »), envoyé seulement pour les modèles du groupe 1. Les deux textes sont dans Supabase, en français et en anglais.

## Limites connues

- Un visiteur sans compte voit la page, mais pas son inscription (il n'en a pas) ; ses étapes d'entonnoir ne sont pas notées. Pour rejoindre la liste, il doit se connecter.
- Le panneau du plugin Thonny a son propre bouton de modèle, qui montre toujours les modèles verrouillés comme désactivés. Il n'ouvre pas la page.
- L'application Android n'a pas encore de lien profond pour `/abonnements` dans son manifeste : la page s'ouvre bien depuis le sélecteur, pas depuis un lien externe.
- Pas encore vérifié sur de vrais appareils : navigateur de téléphone, applis Android et iOS installées, appli PC installée. Les vérifications à faire sont dans la liste de tests staging de la description de la branche.
