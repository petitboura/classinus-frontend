# Sidebar: history in the sidebar, chat pushed to the right

[English version] · [Français](BARRE_LATERALE_HISTORIQUE.fr.md)

Request of 27 November 2026.

## What the user sees (desktop, chat page)

- **The conversation history is shown directly in the sidebar**, under the navigation icons (Dashboard, Desk, Library...), instead of a floating window opened from an "History" button. The icons stay at the top and always visible; the list takes all the remaining space in the middle and scrolls on its own; Subscribe, More and the profile stay at the bottom. The list keeps pinned conversations, rename, delete and loading the next conversations while scrolling. A small button next to the "History" title opens the full screen history.
- **The open sidebar pushes the chat to the right.** The sidebar opens on hover, as before, but it no longer covers the chat: the chat narrows by the same width, with a smooth transition.
- **A narrow icon rail stays visible when the sidebar is closed.** In the history area only the history icon remains.
- **The sidebar stays open while a conversation is being edited** (three dots menu open, rename field, delete confirmation), even if the mouse leaves it. It folds back once the edit ends and the mouse is away.

On a very short screen the list keeps a minimum height and the whole sidebar scrolls: nothing overlaps.

## What does not change

- Mobile keeps its drawer over the chat, with the "History" button and its floating list.
- Pages other than the chat keep the previous behavior: the open sidebar is drawn over the page, which does not move.

## Where it lives

- `components/AppSidebar.tsx`: the box `data-rail-lateral` reserves the width of the sidebar. In the chat (`contexteChat`) it follows the open or closed state of the sidebar, which is what pushes the chat. The floating live-channel button follows it automatically (`lib/useDecalageRailLateral.ts`).
- `components/chat/ListeHistorique.tsx`: the `onOccupe` property tells the sidebar when a line is being edited.

## Known trade-off

Because the sidebar opens on hover and pushes the chat, the chat width changes each time the mouse enters or leaves the sidebar. This was the explicit choice of Bourama (27 November 2026).
