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

- `URL_API_BACKEND` (en tete de `plugin.mts`) : domaine Railway suppose
  inchange apres le renommage des depots GitHub (23-25/09/2026), mais
  pas reverifie independamment pour ce chantier. Surchargeable via la
  variable d'environnement `CLASSINUS_API_URL` si besoin.
- `@nut-tree-fork/nut-js` et `screenshot-desktop` contiennent des modules
  natifs precompiles par plateforme -- a reconstruire avec
  `electron-rebuild` (ou equivalent) si un module natif ne charge pas au
  lancement de l'appli empaquetee. Non teste dans ce chantier (bac a
  sable Linux sans runtime Electron reel) : seule la compilation
  TypeScript a ete verifiee ici.
- `ouvrir_application` lance simplement la commande recue via
  l'interpreteur de commandes (`exec`) -- fonctionne pour un executable
  present dans le PATH Windows (`notepad`, `calc`...), pas teste au-dela.
