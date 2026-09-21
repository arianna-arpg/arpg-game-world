# Portrait dialogue

Dwelling on a selected speaker now opens a framed reader above the action bar.
It shows the speaker's name, their animated in-game model, and paged text.
This is a client presentation over the existing speech grammar and functional
prompt reads; it does not execute quests, award items, or replace station gates.

## Reading and controls

- Speech focus still applies: idle grace, dwell, purpose priority, stable
  distance selection, range, roof/wall reach, story and body visibility.
- Enter, controller A, the text area or the advance button reveals the page
  first; the next press continues, or finishes on the last page. Keyboard and
  pad advance are rebindable as **Advance Dialogue** in Options.
- Escape, controller B or the close button dismisses. Escape closes a visible dialogue
  before reaching the pause menu. The reader does not pause the world or lock
  movement; leaving the speaker's focus closes the exchange.
- Finishing/dismissing cannot reopen the same focused conversation. Departing
  and returning must earn dwell again. Ambient speech additionally honors its
  existing lane cooldown, starting at reader completion or interruption.
- An ambient offer's old bubble window can expire while the page remains open.
  Reading has no deadline. Generated text is composed once, not every frame.
- A changing functional line queues behind the current text. Only the latest
  pending state survives; it is reached through Continue, never substituted
  halfway through a page. Closing dismisses the pending text too.
- Other blocking panels suspend the reader and new dialogue admission. Closing
  the panel resumes the page if its speaker remains in focus. Death, run exit,
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
portrait size, font, spacing and HUD clearance. Set `presentation: 'bubble'`
to compare the prior overhead presentation without changing dwell/priority.
Selection remains configurable through `speechAttention.ts` and
`MonsterDef.speechAttention`. Typing speed and punctuation pauses continue to
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

The renderer batches selection once before actors, then delivers dialogue
through the same actor and room visibility gates as bubbles. It suppresses
the local reader's duplicate overhead bubble. It never owns conversation
rewards or scene-specific dialogue rules.

## Verification

- `npm run check`
- `npm run probe -- speech --retries 0` (K: attention, L: reader transitions)
- `npm run sim -- run --suite smoke`
- `npm run build`, then `npx electron balance/dialogue-ui.cjs`
- `npx electron balance/speech-focus-ui.cjs` retains the original inn focus rig.

The hidden client uses isolated saves and captures the actual DOM plus canvas.
It checks dwell, priority, the live portrait, reveal/advance, paged content,
queued functional changes, dismissal/rearming, extended reading, cooldown from
close, controller/combat isolation, compact layout and same-zone reload.
