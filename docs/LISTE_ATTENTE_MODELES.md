# Waiting list for "Coming soon" models

**English version** · [Version française](LISTE_ATTENTE_MODELES.fr.md)

Added on 16 November 2026 at Bourama's request. A fake door measures real demand before Claude, GPT and Gemini are plugged in. In the model picker at the top of the chat, these models stay greyed out with a **lock** (the word "Coming soon" is gone since 17 November 2026), and are never selectable. The frontier models (group 1) carry a **Max** badge in place of the lock, on the same greyed row. A click on one now opens the `/abonnements` page, a real page (since 18 November 2026, it used to be a window with its own scrolling) which, since 19 November 2026, is a payment page: each plan card has a **Pay** button. The waiting list form, the "no payment" note and the sign-up states are gone from this page (the tables, the routes and the code in `lib/listeAttente.ts` are untouched). The Pay button is not yet connected to a payment service: it does nothing for now. The backend side is described in the backend documentation (`docs/chantiers/LISTE_ATTENTE_MODELES.md`).

## What the person sees

1. They open the model picker. This is the first funnel step (`selecteur_ouvert`), written only when the picker shows at least one "Coming soon" model.
2. They click a greyed out model (`modele_grise_clique`). The picker closes and the `/abonnements?modele=...&nom=...` page opens (`formulaire_ouvert`). A visitor without an account sees it too; the account is only asked for when they join the list, through the "Account required" window. Opened by a direct address, without a model, the page sends the value `page_abonnements` as the model.
3. The page shows a skeleton while it loads, then, under a single title (no intro and no section titles, since 19 November 2026): the three plans as side by side cards, laid out like Claude's pricing page (name, short phrase, big price, a "Pay" button, then the list of what is included; the amount of credit given with each plan is not shown, since 19 November 2026), then a comparison table of the plans (component `TableauComparaison.tsx`, like Claude's: one column per plan, one row per feature, two sections, Features and Models and credit; a tick means included, "No", a short value such as "Unlimited", or "Coming soon").
4. The model in the address (`modele`, `nom`) is no longer read by the page, and the page no longer records the `formulaire_ouvert` step.
5. The new texts (key `attente_abo_titre` and `attente_abo_payer`, French and English, in `textes_modeles_llm`) come from the server. They keep the `attente_` prefix because it is the one the backend returns.

The page scrolls like any page, with a "Back" button at the top that returns to the chat. On a computer the three plan cards sit in a row; on a phone they stack, and each card keeps the same content. The card button is the Pay button of that plan. From the second plan, the list starts with "Everything in <previous plan>, plus:" and only shows what is added. These texts are the keys `attente_palier_<price>_accroche`, `_inclus_titre` and `_inclus`. There is no bar stuck to the bottom (removed on 19 November 2026).

## Where things live

| File | Role |
| --- | --- |
| `app/(app)/abonnements/page.tsx` | The `/abonnements` route. |
| `components/abonnements/PageAbonnements.tsx` | The payment page: plan cards with their Pay button and the comparison table, with its loading state. |
| `components/abonnements/SqueletteAbonnements.tsx` | The loading skeleton, block by block like the real page: the three cards (name, phrase, price, button, check list) and the table (title rows, 16 + 7 rows with check, clock and text cells), with the same containers and line heights so nothing jumps when the content arrives. If the real content changes a lot, adjust the widths and row counts in this file. |
| `components/chat/CartePalierListeAttente.tsx` | One plan card: name, phrase, price, Pay button, included list and an optional badge. |
| `components/chat/SelecteurModeleHaut.tsx` | The picker: a greyed out model now opens the plans page, and the first funnel steps are noted here. |
| `components/abonnements/ChampTelephone.tsx` | The phone number field of the last payment step: a country picker (flag and dial code) on the left, the number on the right. Picking a country puts its dial code in the number; typing a dial code (+221...) shows the country by itself. No native `<select>`: the list opens with `FlottantAncre`. |
| `lib/paysTelephone.ts` | The proposed countries and their dial codes (the 54 African countries, plus France, Belgium, Switzerland, the United States, Canada, the United Kingdom, Germany, Spain and Italy), and the small functions that read a typed number. |
| `lib/listeAttente.ts` | Backend calls, funnel steps, the source (web, android, ios, pc) and the country name helper. |
| `lib/erreurs.ts` | The `LISTE_ATTENTE_*` error codes, in French and English. |

## Nothing is hard coded

- Plans (price and monthly credit) come from the backend, from the `paliers_liste_attente` table. Only the price is shown on the page; the credit amount stays in the data but is never displayed.
- Every text of the form comes from the backend, from `textes_modeles_llm` (keys starting with `attente_`), in French and English. If a key is missing in the chosen language, the French text is used; a raw key is never shown. The comparison table comes from `attente_comp_ordre`'s sections: `attente_comp_<id>_titre` and `attente_comp_<id>_lignes`, one row per `|`, written `label#value plan 1#value plan 2#value plan 3` (a value is `oui`, `non`, `bientot` or a short text). A label with a list in brackets, such as the model names, is shown as the text with the list below it, items separated by a thin vertical line. The old keys `attente_cap_*` and `attente_palier_<price>_points` are no longer read. An optional badge on a plan comes from `attente_palier_<price>_badge`: no text, no badge.
- Country names come from the browser (`Intl.DisplayNames`) in the interface language, so none is translated by hand. Only the ISO codes and dial codes of the proposed countries are in `lib/paysTelephone.ts`. The server keeps the country code and the full number (dial code included, for example `+221 771234567`) as they arrive and does not check them against a list. Flags are drawn from the country code with emoji: Windows does not draw emoji flags (two letters show instead), so a flag image package would be needed to see them there.

## Funnel steps are never blocking

`noterEtapeListeAttente` ignores any error, including a missing account. A failed note never slows or interrupts the person. The last step, `inscription_validee`, is written by the backend when the sign up succeeds; the client cannot send it.

## Lock and Max badge

`SelecteurModeleHaut.tsx` shows a lock icon on every locked model, except group 1 models where the Max badge takes its place. The tooltip and accessible name come from the backend (`libelles_bientot`, the text under the key `bientot`, now "Available with a plan"). That badge, on the right in place of the lock, comes from `libelles_badge` (text `badge_groupe_1`, "Max"), sent only for group 1 models. Both texts live in Supabase in French and English.

## Known limits

- A visitor without an account sees the page, but not a registration (they have none); their funnel steps are not noted. To join the list, they must sign in.
- The Thonny plugin panel has its own model button, which still shows locked models as disabled. It does not open the page.
- The Android app has no deep link for `/abonnements` in its manifest yet: the page opens fine from the picker, not from an external link.
- Not yet checked on a real device: phone browser, installed Android and iOS apps, installed PC app. The checks to do are listed in the staging test list of the branch description.
