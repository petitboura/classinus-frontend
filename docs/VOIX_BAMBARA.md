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
- Buttons (22 November 2026): the heart, the video play button and the close cross sit on images and videos with no background, no circle and no glow, so they never hide the content. The four buttons at the top left (profile, new conversation, history, kept items) are folded behind one button that opens and closes the row; the row is closed when the page loads (`components/bambara/BarreHautBambara.tsx`).
- Each message is sent with `client: "page_bambara"` (`lib/pageBambara.ts`). The server then keeps only the search, visual generation and memory tools, adds the spoken-Bambara notes, and forces the lowest reasoning effort (see `core/outils_page_bambara.py` in classinus-backend).
- Videos and images come from the links the AI writes in its answer (the AI chooses which ones) and from the images it creates (`fichiers_generes` of `generer_image`); the voice never reads links aloud (`lib/pageBambaraVisuels.ts`).

Files: `app/bambara/page.tsx`, `app/bambara/layout.tsx`, `components/bambara/PageBambaraClient.tsx`, `ChampEcritureBambara.tsx`, `BulleAudioBambara.tsx`, `CarteVisuelBambara.tsx`, `RangeesVisuelsBambara.tsx`, `EffetConstruction.tsx`, `bambara.css`, `lib/pageBambara.ts`, `lib/pageBambaraVisuels.ts`, `lib/audioMessageBambara.ts`, `lib/useEcritureBambara.ts`, `lib/useDecalageClavier.ts`. The wave (`components/voix/OndeVoix.tsx`) accepts an optional `etat` and `lireNiveaux` so the page can drive it without the global voice context. Test: `npm run test:page-bambara`.

**Look (18 November 2026, requested by Bourama):** the page is strictly black and white, no other color, with its own construction effects and shapes. The layout itself (conversation, floating controls, audio messages) is described below.

- **Construction frames.** To create an image or search for a video, a photo frame appears: corner marks like a viewfinder, a halftone dot grid that grows in a diagonal wave, and a thin scan line. Images use three small frames. A search uses three empty frames that light up one after another. Nothing looks like text, since the user cannot read.
- **Shape rule.** Media (images, videos, construction frames) have sharp corners; controls (microphone, keyboard button, writing field) are round. The top bubble is the chat's mini bubble (a small 56 px circle, top right), and the microphone and keyboard buttons are small and low on the screen.
- **Font.** The text of the page (the answer, the written question and the writing field) uses `font-lecture` (Source Serif 4), the same font as the chat replies.
- **Colors.** They are defined once in `.bb-page` (`components/bambara/bambara.css`): ink and background swap with the light or dark theme, and every gray is derived from them. The accent, the error red and any hard-coded color are banned on this page, and the test fails if one comes back. An error is shown by emptying the microphone (light fill, ink outline), never by a color. The wave reads its color from its own canvas, so the page redefines `--dj-accent-1` inside `.bb-page` and nothing changes elsewhere. The videos and images found keep their real colors, because they carry the meaning.

**Layout (18 November 2026, requested by Bourama):** it is a conversation, not a results page. The bubble at the top, the writing field and the microphone float over the content: they take no room in the layout, and the content scrolls behind them with fixed top and bottom margins. The phone keyboard lands on top of the page instead of pushing it (`interactiveWidget: "overlays-content"` in `app/bambara/layout.tsx`), and the bottom controls rise just above it (`lib/useDecalageClavier.ts` measures what the keyboard covers, whatever the browser does). Images and videos are small square thumbnails of the same size, laid out like a film strip that goes down (`RangeesVisuelsBambara.tsx`): 3 per row on a phone, 4 on a large screen, wrapping to the next row, never scrolling sideways. Images come first, then videos, under the text of the answer, and each request adds its own sheet after the previous one. A video shows a small play symbol; when played it takes the full width of its row, and only one plays at a time; an image opens full screen with the chat viewer.

**Conversation (18 November 2026, requested by Bourama):** each request is added after the previous ones instead of wiping the screen; the newest is at the bottom, and the screen follows it unless the person has scrolled up to look at something earlier. A written request also shows the written question as a small bubble on the right; a spoken request shows no text, because the person cannot read. Stopping the microphone removes nothing from the conversation; only the building effect in progress disappears. A new page load starts a new conversation. One video plays at a time across the whole conversation (`lib/pageBambaraVisuels.ts`: `TourBambara`, `modifierTour`).

Known limits: Higgsfield generation is not offered on this page yet; the global floating download button on Android browsers is not hidden (its rule is that it cannot be hidden); no test was run against the real services during development.

**Audio messages (November 19, 2026, requested by Bourama):** the conversation works like WhatsApp. What the person says becomes an audio message in a bubble on the right, and Classinus's voice becomes an audio message in a bubble on the left. Each bubble has a play/pause button, voice bars that fill while it plays (tapping the bars seeks), and the duration. The person's speech shows up right away, before the transcription; if nothing is understood (noise), the bubble is removed. Silence before and after the speech is trimmed (`lib/audioMessageBambara.ts`). Classinus's voice is still read aloud automatically, then stays replayable; if the Stop button cuts it, the part already read is kept. Only one bubble plays at a time, and a video starting or a new request stops the current bubble. While a message is replayed the microphone is paused (it would hear the speaker), and an incoming answer waits for the replay to end before being read (`suspendreEcoute` and `reprendreEcoute` in `lib/voixBambara.ts`). Audio messages stay in the page with the rest of the conversation: reloading the page opens a new conversation. Only the first message of each conversation is kept on the server, for the history (see "Top buttons" below). Files: `components/bambara/BulleAudioBambara.tsx`, `lib/audioMessageBambara.ts`.

**Order and text (November 19, 2026, requested by Bourama):** the voice note is on top and Classinus's answer text below it, collapsed by default: only the beginning is visible, on a single line, never more, on desktop and phone alike. The text is not boxed in and its look does not change when expanded: only the number of lines does. One tap expands it, a second tap collapses it, and the arrow points right when collapsed and down when expanded. This also applies to a spoken request. No text is written inside the bubble of the person who speaks. The answer's audio bubble is already there (pulsing bars) as soon as the answer is being prepared, so nothing shifts when the voice is ready. File: `components/bambara/TexteReplieBambara.tsx`.

**Images and videos chosen by the AI (November 19, 2026, requested by Bourama):** the AI chooses which images and videos are shown: the ones whose link it writes in its answer. Search results it does not cite are not shown; they only complete (thumbnail, title) the ones it cites. Images it creates itself (the `generer_image` tool) are always shown. YouTube video thumbnails and search images are never shown on their own, even though the server announces them as "generated files": only the tool that really creates the image counts (`lib/pageBambara.ts`, `lib/pageBambaraVisuels.ts`).

**Top buttons (November 18, 2026, requested by Bourama):** a row of round icon buttons floats at the top left, opposite the small chat bubble, and has no text: new profile, new conversation (a simple "+"), history, and kept items (`components/bambara/BarreHautBambara.tsx`). The first three panels open under the row, one at a time; a second tap or a tap beside the panel closes it, and so does Escape.

- **Profile.** A field for the last name, a field for the first name, and a check button (or Enter). Profiles already created on the account appear below as chips; a tap chooses the person. Each profile has its own history and its own kept items; with no profile chosen they go to a shared space of the account. Choosing or creating a profile starts a new conversation.
- **New conversation ("+").** Stops the microphone, the voice, a written answer in progress and the playing video, empties the screen, and starts a new conversation.
- **History.** The first message of each conversation of the chosen profile, the newest on top: the written text, or, when the person spoke, their first voice message, which can be replayed like in the conversation.
- **Keep.** Each video and image has a heart in its corner (`BoutonCoeurBambara.tsx`): empty when not kept, full when kept. The kept button opens two icon tabs, videos and images, with the same cards (a video plays in its card, an image opens full screen); the heart there removes the item.

Everything is stored on the account (`lib/useBambaraEspace.ts`, `lib/bambaraEspace.ts`; tables and routes described in the backend document `PAGE_BAMBARA_PROFILS.md`). Failures are silent: the page never shows an error. Known limits of this first version: the history lists first messages only and does not reopen a past conversation, and the page's browser back button does not close an open panel.
