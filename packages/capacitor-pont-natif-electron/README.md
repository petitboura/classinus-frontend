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
clics dans la page Classinus). Execution reelle via `@nut-tree-fork/nut-js`
(souris/clavier) et `screenshot-desktop` (capture d'ecran).

## Construire ce paquet

Necessite que `capacitor-dossiers-electron` soit deja construit avant
(reutilise sa fonction `obtenirAppareilIdPc`) :

```bash
cd packages/capacitor-dossiers-electron && npm run build
cd ../capacitor-pont-natif-electron && npm install && npm run build
```

Produit `electron/dist/plugin.mjs`. A refaire a chaque modification de
`electron/src/plugin.mts`.

## Points a verifier au premier vrai test (sur la machine de Bourama)

- `URL_API_BACKEND` (en tete de `plugin.mts`) : vaut
  `https://api.classinus.com` (adresse confirmee par Bourama le
  28/09/2026). Surchargeable via la variable d'environnement
  `CLASSINUS_API_URL` si besoin.
- `@nut-tree-fork/nut-js` et `screenshot-desktop` contiennent des modules
  natifs precompiles par plateforme -- a reconstruire avec
  `electron-rebuild` (ou equivalent) si un module natif ne charge pas au
  lancement de l'appli empaquetee. Non teste dans ce chantier (bac a
  sable Linux sans runtime Electron reel) : seule la compilation
  TypeScript a ete verifiee ici.
- `ouvrir_application` lance simplement la commande recue via
  l'interpreteur de commandes (`exec`) -- fonctionne pour un executable
  present dans le PATH Windows (`notepad`, `calc`...), pas teste au-dela.

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
