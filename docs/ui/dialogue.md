# Portrait dialogue

Dwelling on a selected speaker opens that NPC's conversation panel.
It shows the speaker's name, their animated in-game model, and paged text.
This is a client presentation over the existing speech grammar and functional
prompt reads. Optional responses dispatch registered actions through their
owning systems; the reader does not award items or replace station/quest gates.

`NpcConversationUI` lists all currently applicable topics for that speaker:
quest progress, available work/callings, rewards, imbues and Mireille's flask
guidance. Topics are deliberate choices; Back returns to the list. The existing
engine commands validate every acceptance and reward against current state.
Brandt offers Shop, opening his existing full vendor UI as another NPC tab.
After using Shop, return visits open it directly; Conversation stays available.
The shortcut is a settings preference keyed by character and NPC definition.

## Reading and controls

- Speech focus still applies: idle grace, dwell, purpose priority, stable
  distance selection, range, roof/wall reach, story and body visibility.
- Hover a reachable speaker to override purpose priority. Overlapping hits
  choose the nearest body center, then stable actor id. A passing hover cannot
  complete dwell; a completed cursor choice stays selected when the mouse moves
  onto the reader. An admitted conversation retains its reachable speaker;
  close it or leave range before selecting another.
  Menus, HUD controls and controller aim do not nominate mouse targets.
- Available ambient speakers wear faint rings. The selected ring brightens and
  fills from its actual speech dwell clock. Cooling speakers cannot steal cursor
  focus and do not advertise availability; their cooldown is never bypassed.
  Functional bodies retain rings tied to their independent service clocks.
- Mireille offers a resting response when her care is unlocked and no gift or
  lesson takes precedence, including when the hero needs no replenishment.
- Enter, controller A, the dialogue surface or the advance button reveals the page
  first; the next press continues, or finishes on the last page. Keyboard and
  pad advance are rebindable as **Advance Dialogue** in Options.
- The footer always includes **Finish**, including topic lists, work details,
  rewards and unanswered responses. When no text needs revealing or paging,
  **Finish › Enter** closes the dialogue; an activity has a separate **Back to
  topics** button. During an authored response, focused choices retain their
  normal activation and Finish remains a separate explicit action.
- Surface clicks include the text, name, portrait and margins. Buttons own their
  click, so choosing a response or closing cannot also advance. Selecting text
  does not advance. All routes call the same `DialogueUI.advance` transition.
- Optional response prompts wait for an explicit answer after the final page
  is revealed. Advance never picks an answer. Up/Down/Home/End focuses available
  responses; Enter/Space activates the focused button. The controller pointer
  can operate response prompts even without an accompanying service.
- Escape, controller B or the close button dismisses. Escape closes a visible dialogue
  before reaching the pause menu. The reader does not pause the world or lock
  movement; leaving the speaker's focus closes the exchange.
- Finish, X and Escape dismiss through the same reader close path without
  accepting work or changing any player ribbon. Escape also dismisses the
  front NPC service before any player-panel sweep, regardless of which group
  was last touched or the selected Escape preference.
- Closing stays closed while standing still, including later quest changes;
  a delayed shop timer cannot reopen the shop. A deliberate step inside the
  same NPC's range requests a fresh normal dwell. Services, current quest
  topics and authored responses can return immediately after that dwell.
  Authored quest text cannot lengthen the shared functional dwell (0.4s by
  default, after idle grace); first visits and subsequent quest states obey
  that same limit, including Mireille's native flask introduction.
  Closing Shop also arms this return, even with Conversation still in its
  NPC tabs. Existing vendor definitions supply Shop eligibility for all traders.
- Residents and settled quest givers without attached content retain the
  speech lane cooldown, starting at reader completion or interruption.
  Cooldown expiry alone never rearms an explicitly dismissed visit. Physics
  pushes, casts, menu clicks and old movement cannot count as a fresh step.
- An ambient offer's old bubble window can expire while the page remains open.
  Reading has no deadline. Generated text is composed once, not every frame.
- A changing functional line queues behind the current text. Only the latest
  pending state survives; it is reached through Continue, never substituted
  halfway through a page. Closing dismisses the pending text too.
- Conversation and ordinary station services share NPC tabs, including summoned
  crafting tabs. Changing tabs retains the conversation, and never selects or
  closes a player page. Topics remain available without finishing the greeting.
  A service with no eligible speech opens without an empty dialogue box.
- Inventory and all its pages permit local dialogue admission before and after
  an NPC conversation begins, including when the NPC has no station panel.
  Other personal screens, modal decisions, minigames and pause suspend the
  reader and new dialogue admission. Shelved tabs cannot suppress speech.
  Closing the blocking surface resumes the page if its speaker remains in
  focus. Death, run exit,
  world replacement and every zone load clear the reader.

The local hero owns the reader. Existing couch guests retain their seat-scoped
caravan bubbles; they cannot borrow the local hero's lesson or reading controls.
Reading state is not saved or added to the network protocol. Only the per-character
Shop return preference persists in local settings.

## Shared components and configuration

`src/engine/dialogue.ts` is the DOM-free reader state: a `DialogueOffer` names
its speaker, stable content key, and ordered pages. Current NPC offers are
adapted from `World.npcSpeechView` through `NpcDialogueDirector.readerOffer`; another content system can supply authored
pages through the same reader. `dialoguePages` treats blank lines as explicit
page breaks and otherwise splits at word boundaries.

[Dialogue choices](dialogue-choices.md) defines response authoring, branches,
action registration, live validation and future progression integration.
`NpcDialogueDef.responses` is the authored entry point. Existing NPCs keep their
current behavior unless their content explicitly adds responses.

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

The canonical placement and coexistence contract is
[Services, Inventory and dialogue](service-workspace.md). `UI.dialogueContext`
derives admission from the same enrolled folio leaves that own station lifecycle;
`ServiceWorkspace` owns shop/station placement. The reader never repositions Inventory
or its pages. `ui/dialogueLayout.ts` seats conversation above the bottom HUD with reachable
advance/close controls. Player and NPC groups remain independent at every scale;
small windows can overlap and use the existing movable layout or close controls.

Keyboard advance does not steal native activation from focused service controls;
controller A uses the service pointer to operate either surface, and Escape
dismisses dialogue before closing services.

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
  dwell, Shop and return visits, summoned crafting tabs, purchases, unchanged
  player page selection and geometry, departure, Character and independent
  groups at desktop/narrow/175% scale.
  Add `--finish` for the focused footer course: topics, work/activity details,
  paged greetings, separate Back, mouse/Enter dismissal and retained player UI.
  `--reentry` checks Finish/X/Escape with all four player ribbons, intentional
  movement inside the same NPC radius, and Shop X/Escape under every Escape mode.

The hidden client uses isolated saves and captures the actual DOM plus canvas.
It checks dwell, priority, the live portrait, reveal/advance, paged content,
queued functional changes, dismissal/rearming, extended reading, cooldown from
close, controller/combat isolation, compact layout and same-zone reload.
