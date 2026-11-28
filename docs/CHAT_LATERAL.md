# Chat docked on the right of the pages

[English version] · [Français](CHAT_LATERAL.fr.md)

Request of 28 November 2026. On the pages of the app, the chat no longer floats over the content: it docks on the right, pushes the page, and can be widened or narrowed by dragging its bar.

## Behaviour

- Where it docks: every page of the app except the chat page itself (which has its own interface) and the Settings pages. On a phone, and in a window narrower than 768 px, the chat keeps its previous floating window.
- Opening and closing: the column slides in from the right (the width goes from 0 to the chosen width) and back out on close. The page shrinks accordingly.
- Resizing: drag the bar on the left edge of the chat. The arrow keys also work, and a double click restores the default width (420 px). The chat is never narrower than 340 px, and the page never narrower than 360 px.
- Remembered per account: the width is saved on the profile (column `volet_chat_largeur` of `profiles`), so it is the same on every device. It is also kept on the device so it shows instantly before the profile answers.
- The controls fixed on the right of the screen (notification bell, timers, Discover button, library buttons, agent action log button) move left by the width of the chat, so they never end up underneath it.
- The browser back button does not close a docked chat: it is a column of the page, not a window.
- Going from a page to Settings (or shrinking the window) switches to the floating window without losing the conversation: the chat is never unmounted, only its classes change.

## Where the code lives

- `lib/chatLateral.ts`: the rules (which pages, which screens, widths, durations, the CSS variable and the device memory of the width).
- `lib/useChatLateral.ts`: the hook (width, dragging, keyboard, opening and closing animation, clamping when the window shrinks, publishing the width in `--dj-chat-lateral` on `<html>`).
- `components/chat/CadreChatLateral.tsx`: the wrapper and the drag bar. Docked, it is the column; floating, it has no box (`display: contents`).
- `components/chat/ChatFlottant.tsx`: decides `docke` (open, large screen, page accepted) and switches the chat panel between the column and the floating window.
- `app/globals.css`: `.dj-decale-chat`, the transition of the shifted controls (none while the bar is dragged).
- Backend: `api/profiles.py` (`volet_chat_largeur` in the profile and in the update payload) and `migrations/2026_11_28_profiles_volet_chat_largeur.sql`.

## Adding a control fixed on the right

Use `right-[calc(<distance>+var(--dj-chat-lateral,0px))]` and the `dj-decale-chat` class, so the control follows the chat instead of sliding under it.

## Layers

The docked chat is part of the page layout (no z-index). The drag veil uses `z-[160]`, below the agent overlay layer (`lib/couchesAgent.ts`).
