# capacitor-superposition-electron

Cree le 27/09/2026, Bourama : chantier "canal en direct sort de l'appli"
(voir `plan-canal-en-direct-pc.md` a la racine du depot), Lot R.

Implementation Electron du plugin Capacitor `SuperpositionAgent` : pont IPC
entre la fenetre principale (vraie connexion WebSocket, DOM de la page
Clovis) et la fenetre de superposition systeme (sans bordure, transparente,
toujours au dessus, voir `electron/main.ts`). Methodes principales : `pousserEtat`
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
