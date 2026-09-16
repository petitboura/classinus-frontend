# Plan de chantier — Agent applicatif Clovis (Clovis peut agir dans l'appli)

Rédigé le 15/09/2026, après audit réel de `clovis-frontend` et `clovis-backend`. Ce fichier est fait pour être repris par une ou plusieurs IA en parallèle, chacune sur une branche dédiée à son chantier.

## 1. Décisions déjà actées avec Bourama (ne pas re-discuter)

- Périmètre : Clovis peut voir l'état de l'appli et agir (cliquer, naviguer) comme l'utilisateur, mais uniquement à l'intérieur de l'appli Clovis elle même, jamais sur le reste du PC ou du téléphone.
- Deux mécanismes combinés : un catalogue d'actions structurées pour les parcours fréquents, plus un mode générique (DOM + sélecteur) en filet de sécurité pour le reste.
- Même système réutilisé pour un mode guidage (visite guidée d'une nouveauté), avec pause à chaque étape.
- Trois plateformes concernées : web, natif mobile (Capacitor), PC. Comme les trois tournent sur le même code Next.js, un seul système suffit.
- Curseur virtuel visible, superposé à l'interface, qui se déplace (jamais en ligne droite) et simule le clic.
- Jamais dire à Clovis qu'il peut agir sur un élément désactivé, absent ou invisible à l'écran : la liste des actions disponibles doit toujours être calculée en direct sur l'état réel, jamais apprise une fois pour toutes.
- L'état de l'interface est poussé à Clovis en continu (pas seulement relu à chaque tour de conversation), pour les actions autonomes ET pour le guidage.
- Deux régimes de sensibilité coexistent pour les actions : certaines demandent confirmation, d'autres non. La sensibilité d'une action non qualifiée est TOUJOURS considérée sensible par défaut (défaut prudent).
- La confirmation d'une action sensible se fait par une fenêtre avec un bouton, jamais par une question posée en texte libre dans le chat.
- En cas d'échec en cours de route (élément disparu, page changée) : signaler à l'étudiant et réessayer ; certains cas précis (ex : action avec effet indépendant de l'écran, comme valider/envoyer/sauvegarder) peuvent continuer en arrière plan même si l'étudiant a changé de page. Décidé au cas par cas, voir section 5.
- Aucune limite au nombre d'actions que Clovis peut enchaîner d'affilée sans repasser par l'étudiant. En cas d'échec au milieu d'une chaîne, Clovis évalue lui même si les actions restantes sont indépendantes de celle qui a échoué (même logique que l'enchaînement d'outils déjà existant dans le chat) : si oui il continue, sinon il arrête la chaîne à cette étape, sans annuler ce qui a déjà été fait.
- Toute nouvelle table ou colonne Supabase pour ce chantier doit être strictement additive : ne jamais modifier une table déjà utilisée en production. Développement sur une branche dédiée, fusion dans main seulement quand le code est prêt.

## 2. Constat d'audit (fait le 15/09/2026 — à revérifier avant de coder si du temps a passé depuis)

- **Canal temps réel déjà existant** : `lib/canalTempsReel.ts` (frontend, WebSocket) et `core/canal_temps_reel.py` (backend). Aujourd'hui utilisé pour l'exploration de dossier natif (`poser_question_appareil` : le backend pose une question à l'appareil ouvert et attend la réponse dans le même tour de raisonnement). C'est la fondation la plus naturelle pour la poussée d'état et l'exécution d'action, mais **à confirmer avec Bourama** : on étend ce canal existant, ou on en crée un séparé dédié à l'agent applicatif (voir section 4, point ouvert).
- **Bus d'événements frontend existant** : `lib/evenementsDonnees.ts`, un simple `CustomEvent` sur `window` qui rafraîchit des sections quand l'IA modifie une donnée depuis le chat. Pattern différent (local, pas réseau) mais même philosophie de source unique de vérité, jamais de liste maintenue à la main.
- **Registre d'outils backend existant** : `core/registre_outils.py` (catalogue des serveurs MCP) et la table Supabase `registre_outils_plateforme` (disponibilité par outil, catégorie, serveur). Piège déjà vécu et documenté : cache serveur de 24h, `forcer_rechargement_catalogue_outils` ou redémarrage Railway nécessaire pour qu'un nouvel outil soit visible sans attendre.
- **Structure frontend** : Next.js App Router (`app/(app)/...` pour les sections connectées), composants dans `components/`, hooks/contexts dans `lib/`. Aucun mécanisme existant de déclaration de métadonnée d'action directement sur un composant : à construire de zéro (chantier A ci-dessous).
- **Convention de dépôt** : jamais de tiret moyen dans un texte affiché à l'utilisateur (`CLAUDE.md`), toujours vérifiée avant de livrer un texte visible.

## 3. Contraintes valables pour tous les chantiers ci-dessous

- Aucune ligne droite pour le déplacement du curseur virtuel.
- Sensibilité non déclarée = sensible par défaut.
- Confirmation = fenêtre + bouton uniquement.
- Aucune modification d'une table Supabase déjà utilisée en prod ; additif uniquement, sur branche dédiée.
- Jamais de tiret moyen dans un texte affiché.
- Toute IA qui reprend un chantier ci-dessous doit lire `djiguigne-standards-dev` et, pour tout ce qui touche au frontend, `djiguigne-standards-frontend`, avant d'écrire une seule ligne de code.
- Ne jamais supposer que cet audit (section 2) est toujours exact : revérifier l'état réel du dépôt avant de commencer.

## 4. Phase 0 — fondation commune (séquentielle, à trancher avant tout le reste)

- **0.1** Décider avec Bourama : étendre le canal temps réel existant (`canal_temps_reel.py` / `canalTempsReel.ts`) pour porter les nouveaux messages (état poussé, demande d'exécution d'action), ou créer un canal séparé dédié. Bloque le démarrage des chantiers C et D.
- **0.2** Créer une branche dédiée à l'ensemble du chantier sur `clovis-frontend` et sur `clovis-backend` (nom à confirmer avec Bourama), séparée de `main`, fusionnée seulement quand prête — comme pour le chantier "image-vers-grand-modele".

## 5. Chantiers (dépendances notées, ceux sans dépendance commune sont réellement poussables en parallèle)

### Chantier A — Déclaration de métadonnée d'action sur les composants (frontend)
**Dépendance : aucune.**
Permettre à un composant (bouton, champ, section) de déclarer dans son propre code : un nom d'action, une description, une condition d'activation, et un niveau de sensibilité (sensible/non-sensible, défaut sensible si absent). But : à tout instant, on peut obtenir la liste des actions réellement montées, visibles et actives, sans jamais dépendre d'une liste apprise à l'avance. Peut être conçu et testé avec des composants factices avant d'être branché sur le reste.

### Chantier B — Curseur virtuel (frontend)
**Dépendance : aucune.**
Composant visuel superposé, qui se déplace vers des coordonnées données par une trajectoire non rectiligne, s'arrête, simule visuellement le clic. Testable isolément avec des coordonnées codées en dur (à retirer avant fusion finale, jamais laissées en dur en prod).

### Chantier C — Nouvel outil MCP pour déclencher une action (backend)
**Dépendance : 0.1.**
Nouvel outil exposé UNIQUEMENT côté chat élève (jamais côté serveur MCP public, même logique que pour `verifier_consignes_code_actif`), qui envoie via le canal choisi en 0.1 une demande d'exécution d'action à l'appareil actif et attend le résultat. Entrée à ajouter dans `registre_outils_plateforme`, en anticipant tout de suite le piège de cache 24h déjà connu (appeler `forcer_rechargement_catalogue_outils` ou prévoir un redémarrage).

### Chantier D — Poussée continue de l'état de l'interface (frontend + backend)
**Dépendance : A (rien à signaler sans la déclaration), 0.1 (canal).**
Dès qu'un élément déclaré en A apparaît, disparaît ou change d'état (actif/inactif), un message est poussé via le canal choisi en 0.1. Point à trancher avec Bourama avant de coder : quels changements sont "signalables" pour éviter le bruit (probablement uniquement montage/démontage/changement d'état des éléments déclarés en A, jamais les événements bruts comme frappe ou défilement).

### Chantier E — Fenêtre de confirmation pour action sensible (frontend)
**Dépendance : A (pour connaître la sensibilité déclarée).**
Composant de fenêtre modale générique avec un bouton, affichée quand une action sensible (ou non qualifiée) est demandée.

### Chantier F — Mode générique de secours, DOM + sélecteur (frontend)
**Dépendance : A (pour ne jamais faire doublon avec une action déjà structurée, et pour réutiliser la même logique de vérification en direct).**
Filet de sécurité pour ce qui n'a pas encore d'action déclarée. Double vérification obligatoire juste avant le clic réel (l'élément existe-t-il encore, est-il visible et actif), jamais seulement au moment de la décision.

### Chantier G — Mode guidage / visite guidée (frontend)
**Dépendance : A, B, D.**
Réutilise les actions déclarées et le curseur virtuel, mais avec une pause à chaque étape. Peut être écrit en parallèle sur sa propre branche, mais ne pourra être testé en conditions réelles qu'une fois A, B et D posés.

## 6. Points ouverts à trancher avec Bourama avant que le codage commence

1. Canal réseau (0.1) : étendre l'existant ou en créer un nouveau ?
2. Nom exact du nouvel outil MCP et de ses paramètres (chantier C).
3. Le comportement "peut continuer en arrière plan si la page change" (cas 2 de la section discussion sur les échecs) : déclaré comme un paramètre supplémentaire sur chaque action (dans la métadonnée du chantier A), ou géré autrement ? À ne pas deviner.
4. Portée du premier lot : une preuve de concept limitée à une seule section de l'appli (ex : bibliothèque) avant de généraliser partout, ou tout de suite sur l'ensemble des sections ?
5. Nom de la branche commune du chantier (0.2).

## 7. Rappel pour toute IA qui reprend ce fichier

- Lire `djiguigne-standards-dev` (et `djiguigne-standards-frontend` pour le frontend) avant d'écrire du code.
- Revérifier l'état réel des dépôts avant de supposer que l'audit de la section 2 est toujours valable.
- Ne jamais coder sans confirmation explicite de Bourama sur les points ouverts de la section 6.
- Expliquer tout à Bourama en langage simple, sans jargon inutile, il n'a pas de background code.
