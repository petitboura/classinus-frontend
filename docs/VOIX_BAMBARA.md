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

Requested by Bourama on 16 November 2026. A page inside Classinus, after sign-in, for people who speak Bambara and can neither read nor write. It holds the bubble at the top (the voice wave), the microphone and a small keyboard button. One touch to speak, one touch to stop. It reuses the same voice chain as above (`ouvrirVoixBambara`).

- The screen shows only videos and images: videos from the web (tap to play), images from the web, generated images. Nothing is written on screen when the person speaks, and the AI's reasoning is never shown.
- While a tool works, a building effect is shown instead of an icon and a label: tiles that lay down one by one to draw an image or a video, result cards that assemble for a web search. Memory and other tools show nothing but the bubble.
- Writing (18 November 2026): the small keyboard button next to the microphone slides a text field in and out (hidden by default). A written message takes the same path as a transcribed one (`demanderPageBambara`). The answer then shows as text on screen, as it arrives, and is read aloud by the Bambara voice (`lib/useEcritureBambara.ts`). If the server has no Bambara voice, or the voice fails, the text stays. Sending a written message closes a microphone session that is still open; tapping the microphone while a written answer is being read stops it.
- Each message is sent with `client: "page_bambara"` (`lib/pageBambara.ts`). The server then keeps only the search, visual generation and memory tools, adds the spoken-Bambara notes, and forces the lowest reasoning effort (see `core/outils_page_bambara.py` in classinus-backend).
- Videos and images come from the server lists (`images`, `videos`, `fichiers_generes`) and from the links the AI writes in its answer, which the voice never reads aloud (`lib/pageBambaraVisuels.ts`).

Files: `app/bambara/page.tsx`, `app/bambara/layout.tsx`, `components/bambara/PageBambaraClient.tsx`, `ChampEcritureBambara.tsx`, `CarteVisuelBambara.tsx`, `RangeesVisuelsBambara.tsx`, `EffetConstruction.tsx`, `bambara.css`, `lib/pageBambara.ts`, `lib/pageBambaraVisuels.ts`, `lib/useEcritureBambara.ts`, `lib/useDecalageClavier.ts`. The wave (`components/voix/OndeVoix.tsx`) accepts an optional `etat` and `lireNiveaux` so the page can drive it without the global voice context. Test: `npm run test:page-bambara`.

**Look (18 November 2026, requested by Bourama):** the page is strictly black and white, no other color. The colors are defined once in `.bb-page` (`components/bambara/bambara.css`): ink and background swap with the light or dark theme, and every gray is derived from them. The accent, the error red and any hard-coded color are banned on this page, and the test fails if one comes back. An error is shown by emptying the microphone (light fill, ink outline), never by a color. The wave reads its color from its own canvas, so the page redefines `--dj-accent-1` inside `.bb-page` and nothing changes elsewhere. The videos and images found keep their real colors, because they carry the meaning.

**Layout (18 November 2026, requested by Bourama):** it is a conversation, not a results page. The bubble at the top, the writing field and the microphone float over the content: they take no room in the layout, and the content scrolls behind them with fixed top and bottom margins. The phone keyboard lands on top of the page instead of pushing it (`interactiveWidget: "overlays-content"` in `app/bambara/layout.tsx`), and the bottom controls rise just above it (`lib/useDecalageClavier.ts` measures what the keyboard covers, whatever the browser does). Images and videos are small cards in scrolling rows, left to right, as in the chat (`RangeesVisuelsBambara.tsx`): one row of images, one row of videos, under the text of the answer. A video plays inside its card and only one plays at a time; an image opens full screen with the chat viewer.

**Conversation (18 November 2026, requested by Bourama):** each request is added after the previous ones instead of wiping the screen; the newest is at the bottom, and the screen follows it unless the person has scrolled up to look at something earlier. A written request also shows the written question as a small bubble on the right; a spoken request shows no text, because the person cannot read. Stopping the microphone removes nothing from the conversation; only the building effect in progress disappears. A new page load starts a new conversation. One video plays at a time across the whole conversation (`lib/pageBambaraVisuels.ts`: `TourBambara`, `modifierTour`).

Known limits: Higgsfield generation is not offered on this page yet; the global floating download button on Android browsers is not hidden (its rule is that it cannot be hidden); no test was run against the real services during development.
