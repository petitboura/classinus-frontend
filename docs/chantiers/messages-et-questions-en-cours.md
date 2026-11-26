# Messages and questions while Classinus works (chat)

**English version** · [Version française](messages-et-questions-en-cours.fr.md)

Added on 26 November 2026 at Bourama's request. This is the front end half of the chantier. The backend half (routes, `poser_question` tool, delay setting) is described in `classinus-backend/docs/chantiers/QUESTIONS_ET_MESSAGES_EN_COURS.md`.

## What the user sees

1. **The input bar stays usable while Classinus works.** With text typed (and no attached file or location), the send arrow replaces the Stop button. With an empty field, or with a file attached, the Stop button stays. The placeholder says a detail can be added.
2. **A message sent during a turn appears at once** under the running answer, as a user bubble, with the mention "Received, Classinus will read it along the way" once the server has queued it. The turn is not stopped.
3. **If nothing can read it** (the turn just ended, the text is longer than the server queue accepts, the request failed), the bubble says it will be sent when the answer is finished, and it goes out as a normal message at that moment. Nothing is cut or lost.
4. **A question card appears live** when Classinus uses `poser_question`. It is the usual rich question (`QuestionInteractive`): choices with "Other", several fields ending with a free field, and so on.
   - Not blocking: the task continues, the card stays open, the answer reaches Classinus when given.
   - Blocking: Classinus waits for the answer inside the same turn. If the delay passes, the card is locked with a note, and Classinus asks the question again in its message.
   - Pressing Stop removes unanswered cards and unread messages.

## How it is wired

- `components/chat/BarreDeSaisie.tsx`: new prop `onEnvoyerPendantTour`. While `genererEnCours` is true and the prop is given, `envoyer()` hands the text (pasted texts joined) to it instead of refusing. `envoiPendantTourPossible` decides between the send arrow and the Stop button.
- `components/chat/ChatIA.tsx`:
  - `envoyerPendantTour` calls `POST /api/chat/message-en-cours` (`lib/api.ts::envoyerMessagePendantTour`). `pris_en_compte: false` or a network error puts the message in the "attente" state, and an effect sends the waiting messages together as one normal message once the turn and the text display are finished.
  - `repondreQuestionEnDirect` calls `POST /api/chat/question-reponse` (`repondreQuestionEnCours`). Status `a_renvoyer` sends the answer as a normal message (or queues it as "attente" while a turn runs).
  - The stream event `question_en_direct` is handled in `traiterEvenement`. The card id is the tool call id. The event is part of the replayed stream, so reopening the page during a blocking wait redraws the card. The `outil_resultat` of a blocking question that nobody answered locks the card.
  - `messagesPendantTour` and `questionsEnDirect` are separate lists drawn under the messages: the streamed text is written into the LAST message, nothing may be inserted after it. A normal new turn clears them.
- `components/chat/MessagesPendantTour.tsx` and `components/chat/QuestionEnDirect.tsx`: the two drawing components. z-index: none set, they sit in the message flow, below the agent overlay layer.
- `lib/i18n/interface.ts`: English texts. `lib/usagesDecouvrir.ts`: two new questions in the general FAQ of `/decouvrir/usages`, with English texts.

## Known limits

- Messages sent during a turn are not stored as separate messages by the server. After a reload they are no longer shown (Classinus's answer already took them into account).
- A message with an attached file or a location cannot join a running turn.
- Question cards live in the page only. After a reload the replayed stream redraws them, but only while the server still holds the turn.

## Checks

`npx tsc --noEmit`, `node tests/verifier-composants-natifs.mjs`, `node tests/verifier-couleurs-theme.mjs`.
