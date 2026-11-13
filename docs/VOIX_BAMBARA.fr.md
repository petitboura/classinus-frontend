# Mode vocal bambara

[English version](VOIX_BAMBARA.md) · **Version française**

Demandé par Bourama le 13 novembre 2026. Le côté serveur est décrit dans `docs/chantiers/VOIX_BAMBARA.fr.md` du dépôt classinus-backend.

## Parcours

1. L'utilisateur allume le mode vocal (bouton du chat ou bouton du canal en direct).
2. Si le serveur dit que le bambara est branché (`GET /api/voix-bambara/etat`), une question s'affiche : « Dans quelle langue veux-tu parler ? ». « Autre langue » ouvre la voix Gemini Live habituelle, sans aucun changement. Sans bambara branché, ou pendant un tour du canal en direct, la question n'est pas posée.
3. En bambara : le micro détecte la fin de chaque phrase, Soloni transcrit seulement, le texte part dans le chat comme une demande de la voix (la question et la réponse s'affichent dans la conversation), puis la réponse écrite est nettoyée, découpée et lue par la voix Gemini.

## Fichiers

- `lib/voixBambara.ts` : la session (même forme que `lib/geminiLive.ts`, donc l'onde et le bouton Arrêter marchent sans changement).
- `lib/voixBambaraMicro.ts` : détection de la parole et enregistrement. Les seuils sont dans `REGLAGES_MICRO`.
- `lib/voixBambaraLecture.ts` : lecture des morceaux, le suivant est préparé pendant que le précédent joue.
- `lib/voixBambaraTexte.ts` : retire ce qui ne se prononce pas et découpe la réponse.
- `lib/voixBambaraApi.ts` : appels vers le relais du backend. Le navigateur ne connaît aucune adresse de service.
- `components/voix/ChoixLangueVoix.tsx` : la question « bambara ou autre ».
- Le champ `client: "voix_bambara"` part avec chaque message du mode bambara (`components/chat/ChatIA.tsx`, `lib/geminiLive.ts` pour le chemin direct) : le serveur ajoute alors ses deux consignes (texte simple, réponse en bambara oral).

## Limites

- Pendant que Classinus travaille ou parle, le micro est en pause : on ne peut pas l'interrompre en parlant, seulement avec le bouton Arrêter.
- Les messages tapés dans le chat et les bulles du canal en direct ne sont pas lus en bambara.
- Test : `npm run test:voix-bambara`. Aucun essai avec les vrais services n'a été fait pendant le développement.
