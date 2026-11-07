# Higgsfield: status of branch `feature/higgsfield-catalogue-generation`

[English version] · [Français](HIGGSFIELD_TODO.fr.md)

Updated 7 November 2026: the Generate form can hand over to the chat.

## Completed in this branch

### Frontend: `classinus-frontend`

- `components/higgsfield/CatalogueHiggsfield.tsx`: normalized text search, `X effects / N total` counter, Type/Style chips, removed the SOON banner, 2-to-3-column grid, empty state and reset.
- `components/higgsfield/VisionneurHiggsfield.tsx`: vertical snap, ← → / ↑ ↓ arrows, bottom dots, keyboard controls, and Generate button wired to the `onGenerer` callback.
- `lib/higgsfieldApi.ts`: helpers for `higgsfieldDisponible`, `lancerVideoHiggsfield`, `lancerImageHiggsfield`, `lancerGenjutsuHiggsfield`, `statutHiggsfield`, `annulerHiggsfield`, `estimerHiggsfield`, and `uploaderFichierHiggsfield`.
- `components/higgsfield/GenererHiggsfield.tsx`: **complete**. Image/video upload through `POST /api/uploads/fichier-chat`; title, prompt, duration, format, quality, sound, and resolution fields; Higgsfield job submission; status polling through `GET /statut/{id}` every 5 seconds with a progress bar; cancellation; image/video result display; and automatic backend save to the library.

### Backend: `classinus-backend`

- `api/higgsfield.py`: router endpoints `POST /api/higgsfield/video|image|genjutsu`, `GET /statut/{id}`, `POST /annuler/{id}`, `POST /estimation`, and `GET /disponible`. Rate limit `10/min` plus `reserver_generation` (daily quota); library save occurs when the status is finalized.
- `api/main.py`: `higgsfield_router` imported and mounted through `app.include_router(higgsfield_router)`. This was restored because it had not been committed previously.

### Performance on phones (6 November 2026, branch `fix/higgsfield-allegement-mobile`)

- Catalogue: a card's video is now loaded only when the card is near the screen and is released when it moves away (before, every video already scrolled past stayed in memory). Cards no longer redraw when the full-screen viewer opens or closes, and the blur effects on every card were removed.
- Viewer: only the displayed effect and its two neighbours have a real video; the others show their still image. Before, all videos of the catalogue started together when the viewer opened.

- Viewer framing (phone and PC): the video (or image) is shown in full, with black bars if needed, instead of being cropped to fill the screen.
- Viewer navigation (6 November 2026, branch `fix/higgsfield-points-cadrage`): the vertical column on the right (`RailVisionneur`) was removed. On PC, one small dot per effect sits at the bottom (the displayed effect has a longer white dot, each dot is clickable) and the up and down arrows stay on the right edge. On phones, no indicator is shown; swiping is enough. The `1 / N` counter at the top stays.

### Generate form for video-to-video effects (6 November 2026)

- The 47 video-to-video effects (35 Genjutsu and 12 Viral) do not send the effect itself to Higgsfield: the result comes from the user's own video and images. So the description field is now folded under "Add a detail (optional)" instead of being a large field, and the viewer shows a note under the preview: "The preview is an example. Your result depends on your video and your images."
- The 3 image effects (Soul) are unchanged: the description stays required. Prefilling it with a style prompt is a separate step, not done yet.

### Server-side generation (6 November 2026)

- Launching, tracking and saving a generation now happen on the server: you can close the app and the result still lands in your library, with a notification when it is ready. See `docs/status/HIGGSFIELD_TODO.md` in `classinus-backend` for the table, the loop and the endpoints.
- `lib/higgsfieldApi.ts`: `statutHiggsfield` only reads the server state (the `titre` parameter was removed); new `listerGenerationsHiggsfield`.
- New `components/higgsfield/GenerationsRecentesHiggsfield.tsx`: "My recent generations" block at the top of the catalogue (running, done, failed; a "View" link on finished ones). It refreshes while a generation is running and stays hidden when the list is empty.
- Generation card (`components/higgsfield/CarteGenerationHiggsfield.tsx`): during a generation the form folds away and an empty card with the exact shape of the future video or image takes its place, with a frosted-glass layer over the user's own file, a real elapsed-time counter, and the result revealed once it is loaded. Higgsfield sends no partial preview and no percentage, so only the three real steps are shown: "Sending your files", "Waiting for its turn" and "Creation in progress".

### Chat fallback from the Generate form (7 November 2026)

- New "Do it in the chat" button in the Generate form, above Close and Generate. It opens a new chat conversation with a ready-written message and keeps everything already added in the form: the video and the images are attached again in the chat input, and the title (if changed), the description and the chosen options are written into the message. The button folds away while a generation runs and when the result is shown, and comes back after a failure or a cancellation. It exists for the cases where the form is not enough.
- The 3 image effects (Soul) get the same button, with the message about the chosen style.
- Marketing Studio presets have no form yet, so the same button sits under the "generation not available yet" notice and opens the chat with a message naming the preset (name, category, identifier).
- New `lib/messageChatHiggsfield.ts`: builds the message from the effect's `promptChat` and from what was typed in the form (it writes the starting sentence itself for Marketing Studio presets). Messages stay in French, like the catalogue sentences.
- Chat side: `useOuvrirChatAvecTexte` now accepts optional files. `ContexteChat` gets `fichiersInitiauxConversation`, which follows the life of `texteInitialConversation` (emptied when the text is emptied) and is also emptied by the input bar once the message is sent. `BarreDeSaisie` adds these files once when it opens, through its normal attachment path.
- Not tested in a browser yet: the type-check, the i18n tests and the native-components and theme-colour checks pass, and the message builder was run on real effects.

## Manual tests before merge

- [ ] Catalogue: search, filters, counter, reset, hover sound card, fallback when preview is unavailable.
- [ ] Viewer: scroll snap, arrows, keyboard, dots, sound toggle, and Generate opening the correct panel.
- [ ] Backend: `GET /api/higgsfield/disponible` returns `{disponible: true/false}` based on the environment's `HIGGSFIELD_API_KEY`.
- [ ] Generate: upload → submit → status → cancel → completion → library.
- [ ] Generate, "Do it in the chat": with a video and images added, the chat opens on a new conversation, the message is written, the same files are attached in the input bar, and sending the message sends them; the button hides during a generation and returns after a failure.
- [ ] Marketing Studio: "Do it in the chat" under the notice opens the chat with a message naming the preset.

## References

- Backend endpoints: `api/higgsfield.py`
- Higgsfield logic: `core/generation_video_higgsfield.py`, `core/higgsfield_catalogue.py`, `core/higgsfield_limites.py`, `core/higgsfield_requetes.py`
- Static catalogue: `lib/effetsHiggsfield.ts` (50+ effects)
