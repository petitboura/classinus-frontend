# capacitor-superposition-electron

Cree le 27/09/2026, Bourama : chantier "canal en direct sort de l'appli"
(voir `plan-canal-en-direct-pc.md` a la racine du depot), Lot R.

Implementation Electron du plugin Capacitor `SuperpositionAgent` : pont IPC
entre la fenetre principale (vraie connexion WebSocket, DOM de la page
Clovis) et la fenetre de superposition systeme (sans bordure, transparente,
toujours au dessus et remise au sommet toutes les 500 ms, voir `electron/main.ts`). Methodes principales : `pousserEtat`
(fenetre principale -> superposition, avec conversion des coordonnees du
curseur de "locales a la page" vers "absolues a l'ecran"), `envoyerInteraction`
(superposition -> fenetre principale) et `maintenirCapture` (la
superposition signale un appui en cours sur l'un de ses elements ; le reste
du passe-clic est decide cote Electron par un suivi de la position du
pointeur, sans jamais recevoir les mouvements de souris du PC). Depuis le 01/10/2026 (bouton permanent du canal, voir le Lot W du plan), la
superposition reste affichee en permanence des que la fenetre principale a
pousse son premier etat (`pousserEtat` avec `retirer: true` la retire), et le
plugin expose deux methodes de plus pour le demarrage automatique avec
Windows : `lireDemarrageAutomatique` et `definirDemarrageAutomatique`.
Depuis le 11/10/2026 (crayon du canal), `definirModeCrayon` fait capter la
souris a la superposition sur tout l'ecran tant que le crayon est sorti, et
`definirRaccourcisCrayon` prend trois raccourcis systeme (sortir le crayon,
rappeler les traits, les effacer) seulement canal actif, relayes a la page par
l'evenement `crayon` (logique dans `electron/src/raccourcisCrayon.mts`, testee par
`npm run test:raccourcis-crayon`).
Voir les commentaires de `electron/src/plugin.mts` pour le
detail, et `lib/superpositionElectron.ts` (racine du depot) pour la forme
exacte de l'etat/des interactions transportes.

Meme raison qu'un paquet local a part (et pas un fichier dans `electron/`)
que `capacitor-dossiers-electron` (Lot Q) : `@capawesome/capacitor-electron`
decouvre les plugins via le champ `"capacitor": {"electron": {"src": "..."}}`
du `package.json` d'une dependance, pas en scannant `electron/` librement.

## Construire ce paquet

```bash
cd packages/capacitor-superposition-electron
npm install
npm run build
```

Produit `electron/dist/plugin.mjs`. A refaire a chaque modification de
`electron/src/plugin.mts`.

## Tester (sur ta machine Windows)

Depuis la racine du depot `clovis-frontend` :

```powershell
npm install
npm run build:capacitor
npx cap sync @capawesome/capacitor-electron
npx cap run @capawesome/capacitor-electron
```

Critere de fin du Lot R (voir le plan) : appli Electron lancee, ouvrir le
Bloc-notes ou un site quelconque au premier plan -- le curseur, la bulle, la
barre de saisie et le journal restent visibles et utilisables par dessus.

## Focus et clavier (12/10/2026)

Sous Windows, la fenetre de superposition nait non activable (`focusable: false`
dans `electron/main.ts`) : un clic sur la bulle, un bouton ou le crayon arrive
normalement mais n'active pas la superposition, donc la fenetre qui est derriere
ne se fige plus. `definirSaisieTexte({ actif })` la rend activable seulement
pendant que l'etudiant ecrit dans une de ses zones de texte (la page l'appelle
depuis `PageAgentSuperpositionClient.tsx` et `ControlesInteractionCanal.tsx`),
puis la rend non activable. Rendre la fenetre non activable n'a jamais suffi a
rendre l'activation a la fenetre du dessous (le journal de diagnostic du
18/10/2026 ne montrait aucune perte de focus) : avant la saisie, le plugin note
donc la fenetre active et, a la fin, la reactive avec `SetForegroundWindow`
(`electron/src/focusPrecedent.mts`, appels Windows par le module natif `koffi`).
Si l'etudiant a clique dans une autre fenetre entre temps, rien n'est reactive.
Si `koffi` ne se charge pas, la raison est ecrite dans le journal (ligne `FOCUS`)
et la superposition fonctionne comme avant. Perte de focus de la superposition :
elle redevient non activable seule. Hors Windows, rien ne change. Test :
`npm run test:focus-precedent`.

## Forme de la fenetre (18/10/2026)

La fenetre de superposition couvre toujours tous les ecrans, mais elle est decoupee
(`BrowserWindow.setShape`, Windows et Linux) a la forme exacte de ce que la page affiche :
curseur, bulle, boutons, journal, menus ouverts, marques, traits du crayon. En dehors de ces
zones, Windows ne voit aucune fenetre Classinus : rien n'est peint et les clics traversent
vers l'application dessous. Raison : une fenetre transparente plein ecran peut prendre le
focus, figer la fenetre du dessous et cacher des choses.

- Page : `lib/formeSuperposition.ts` mesure les elements `position: fixed` visibles (avec tout
  ce qui en depasse), plus les elements marques `data-agent-forme="inclure"`, sans les
  conteneurs marques `data-agent-forme="exclure"` (marques et couche du crayon, plein ecran
  mais presque vides). Une marge de 40 px entoure chaque zone. Tout nouvel element visible de
  la superposition doit etre `fixed` (ou marque `inclure`), sinon il serait coupe.
- Processus principal : `definirForme` (plugin.mts) valide, convertit et borne les zones
  (`electron/src/forme.mts`). Une liste vide remet la fenetre entiere dans `setShape` : une page
  vide donne donc un point de 1 pixel, jamais une liste vide. Crayon sorti : fenetre entiere.
- Si `setShape` echoue, la fenetre redevient entiere et l'ancien comportement continue.
- Le passe-clic (`setIgnoreMouseEvents`, suivi de la souris) n'a pas change : la forme reduit la
  surface occupee, elle ne remplace pas encore le passe-clic.

Test : `npm run test:forme-superposition` (module pur, puis mesure de la page dans Chromium).
