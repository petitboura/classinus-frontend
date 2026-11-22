# Referral and free image credits (frontend, step 5)

[English version] · [Français](parrainage-credits-images.fr.md)

Project started on 9 November 2026. Goal: every user becomes an acquisition channel. Image generation is free up to a balance of credits; an image is downloaded only after it has been shared; every friend who signs up through a person's link earns that person more credits.

This document covers step 5 (frontend). Steps 1 to 4 (Supabase tables, credits, referral, download unlock) live in the backend repository and were already in place on `staging` when this step started.

## The six steps

1. Supabase: credits, referral codes, referrals, disposable email domains, normalized email.
2. Backend, credits: one credit per image, refusal at zero (`CREDITS_IMAGES_EPUISES`). Videos are not charged.
3. Backend, referral: the referrer is recorded; once the email is confirmed (and it is not the person themselves nor a disposable email) the referrer earns credits.
4. Backend, download unlock: an image downloads only after a finished share, reported by the app.
5. Frontend (this document).
6. Real test on staging, then promotion to `main`.

## Server contracts used by the frontend

| Call | Use |
| --- | --- |
| `GET /api/parrainage/moi` | Code, remaining credits, valid and pending friends. Limited to 30 per minute. |
| `POST /api/parrainage/enregistrer` | Records the referrer. Answers `valide`, `en_attente`, `refuse` or `ignore`. |
| `POST /api/higgsfield/partage-termine/{id}` | Tells the server the share is finished; the download unlocks. Safe to repeat. |
| `GET /api/higgsfield/telecharger/{id}` | Returns the file. Needs the person's session; refuses a locked image with `TELECHARGEMENT_PARTAGE_REQUIS`. |
| status and list routes | Now carry `telechargement_debloque`. |

Error codes added to `lib/erreurs.ts` (French and English): `CREDITS_IMAGES_EPUISES`, `CREDITS_IMAGES_INDISPONIBLE`, `PARRAINAGE_CODE_INVALIDE`, `PARRAINAGE_INDISPONIBLE`, `TELECHARGEMENT_PARTAGE_REQUIS`, `IMPOSSIBLE_TELECHARGER_HIGGSFIELD`, `PARTAGE_IMAGE_INVALIDE`. Keep them in sync with `core/erreurs.py` in the backend.

## What the person sees

- **After an image is generated**: `Share` and a locked `Download` (padlock). `Open` is hidden because it would show the raw image. A video keeps `Open` and `Download`, never locked.
- **Share**: the person chooses the link, the image, or both, or copies the link as a fallback. When the share is finished the app tells the server and the padlock opens.
- **Download** (unlocked): the file is fetched with the person's session and saved through `lib/telecharger.ts`.
- **Credits left**: a small pill in the image generation windows. At zero, or when the server refuses an image, the "no more images, invite your friends" block replaces the error message.
- **Recent generations**: a locked image shows `Share` instead of `View`; the same block unfolds under the row.
- **Invitation link** `/invitation?code=ABCD2345`: public landing page. It keeps the code on the device and leads to sign up.

## Files

- `lib/parrainageApi.ts`: calls to `/api/parrainage`.
- `lib/parrainage.ts`: code kept on the device (`localStorage`, survives the email confirmation detour), link builder, code shape check.
- `lib/useMonParrainage.ts`: shared query for the signed in account, keyed by user id (the cache is persisted and nothing clears it on sign out).
- `lib/partagerImage.ts`: sharing logic (Capacitor share plugin, `navigator.share` with `canShare`, clipboard fallback).
- `lib/higgsfieldApi.ts`: `signalerPartageTermineHiggsfield`, `recupererFichierHiggsfield`, `telechargement_debloque` field.
- `lib/useSuiviGenerationHiggsfield.ts`: now keeps `telechargementDebloque`, `marquerDebloque` and `codeErreur`.
- `components/higgsfield/ActionsResultatHiggsfield.tsx`: result buttons (video unchanged, image behind the share).
- `components/higgsfield/CreditsImagesHiggsfield.tsx`, `PlusDeCreditsHiggsfield.tsx`: balance and "invite your friends" block.
- `components/EnregistrementParrainage.tsx`: registers the stored code once the person is signed in (mounted in `app/layout.tsx`).
- `app/invitation/`: landing page and its layout (not indexed).

## Decisions

- No gain number (10 at the start, 5 per friend) is written in any text. They live in `parrainage_reglages` in Supabase and no public route exposes them. The texts only say "free images".
- The share text that travels with the image or link exists in French and English in `lib/partagerImage.ts` (it is not in the page, so the interface translation cannot reach it).
- The invitation link uses a query parameter, not a path segment, so it works in the static export of the mobile app.
- `/invitation` is declared in `AndroidManifest.xml` so the link opens the app, as for every other page.

## Known limits

- The lock encourages sharing; it does not protect a secret. The generated image is displayed in the window, and a copy is saved to the person's library automatically (from where it can be downloaded). The backend says the same in `core/higgsfield_telechargement.py`.
- Images generated in the chat are not locked yet: the chat receives the raw image address without the generation number. This needs a backend change (return the number), then the same lock in the chat. Planned as step 5b.
- Sharing the image itself needs `navigator.canShare` to accept files. Firefox on desktop does not: the link is shared instead.
- Some apps ignore the text that goes with a shared image, so the link may not appear next to the image. The person can choose the link alone.
- Reading the image in the browser to share it depends on the image host allowing it (CORS). If it refuses, "The image" and "Both" are disabled and the link stays available. Not yet verified against a real Higgsfield image.
- The native app (Capacitor) share path has not been exercised on a device.
- `tests/verifier-liens-entrants.mjs` fails because `/higgsfield` is missing from the Android manifest list. This predates this work and is not part of it.

## Test on staging (step 6)

1. Generate a real Marketing Studio image: the balance drops by one; a failed generation gives the credit back.
2. Share (link, image, both, copy link): the padlock opens, `Download` saves the file, `Open` appears.
3. Open `/invitation?code=<code>` signed out, create a second account, confirm the email: the referrer's balance rises.
4. Use up the balance: the "invite your friends" block appears instead of an error.
5. Check the three views (web, PC, native) for overflow, back button and the bottom bar on a phone.
