# Higgsfield: status of branch `feature/higgsfield-catalogue-generation`

[English version] · [Français](HIGGSFIELD_TODO.fr.md)

Updated 1 November 2026: the Generate panel is complete.

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

### Generate form: what is shown, what is sent, what comes back (6 and 7 November 2026)

Rule decided by Bourama on 6 November 2026: for the effects, the description the person reads, what really goes to the model and what comes out must never diverge.

- The name and the preview of an effect are never sent to Higgsfield. They are examples, and the viewer says so under the preview.
- **Genjutsu, motion transfer (25 effects).** Keeps the gestures, the camera and the rhythm of the user's video and rebuilds the scene from the user's images. The text field stays folded under "Add a detail (optional)" while it is empty, and stays visible as soon as it holds a text, because that text is sent.
- **Genjutsu, element swap (10 effects).** Changes one element of the video (character, outfit, object or place) and keeps the rest. The text says which one, so the field "What should change?" is always visible (optional).
- **Viral (12 effects).** They go through the motion transfer. The description of the effect is the starting text of an always visible field and is sent with the request; the person can edit or erase it. The documentation of Higgsfield does not confirm that it follows this text for the motion transfer: a test with and without the text is still to be done.
- **Soul (3 effects).** Soul 2.0 is now really called (before, the request went to Grok). The style of the effect is sent (`style_id`), the text field starts filled with a short portrait text for that style, the reference images zone is hidden (Soul does not offer it), and the quality is 720p or 1080p. Higgsfield may reword a very short text, and the form says so.
- Plain labels replace the technical model names (`hf_mult_motion_control`, `genjutsu-motion`, `higgsfield-viral`): "Motion transfer", "Element swap" and "Soul 2.0".
- `lib/effetsHiggsfield.ts`: the unused `promptChat` field was removed, `styleId` and `promptInitial` were added, and the descriptions are written with their accents. `lib/higgsfieldGeneration.ts`: `modeEffet`, `libelleModeEffet`, `estEffetViral`, `FORMATS_SOUL` and `QUALITES_SOUL`.
- The descriptions of the effects stay in French (they are catalogue data, not part of the English dictionary), so an English user also sees and sends the French text of a Viral effect.

### Server-side generation (6 November 2026)

- Launching, tracking and saving a generation now happen on the server: you can close the app and the result still lands in your library, with a notification when it is ready. See `docs/status/HIGGSFIELD_TODO.md` in `classinus-backend` for the table, the loop and the endpoints.
- `lib/higgsfieldApi.ts`: `statutHiggsfield` only reads the server state (the `titre` parameter was removed); new `listerGenerationsHiggsfield`.
- New `components/higgsfield/GenerationsRecentesHiggsfield.tsx`: "My recent generations" block at the top of the catalogue (running, done, failed; a "View" link on finished ones). It refreshes while a generation is running and stays hidden when the list is empty.
- Not done yet: the "built before your eyes" visual effect during generation.

## Manual tests before merge

- [ ] Catalogue: search, filters, counter, reset, hover sound card, fallback when preview is unavailable.
- [ ] Viewer: scroll snap, arrows, keyboard, dots, sound toggle, and Generate opening the correct panel.
- [ ] Backend: `GET /api/higgsfield/disponible` returns `{disponible: true/false}` based on the environment's `HIGGSFIELD_API_KEY`.
- [ ] Generate: upload → submit → status → cancel → completion → library.

## References

- Backend endpoints: `api/higgsfield.py`
- Higgsfield logic: `core/generation_video_higgsfield.py`, `core/higgsfield_catalogue.py`, `core/higgsfield_limites.py`, `core/higgsfield_requetes.py`
- Static catalogue: `lib/effetsHiggsfield.ts` (50+ effects)
