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

## Base de la vision de l'écran (règle permanente)

L'IA ne doit rien perdre de ce qui est affiché, que les composants aient pensé ou
non à se déclarer. Les quatre règles (détail dans `REGLE_VISION_ECRAN`, backend,
`core/profils_agents.py`, envoyée à chaque message) sont tenues par le code :

1. Tout élément visible est listé, bouton par bouton, avec un nom. Sur le site :
   `lib/structureEcran.ts` (nom de secours : libellés référencés, icône, position)
   et `lib/scanElementsInteractifs.ts` (éléments qui réagissent au clic sans rôle,
   boutons désactivés marqués). Sur le PC : les boutons sans nom restent dans la
   lecture avec leur identifiant d'automatisation et leur aide, et les textes ont
   un plafond à part pour ne plus prendre la place des boutons.
2. Fenêtres et panneaux reconnus par leur structure (`zoneDeLElement`, panneau
   UIA, fenêtres flottantes au-dessus). L'IA ouvre un panneau avant de cliquer dedans.
3. Un bouton agrandir ou plein écran indique ce qu'il agrandit.
4. `lire_ecran` lit aussi les fenêtres flottantes restées au-dessus ; `lire_page`
   termine par la liste des fenêtres et panneaux affichés.

Garde-fou côté backend : `test_regle_vision_ecran.py` échoue si une règle disparaît
du prompt ou si une ligne d'élément perd sa fin.
