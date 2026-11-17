# Avatar Napster du mode vocal (16/11/2026)

Branche `feat/avatar-napster` des deux dépôts (classinus-backend et classinus-frontend). Pas encore fusionnée dans `main`.

## Ce que c'est
L'avatar Napster remplace seulement l'onde du mode vocal, en plein écran et en petite bulle. Rien d'autre ne change :
le bambara et la bulle du canal en direct gardent l'onde. L'avatar est un interprète : il écoute et parle, et passe
toute vraie demande au chat de Classinus par l'outil `demander_a_classinus`. Napster ne reçoit aucun identifiant d'élève
et ne garde aucune mémoire. Aucune donnée n'est stockée côté Classinus pour l'avatar.

## Interrupteur et variables (Railway, classinus-backend)
- `AVATAR_NAPSTER_ACTIF` : `1`, `true` ou `oui` pour allumer. Retirée ou autre chose : éteint, le mode vocal reste celui d'avant.
- `NAPSTER_API_KEY` et `NAPSTER_AGENT_ID` : clé de l'API et identifiant de l'agent (napster.com/developer).
- Facultatives : `NAPSTER_API_URL`, `AVATAR_NAPSTER_MAX_PAR_MINUTE` (jetons par minute et par compte, 6 par défaut), et les textes `AVATAR_NAPSTER_CONSIGNES`, `_DESCRIPTION_OUTIL`,
  `_ACCUEIL`, `_ANNONCE_REPONSE`, `_ANNONCE_BULLE`, `_ATTENTE`, `_SUITE_DEMANDE` (voir core/avatar_napster_config.py).

## Où est le code
- Backend : `api/avatar_napster.py` (état et jeton), `core/avatar_napster_config.py`, `test_avatar_napster.py`.
- Frontend : `lib/avatarNapster.ts` (session), `lib/avatarNapsterApi.ts`, `lib/contexteVoixDirecte.tsx` (choix avatar avant bambara),
  `components/voix/VoixDirecteSuperposition.tsx` (avatar à la place de l'onde).

## À vérifier en vrai (jamais testé avec une vraie clé)
- Le nom de l'évènement d'appel d'outil (`function_implicitly_called`) et les champs `call_id`, `name`, `arguments`, pris dans la doc officielle.
- La langue de l'avatar se règle sur l'agent côté Napster, pas ici.
- Mention « Powered by Napster » gardée en plein écran.
