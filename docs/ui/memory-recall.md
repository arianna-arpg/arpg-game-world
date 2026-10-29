# Memory unveiling

The Recall pane remains a separate folio from Inventory and its Skills,
Character and Passives pages. Its automatic placement measures the visible
inventory workspace and ribbon strips each frame, then chooses a clear
horizontal space without moving those panels. It prefers the usual width,
can narrow to a configured minimum, and respects UI scale, viewport edges
and the HUD. If the window cannot fit all panels, it minimizes overlap and
uses the independent-panel stacking rung so Recall controls remain clickable.
An explicitly moved pane keeps the player's placement.

`src/ui/panelPlacement.ts` owns the reusable geometry. Recall's width, minimum
width, gap, margins, preferred top position and timing are in
`MEMORY_RECALL_UI_CFG` in `src/ui/memoryRecall.ts`. The UI uses measured screen
pixels and converts the resulting seat back to layout pixels exactly once.
It reserves the available reading height when choosing a horizontal position,
so an added reveal cannot move the controls sideways.

## Open all

The small header control opens the current pouch, one existing `recallMemory`
intent per beat. It processes the first remaining provenance group in view
order; the engine retains each group's FIFO order, seeded rolls, promises,
rarity, facets and mint rules. Preformed Memories require the usual chosen
facet before opening. The facet remains fixed for the batch.

Room and spoils refusals pause the batch without sending refused intents or
spending units. It automatically resumes once those gates clear. The existing
last-unit rule still lets the reward occupy its retiring pouch's cell.
Rewards enter the ordinary bag and receive the normal reveal and flash.
No new save format, network action, reward rule or special item capacity is
introduced.

The control becomes **Stop** while running or paused. It stays mounted during
refreshes so a pointer press or keyboard focus survives the next reveal.
Manual row buttons and facet changes are disabled while opening. Stop, closing
the pane, selecting another pouch, owner/world replacement, death, or removal
of the pouch end the batch. Escape/options, a minigame or a shelved Recall
temporarily suspend its ticks. A finished pouch leaves its final reveals
visible, as individual recalls do. Bulk opening never jumps to another pouch.

Both manual and automatic recalls establish and restore the pane owner's
action context explicitly; an automatic beat has no originating DOM event
from which to infer a couch guest. Engine actions remain host-authoritative.

## Verification

- `npm run check`
- `npm run probe -- memoryrecall`: seeded manual/bulk parity, cadence, full-bag
  waiting and resumption, retiring pouch capacity, facets, seals, cancellation,
  couch ownership and placement geometry.
- Existing `memories`, `folio`, and `menubar` probes.
- Build, then `electron balance/memory-recall-ui.cjs`: actual pane controls,
  both arrival orders with all three main inventory pages, four viewport/scale
  configurations, live repositioning and saved placement, clickability, stable
  Stop button, full-bag resume, couch ownership and normal individual reveals.
  Screenshots and disposable saves go in ignored reports.
- `electron balance/inventory-pages-ui.cjs`: parent page/ribbon regression.
