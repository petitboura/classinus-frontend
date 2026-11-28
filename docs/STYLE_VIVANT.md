# The lively style for waiting and reasoning

**English version** · [Version française](STYLE_VIVANT.fr.md)

Style chosen on 27 November 2026. This sheet keeps it as information, to understand it or reuse it elsewhere.

## The idea

While Classinus is working, the screen should feel alive. The movement never follows a regular rhythm, the same shape never appears twice in a row, and everything settles down once the work is done.

## The ingredients

| Ingredient | What you see | Setting |
| --- | --- | --- |
| Irregular rhythm | A change that is sometimes fast, sometimes slow | At random: 1 s, 1.4 s, 1.9 s, 2.6 s or 3.5 s |
| No repetition | The new pick always differs from the previous one | Texts, styles and icons |
| Highlight | A light travels from letter to letter | 2.2 s cycle, 60 ms offset per letter |
| Three dots | They bounce in turn after the text | 1.3 s cycle, 4 px jump, 150 ms offset |

## The texts

Very short phrases, in the first person or figurative, with no name at all.

| French | English |
| --- | --- |
| Je réfléchis | Thinking it through |
| Ça mijote | Gently simmering |
| Les idées arrivent | Ideas coming in |
| Je creuse | Digging deeper |
| Un petit instant | Just a moment |
| Petite étincelle | A little spark |
| Les neurones chauffent | Neurons warming up |
| Je fais le lien | Connecting the dots |
| Je rassemble tout | Pulling it together |
| Mise en ordre | Sorting it out |
| Ça prend forme | Taking shape |
| Je peaufine | Polishing it up |

## The three ways to change text

Each change picks one at random, different from the previous one.

| Style | New text | Old text |
| --- | --- | --- |
| Wheel | The whole line rises from below in 0.38 s | It slides up while fading, 0.38 s |
| Letters | Letters appear one by one, every 38 ms | It disappears at once |
| Wave | After 120 ms, letters rise one by one, every 25 ms, with a small bounce | Its letters fly off one by one, every 18 ms |

## The reasoning icons

While reasoning is in progress, the icon changes at the same irregular rhythm, with a short fade. The first one is picked at random too.

| Icon | Name in the Lucide library | Movement |
| --- | --- | --- |
| Sparkle | `Sparkle` | Grows and turns, 1.8 s |
| Light bulb | `Lightbulb` | Glows and dims, 1.6 s |
| Atom | `Atom` | Spins, 4 s per turn |
| Orbit | `Orbit` | Spins, 4 s per turn |
| Connected points | `Waypoints` | Spins, 4 s per turn |
| Feather | `Feather` | Sways as if writing, 1.1 s |
| Three dots | Custom drawing | Bounce in turn |

Once reasoning is finished, the light bulb always remains, still.

## Reading comfort

- If the person asked their device to reduce motion, movements stop. The waiting text changes with a simple fade and the icons change without moving.
- For the waiting message, a screen reader hears a single announcement.

## Where it is used today

- [Chat waiting message](MESSAGE_ATTENTE.md): texts, a single animation and dots.
- [Tool line](LIGNE_OUTILS_ROUE.md): the reasoning icons.

The settings live in `lib/messageAttente.ts`, `components/IndicateurReflexion.tsx`, `components/chat/IconeReflexion.tsx` and `tailwind.config.ts`. If one of them changes, this sheet changes with it.
