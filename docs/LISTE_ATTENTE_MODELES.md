# Waiting list for "Coming soon" models

**English version** · [Version française](LISTE_ATTENTE_MODELES.fr.md)

Added on 16 November 2026 at Bourama's request. A fake door measures real demand before Claude, GPT and Gemini are plugged in. In the model picker at the top of the chat, these models stay greyed out with a **lock** (the word "Coming soon" is gone since 17 November 2026), and are never selectable. The frontier models (group 1) also carry a **Max** badge in front of their name. A click on one now opens the `/abonnements` page, a real page (since 18 November 2026, it used to be a window with its own scrolling) where the person signs up for a paid waiting list. **No payment is taken**, and the form says so at the top. The backend side is described in the backend documentation (`docs/chantiers/LISTE_ATTENTE_MODELES.md`).

## What the person sees

1. They open the model picker. This is the first funnel step (`selecteur_ouvert`), written only when the picker shows at least one "Coming soon" model.
2. They click a greyed out model (`modele_grise_clique`). The picker closes and the `/abonnements?modele=...&nom=...` page opens (`formulaire_ouvert`). A visitor without an account sees it too; the account is only asked for when they join the list, through the "Account required" window. Opened by a direct address, without a model, the page sends the value `page_abonnements` as the model.
3. The page shows a skeleton while it loads, then: an intro, the "no payment" notice, the three plans as side by side cards (big price, monthly credit, then the plan's points), the profile (student, administration or developer), an optional country and WhatsApp number, a consent tick and a sentence about data use.
4. "Join the list" stays disabled until a plan, a profile and the consent tick are all set.
5. There is ONE waiting list per person (decision of 17 November 2026), not one per model. If the person is already on it, whichever model they clicked, the form says so with the plan name (Pro, Max or Ultra) and offers "Change my choice" or "Unsubscribe". Unsubscribing also erases the WhatsApp number.

The page scrolls like any page, with a "Back" button at the top that returns to the chat. On a computer the three plan cards sit in a row; on a phone they stack, and every card shows its points. The bottom bar stays stuck to the bottom of the screen with the chosen price and the "Join the list" button.

## Where things live

| File | Role |
| --- | --- |
| `app/(app)/abonnements/page.tsx` | The `/abonnements` route. |
| `components/abonnements/PageAbonnements.tsx` | The page, with its loading, already registered, thank you and unsubscribed states. |
| `components/chat/CartePalierListeAttente.tsx` | One plan card: price, credit, points and an optional badge. |
| `components/chat/SelecteurModeleHaut.tsx` | The picker: a greyed out model now opens the plans page, and the first funnel steps are noted here. |
| `lib/listeAttente.ts` | Backend calls, funnel steps, the source (web, android, ios, pc) and the country list. |
| `lib/erreurs.ts` | The `LISTE_ATTENTE_*` error codes, in French and English. |

## Nothing is hard coded

- Plans (price and monthly credit) come from the backend, from the `paliers_liste_attente` table.
- Every text of the form comes from the backend, from `textes_modeles_llm` (keys starting with `attente_`), in French and English. If a key is missing in the chosen language, the French text is used; a raw key is never shown. Each plan's points come from `attente_palier_<price>_points` (separated by `|`; a point starting with `~` is a capability the plan does not have and shows a greyed cross instead of a tick; all three plans list the same eight capabilities in the same order, taken from Bourama's plan table of 16 Nov 2026); without them the plan sentence `attente_palier_<price>` is shown. An optional badge on a plan comes from `attente_palier_<price>_badge`: no text, no badge.
- Country names come from the browser (`Intl.DisplayNames`) in the interface language, so none is translated by hand. Only the ISO codes of the proposed countries are in `lib/listeAttente.ts`.

## Funnel steps are never blocking

`noterEtapeListeAttente` ignores any error, including a missing account. A failed note never slows or interrupts the person. The last step, `inscription_validee`, is written by the backend when the sign up succeeds; the client cannot send it.

## Lock and Max badge

`SelecteurModeleHaut.tsx` shows a lock icon on every locked model. Its tooltip and accessible name come from the backend (`libelles_bientot`, the text under the key `bientot`, now "Available with a plan"). The badge in front of the name comes from `libelles_badge` (text `badge_groupe_1`, "Max"), sent only for group 1 models. Both texts live in Supabase in French and English.

## Known limits

- A visitor without an account sees the page, but not a registration (they have none); their funnel steps are not noted. To join the list, they must sign in.
- The Thonny plugin panel has its own model button, which still shows locked models as disabled. It does not open the page.
- The Android app has no deep link for `/abonnements` in its manifest yet: the page opens fine from the picker, not from an external link.
- Not yet checked on a real device: phone browser, installed Android and iOS apps, installed PC app. The checks to do are listed in the staging test list of the branch description.
