# Chat waiting message

**English version** · [Version française](MESSAGE_ATTENTE.fr.md)

Requested on 27 November 2026.

## What the user sees

- Between sending a question and the first sign of an answer (tool, reasoning or text), a short message is shown. It contains no agent name.
- The text changes at random among twelve, never showing the same one twice in a row. It stays between 1 and 3.5 seconds.
- Each change picks at random a style different from the previous one: the wheel, letters one by one, or the wave.
- Three dots bounce after the text and a highlight travels across the letters.
- If the person asked their device to reduce motion, movements are replaced by a simple fade.
- A screen reader hears a single announcement.

## Code

- `lib/messageAttente.ts`: texts, styles, durations and random pick.
- `components/IndicateurReflexion.tsx`: display.
- `tailwind.config.ts`: animations.
- `lib/i18n/interface.ts`: English for the texts. Every new text needs its English version there.
