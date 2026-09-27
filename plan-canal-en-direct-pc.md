# Plan : le canal en direct sort de l'appli, sur PC

Document de contexte complet pour une IA qui va coder ce chantier sans repasser par Bourama pour des questions de base. Toutes les informations ci-dessous viennent d'une lecture réelle du code des dépôts (pas de suppositions). Vérifie quand même l'état actuel des fichiers cités avant de commencer : ce document date du 27/09/2026, et Bourama fait avancer plusieurs chantiers en parallèle.

## Objectif demandé par Bourama

Aujourd'hui, Clovis peut cliquer et écrire, mais uniquement à l'intérieur de sa propre page web (le "canal en direct" existant). Bourama veut que Clovis puisse sortir de cette page : agir sur tout le PC (pas seulement le navigateur), en gardant visibles et fonctionnels, où que Clovis navigue ou quelle que soit l'appli au premier plan :
- le curseur virtuel et sa bulle de dialogue,
- la barre de saisie et ses composants (bouton d'activation, dictée, écriture),
- le journal des actions.

Ces trois éléments doivent pouvoir se déplacer sur n'importe quelle page ou appli, et rester au-dessus de tout (superposition système, pas seulement au-dessus du contenu d'une page web).

Décisions déjà actées par Bourama pour ce chantier :
- Périmètre : le PC entier, pas seulement le navigateur.
- Techno retenue : Electron (confirmé, pas Tauri).
- Pas d'étape de confirmation avant action pour ce premier temps de travail (sera ajoutée plus tard, voir la fin de ce document pour où l'accrocher).
- Construction "solide dès maintenant", pas un prototype jetable.
- Un test de faisabilité (script PowerShell : ouverture d'appli, écriture clavier, lecture d'écran, souris, capture d'écran) a été fait et confirmé réussi par Bourama en personne : Windows permet bien à un programme installé de faire tout ça.

## Dépôts concernés

Deux dépôts GitHub, compte `petitboura` :
- Backend : anciennement `clovis-backend`, redirige maintenant vers `petitboura/classinus-backend` (renommage du 23-25/09/2026).
- Frontend : anciennement `clovis-frontend`, même mouvement vers `petitboura/classinus-frontend`.

**Avant de cloner, vérifie le nom réel du dépôt** (redirection GitHub ou nom déjà changé une nouvelle fois) : ces renommages sont récents et peuvent avoir encore bougé.

## Ce qui existe déjà : le canal agent applicatif ("canal en direct")

C'est le nom du système que Bourama appelle "canal en direct". Il ne cible jamais un appareil précis : toute demande est diffusée à **toutes** les connexions ouvertes du compte à la fois (PC, navigateur, mobile), et c'est la première connexion qui répond réellement (pas "ignore") qui l'emporte. Les autres ignorent silencieusement.

### Backend : `core/canal_agent_applicatif.py` et `api/canal_agent_applicatif.py`

Route WebSocket : `POST/WS /api/canal-agent-applicatif/ws` (fichier `api/canal_agent_applicatif.py`).

Handshake exact :
1. Le client ouvre la connexion WebSocket.
2. Le client envoie en premier message : `{"auth_token": "<jeton_supabase>", "appareil_id": "<id>"}`. Le jeton n'est jamais mis dans l'URL (pour ne pas finir dans des logs de proxy).
3. Le backend vérifie le jeton via Supabase (`supabase.auth.get_user`), ferme la connexion avec le code `4401` si invalide ou si rien n'arrive dans les 10 secondes.
4. `appareil_id` : convention `""` = session web/PC classique, sinon un identifiant natif propre à l'appareil. **Point important** : la clé de connexion est `(user_id, appareil_id)`. Une deuxième connexion qui arrive avec exactement la même clé **remplace et ferme** la précédente (voir `connecter()`). Donc si l'appli Electron doit ouvrir une deuxième connexion dédiée aux actions système (voir Lot S plus bas), elle doit utiliser un `appareil_id` différent de celui de la fenêtre principale, sinon elles se couperaient l'une l'autre.

Boucle de réception du backend après le handshake, trois formes de message reconnues venant du client :
- `{"id": ..., "resultat": ...}` → résout la demande en cours dont l'id correspond (`recevoir_reponse`).
- `{"etat_actions": [...]}` → remplace l'état des éléments cliquables poussés par cette connexion (`mettre_a_jour_etat_actions`).
- `{"message_etudiant": "...", "id_message": "..."}` → message de l'étudiant pendant que Clovis agit (`accuser_message_etudiant`).

Fonctions qui envoient une demande **vers** le frontend et attendent une réponse (toutes basées sur `_diffuser_et_attendre`, qui diffuse à toutes les connexions du `user_id` et attend la première réponse valable, avec des paliers de statut à 5s, 15s, puis abandon à 30s) :
- `demander_execution_action(user_id, action_id, on_statut)` → envoie `{"id", "action_id"}`.
- `demander_clic_generique(user_id, selecteur, description, on_statut)` → envoie `{"id", "selecteur_generique", "description"}`.
- `demander_pointage_action(user_id, action_id, on_statut)` → envoie `{"id", "montrer_action_id"}` (déplace juste le curseur, n'exécute rien).
- `demander_ecriture_champ(user_id, action_id, texte, on_statut)` → envoie `{"id", "action_id", "texte_a_ecrire"}`.

Fonctions qui diffusent sans rien attendre en retour :
- `pousser_texte_clovis(user_id, texte, duree_secondes=None)` → envoie `{"texte_clovis": texte}` (+ `duree_secondes` optionnel) à toutes les connexions, affiché dans la bulle de dialogue. C'est l'outil `dire_a_l_etudiant` (`core/outils_action_agent.py`) qui appelle ça pendant qu'un tour est en cours.
- `demander_ouverture_canal(user_id, conversation_id, texte_suite)` → cas spécifique à la démo, pas central pour ce chantier.

Le tout est écrit pour être étendu facilement : chaque nouvelle capacité peut réutiliser `_diffuser_et_attendre` avec un nouveau nom de champ dans le message diffusé, sans toucher à la boucle de réception (`api/canal_agent_applicatif.py`) qui accepte déjà n'importe quel `{"id", "resultat"}` en retour, quel que soit le type de demande d'origine.

### Frontend : `lib/canalAgentApplicatif.ts` (et les composants visuels)

C'est un fichier `"use client"`, donc du JavaScript de navigateur, initialisé une seule fois par `initialiserCanalAgentApplicatif()`, qui ouvre/ferme la connexion selon la visibilité de l'onglet et l'état de la session Supabase.

Calcul de `appareil_id` côté client, dans `obtenirAppareilIdPourCanal()` : si `Capacitor.isNativePlatform()` est faux (cas du navigateur web normal), renvoie `""`. Sinon, appelle un plugin Capacitor nommé `"Dossiers"` et sa méthode `obtenirInfosAppareil()`, qui renvoie `{appareilId: string}`. **Ce mécanisme existe déjà et est déjà prêt pour n'importe quelle plateforme native, pas seulement mobile** : si l'appli Electron passe par Capacitor et déclare `isNativePlatform() = true`, ce code fonctionnera sans être modifié, à condition qu'un plugin natif du même nom expose la même méthode côté Electron (voir Lot Q).

Les six formes de message reconnues en provenance du backend (fonction `traiterMessage`) :
1. `{"accuse_message_etudiant": id, "pris_en_compte": bool}`
2. `{"message_etudiant_renvoye": string}`
3. `{"texte_clovis": string, "duree_secondes"?: number}` → bulle de dialogue
4. `{"ouvrir_canal_en_direct": {...}}`
5. `{"id", "action_id", "texte_a_ecrire"}` → écriture simulée dans un champ
6. `{"id", "action_id"}` → clic
7. `{"id", "selecteur_generique", "description"}` → clic générique par sélecteur CSS
8. `{"id", "montrer_action_id"}` → pointage seul

Toutes les demandes de clic/écriture ciblent des éléments du DOM de la page Clovis elle-même, repérés par un attribut `data-agent-id` posé automatiquement par un scan générique (`lib/scanElementsInteractifs.ts`, hors périmètre de ce chantier). **C'est la vraie limite actuelle** : rien ne permet aujourd'hui de cliquer en dehors de cette page.

Composants visuels concernés, tous dans `clovis-frontend/components/` :
- `CurseurVirtuelAgent.tsx` : le curseur, en `position: fixed`, `z-index: 10000`, lit son état dans le contexte React `ContexteCurseurVirtuel` (`lib/contexteCurseurVirtuel.tsx`), déplaçable à la souris quand aucune action n'est en cours.
- `BulleDialogueAgent.tsx` : la bulle de dialogue à côté du curseur.
- `CanalEnDirectFlottant.tsx` : le groupe flottant en bas à gauche (bouton d'activation + `ControlesInteractionCanal.tsx`, qui contient la barre de saisie/dictée), en `position: fixed`, `z-index: 65`, déplaçable via `lib/useDeplacable.ts`.
- `BoutonJournalAgent.tsx` : le bouton du journal des actions.
- Tout ce visuel lit son état dans les contextes React `ContexteCurseurVirtuel` et `ContexteCanalEnDirect` (`lib/contexteCanalEnDirect.tsx`), qui sont eux-mêmes mis à jour par `lib/canalAgentApplicatif.ts` au fil des messages WebSocket reçus.

**Point essentiel à comprendre avant de coder la suite** : ces éléments sont des `<div>` React normaux, positionnés en CSS à l'intérieur d'une seule page. Ils flottent déjà au-dessus du contenu de cette page (c'est ce que Bourama a déjà demandé et obtenu le 19-20/09/2026), mais pas au-dessus du reste de l'écran. Dès que l'utilisateur change d'onglet, de site, ou d'appli, ils disparaissent avec la fenêtre du navigateur qui les contient. C'est exactement le problème que ce chantier doit résoudre.

## Découpage en lots

Les lots suivent la convention déjà en place dans le code (des lettres de chantier : A, B, C, D, F, G, I, J, K, L, M, N, P sont déjà pris). On continue avec Q, R, S, T. Chaque lot est un commit/PR à part entière, avec un état qui marche à la fin, testable seul.

Ordre de dépendance réel (pas totalement indépendants entre eux, mais chaque lot est un livrable complet et vérifiable) : Q d'abord (base), puis R et S peuvent être faits dans n'importe quel ordre une fois Q pushé, T vient après R et S.

---

### Lot Q — Squelette Electron + identifiant d'appareil propre au PC

**But** : faire tourner `clovis-frontend` dans une vraie fenêtre Electron installée, avec un identifiant d'appareil qui lui est propre (pas `""`), sans changer aucun comportement fonctionnel. Ce lot ne fait rien de nouveau visible par l'étudiant : il pose juste la fondation.

**Ce qu'il faut faire :**
1. Ajouter un répertoire `electron/` à la racine de `clovis-frontend`, au même niveau que `android/` et `ios/` (mêmes précédents : ces deux-là ont été construits directement dans ce dépôt, pas dans un dépôt séparé — décision de Bourama du 25/08/2026, voir le chantier mobile). Utiliser la plateforme Electron de Capacitor (`@capacitor-community/electron`), qui charge le même export statique déjà généré par `npm run build:capacitor` (voir `next.config.mjs` pour la logique conditionnelle, déjà en place pour android/ios).
2. Créer un plugin Capacitor natif, nommé exactement `Dossiers` (même nom que celui déjà appelé côté web dans `obtenirAppareilIdPourCanal()`, fichier `lib/canalAgentApplicatif.ts`), avec au minimum la méthode `obtenirInfosAppareil()` renvoyant `{appareilId: string}`. L'identifiant est un UUID généré une seule fois à la première ouverture et stocké dans un fichier local (dossier `userData` d'Electron), sur le même principe que `IdentifiantAppareil.kt`/`.swift` côté mobile (chantier `clovis-mobile`, 05/09/2026).
3. Ne rien modifier dans `lib/canalAgentApplicatif.ts` : le code qui appelle `Capacitor.isNativePlatform()` et le plugin `Dossiers` existe déjà et doit fonctionner tel quel une fois Electron reconnu comme plateforme native par Capacitor.

**Critère de fin** : lancer l'appli Electron, se connecter avec un compte Clovis, et confirmer que le canal agent applicatif s'ouvre avec un `appareil_id` non vide (vérifiable côté backend par un log temporaire dans `connecter()`, à retirer ensuite). Confirmer aussi qu'un clic ordinaire déjà existant (chantier F, clic générique) fonctionne à l'identique dans cette fenêtre Electron.

**Hors périmètre de ce lot** : pas de fenêtre de superposition, pas d'action hors de la page Clovis.

---

### Lot R — Fenêtre de superposition système (curseur, bulle, barre de saisie, journal au-dessus de tout)

**Dépend de** : Lot Q (a besoin qu'Electron tourne).

**But** : que les trois éléments demandés par Bourama restent visibles et actifs même quand une autre appli ou un autre site est au premier plan.

**Ce qu'il faut faire :**
1. Dans le processus principal Electron (`main`), ouvrir une **deuxième** `BrowserWindow`, en plus de la fenêtre principale qui affiche `clovis-frontend` : sans bordure (`frame: false`), transparente (`transparent: true`), toujours au-dessus (`alwaysOnTop: true`, avec le niveau le plus haut disponible sur Windows), qui ne doit pas capter les clics là où rien n'est affiché (`setIgnoreMouseEvents` activé/désactivé dynamiquement selon la zone).
2. Cette fenêtre de superposition charge une page dédiée et minimale (nouvelle route, par exemple `app/(app)/agent-superposition/page.tsx` dans `clovis-frontend`), qui réutilise tel quel `CurseurVirtuelAgent.tsx`, `BulleDialogueAgent.tsx`, `CanalEnDirectFlottant.tsx` et `BoutonJournalAgent.tsx` — sans les récrire.
3. Problème à résoudre : ces composants lisent leur état dans des contextes React (`ContexteCurseurVirtuel`, `ContexteCanalEnDirect`) qui sont remplis par `lib/canalAgentApplicatif.ts`, lequel tourne dans la fenêtre **principale** (celle qui garde la vraie connexion WebSocket et le DOM de la page Clovis). La fenêtre de superposition est un processus de rendu séparé : elle n'a pas accès à ces contextes directement. Il faut un pont IPC Electron (`ipcMain` dans le processus principal, relayant entre les deux fenêtres de rendu, exposé via un script `preload` sécurisé, pas de `nodeIntegration` direct dans le renderer) : chaque changement d'état poussé dans `ContexteCurseurVirtuel`/`ContexteCanalEnDirect` de la fenêtre principale est renvoyé vers la fenêtre de superposition, et chaque interaction de l'utilisateur avec la superposition (glisser le curseur, écrire dans la barre de saisie, cliquer sur le bouton du canal) repart en sens inverse vers la fenêtre principale, qui appelle les fonctions déjà existantes (`envoyerMessageEtudiant`, etc.) exactement comme si l'utilisateur avait cliqué dans la page normale.
4. Un moyen simple de distinguer "on tourne dans la fenêtre de superposition Electron" du fonctionnement web/mobile normal est nécessaire pour activer ce pont sans rien casser ailleurs (vérifier `Capacitor.getPlatform() === "electron"` ou équivalent selon ce que le plugin Capacitor Electron expose réellement — à vérifier dans sa documentation au moment de coder, ne pas deviner le nom exact).

**Critère de fin** : avec l'appli Electron lancée, ouvrir le Bloc-notes ou un site quelconque au premier plan : le curseur, la bulle, la barre de saisie et le journal restent visibles et utilisables par-dessus, exactement comme aujourd'hui dans la page Clovis. Les actions déjà existantes (clic dans la page Clovis, chantier F) continuent de fonctionner et sont visibles dans cette superposition même quand la fenêtre principale Clovis n'est pas au premier plan.

**Hors périmètre de ce lot** : toujours aucune action réelle en dehors de la page Clovis. Ce lot est purement visuel et de relais, il ne donne aucun nouveau pouvoir d'action à Clovis.

---

### Lot S — Nouvel exécutant : actions au niveau du système (clic écran, clavier, ouverture d'appli, lecture d'écran)

**Dépend de** : Lot Q (identifiant d'appareil). Ne dépend pas fonctionnellement du Lot R (peut être testé sans superposition visuelle, via des logs, mais n'a de sens pour l'étudiant qu'une fois R en place).

**But** : donner à Clovis une vraie capacité d'agir en dehors de sa page, sur le système.

**Ce qu'il faut faire, côté Electron (processus principal, Node) :**
1. Ouvrir une **deuxième connexion WebSocket** vers `/api/canal-agent-applicatif/ws`, distincte de celle de la fenêtre principale (qui reste dédiée aux clics DOM dans la page Clovis). Cette deuxième connexion tourne en JavaScript Node classique (bibliothèque `ws`), pas dans un renderer Capacitor, car elle a besoin d'un accès système que le navigateur interdit. Utiliser un `appareil_id` **différent** de celui de la fenêtre principale (rappel : deux connexions avec le même `(user_id, appareil_id)` se remplacent et se ferment l'une l'autre côté backend, voir `connecter()`) — par exemple le même UUID que le Lot Q suivi d'un suffixe distinctif.
2. Le jeton Supabase nécessaire pour l'authentification (`auth_token`) doit être récupéré depuis la session déjà ouverte dans la fenêtre principale et transmis au processus principal via IPC (jamais stocké en clair côté disque au-delà de ce que fait déjà l'appli existante).
3. Utiliser une bibliothèque de contrôle système multiplateforme pour Node (par exemple `@nut-tree/nut-js`) pour : déplacer la souris et cliquer à des coordonnées d'écran précises, taper du texte au clavier, ouvrir une application (lancement de processus classique). Pour la lecture d'écran, une capture d'écran (par exemple `screenshot-desktop`) est le point de départ le plus simple ; une lecture plus fine des fenêtres ouvertes (nom des fenêtres, texte affiché) peut s'appuyer sur les API natives Windows (UI Automation), à évaluer à ce moment-là selon la difficulté réelle plutôt que d'être décidée à l'avance ici.

**Ce qu'il faut faire, côté backend (`clovis-backend`), en ajout dans `core/canal_agent_applicatif.py`, sans toucher au code existant :**
```python
async def demander_action_systeme(user_id: str, type_action: str, parametres: dict, on_statut=None) -> Any | None:
    """
    Meme principe que demander_execution_action, mais pour une action hors
    du DOM de la page Clovis (clic a des coordonnees d'ecran, clavier,
    ouverture d'application, lecture d'ecran) : diffuse
    {action_systeme, parametres} a toutes les connexions actives, la
    connexion Electron dediee au systeme (voir lot S) execute reellement,
    les autres connexions (fenetre principale web/DOM, mobile) l'ignorent
    naturellement car elles ne reconnaissent pas ce type de message.
    """
    correlation_id = str(uuid.uuid4())
    return await _diffuser_et_attendre(
        user_id,
        {"id": correlation_id, "action_systeme": type_action, "parametres": parametres},
        on_statut,
        on_timeout_log=f"action_systeme={type_action}",
    )
```
Aucune modification n'est nécessaire dans `api/canal_agent_applicatif.py` : la boucle de réception accepte déjà n'importe quel `{"id", "resultat"}` en retour, quel que soit le type de demande d'origine.

**Ce qu'il faut faire, côté outils pour le modèle** : un nouveau fichier ou une extension de `core/outils_action_agent.py`, exposant au modèle des outils tels que `cliquer_ecran(x, y)`, `taper_clavier(texte)`, `ouvrir_application(nom)`, `lire_ecran()`, chacun appelant `demander_action_systeme` avec le `type_action` et les `parametres` correspondants.

**Critère de fin** : demander à Clovis (par le chat) d'ouvrir le Bloc-notes et d'y écrire une phrase précise, sans que l'étudiant touche à rien : ça doit se produire réellement à l'écran, et la réponse remonter jusqu'au modèle.

**Hors périmètre de ce lot** : pas encore de confirmation avant action (décision de Bourama, voir plus bas), pas encore de journalisation visuelle unifiée avec les actions DOM (voir Lot T).

---

### Lot T — Unifier le journal et la bulle entre actions DOM et actions système

**Dépend de** : Lot R (superposition visuelle) et Lot S (actions système) tous les deux terminés.

**But** : que les actions faites hors de la page (Lot S) apparaissent dans le même journal et la même bulle que les actions faites dans la page (existant), sans que l'étudiant perçoive de différence.

**Ce qu'il faut faire :**
1. Juste avant d'envoyer la réponse `{"id", "resultat"}` pour une action système exécutée (Lot S, processus principal Electron), envoyer aussi un événement IPC vers la fenêtre de superposition (Lot R) décrivant l'action en une phrase courte ("Clovis a cliqué à l'écran", "Clovis a ouvert Bloc-notes", "Clovis a écrit du texte"), sur le même modèle que ce que fait déjà `pousserJournalDepuisAgent`/`mettreAJourJournalDepuisAgent` côté web pour les actions DOM (`lib/contexteCanalEnDirect.tsx`).
2. Réutiliser `pousser_texte_clovis` côté backend sans aucune modification pour la narration parlée (bulle) : ce mécanisme est déjà générique et diffuse à toutes les connexions, il fonctionnera pour les actions système exactement comme pour les actions DOM, à condition que la fenêtre de superposition (Lot R) l'affiche bien (ce qui est déjà son rôle depuis le Lot R).

**Critère de fin** : une action système (Lot S) et une action DOM classique (existant) produisent, du point de vue de l'étudiant, exactement le même type d'entrée dans le journal et le même type de commentaire dans la bulle.

---

## Ce qui est volontairement laissé de côté pour l'instant

- **Confirmation avant action sensible** : Bourama a tranché de la laisser de côté pour ce premier temps de travail. Le point d'ancrage naturel pour l'ajouter plus tard est `demander_action_systeme` côté backend (avant de diffuser) et/ou dans le processus principal Electron (avant d'exécuter réellement, Lot S) : ajouter une liste d'actions jugées sensibles (ouverture d'un site de paiement, suppression de fichier, etc.) et une pause qui attend une validation explicite de l'étudiant, envoyée par la fenêtre de superposition.
- **Mac** : ce plan cible Windows en priorité (comme le reste de l'environnement de travail de Bourama). Une extension à Mac demanderait de gérer les permissions Accessibilité/Enregistrement d'écran, spécifiques à ce système, et un compte Apple Developer payant pour la distribution, que Bourama n'a pas encore.
- **Lecture d'écran fine (nom des fenêtres, texte précis affiché)** : volontairement laissée ouverte au Lot S plutôt que figée à l'avance, pour être tranchée selon la difficulté réelle rencontrée en codant (capture d'écran simple d'abord, UI Automation Windows si nécessaire).
