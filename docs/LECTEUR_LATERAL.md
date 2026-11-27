# Reader beside the chat

[English version] · [Français](LECTEUR_LATERAL.fr.md)

Request of 27 November 2026. Like Claude, ChatGPT and Gemini, a file opened from the conversation pushes the chat to the left and shows up beside it, so the person can keep talking while reading.

## Behaviour

- One pane for every kind of content: PDF, e-books (EPUB, MOBI), Word, Excel, PowerPoint, text, Markdown (formatted or raw view), images, audio and video.
- Clicking another file replaces the one already open. There are no tabs.
- On a computer (window at least 1024 px wide): the pane sits to the right of the chat. Dragging the bar between them widens or narrows it (arrow keys also work, a double click restores the default width). The chosen width is remembered. The chat never goes below 340 px, the pane never below 360 px.
- The full screen button turns the pane into a layer over the whole window. Escape leaves full screen.
- On a phone, or in a window narrower than 1024 px: the reader opens full screen with an arrow back to the conversation. The phone back button closes it.
- Images: thumbnails stay in the chat, the one being viewed is outlined in gold. In the pane, the arrows and a row of thumbnails switch between the images of the same row or gallery. Swiping works on a phone.
- The pane closes when the conversation changes.
- The "Opened on the right" line appears on the file card while that file is displayed in the pane.

## Where the code lives

- `lib/lecteurLateral.ts`: the single source of truth (what is open, the remembered width, the two-column breakpoint). Anything that wants to open a file calls `ouvrirDansLecteur()`. It returns `false` when no pane is mounted, and the caller then keeps its old behaviour.
- `components/chat/VoletLecteur.tsx`: the pane itself (header, resizing bar, full screen, phone layer). Mounted only by `ChatSection.tsx`, the chat page.
- `components/chat/ContenuFichierApercu.tsx`: chooses the preview for a file type. Shared by the pane and by the window of cited sources (`VisionneurPositionGlobal.tsx`).
- `components/chat/ContenuImagesLecteur.tsx`: the image content (zoom, thumbnails, arrows).
- Openers: `FichierChip.tsx` (files and generated images), `ImageMessage.tsx`, `GalerieImagesBulle.tsx`, `BulleMessage.tsx` (attachments) and `VisionneurPositionGlobal.tsx` (the "Open here" event of cited sources).

## What did not change

Where the pane is not mounted (the floating chat on other pages, the overlay window on PC), the previous behaviour stays: the unfolding block in the thread, the image window, the media window, the sources window. The files being attached in the input bar still open in their own window.

## Layers

The pane layer uses `z-[160]`, below the agent overlay layer (`lib/couchesAgent.ts`).
