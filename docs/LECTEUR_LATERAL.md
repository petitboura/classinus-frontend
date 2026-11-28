# Reader beside the chat

[English version] · [Français](LECTEUR_LATERAL.fr.md)

Request of 27 November 2026. Like Claude, ChatGPT and Gemini, a file opened from the conversation pushes the chat to the left and shows up beside it, so the person can keep talking while reading.

## Behaviour

- One pane for every kind of content: PDF, e-books (EPUB, MOBI), Word, Excel, PowerPoint, text, Markdown (formatted or raw view), source code (with syntax colouring and a Copy button), library notes, images, audio and video.
- Clicking another file replaces the one already open. There are no tabs.
- On a computer (window at least 1024 px wide): the pane sits to the right of the chat. Dragging the bar between them widens or narrows it (arrow keys also work, a double click restores the default width). The chosen width is remembered. The chat never goes below 340 px, the pane never below 360 px.
- The full screen button turns the pane into a layer over the whole window. Escape leaves full screen.
- On a phone, or in a window narrower than 1024 px: the reader opens full screen with an arrow back to the conversation. The phone back button closes it.
- Images: thumbnails stay in the chat, the one being viewed is outlined in gold. In the pane, the arrows and a row of thumbnails switch between the images of the same row or gallery. Swiping works on a phone.
- The pane closes when the conversation changes.
- The "Opened on the right" line appears on the file card while that file is displayed in the pane.
- Files you attach yourself open in the pane with the right preview: the type is guessed from the file name (`components/chat/typeMimePieceJointe.ts`). Before, only PDFs did; Word, Excel, Markdown, EPUB and code showed "Preview not available".

## Automatic opening

Request of 28 November 2026. When an answer ends, the first file it contains opens in the pane by itself, replacing the one already open.

- "Ends" means the generation is finished and the text has finished displaying. It only fires for an answer that just arrived live, never when an old conversation is opened, and not for an answer the person stopped.
- First file of the answer: the first one in reading order, among documents, code, library notes, images, audio and video. Images in a row open with their neighbours. Other files stay as cards.
- Computer only (two columns, window at least 1024 px wide). On a phone the pane would cover the answer that just arrived, so nothing opens by itself.
- Only files from our own storage open by themselves (generated or saved here). A file hosted on another site, or an illustration image found on the web, stays a card to click: opening it would need the server relay and sometimes a sign in.
- Setting: Settings > Preferences > "Automatic reader opening". On by default, remembered per device (`lib/lecteurLateral.ts`, `useOuvertureAuto`).

## Where the code lives

- `lib/lecteurLateral.ts`: the single source of truth (what is open, the remembered width, the two-column breakpoint). Anything that wants to open a file calls `ouvrirDansLecteur()`. It returns `false` when no pane is mounted, and the caller then keeps its old behaviour.
- `components/chat/VoletLecteur.tsx`: the pane itself (header, resizing bar, full screen, phone layer). Mounted only by `ChatSection.tsx`, the chat page.
- `components/chat/ContenuFichierApercu.tsx`: chooses the preview for a file type. Shared by the pane and by the window of cited sources (`VisionneurPositionGlobal.tsx`).
- `components/chat/ContenuImagesLecteur.tsx`: the image content (zoom, thumbnails, arrows).
- `components/chat/ContenuCode.tsx`: the source code content (same colouring as `FichierCode.tsx`).
- `components/chat/CarteFichierLecteur.tsx`: the card shared by files, code and library notes.
- `components/chat/contenuLecteurFichier.ts`: the single rule "this file opens in the pane" (used by the card and by automatic opening).
- Openers: `FichierChip.tsx` (files and generated images), `FichierCode.tsx` (code), `NoteTexteChip.tsx` (library notes), `ImageMessage.tsx`, `GalerieImagesBulle.tsx`, `BulleMessage.tsx` (attachments) and `VisionneurPositionGlobal.tsx` (the "Open here" event of cited sources).
- Automatic opening: `components/chat/premierContenuReponse.ts` (finds the first file of an answer), `components/chat/useOuvertureAutoReponse.ts` (fires at the end of the answer, plugged in `ChatIA.tsx`).

## What did not change

Where the pane is not mounted (the floating chat on other pages, the overlay window on PC), the previous behaviour stays: the unfolding block in the thread, the image window, the media window, the sources window. The files being attached in the input bar still open in their own window.

## Layers

The pane layer uses `z-[160]`, below the agent overlay layer (`lib/couchesAgent.ts`).
