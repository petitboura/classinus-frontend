# capacitor-dossiers-electron

Cree le 27/09/2026, Bourama : chantier "canal en direct sort de l'appli"
(voir `plan-canal-en-direct-pc.md` a la racine du depot), Lot Q.

Implementation Electron du plugin Capacitor `Dossiers`, limitee pour
l'instant a `obtenirInfosAppareil()` -- l'identifiant persistant du PC,
necessaire pour que `core/canal_agent_applicatif.py` (clovis-backend, voir
la cle `(user_id, appareil_id)`) distingue une fenetre Electron d'un onglet
navigateur classique. Cote web, rien n'a ete modifie : `lib/canalAgentApplicatif.ts`
appelle deja ce plugin par son nom des que `Capacitor.isNativePlatform()`
est vrai (ce que la plateforme Electron rapporte nativement).

Les autres methodes du plugin `Dossiers` deja disponibles sur Android/iOS
(gestion de dossiers designes) ne sont pas reprises ici -- chantier a part,
non demande pour l'instant.

## Pourquoi un paquet local a part, plutot qu'un fichier dans `electron/`

`@capawesome/capacitor-electron` (la plateforme Electron maintenue, voir
son README) decouvre les implementations de plugin en scannant les
dependances du projet a la recherche d'un champ `"capacitor": {"electron":
{"src": "..."}}` dans leur `package.json` -- pas en lisant des fichiers
poses librement dans `electron/`. D'ou ce petit paquet local, reference
depuis `package.json` (racine du depot) via `"file:./packages/
capacitor-dossiers-electron"`.

## Construire ce paquet

```bash
cd packages/capacitor-dossiers-electron
npm install
npm run build
```

Produit `electron/dist/plugin.mjs` (chemin exact attendu par le contrat).
A refaire a chaque modification de `electron/src/plugin.mts` -- ce n'est
pas automatique.

## Tester (sur ta machine Windows, comme pour le reste du projet)

Depuis la racine du depot `clovis-frontend` :

```powershell
npm install
npm run build:capacitor
npx cap sync @capawesome/capacitor-electron
npx cap run @capawesome/capacitor-electron
```

Verification que tout est bien branche : une fois l'appli Electron
lancee et connectee avec un compte, `Capacitor.getPlatform()` doit valoir
`"electron"` cote web (console DevTools de la fenetre). Un log temporaire
dans `connecter()` (`clovis-backend/core/canal_agent_applicatif.py`) permet
de confirmer que l'`appareil_id` recu n'est plus une chaine vide.
