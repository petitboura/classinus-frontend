# Sidebar: history in the sidebar, chat pushed to the right

[English version] · [Français](BARRE_LATERALE_HISTORIQUE.fr.md)

Request of 27 November 2026.

## What the user sees (desktop, chat page)

- **The conversation history is shown directly in the sidebar**, under the navigation icons (Dashboard, Desk, Library...), instead of a floating window opened from an "History" button. The icons stay at the top and always visible; the list takes all the remaining space in the middle and scrolls on its own; Subscribe, More and the profile stay at the bottom. The list keeps pinned conversations, rename, delete and loading the next conversations while scrolling. A small button next to the "History" title opens the full screen history.
- **The open sidebar pushes the chat to the right.** The sidebar opens on hover, as before, but it no longer covers the chat: the chat narrows by the same width, with a smooth transition.
- **A narrow icon rail stays visible when the sidebar is closed.** There is no "History" button: hovering opens the sidebar and the list appears.
- **The top and bottom of the list fade out** while there are more conversations on that side; each fade disappears at the very end.
- **Hovering a conversation** (mouse) shows a bubble with its full name and, underneath, the full date with weekday and time.
- **A conversation from today** shows the elapsed time ("just now", "12 min ago", "3 h ago") instead of a date, on the line and in the bubble; it refreshes every minute.
- **The sidebar stays open while a conversation is being edited** (three dots menu open, rename field, delete confirmation), even if the mouse leaves it. It folds back once the edit ends and the mouse is away.

On a very short screen the list keeps a minimum height and the whole sidebar scrolls: nothing overlaps.

## On phones

- **The conversation list is shown directly in the menu**, below the sections, with no "History" button. It takes the remaining space, scrolls on its own and fades at the top and bottom; More and the profile stay at the bottom.
- **A long press on a conversation** shows the bubble (full name and date) above the line; it closes when you touch elsewhere or scroll. A short tap opens the conversation.
- **The menu closes as soon as a conversation is chosen**, from its list or from the full screen history. Tapping the conversation already open closes it too. (Request of 28 November 2026.)
- **A swipe to the right opens the menu**, from anywhere on the chat screen, in addition to the button. (Request of 28 November 2026.)

The swipe does nothing when another gesture comes first: a code block, a table or a row of images already moved to the right (once back at the start, the next swipe opens the menu), a slider, a field being typed in, selected text, a small menu of the input bar or a window open over the chat, a page zoomed with two fingers. Interactive widgets keep their own gestures.

## What does not change

- On phones, the menu is still a drawer drawn over the chat.
- Pages other than the chat keep the previous behavior: the open sidebar is drawn over the page, which does not move.

## Where it lives

- `components/AppSidebar.tsx`: the box `data-rail-lateral` reserves the width of the sidebar. In the chat (`contexteChat`) it follows the open or closed state of the sidebar, which is what pushes the chat. The floating live-channel button follows it automatically (`lib/useDecalageRailLateral.ts`).
- `components/chat/ListeHistorique.tsx`: the `onOccupe` property tells the sidebar when a line is being edited; the `fondu` property enables the top and bottom fades (`dj-fondu-vertical` style in `app/globals.css`).
- `components/chat/BulleFil.tsx`: the hover bubble of a conversation.
- `lib/datesHistorique.ts`: line and bubble dates, in French and English.
- `lib/useGlissementOuvreMenu.ts`: the swipe that opens the menu. It listens to the area marked `data-zone-glissement-menu` (`components/chat/ChatSection.tsx`). A small menu laid over the chat carries `data-sans-glissement` to suspend the gesture.
- The `onChoisirActive` property of `ListeHistorique` and `HistoriquePleinEcran` closes the menu when the conversation already open is tapped.

## Known trade-off

Because the sidebar opens on hover and pushes the chat, the chat width changes each time the mouse enters or leaves the sidebar. This was the explicit choice of Bourama (27 November 2026).
