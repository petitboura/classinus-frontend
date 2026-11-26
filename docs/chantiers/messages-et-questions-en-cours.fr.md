# Messages et questions pendant que Classinus travaille (chat)

[English version](messages-et-questions-en-cours.md) · **Version française**

Ajouté le 26 novembre 2026 à la demande de Bourama. C'est la moitié frontend du chantier. La moitié backend (routes, outil `poser_question`, réglage du délai) est décrite dans `classinus-backend/docs/chantiers/QUESTIONS_ET_MESSAGES_EN_COURS.fr.md`.

## Ce que voit l'utilisateur

1. **La barre de saisie reste utilisable pendant que Classinus travaille.** Avec du texte écrit (et sans fichier ni localisation joints), la flèche d'envoi remplace le bouton Arrêter. Champ vide, ou fichier joint : le bouton Arrêter reste. Le texte d'invite indique qu'on peut ajouter une précision.
2. **Un message envoyé pendant un tour s'affiche tout de suite** sous la réponse en cours, comme une bulle de l'utilisateur, avec la mention « Pris en compte, Classinus le lira en route » dès que le serveur l'a mis en file. Le tour n'est pas arrêté.
3. **Si rien ne peut le lire** (le tour vient de finir, le texte dépasse ce que la file accepte, la requête a échoué), la bulle indique qu'il sera envoyé quand la réponse est terminée, et il part alors comme un message normal. Rien n'est coupé ni perdu.
4. **Une carte de question apparaît en direct** quand Classinus utilise `poser_question`. C'est la question riche habituelle (`QuestionInteractive`) : choix avec « Autre », plusieurs champs terminés par un champ libre, etc.
   - Non bloquante : la tâche continue, la carte reste ouverte, la réponse parvient à Classinus quand elle est donnée.
   - Bloquante : Classinus attend la réponse dans le même tour. Si le délai passe, la carte est verrouillée avec une note, et Classinus repose la question dans son message.
   - Appuyer sur Arrêter retire les cartes sans réponse et les messages non lus.

## Comment c'est branché

- `components/chat/BarreDeSaisie.tsx` : nouvelle prop `onEnvoyerPendantTour`. Quand `genererEnCours` est vrai et que la prop est fournie, `envoyer()` lui passe le texte (textes collés compris) au lieu de refuser. `envoiPendantTourPossible` choisit entre la flèche d'envoi et le bouton Arrêter.
- `components/chat/ChatIA.tsx` :
  - `envoyerPendantTour` appelle `POST /api/chat/message-en-cours` (`lib/api.ts::envoyerMessagePendantTour`). `pris_en_compte: false` ou une erreur réseau met le message à l'état « attente », et un effet envoie les messages en attente ensemble, comme un seul message normal, quand le tour et l'affichage du texte sont finis.
  - `repondreQuestionEnDirect` appelle `POST /api/chat/question-reponse` (`repondreQuestionEnCours`). Le statut `a_renvoyer` envoie la réponse comme un message normal (ou la met en « attente » pendant qu'un tour tourne).
  - L'événement de flux `question_en_direct` est traité dans `traiterEvenement`. L'identifiant de la carte est celui de l'appel d'outil. L'événement fait partie du flux rejoué : rouvrir la page pendant une attente bloquante redessine la carte. L'`outil_resultat` d'une question bloquante restée sans réponse verrouille la carte.
  - `messagesPendantTour` et `questionsEnDirect` sont des listes à part, dessinées sous les messages : le texte streamé s'écrit dans le DERNIER message, rien ne doit s'insérer après lui. Un nouveau tour normal les vide.
- `components/chat/MessagesPendantTour.tsx` et `components/chat/QuestionEnDirect.tsx` : les deux composants d'affichage. Pas de z-index : ils sont dans le flux des messages, sous la couche de l'agent.
- `lib/i18n/interface.ts` : textes anglais. `lib/usagesDecouvrir.ts` : deux nouvelles questions dans la FAQ générale de `/decouvrir/usages`, avec leurs textes anglais.

## Limites connues

- Les messages envoyés pendant un tour ne sont pas enregistrés par le serveur comme des messages à part. Après un rechargement, ils ne sont plus affichés (la réponse de Classinus les a déjà pris en compte).
- Un message avec un fichier ou une localisation joints ne peut pas rejoindre un tour en cours.
- Les cartes de question n'existent que dans la page. Après un rechargement, le flux rejoué les redessine, mais seulement tant que le serveur garde le tour.

## Vérifications

`npx tsc --noEmit`, `node tests/verifier-composants-natifs.mjs`, `node tests/verifier-couleurs-theme.mjs`.
