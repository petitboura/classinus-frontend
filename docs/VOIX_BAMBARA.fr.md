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

## Page bambara (`/bambara`)

Demandée par Bourama le 16 novembre 2026. Une page de Classinus, après connexion, pour les personnes qui parlent bambara et ne savent ni lire ni écrire. Elle contient la bulle en haut (l'onde de la voix), le micro et un petit bouton clavier. Un toucher pour parler, un toucher pour arrêter. Elle réutilise la chaîne vocale ci-dessus (`ouvrirVoixBambara`).

- L'écran ne montre que des vidéos et des images : vidéos du web (un toucher pour lancer), images du web, images générées. Aucun texte n'est écrit à l'écran quand la personne parle, et la réflexion de l'IA n'est jamais montrée.
- Pendant qu'un outil travaille, un effet de construction remplace l'icône et le libellé : des tuiles qui se posent une à une pour dessiner une image ou une vidéo, des cartes de résultats qui se montent pour une recherche web. La mémoire et les autres outils ne montrent rien d'autre que la bulle.
- Écriture (18 novembre 2026) : le petit bouton clavier à côté du micro fait glisser un champ de texte, caché par défaut. Un message écrit suit le même chemin qu'un message transcrit (`demanderPageBambara`). La réponse s'affiche alors en texte à l'écran, au fur et à mesure, et elle est lue à voix haute par la voix bambara (`lib/useEcritureBambara.ts`). Si le serveur n'a pas de voix bambara, ou si la voix échoue, le texte reste. Envoyer un message écrit ferme une écoute du micro encore ouverte ; toucher le micro pendant la lecture d'une réponse écrite l'arrête.
- Chaque message part avec `client: "page_bambara"` (`lib/pageBambara.ts`). Le serveur ne garde alors que les outils de recherche, de génération visuelle et de mémoire, ajoute les consignes de bambara oral et force l'effort de réflexion au plus faible (voir `core/outils_page_bambara.py` dans classinus-backend).
- Les vidéos et images viennent des listes du serveur (`images`, `videos`, `fichiers_generes`) et des liens que l'IA écrit dans sa réponse, que la voix ne lit jamais à voix haute (`lib/pageBambaraVisuels.ts`).

Fichiers : `app/bambara/page.tsx`, `components/bambara/PageBambaraClient.tsx`, `ChampEcritureBambara.tsx`, `CarteVisuelBambara.tsx`, `EffetConstruction.tsx`, `bambara.css`, `lib/pageBambara.ts`, `lib/pageBambaraVisuels.ts`, `lib/useEcritureBambara.ts`. L'onde (`components/voix/OndeVoix.tsx`) accepte un `etat` et un `lireNiveaux` facultatifs pour que la page la pilote sans le contexte vocal global. Test : `npm run test:page-bambara`.

Limites connues : la génération Higgsfield n'est pas encore proposée sur cette page ; le bouton flottant de téléchargement des navigateurs Android n'est pas masqué (sa règle est qu'il ne peut pas l'être) ; aucun essai avec les vrais services n'a été fait pendant le développement.
