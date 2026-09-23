# Portrait dialogue

Dwelling on a selected speaker now opens a framed reader above the action bar.
It shows the speaker's name, their animated in-game model, and paged text.
This is a client presentation over the existing speech grammar and functional
prompt reads; it does not execute quests, award items, or replace station gates.

## Reading and controls

- Speech focus still applies: idle grace, dwell, purpose priority, stable
  distance selection, range, roof/wall reach, story and body visibility.
- Hover a reachable speaker to override purpose priority. Overlapping hits
  choose the nearest body center, then stable actor id. A passing hover cannot
  complete dwell; a completed cursor choice stays selected when the mouse moves
  onto the reader. Point at another eligible speaker or leave range to switch.
  Menus, HUD controls and controller aim do not nominate mouse targets.
- Available ambient speakers wear faint rings. The selected ring brightens and
  fills from its actual speech dwell clock. Cooling speakers cannot steal cursor
  focus and do not advertise availability; their cooldown is never bypassed.
  Functional bodies retain rings tied to their independent service clocks.
- Mireille offers a resting response when her care is unlocked and no gift or
  lesson takes precedence, including when the hero needs no replenishment.
- Enter, controller A, the text area or the advance button reveals the page
  first; the next press continues, or finishes on the last page. Keyboard and
  pad advance are rebindable as **Advance Dialogue** in Options.
- Escape, controller B or the close button dismisses. Escape closes a visible dialogue
  before reaching the pause menu. The reader does not pause the world or lock
  movement; leaving the speaker's focus closes the exchange.
- Finishing/dismissing cannot reopen the same content during a focused visit.
  A newly relevant line (for example, a quest or stock unlock) may speak while
  the player remains at the counter. Dismissal covers queued content too;
  already read lines cannot cycle back into the queue. Departing and returning
  must earn dwell again. Ambient speech additionally honors its
  existing lane cooldown, starting at reader completion or interruption.
- An ambient offer's old bubble window can expire while the page remains open.
  Reading has no deadline. Generated text is composed once, not every frame.
- A changing functional line queues behind the current text. Only the latest
  pending state survives; it is reached through Continue, never substituted
  halfway through a page. Closing dismisses the pending text too.
- Ordinary station services coexist with the reader, including summoned
  crafting tabs and their selling inventory. A station opening or changing
  tabs never interrupts its conversation or requires it to be finished first.
  A service with no eligible speech opens without an empty dialogue box.
- Visible personal pages, modal decisions, minigames and pause suspend the
  reader and new dialogue admission. Shelved tabs cannot suppress speech.
  Closing the blocking surface resumes the page if its speaker remains in
  focus. Death, run exit,
  world replacement and every zone load clear the reader.

The local hero owns the reader. Existing couch guests retain their seat-scoped
caravan bubbles; they cannot borrow the local hero's lesson or reading controls.
Nothing is saved or added to the network protocol.

## Shared components and configuration

`src/engine/dialogue.ts` is the DOM-free reader state: a `DialogueOffer` names
its speaker, stable content key, and ordered pages. Current NPC offers are
adapted from `World.npcSpeechView`; another content system can supply authored
pages through the same reader. `dialoguePages` treats blank lines as explicit
page breaks and otherwise splits at word boundaries.

`src/data/dialogue.ts` owns presentation mode, page budget, reader width,
portrait size, font, spacing, HUD clearance and service workspace dials.
Set `presentation: 'bubble'`
to compare the prior overhead presentation without changing dwell/priority.
Selection remains configurable through `speechAttention.ts` and
`MonsterDef.speechAttention`: `restingLine` folds through role and definition,
`pointer` controls hover admission/hit padding, and `cue` controls ring size,
color, weight and opacity. The reusable `dwellFocus` fold accepts optional
pointer hit scores from any dwell family; NPC admission and visuals share the
world's candidate read. Typing speed and punctuation pauses continue to
fold `VIS_CFG.speech` through `MonsterDef.speech`; the existing **NPC Talk
Typing** option disables reveal animation for the reader as well.

`src/render/actorPortrait.ts` resolves the speaker's live look, color,
material, adornments and extra parts with definition geometry. Ultimate
cutaways and dialogue both use this helper and the same `drawPortraitInto`
compositor. No generated portrait assets or replacement character art are used.

`src/ui/dialogue.ts` owns only reading/presentation and input admission. Its
DOM text uses `textContent`; bind/name tokens arrive resolved through the
renderer's existing text seam. Full text is announced once per page, rather
than once per typed glyph. UI scaling and stack order use the shared fabrics;
compact layouts remain within the viewport and can scroll at high UI scales.

`UI.dialogueContext` derives coexistence from the same enrolled folio leaves
that own station open/close, reach and tab selection. Every `kind: 'station'`
joins automatically; modal/page leaves suspend only while drawn. Inventory
joins only with a local service. Gameplay and controller menu-pointer gates
remain unchanged. Keyboard advance does not steal native activation from
focused service controls; controller A uses the service pointer to operate
either surface, and Escape dismisses dialogue before closing services.

`ui/dialogueLayout.ts` reserves a stable reading band beneath the services,
with the animated portrait and continuously reachable advance/close controls.
Services and inventory fit beside one another, or stack when too narrow, with
scrolling content. On a short/high-scale screen they may borrow the inactive
HUD space while services own input. Font size continues to follow the user's
scale. The layout reserves its CSS geometry until each service panel actually
closes. Dismissal, finishing a page and modal suspension preserve panel bounds,
scroll limits and purchase/sale targets. Folio tabs measure those same retained
seats; explicit tab, viewport and scale changes may refit the workspace. Saved
positions remain untouched, and closing a panel releases its reservation.

The renderer batches selection once before actors, then delivers dialogue
through the same actor and room visibility gates as bubbles for initial
admission. Once admitted, a page remains while the world's reachable focus
holds, even if a roof animation or render culling temporarily hides the body.
An NPC's functional role supplies its dwell reach even when it also gives
quests. `NPC_DWELL_RADII` supplies shared counter/dialogue range overrides;
unlisted roles retain their authored conversation radii. It suppresses
the local reader's duplicate overhead bubble. It never owns conversation
rewards or scene-specific dialogue rules.

## Verification

- `npm run check`
- `npm run probe -- speech --retries 0` (K: attention, L: reader transitions)
- `npm run sim -- run --suite smoke`
- `npm run build`, then `npx electron balance/dialogue-ui.cjs`
- `npx electron balance/speech-focus-ui.cjs` retains the original inn focus rig.
- `npx electron balance/dialogue-services-ui.cjs` checks actual stocked-counter
  dwell with summoned crafting tabs, purchases, independent dismissal, new
  state admission, suspension, controller input, departure, and non-overlapping
  readable layouts at desktop/compact/175% scale.

The hidden client uses isolated saves and captures the actual DOM plus canvas.
It checks dwell, priority, the live portrait, reveal/advance, paged content,
queued functional changes, dismissal/rearming, extended reading, cooldown from
close, controller/combat isolation, compact layout and same-zone reload.
