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
Ordinary encounters should be quick in-world interactions; full dialogue is
for important scenes.

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
Pages still follow a manually moved bag. The next
presentation change will use brief in-world speech for routine visits and
retain a reader for important exchanges and explicit decisions, using the
existing speech/action machinery. This is not acceptance of seamless's large
conversation workspace or persistent approach/lesson text. An earlier question
introduced a possible Talk control without explaining that it does not exist
today; the player requested clarification. The clarified proposal retains
approach/dwell, uses brief overhead speech for ordinary visits, and opens the
full reader automatically for important exchanges or decisions. No new Talk
control is approved or implemented. The existing large reading strip remains
in this first correction.

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
