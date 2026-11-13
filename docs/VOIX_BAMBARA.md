# Bambara voice mode

**English version** · [Version française](VOIX_BAMBARA.fr.md)

Requested by Bourama on 13 November 2026. The server side is described in `docs/chantiers/VOIX_BAMBARA.md` of the classinus-backend repository.

## Flow

1. The user turns voice mode on (chat button or live channel button).
2. If the server says Bambara is connected (`GET /api/voix-bambara/etat`), a question appears: "Which language do you want to speak?". "Other language" opens the usual Gemini Live voice, unchanged. Without Bambara connected, or during a live channel turn, the question is not asked.
3. In Bambara: the microphone detects the end of each sentence, Soloni only transcribes, the text goes into the chat like a voice request (the question and the answer show in the conversation), then the written answer is cleaned, split and read by the Gemini voice.

## Files

- `lib/voixBambara.ts`: the session (same shape as `lib/geminiLive.ts`, so the wave and the Stop button work unchanged).
- `lib/voixBambaraMicro.ts`: speech detection and recording. Thresholds are in `REGLAGES_MICRO`.
- `lib/voixBambaraLecture.ts`: reading the chunks, the next one is prepared while the previous one plays.
- `lib/voixBambaraTexte.ts`: removes what cannot be spoken and splits the answer.
- `lib/voixBambaraApi.ts`: calls to the backend relay. The browser knows no service address.
- `components/voix/ChoixLangueVoix.tsx`: the "Bambara or other" question.
- The field `client: "voix_bambara"` is sent with every Bambara-mode message (`components/chat/ChatIA.tsx`, `lib/geminiLive.ts` for the direct path): the server then adds its two notes (plain text, answer in spoken Bambara).

## Limits

- While Classinus works or speaks, the microphone is paused: it cannot be interrupted by speaking, only with the Stop button.
- Messages typed in the chat and live channel bubbles are not read aloud in Bambara.
- Test: `npm run test:voix-bambara`. No test was run against the real services during development.
