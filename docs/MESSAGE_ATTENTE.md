# Chat waiting message

**English version** · [Version française](MESSAGE_ATTENTE.fr.md)

Requested on 27 November 2026.

## What the user sees

- Between sending a question and the first sign of an answer (tool, reasoning or text), a short message is shown. It contains no agent name.
- The text changes among twelve: all of them show, in a shuffled order, before any one comes back (even from one message to the next). Each one stays between 2 and 5 seconds, picked at random (`DUREE_ATTENTE_MIN_MS` and `DUREE_ATTENTE_MAX_MS` settings).
- A single animation, the same as the tools wheel: the new line rises 5 px while appearing, the old one rises 5 px while fading out.
- Three dots always bounce after the text.
- If the person asked their device to reduce motion, movements are replaced by a simple fade.
- A screen reader hears a single announcement.

## Code

- `lib/messageAttente.ts`: texts, duration and shuffle.
- `components/IndicateurReflexion.tsx`: display.
- `tailwind.config.ts`: animations (`dj-roue-fondu-entree` and `dj-roue-fondu-sortie`, shared with the tools wheel).
- `lib/i18n/interface.ts`: English for the texts. Every new text needs its English version there.
