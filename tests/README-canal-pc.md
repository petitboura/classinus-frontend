# Vérification du canal PC

`npm run test:canal-pc` exerce les vrais modules de lecture/scanning, le cycle
de vie du canal, le plugin natif, la route WebSocket Python et le résultat de
`lire_ecran` destiné au modèle. Seules les frontières externes sont simulées :
session de test, contextes React, Win32/PowerShell et pilote nut-js.

Préparation (Node 24, backend de la branche `fix/canal-pc-lecture-complete`
dans le dossier voisin `classinus-backend`) :

```bash
npm ci --ignore-scripts
npx playwright install chromium
python -m pip install fastapi uvicorn websockets
npm run test:canal-pc
```

`BACKEND_REPO`, `PYTHON`, `CHROMIUM_PATH` et `CHROMIUM_ARGS` permettent de
choisir le checkout, l'interpréteur Python et le navigateur local.

Le test vérifie : texte et valeurs de la page, mots de passe masqués,
popup visible, boutons du canal exclus, miroir sans connexion, renderer
Electron caché toujours joignable, onglet web masqué fermé puis reconnecté,
connexion système sur la même API, ouverture d'application sans attendre sa
fermeture, erreur native renvoyée sans perdre la demande, lecture UIA
indépendante du pilote souris/clavier, texte et coordonnées conservés par le
backend. Le modèle LLM lui-même n'est pas appelé.

Sur Windows avec une session de bureau :

```powershell
node tests/verifier-uia-windows.mjs
```

Ce second test crée une vraie fenêtre WinForms et utilise la vraie lecture
PowerShell/UI Automation. Il vérifie texte, boutons, valeur, mot de passe,
fenêtre sous la superposition et restitution du focus. Le workflow GitHub
`Lecture PC Windows` exécute aussi les compilations TypeScript.

Après modification, reconstruire les trois plugins locaux (`npm run build`
dans `packages/capacitor-dossiers-electron`, puis
`packages/capacitor-pont-natif-electron` et
`packages/capacitor-superposition-electron`), refaire le build Capacitor et
la synchronisation Electron, puis empaqueter l'application. Une application
déjà installée garde son ancien code tant qu'elle n'est pas reconstruite.
Les builds de cette branche ciblent toujours le backend de test existant.
Il doit inclure le Lot V (lecture UIA structurée) et l'origine CORS Electron.
