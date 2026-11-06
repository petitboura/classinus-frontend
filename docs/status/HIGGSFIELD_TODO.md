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

## Manual tests before merge

- [ ] Catalogue: search, filters, counter, reset, hover sound card, fallback when preview is unavailable.
- [ ] Viewer: scroll snap, arrows, keyboard, dots, sound toggle, and Generate opening the correct panel.
- [ ] Backend: `GET /api/higgsfield/disponible` returns `{disponible: true/false}` based on the environment's `HIGGSFIELD_API_KEY`.
- [ ] Generate: upload → submit → status → cancel → completion → library.

## References

- Backend endpoints: `api/higgsfield.py`
- Higgsfield logic: `core/generation_video_higgsfield.py`, `core/higgsfield_catalogue.py`, `core/higgsfield_limites.py`, `core/higgsfield_requetes.py`
- Static catalogue: `lib/effetsHiggsfield.ts` (50+ effects)
