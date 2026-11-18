# Liste d'attente des modèles « Bientôt »

[English version](LISTE_ATTENTE_MODELES.md) · **Version française**

Ajoutée le 16 novembre 2026 à la demande de Bourama. Une fausse porte mesure la demande réelle avant de brancher Claude, GPT et Gemini. Dans le sélecteur de modèles en haut du chat, ces modèles restent grisés avec un **verrou** (le mot « Bientôt » n'existe plus depuis le 17 novembre 2026) et ne sont jamais sélectionnables. Les modèles frontière (groupe 1) portent en plus un badge **Max** devant leur nom. Un clic dessus ouvre maintenant un formulaire d'inscription à une liste d'attente payante. **Aucun paiement n'est pris**, et le formulaire le dit en haut. Le côté serveur est décrit dans la documentation du backend (`docs/chantiers/LISTE_ATTENTE_MODELES.fr.md`).

## Ce que voit la personne

1. Elle ouvre le sélecteur de modèles. C'est la première étape de l'entonnoir (`selecteur_ouvert`), notée seulement quand le sélecteur montre au moins un modèle « Bientôt ».
2. Elle clique sur un modèle grisé (`modele_grise_clique`). Le sélecteur se ferme et le formulaire s'ouvre (`formulaire_ouvert`).
3. Le formulaire montre un squelette pendant le chargement, puis : une introduction, l'avertissement « aucun paiement », les trois paliers en cartes côte à côte (prix en grand, crédit mensuel, puis les points du palier), le profil (étudiant, administration ou développeur), un pays et un WhatsApp facultatifs, une case de consentement et une phrase sur l'usage des données.
4. « Rejoindre la liste » reste inactif tant qu'un palier, un profil et la case de consentement ne sont pas tous renseignés.
5. Il n'y a qu'UNE liste d'attente par personne (décision du 17 novembre 2026), pas une par modèle. Si la personne y est déjà, quel que soit le modèle cliqué, le formulaire le dit avec le nom du palier (Pro, Max ou Ultra) et propose « Modifier mon choix » ou « Me désinscrire ». La désinscription efface aussi le numéro WhatsApp.

Le formulaire s'ouvre en feuille depuis le bas sur téléphone et en fenêtre centrée sur ordinateur (le cadre commun `CadrePanneau`, aussi utilisé par l'écran Connexions), avec ouverture et fermeture animées. Sur ordinateur, les trois cartes de palier sont sur une ligne ; sur téléphone elles s'empilent, et seule la carte choisie déplie ses points. Le pied de page reste fixe en bas avec le prix choisi et le bouton « Rejoindre la liste ».

## Où se trouvent les choses

| Fichier | Rôle |
| --- | --- |
| `components/chat/FormulaireListeAttente.tsx` | Le formulaire, avec ses états de chargement, déjà inscrit, merci et désinscrit. |
| `components/chat/CartePalierListeAttente.tsx` | Une carte de palier : prix, crédit, points et badge facultatif. |
| `components/chat/SelecteurModeleHaut.tsx` | Le sélecteur : un modèle grisé ouvre maintenant le formulaire, et les premières étapes de l'entonnoir sont notées ici. |
| `lib/listeAttente.ts` | Les appels au serveur, les étapes de l'entonnoir, la source (web, android, ios, pc) et la liste des pays. |
| `lib/erreurs.ts` | Les codes d'erreur `LISTE_ATTENTE_*`, en français et en anglais. |

## Rien n'est écrit en dur

- Les paliers (prix et crédit mensuel) viennent du serveur, de la table `paliers_liste_attente`.
- Tous les textes du formulaire viennent du serveur, de `textes_modeles_llm` (clés qui commencent par `attente_`), en français et en anglais. Si une clé manque dans la langue choisie, le texte français est utilisé ; une clé brute n'est jamais affichée. Les points de chaque palier viennent de `attente_palier_<prix>_points` (séparés par `|` ; un point qui commence par `~` est une capacité que le palier n'a pas et s'affiche avec une croix grisée au lieu d'une coche ; les trois paliers citent les mêmes huit capacités dans le même ordre, tirées du tableau des paliers de Bourama du 16/11/2026) ; sans eux, la phrase `attente_palier_<prix>` est affichée. Un badge facultatif sur un palier vient de `attente_palier_<prix>_badge` : sans texte, pas de badge.
- Les noms de pays viennent du navigateur (`Intl.DisplayNames`) dans la langue de l'interface, donc aucun n'est traduit à la main. Seuls les codes ISO des pays proposés sont dans `lib/listeAttente.ts`.

## Les étapes de l'entonnoir ne bloquent jamais

`noterEtapeListeAttente` ignore toute erreur, y compris l'absence de compte. Une note qui échoue ne ralentit ni n'interrompt jamais la personne. La dernière étape, `inscription_validee`, est écrite par le serveur quand l'inscription réussit ; le client ne peut pas l'envoyer.

## Verrou et badge Max

`SelecteurModeleHaut.tsx` montre une icône de verrou sur chaque modèle verrouillé. Son info-bulle et son nom accessible viennent du backend (`libelles_bientot`, le texte de la clé `bientot`, maintenant « Disponible avec un abonnement »). Le badge devant le nom vient de `libelles_badge` (texte `badge_groupe_1`, « Max »), envoyé seulement pour les modèles du groupe 1. Les deux textes sont dans Supabase, en français et en anglais.

## Limites connues

- Le formulaire demande un compte connecté. Un visiteur sans compte reçoit le message de connexion habituel de la couche API.
- Le panneau du plugin Thonny a son propre bouton de modèle, qui montre toujours les modèles verrouillés comme désactivés. Il n'ouvre pas le formulaire.
- Pas encore vérifié sur de vrais appareils : navigateur de téléphone, applis Android et iOS installées, appli PC installée. Les vérifications à faire sont dans la liste de tests staging de la description de la branche.
