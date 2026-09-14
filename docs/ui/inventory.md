# Live inventory

The inventory joins the character sheet and map on the shared half-second UI
refresh in `src/main.ts`, on both host and client. Client metadata arrivals also
request a live refresh. Pickups, purchases, rewards, stack merges, wallet changes,
equipment changes and container transfers therefore do not need their own UI
notification hooks. The view reads the panel owner's current state and the
existing item, currency, equipment and container registries.

`UI.refreshInventory(true)` is the automatic path. It compares generated markup
against the last rendered markup separately for the inventory, Skills drawer
and each container drawer. Unchanged surfaces keep their nodes, focus, tooltip
anchors and listeners. Changed surfaces restore their scroll offsets and wire
only their new controls; a bag change cannot duplicate the Skills listeners.
The satchel and item handlers read the inventory owner's current meta, including
couch guests and replaced inventory arrays.

Automatic refresh defers while a pointer press is active on the inventory or a
drawer. Window release, cancel, blur and re-entry without pressed buttons clear
that guard; the next cadence catches up. Click-lift carries remain live through
the existing drag fabric. Closed inventory panels do no automatic rendering.

Explicit `refreshInventory()` calls retain immediate rebuilding and refresh the
open skill trees as before. Automatic inventory polling does not rebuild trees;
client metadata arrivals still refresh them separately. No gameplay, save or
network schema changes are required.

Verification: `npm run check`, `npm run build`, `npm run smoke`, then
`npx electron balance/inventory-ui.cjs`. The latter runs the real game in a hidden
Electron window with isolated saves and profile under `balance/reports/`. It
checks automatic pickup, out-of-panel purchases, equipment, merged stacks,
wallets, container unlocks/transfers, couch ownership, closed/reopened panels,
scroll retention, idle node/focus stability, single-fire listeners, pointer
presses and click-lift carry continuity.
