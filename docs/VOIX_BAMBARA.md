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

## Bambara page (`/bambara`)

Requested by Bourama on 16 November 2026. A page inside Classinus, after sign-in, for people who speak Bambara and can neither read nor write. It holds only the bubble at the top (the voice wave) and the microphone. One touch to speak, one touch to stop. It reuses the same voice chain as above (`ouvrirVoixBambara`).

- The screen shows only videos and images: videos from the web (tap to play), images from the web, generated images. Nothing is written on screen, and the AI's reasoning is never shown.
- While a tool works, a building effect is shown instead of an icon and a label: tiles that lay down one by one to draw an image or a video, result cards that assemble for a web search. Memory and other tools show nothing but the bubble.
- Each message is sent with `client: "page_bambara"` (`lib/pageBambara.ts`). The server then keeps only the search, visual generation and memory tools, adds the spoken-Bambara notes, and forces the lowest reasoning effort (see `core/outils_page_bambara.py` in classinus-backend).
- Videos and images come from the server lists (`images`, `videos`, `fichiers_generes`) and from the links the AI writes in its answer, which the voice never reads aloud (`lib/pageBambaraVisuels.ts`).

Files: `app/bambara/page.tsx`, `components/bambara/PageBambaraClient.tsx`, `CarteVisuelBambara.tsx`, `EffetConstruction.tsx`, `bambara.css`, `lib/pageBambara.ts`, `lib/pageBambaraVisuels.ts`. The wave (`components/voix/OndeVoix.tsx`) accepts an optional `etat` and `lireNiveaux` so the page can drive it without the global voice context. Test: `npm run test:page-bambara`.

Known limits: Higgsfield generation is not offered on this page yet; the global floating download button on Android browsers is not hidden (its rule is that it cannot be hidden); no test was run against the real services during development.
