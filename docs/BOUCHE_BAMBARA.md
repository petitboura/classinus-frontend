# Bambara voice test page

[English version] · [Français](BOUCHE_BAMBARA.fr.md)

Status: internal test page on branch `feat/bouche-bambara`, not deployed. Requested by Bourama on 12 November 2026 to compare Bambara text-to-speech voices by ear. The service behind it lives in the backend repository (see its `docs/BOUCHE_BAMBARA.md`).

## What it does

The page `/dev-demo-bouche` lets an administrator type a Bambara sentence and listen to each available voice, one card per voice, or all of them in turn with "Listen to all". Each card shows the licence status of the model and an "experimental" mark when the model card says so. A voice with several speakers has a speaker selector.

## Files

- `app/dev-demo-bouche/page.tsx`, `layout.tsx`: the page, and the layout that sends `noindex, nofollow`.
- `components/bouche/PageTestBouche.tsx`: state and layout of the page (text, voices, audio, errors).
- `components/bouche/CarteVoixBouche.tsx`: one voice card, and its loading skeleton.
- `lib/boucheApi.ts`: calls to `GET /api/bouche/voix` and `POST /api/bouche/synthese`.
- `lib/textesBouche.ts`: all texts, in French and English.
- `lib/erreurs.ts`: the seven `BOUCHE_*` error codes, in both languages, kept in sync with the backend.
- `lib/liensEntrants.ts`: the page is listed among the pages that never open inside the app.

## Behavior to know

- Reserved to administrators: the backend answers `PAS_LE_DROIT_ADMIN` to anyone else, and the page shows that message.
- The voice list, the number of speakers and the maximum text length come from the service. Nothing about the voices is hard-coded in the page.
- Audio is played from a temporary browser address that is released when a new audio replaces it and when the page closes.
- The page is a web page only: it is not part of the native app navigation and not in the sitemap.
- No text is stored by the page.
