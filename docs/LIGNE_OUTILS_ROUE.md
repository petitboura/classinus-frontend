# Tool line: the wheel, AI notes and reasoning

[English version] · [Français](LIGNE_OUTILS_ROUE.fr.md)

Request of 25 November 2026. The backend part (the `commenter` tool and the `commentaire` event) is described in the backend repository, `docs/chantiers/LIGNE_OUTILS_COMMENTAIRE.md`.

## What the user sees

- **One line, collapsed by default.** When two or more lines exist (tools or notes), the tool activity is a single line. While the AI works, each new line replaces the previous one like a wheel turning upward: the new line comes up from the bottom, the old one slides up and fades.
- **No minimum display time for a tool.** Tools called at the same time replace each other fast (about 170 ms apart). A note from the AI stays longer, according to its length (1.4 s to 4.5 s), so it can be read.
- **One line of text.** The text is cut with an ellipsis when it is too long (mostly on mobile) instead of wrapping. The unfolded list still wraps.
- **Notes.** A note from the AI is its own line with a dot icon instead of a tool icon. It does not break a group and is never counted as a tool.
- **Until the answer is finished** (tool running, reasoning, text or pending confirmation), the last line stays on screen until the next one replaces it. The wheel never goes back over a line already shown (26 November 2026).
- **When the work is done.** The wheel becomes "N tools used", collapsed, as before. A click unfolds the full list, tools and notes in order. The shimmer on a line shows that its tool is still running; there is no "running" or "done" counter.
- **Reasoning (26 November 2026).** Each phase of the model's reasoning is its own line of the wheel, in its real place between tools and notes, with a brain icon. There is no single reasoning block at the top any more. The title is a word of the reasoning family, a colon, then the first sentence of what the model thinks: "Reasoning: Let me read the config file first." (French: "Réflexion : ..."). The word changes from one reasoning to the next (French: Réflexion, Raisonnement, Analyse, Pensée; English: Reasoning, Thinking, Analysis, Reflection), chosen from the reasoning's number in the message so it never flickers while the text is typed. If the text starts with a bold heading written by the model, that heading is the title. The title shimmers while the model is still thinking. A reasoning is never counted as a tool. In the unfolded list, a click on the line shows the raw reasoning text.
- **A single tool without a note** keeps the simple display.

## Code

- `components/chat/OutilResultatBulle.tsx`: builds the ordered list (tool lines merged when the same tool repeats, notes between), decides between wheel, summary and simple display.
- `components/chat/RoueOutils.tsx`: the wheel (timers, animations `dj-roue-entree` and `dj-roue-sortie` in `tailwind.config.ts`).
- `components/chat/LigneCommentaire.tsx`: the note line in the unfolded list.
- `components/chat/ChatIA.tsx`: receives the `commentaire` event through the same queue as tools, so the text being typed finishes first, and stores a `commentaire` segment.
- `components/chat/BulleMessage.tsx`: `commentaire` segment type and grouping of a run of tools, notes and reasoning phases.
- `components/chat/LigneReflexion.tsx`: the reasoning line in the unfolded list (title, click to read the raw text).
- `lib/titreReflexion.ts`: builds the title (word, then first sentence, cleaned of formatting and long dashes, 160 characters at most).
- `components/chat/RaisonnementBulle.tsx`: the former single block, now only for old messages saved without segments.
- `lib/i18n/interface.ts`: English for "N outil(s) utilisé(s)". Notes are written by the AI in the conversation language and are never translated. The reasoning title word follows the interface language; the sentence after it is the model's own text.
