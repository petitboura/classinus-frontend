# capacitor-pont-natif-electron

Cree le 27/09/2026, Bourama : chantier "canal en direct sort de l'appli"
(voir `plan-canal-en-direct-pc.md` a la racine du depot), Lot S.

Implementation Electron du plugin Capacitor `PontNatif` -- meme nom que
celui deja utilise sur Android/iOS et deja appele automatiquement cote
web (voir `lib/supabase.ts`, `enregistrerToken` a chaque changement de
session Supabase, aucun changement necessaire la-bas).

Sur Electron, `enregistrerToken` ouvre et maintient une DEUXIEME
connexion WebSocket vers `clovis-backend`, dediee aux actions systeme
(clic ecran, clavier, ouverture d'application, lecture d'ecran) --
separee de la connexion de la fenetre principale (qui reste dediee aux
clics dans la page Classinus). Le clic tente les actions UI Automation et
les boutons natifs Windows sans déplacer la souris. `@nut-tree-fork/nut-js`
sert au clavier et au repli souris annoncé. La lecture d'écran est textuelle.

## Construire ce paquet

Necessite que `capacitor-dossiers-electron` soit deja construit avant
(reutilise sa fonction `obtenirAppareilIdPc`) :

```bash
cd packages/capacitor-dossiers-electron && npm run build
cd ../capacitor-pont-natif-electron && npm install && npm run build
```

Produit `electron/dist/plugin.mjs`. A refaire a chaque modification de
`electron/src/plugin.mts`.

## Lot V : lecture de la fenetre au premier plan (UI Automation)

Le cas `lire_ecran` ne prend plus de capture d'image (decision Bourama du
28/09/2026 : aucune image envoyee au modele, trop couteux). Il lit en TEXTE
la fenetre au premier plan avec UI Automation de Windows, via un petit
script PowerShell lance par `electron/src/lectureFenetreWindows.mts`
(lecture seule, aucune fenetre affichee). Le resultat contient le titre, le
nom de l'application, les titres des autres fenetres ouvertes, et les
elements visibles (textes, boutons, champs avec leur valeur, cases,
onglets...) avec leurs coordonnees d'ecran pour `cliquer_ecran`. La valeur
d'un champ mot de passe n'est jamais lue. Les fenetres de Classinus lui
meme sont reconnues par leur processus (`process.pid`) : la fenêtre principale
renvoie vers `lire_page`. Quand la superposition a le focus, son handle Win32
est exclu et la fenêtre visible immédiatement en dessous est lue. Avant une
frappe ou un clic système, le focus lui est rendu.

Les limites (nombre d'elements, longueurs, delai) sont envoyees par le
backend avec chaque demande (`core/outils_action_agent_pc.py`), elles ne
sont reglees qu'a cet endroit. Si la lecture echoue (PowerShell absent ou
bloque, delai depasse), on renvoie au moins le titre, en mode `titre_seul`.

Lecture du texte long (documents, champs multilignes) : par l'API COM native
de UI Automation (`IUIAutomation`, classe `LectureTexteCom` du script), et non
par le wrapper .NET `TextPatternRange.GetText()`, qui plante Windows
PowerShell avec une violation d'acces sous Windows 11. Ordre des methodes COM
et GUID verifies contre `uiautomationclient.h` du SDK Windows. Non verifie sur
une vraie machine Windows a ce jour.

Filet de securite : si PowerShell s'arrete brutalement sans rien renvoyer
(plantage de Windows dans la lecture du texte long d'un document ou d'un
champ, code 3221225477), la lecture est relancee une seule fois sans cette
partie. Clovis recoit alors la structure de la fenetre (boutons, menus,
champs courts), avec `texte_long_ignore: true`. Pas de relance apres un
delai depasse.

A tester sur la machine de Bourama, en priorite :

- Bloc-notes avec une phrase ecrite : le texte est lu.
- Chrome sur une page quelconque : contenu de la page lu, ou seulement la
  barre d'outils ? (les navigateurs ne construisent leur arbre complet que
  lorsqu'un outil d'accessibilite le demande : non verifie).
- Ecran regle a 100 % puis 150 % : les coordonnees donnees a l'IA tombent
  elles sur le bon element avec `cliquer_ecran` ? Le script se declare
  sensible a l'echelle d'affichage (`SetProcessDPIAware`) pour s'aligner sur
  la souris, mais l'accord avec `nut-js` n'a pas pu etre verifie.
- Un champ mot de passe rempli : la valeur ne doit jamais apparaitre.
- Une application qui n'expose rien : reponse propre en `titre_seul`.

`screenshot-desktop` n'est plus utilise par ce paquet : la dependance de
`package.json` peut etre retiree (a decider avec Bourama).

## Points a verifier au premier vrai test (sur la machine de Bourama)

- La destination API est transmise par le renderer dans
  `enregistrerToken({token, apiUrl})` : le canal système et le chat utilisent
  le même serveur, y compris en staging. Sans `apiUrl`, le repli reste
  `CLASSINUS_API_URL` puis `https://api.classinus.com`.
- `@nut-tree-fork/nut-js` et `screenshot-desktop` contiennent des modules
  natifs precompiles par plateforme -- a reconstruire avec
  `electron-rebuild` (ou equivalent) si un module natif ne charge pas au
  lancement de l'appli empaquetee. Non teste dans ce chantier (bac a
  sable Linux sans runtime Electron reel) : seule la compilation
  TypeScript a ete verifiee ici.
- `ouvrir_application` lance un exécutable avec `spawn` et accuse son
  démarrage immédiatement, sans attendre sa fermeture.

## Lot T : journal et bulle des actions système

Autour de chaque action système exécutée (clic, clavier, ouverture
d'application, lecture d'écran), ce plugin émet l'événement
`actionSysteme` vers la fenêtre principale : phase `debut` (phrase courte,
ex. "Clovis a ouvert notepad") avant l'exécution, phase `fin` (statut
`succes` ou `erreur`) après. La fenêtre principale
(`lib/superpositionElectron.ts`, `useJournalActionsSysteme`) en fait une
entrée de journal et une phrase de bulle, exactement comme pour un clic
dans la page ; la superposition les reçoit par l'instantané du lot R.

Critère de fin à vérifier sur ta machine : demander à Clovis d'ouvrir le
Bloc-notes et d'y écrire une phrase, Bloc-notes au premier plan. Le
journal et la bulle de la superposition doivent montrer les mêmes types
d'entrées que pour une action dans la page.

## Clic indépendant et repli annoncé

Lorsqu'un bouton Win32 ou WinForms n'expose aucun pattern UIA, son handle et
sa classe native sont vérifiés avant l'envoi de `BM_CLICK`. Ce chemin reste
indépendant du pointeur Windows. Les autres contrôles incompatibles utilisent
le repli souris annoncé ci-dessous.

`cliquer_ecran` place d’abord le curseur dessiné sur la cible et tente une action UI Automation (bouton, case, sélection, menu ou focus de champ). Aucun pilote souris n’est chargé sur ce chemin. Si aucune action compatible n’existe, la superposition affiche « Je ne peux pas cliquer ici avec mon curseur seul. Je vais utiliser ton curseur maintenant. » avant le clic par la vraie souris, sans validation de l’étudiant. Le pointeur est remis à sa position initiale si l’étudiant ne l’a pas repris. La superposition laisse traverser le clic pendant toute l’opération.

Un clic UIA commencé mais dont le résultat est incertain n’est pas répété, pour éviter une double action. Les confirmations internes concernent uniquement l’affichage de la superposition ; aucun bouton d’approbation n’est présenté.
