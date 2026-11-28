# Chat docked on the right of the pages

[English version] · [Français](CHAT_LATERAL.fr.md)

Request of 28 November 2026. On the pages of the app, the chat no longer floats over the content: it docks on the right, pushes the page, and can be widened or narrowed by dragging its bar.

## Behaviour

- Where it docks: every page of the app except the chat page itself (which has its own interface) and the Settings pages. On a phone, and in a window narrower than 768 px, the chat keeps its previous floating window.
- Opening and closing: the column slides in from the right (the width goes from 0 to the chosen width) and back out on close. The page shrinks accordingly.
- The chat only closes with its Close button. Navigating never closes it: when you are on the full screen chat page and click a section or a sub-section (sidebar or command palette), the chat docks on the right with the same conversation and the section opens on the left. The chat starts at the full width of the window and shrinks to the right while the page opens. Going to Settings opens the chat as the floating window there. On a phone or in a narrow window, navigation is unchanged.
- Header: same height and same bottom line as the page header (`components/EnTeteApp.tsx`), so the two lines continue each other. The docked header has no logo and no name: on the left the title of the active conversation (taken from the history), always on a single line and cut with an ellipsis when it is long, empty for a new conversation; on the right the action buttons.
- Full screen: the button at the top of the docked chat (left arrow icon) stretches the chat to the left over the whole window, pushing the page out, then opens the full screen chat page. While it stretches, the chat content follows the column width (it is the only time besides the arrival animation that the content reflows during an animation). The chat stays open in the app state, so clicking a section from the full screen chat docks it again.
- Resizing: drag the bar on the left edge of the chat. The arrow keys also work, and a double click restores the default width (420 px). The chat is never narrower than 340 px, and the page never narrower than 360 px.
- Remembered per account: the width is saved on the profile (column `volet_chat_largeur` of `profiles`), so it is the same on every device. It is also kept on the device so it shows instantly before the profile answers.
- The controls fixed on the right of the screen (notification bell, timers, Discover button, library buttons, agent action log button) move left by the width of the chat, so they never end up underneath it.
- Chat welcome title ("Staying up late?" and the like): it is typed letter by letter only once, when the page opens or when the chat opens after being closed. Docking the chat, stretching it to full screen, changing page or starting a new conversation shows it at once without replaying it (`lib/revelationTitreAccueil.ts`).
- Sidebar: same behaviour on every page, including the full screen chat, because the chat is everywhere. No more floating windows for sections: a section, a sub-section, Connect Claude, Thonny or a shortcut on the empty chat screen opens the real page (from the full screen chat, the chat docks on the right). Only the conversation history (and the New conversation button) shows on the full screen chat alone, since the docked chat has its own in its header. The expanded rail slides over the page everywhere, it no longer pushes the page in the chat.
- The browser back button does not close a docked chat: it is a column of the page, not a window. On the full screen chat page the chat shows no popup, so back simply navigates.
- Going from a page to Settings (or shrinking the window) switches to the floating window without losing the conversation: the chat is never unmounted, only its classes change.

## Where the code lives

- `lib/chatLateral.ts`: the rules (which pages, which screens, widths, durations, the CSS variable and the device memory of the width).
- `lib/useChatLateral.ts`: the hook (width, dragging, keyboard, opening and closing animation, stretching to full screen, arrival from the full screen chat, clamping when the window shrinks, publishing the width in `--dj-chat-lateral` on `<html>`).
- `lib/useGarderLeChatOuvert.ts`: called just before navigating from the full screen chat (sidebar `components/AppSidebar.tsx`, command palette `components/PaletteCommandes.tsx`). Opens the chat and marks the arrival so the docked chat starts at full width.
- `components/chat/CadreChatLateral.tsx`: the wrapper and the drag bar. Docked, it is the column; floating, it has no box (`display: contents`).
- `components/chat/ChatFlottant.tsx`: decides `docke` (open, large screen, page accepted) and switches the chat panel between the column and the floating window.
- `app/globals.css`: `.dj-decale-chat`, the transition of the shifted controls (none while the bar is dragged).
- Backend: `api/profiles.py` (`volet_chat_largeur` in the profile and in the update payload) and `migrations/2026_11_28_profiles_volet_chat_largeur.sql`.

## Adding a control fixed on the right

Use `right-[calc(<distance>+var(--dj-chat-lateral,0px))]` and the `dj-decale-chat` class, so the control follows the chat instead of sliding under it.

## Layers

The docked chat is part of the page layout (no z-index). The drag veil uses `z-[160]`, below the agent overlay layer (`lib/couchesAgent.ts`).
