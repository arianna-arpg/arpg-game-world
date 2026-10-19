# Dialogue redesign · 19 October 2026

Status: implementation authorized on 19 October 2026. NPC panels are now a
separate Folio group, Brandt's Shop opens his existing vendor, and Character is
an Inventory ribbon retaining the existing sheet contents. The current checks
and contract are in `docs/ui/service-workspace.md`. The notes below retain the
design history; historical verification is not the current acceptance gate.
The earlier shared-book correction on `codex/dialogue-panel-parity`, based on
main `645fe6ca`, is verified only against its previous contract and must not be
integrated unchanged. The canonical seamless checkout was inspected at `ac9dedab`.
The former stacked workspace and overhead approach captions were not promoted;
the implemented panel contract supersedes them. Nothing here changes the
once-per-account tutorial or physical class selection in Mu.

## Implementation verification

The shared baseline and continuous-world client both passed the 32-case
Brandt/Mireille matrix: Skills, Passives, Reliquary and Character; open/restored
arrivals; 2560×1440, 1280×800 and 820×650 at 175% scale. Player selection and
rectangles remain stable. The native first-Mireille regression also passes:
her proximity previously inserted a 43.5-pixel flask-help block into Inventory;
that guidance now stays in her conversation topic.

The real Shop button, purchase, return shortcut, NPC tabs, native work acceptance,
Character ribbon, pause, quest refresh and departure pass. Player-page mouse/key
controls and owner isolation pass. All project types, dialogue/folio and native
quest checks, simulation smoke, production build and the normal Begin → Mu →
world → saved Continue client course pass. The tests use isolated profiles and
saves; NPC matrices use controlled positioning and do not claim a full campaign
playthrough. Reports and screenshots remain in ignored `balance/reports/`.

## Player direction

The player reports overlapping vendor and Skills tabs, different results when
arriving with remembered pages versus an already open bag, inventory resizing
at vendors, and Mireille failing to speak when Inventory is already open.
They require one consistent panel rule. The latest direction permits giving up
automatic fitting at very small resolutions to preserve the existing player UI
and full NPC services. A supported minimum viewport at the chosen UI scale is
still to be measured; no arbitrary numerical cutoff has been accepted.
The latest clarification supersedes the earlier brief-greeting proposal:
ordinary encounters also open the conversation panel. This is the only surface
for dialogue; there are no overhead greeting lines or separate Talk button.
Dwelling near Mireille opens her panel with content and all available options
derived from the dwelling player's quest state. Brandt's vendor interface must
remain the existing full vendor panel, including its stock, transactions,
tooltips, selling, holds and other controls. The conversation panel offers Shop
as an action that opens that panel; it must not recreate shopping inside the
conversation reader. The previous mockup's simplified shop is rejected.

The current proposed structure has two independent panel groups: NPC panels
(conversation and the NPC's services) and player panels (the exact current
Inventory, Skills, Passives and Reliquary setup). NPC arrival must not bind to,
replace or resize the player's selected page. The groups coordinate placement,
but never merge because their rectangles happen to overlap.

## Reproduced baseline failures and revised rule

- Main's dialogue admission rejects an open bag unless a station panel is open.
  Seamless also permits an already established conversation, so arriving with
  Inventory open still prevents Mireille from starting one.
- Folio groups by position only at initial admission. A service opening the
  bag can restore a Skills page before the service has its final position;
  separately admitted books can subsequently overlap without regrouping.
- Services reserve a reading band and shrink Inventory, while an ordinary
  inventory visit uses a different height limit. The bigger seamless activity
  panel adds another height calculation.

Revised contract for review: NPC conversation and services share an NPC panel
group, with the current player UI remaining a separate group. Both may remain
open. NPC panels should occupy a dedicated side with enough space for the full
player setup at supported viewport/scale combinations. Opening order must not
change membership, player selection or inventory size. A local Inventory page
cannot prevent NPC speech from starting; pause and genuine modal decisions
still suspend it.

Preserve readable controls and existing player layout before attempting to fit
both groups on an undersized screen. The proposed fallback is manual moving or
closing through existing controls, not automatic cross-group tab merging,
shrinking, or forced closure of Skills. Initial placement should avoid occupied
space where possible; essential close/navigation controls still need to remain
reachable. Do not promise simultaneous non-overlap at every resolution/scale.

The first correction (`b979655f`) instead puts Inventory pages and station tabs
into one book and constrains the bag to the reader's band. Those grouping and
sizing choices are superseded. Its opening-order reproductions and local speech
admission findings remain useful; its passing checks do not validate this new
design. The conversation reader itself has not been redesigned in gameplay.

## Reviewable interaction

The Mireille interaction in the chat mockup is broadly accepted. The following
Brandt routing supersedes that mockup's embedded shop. This remains a design
record rather than a gameplay implementation:

- First visit: dwell opens Brandt's conversation panel, with Shop and all
  currently available quest topics. Shop opens the existing vendor panel.
- Returning visits: the proposed shortcut begins after that player explicitly
  chooses Shop once. Later dwelling opens the existing vendor panel directly;
  shopping does not repeatedly require a greeting or response. Remembering
  this per character is the proposed default, not a global account bypass.
- Conversation remains a peer NPC tab while trading, with a marker for
  available quest options. Switching to it preserves vendor state; returning to Shop
  restores that same panel. A quest does not need the shop to be open, and
  shopping does not require completing or accepting a quest.
- Mireille defaults to the conversation view and shows all applicable topics
  together. Selecting one displays its dialogue and explicit actions inside
  that same frame. Quest eligibility and mutations remain engine-owned.
- A new quest/reward changes the topic list without stealing the selected shop.
  The shop and conversation keep independent content and lifecycle inside the
  same visit and shared tab system.
- The actual vendor panel and conversation belong to the NPC group. Inventory,
  Skills, Passives and Reliquary retain their current player group, structure,
  dimensions and selection. Opening Brandt while Skills is open leaves Skills
  open in that group. Shared placement does not replace either group's UI.
- The earlier mockup's combined NPC/player tab strip is superseded, along with
  its compact Inventory tab. A future preview must show both independent
  groups with the real vendor panel, not the simplified embedded shop.

Implementation seam confirmed: the existing dialogue menu action routes through
`UI.activateDialogueMenu('vendor')`, the registered menu verb and `showVendor`.
That path retains live availability checks, ordinary vendor rendering, selling
inventory and Folio enrollment. Selecting an already-open vendor should front
its existing leaf. The change belongs in arrival routing and shared panel
selection, not `refreshVendor` or a second transaction implementation.

No new Talk control or overhead speech is proposed. This design does not adopt
seamless's larger stacked conversation workspace or persistent approach/lesson
text. Its existing quest actions are a reference for selective reuse, not
approval to change progression or import the whole branch.

## Historical verification and delivery

For the first shared-book correction only: `npm run check`, Folio, speech and speech-grammar probes, simulation
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

Delivery uses a normal merge through main into the canonical playable world;
remote publication is not part of this task. Combat, passive content,
support handling and the main/seamless decision register belong to the other
active session. Integration must preserve its edits and use normal main to
seamless ancestry.
