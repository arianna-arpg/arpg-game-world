# Dialogue redesign · 19 October 2026

Status: panel parity correction verified on `codex/dialogue-panel-parity`, based on
main `645fe6ca`. The canonical seamless checkout was inspected at `ac9dedab`.
P08/P09 remain unapproved for wholesale promotion. Nothing here changes the
once-per-account tutorial or physical class selection in Mu.

## Player direction

The player reports overlapping vendor and Skills tabs, different results when
arriving with remembered pages versus an already open bag, inventory resizing
at vendors, and Mireille failing to speak when Inventory is already open.
They require one consistent panel rule that works at small resolutions.
The latest clarification supersedes the earlier brief-greeting proposal:
ordinary encounters also open the conversation panel. This is the only surface
for dialogue; there are no overhead greeting lines or separate Talk button.
Dwelling near Mireille opens her panel with content and all available options
derived from the dwelling player's quest state. Brandt must expose shopping
immediately, while his dialogue and quest options remain independently usable
within the same NPC interface.

## Reproduced baseline failures and replacement rule

- Main's dialogue admission rejects an open bag unless a station panel is open.
  Seamless also permits an already established conversation, so arriving with
  Inventory open still prevents Mireille from starting one.
- Folio groups by position only at initial admission. A service opening the
  bag can restore a Skills page before the service has its final position;
  separately admitted books can subsequently overlap without regrouping.
- Services reserve a reading band and shrink Inventory, while an ordinary
  inventory visit uses a different height limit. The bigger seamless activity
  panel adds another height calculation.

Replacement contract: one selected secondary panel for each player, with
services and all Inventory pages sharing that selection. An arriving service
takes priority over remembered pages; explicit page selection still works.
Inventory remains its companion where space permits. Compact layouts expose
one usable surface at a time through visible tabs. Opening order must not
change the result. A local Inventory page cannot prevent NPC speech from
starting; pause and genuine modal decisions still suspend it.

The first implementation fixes this lifecycle/layout foundation. All local
Inventory pages and station tabs join the same book without relying on initial
overlap. The bag uses the same bounds before, during and after a station visit.
Pages still follow a manually moved bag. The existing large reading strip
remains in this first correction (`b979655f`).

## Reviewable interaction

The next interface is illustrated by an interactive conversation mockup in this
chat, with example content rather than a gameplay implementation:

- One NPC frame, with name and portrait. Brandt defaults to Shop on dwell;
  Conversation remains adjacent with its available-topic count. Shopping never
  requires choosing a response, finishing a line, or opening another menu.
- Mireille defaults to the conversation view and shows all applicable topics
  together. Selecting one displays its dialogue and explicit actions inside
  that same frame. Quest eligibility and mutations remain engine-owned.
- A new quest/reward changes the topic list without stealing the selected shop.
  The shop and quest activity have independent state inside one visit.
- The NPC frame shares the selected-panel slot with Skills, Passives and
  Reliquary. Inventory is a stable companion on roomy layouts and another
  selectable surface on small layouts. No second dialogue overlay competes
  with that slot. Switching panels preserves the selected NPC activity.

No new Talk control or overhead speech is proposed. This design does not adopt
seamless's larger stacked conversation workspace or persistent approach/lesson
text. Its existing quest actions are a reference for selective reuse, not
approval to change progression or import the whole branch.

## Verification and delivery

Passed: `npm run check`, Folio, speech and speech-grammar probes, simulation
smoke, and production build. The existing dialogue/services client check passes
buying, service selection, independent dismissal, pause/resume, controller use,
custom positions and departure. Inventory pages and tabs client checks pass,
including native pointer/key controls, remembered selection, moved bag and
separate player ownership.

The extended dialogue/services matrix passes 18 vendor cases (Skills, Passives,
Reliquary × remembered/already-open arrival × 1400×1000, 820×650, 820×650 at
175%) plus three Mireille/open-bag cases. It clicks real tab targets and checks
one selected panel, dialogue admission and unchanged bag bounds. These are
controlled client checks with isolated saves, not a complete ordinary-input
campaign playthrough. Reports/screenshots stay in ignored `balance/reports/`.

Inspection: the canonical seamless conversation integration check reached
Brandt, Mireille, controller flask selection and a quest return, then failed
on a missing Inventory button. It is a controlled fixture, not a passing full
playthrough or evidence that the reported opening-order cases work.

No gameplay changes are published or integrated yet. Combat, passive content,
support handling and the main/seamless decision register belong to the other
active session. Integration must preserve its edits and use normal main to
seamless ancestry.
