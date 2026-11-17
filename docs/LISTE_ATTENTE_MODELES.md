# Waiting list for "Coming soon" models

**English version** · [Version française](LISTE_ATTENTE_MODELES.fr.md)

Added on 16 November 2026 at Bourama's request. A fake door measures real demand before Claude, GPT and Gemini are plugged in. In the model picker at the top of the chat, these models stay greyed out with the "Coming soon" label, and are never selectable. A click on one now opens a sign up form for a paid waiting list. **No payment is taken**, and the form says so at the top. The backend side is described in the backend documentation (`docs/chantiers/LISTE_ATTENTE_MODELES.md`).

## What the person sees

1. They open the model picker. This is the first funnel step (`selecteur_ouvert`), written only when the picker shows at least one "Coming soon" model.
2. They click a greyed out model (`modele_grise_clique`). The picker closes and the form opens (`formulaire_ouvert`).
3. The form shows a skeleton while it loads, then: an intro, the "no payment" notice, the three plans as side by side cards (big price, monthly credit, then the plan's points), the profile (student, administration or developer), an optional country and WhatsApp number, a consent tick and a sentence about data use.
4. "Join the list" stays disabled until a plan, a profile and the consent tick are all set.
5. If the person is already on the list for this model, the form says so and offers "Change my choice" or "Unsubscribe". Unsubscribing also erases the WhatsApp number.

The form opens in a bottom sheet on a phone and a centred window on a computer (the shared `CadrePanneau` frame, also used by the Connexions screen), with animated opening and closing. On a computer the three plan cards sit in a row; on a phone they stack, and only the chosen card unfolds its points. The footer stays fixed at the bottom with the chosen price and the "Join the list" button.

## Where things live

| File | Role |
| --- | --- |
| `components/chat/FormulaireListeAttente.tsx` | The form, with its loading, already registered, thank you and unsubscribed states. |
| `components/chat/CartePalierListeAttente.tsx` | One plan card: price, credit, points and an optional badge. |
| `components/chat/SelecteurModeleHaut.tsx` | The picker: a greyed out model now opens the form, and the first funnel steps are noted here. |
| `lib/listeAttente.ts` | Backend calls, funnel steps, the source (web, android, ios, pc) and the country list. |
| `lib/erreurs.ts` | The `LISTE_ATTENTE_*` error codes, in French and English. |

## Nothing is hard coded

- Plans (price and monthly credit) come from the backend, from the `paliers_liste_attente` table.
- Every text of the form comes from the backend, from `textes_modeles_llm` (keys starting with `attente_`), in French and English. If a key is missing in the chosen language, the French text is used; a raw key is never shown. Each plan's points come from `attente_palier_<price>_points` (separated by `|`; a point starting with `~` is a capability the plan does not have and shows a greyed cross instead of a tick; all three plans list the same eight capabilities in the same order, taken from Bourama's plan table of 16 Nov 2026); without them the plan sentence `attente_palier_<price>` is shown. An optional badge on a plan comes from `attente_palier_<price>_badge`: no text, no badge.
- Country names come from the browser (`Intl.DisplayNames`) in the interface language, so none is translated by hand. Only the ISO codes of the proposed countries are in `lib/listeAttente.ts`.

## Funnel steps are never blocking

`noterEtapeListeAttente` ignores any error, including a missing account. A failed note never slows or interrupts the person. The last step, `inscription_validee`, is written by the backend when the sign up succeeds; the client cannot send it.

## Known limits

- The form needs a signed in account. A visitor without an account gets the usual sign in message from the API layer.
- The Thonny plugin panel has its own model button, which still shows "Coming soon" models as disabled. It does not open the form.
- Not yet checked on a real device: phone browser, installed Android and iOS apps, installed PC app. The checks to do are listed in the staging test list of the branch description.
