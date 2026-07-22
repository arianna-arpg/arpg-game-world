# THE PATRON'S HOLD — vendor counters, reserved wares, and the standing order

`src/data/vendors.ts` (the registry + `VENDOR_CFG`) · `src/engine/world.ts`
(the hold machinery beside the stock builder) · `src/meta/worldstate.ts`
(`WorldStateSave.vendorHolds` + sanitizer) · `src/meta/unlocks.ts` (derived
Vault rows) · probe: `balance/probe_vendorlocker.ts`.

## The counter registry (recap)

A vendor is an `npcRole` NPC plus ONE row in `VENDORS` (`data/vendors.ts`):
proximity gate, stock source, price fn, buy intent. The Vendor screen renders
every near counter; a new merchant is one more row. Stock arrays
(`vendorStock`, `chandlerStock`, `descentStock`) are **projections** — armed
at zone load, re-rolled on the world-clock restock, emptied when their
counter stands down. Nothing in a stock array is durable…

## …except the hold

`World.vendorHolds` (keyed by `VendorDef.holdKey ?? id`; a per-site counter
would key `id@zoneId` — the sanitizer already tolerates both) is durable
world state in the muster-roll law's shape: **state, not weather**. It rides
`WorldStateSave.vendorHolds`, survives leave/re-enter, reload, and every
restock. A hold carries:

- `locks: VendorHoldRow[]` — reserved shelf rows. Each row owns the LIVE
  `VendorEntry` object plus the slot (`idx`) the overlay re-seats it at.
  While the counter stands, the entry in stock IS the held object (identity,
  not a marker field — one truth). `commission: true` marks the standing
  order's find.
- `commission?: { kind, id }` — the standing order itself.
- `ordinal` — the highest restock beat the order has resolved through.

**The overlay law**: `armVendorStock(key)` = resolve the order's elapsed
beats → roll a fresh shelf → seat every held row at its remembered slot
(clamped; collisions probe to the nearest free seat). Every arm site and the
restock walk through it. `syncHoldIdx` re-anchors seats after any stock
splice (buys) and before any rebuild.

## The reserve ladder (locks)

Capacity = owned rungs of `VENDOR_CFG.lock.ladder` — an array of
`{ flag, cost }`. `World.vendorLockCap()` folds it; `unlocks.ts` **derives**
its catalog rows from the same list (ids `feat_vendor_lock_N`, chained
`requiresUnlock`, the config's costs). Raising the ceiling to N is appending
one row — no literal anywhere counts to three. The first rung is
discovery-gated on `LEDGER_VENDOR_BOUGHT` (stamped by any counter purchase:
you can only reserve at a market you've traded in).

- `setVendorLock(vendorId, index, on, seat)` — the `vendorLock` intent.
  Capacity counts NON-commission rows across that counter's whole shelf.
  Releasing leaves the ware on the shelf until the next restock re-rolls it.
- Buying a reserved ware clears its row (and frees capacity) via
  `vendorBought`, which every buy handler routes through.
- Which counters hold: `VendorDef.holds: { locks?, commission? }` — pure
  capability data. Brandt and the chandler wear both; the delver's
  per-descent shelf opts out by wearing neither.

## The standing order (commission)

One pre-selected gem per counter, watched for across restocks — including
every restock that *would have happened* while you were away.

- **Eligibility** (`setVendorCommission`, the `vendorCommission` intent):
  the Vault rung (`FEATURE.VENDOR_COMMISSION`), a registered gem, unlocked
  for drops, KNOWN to the drop index (`VENDOR_CFG.commission.need` genuine
  mints), and rollable at this counter (`commissionOdds > 0` — an
  out-of-bracket or not-yet-sold gem refuses WITH its reason, never a
  silently dead order).
- **The beat lattice**: `restockOrdinal() = floor(worldTime /
  restockSeconds())` — pure f(time), so beats that passed unattended are
  countable at any later arm and a resolved beat never comes around again
  (`hold.ordinal` advances; `maxCatchup` bounds the loop).
- **The odds law**: `commissionOdds` reads the SAME pool + weights the
  roller draws (`skillDropPool`/`supportDropPool` + `gemWeights` — split
  from `pickGem` precisely so no parallel formula can drift), folds the
  slot's kind share (`VENDOR_CFG.supportShare`) over the counter's gem
  slots (`1-(1-p)^slots`), then the `oddsMult` kindness dial. The panel
  prints the same number the resolver rolls.
- **Determinism**: each beat's roll is seeded
  `worldSeed ^ hash('vendorhold:key:kind:id:beat')` and the FIND mints on
  the same stream (rarity → sockets) — a reload replays the identical find,
  seat and rarity. No scumming, by construction.
- **Lifecycle**: a hit seats the gem as a commission-marked reserved row
  (EXEMPT from the reserve cap) and the watch stops. Purchase FULFILLS the
  order (clears it). Releasing the find unbought resumes the watch — you
  turned down the find, not the order. Withdrawal releases order and find.
- **The gem bracket** (`VENDOR_CFG.gemBracket`): `'shopper'` (default) =
  gem rolls read `max(ground, local hero)` — the gear shelf's own "at the
  buyer's level" anchoring, so the counter grows with the account;
  `'zone'` = the pre-hold behavior verbatim (Lastlight stays
  starter-bracket). World drops never read this.

## The drop index

`account.ledger['gemdrop:<id>']` (+ `gemdrops_total`) — the bestiary's
sibling, same ledger, same doctrine. Bumped ONLY where a gem is genuinely
MINTED into the world: `World.dropGemAt` (every kill trickle, boss table,
chest, event payout, breakable) and the Bonewright's fixed spoils. Discards
(`dropFromInventory`), corpse reclaims (`dropSavedLoot`), looter-sack
movement and counter purchases move OWNED goods and never route through a
mint — the index is abuse-proof at the source and accrues through play,
never juggling. Immortal runs read but never feed (`metaProgressionActive`,
the bestiary's own guard). Being ordinary ledger keys, unlock rows may gate
on them verbatim (`reqLedgerCounts: { [gemDropKey('x')]: n }`) — the
commission card itself gates on `gemdrops_total`.

## Persistence + tolerance

`serializeVendorHolds` packs live entries to the corpse-loot union
(`SavedLoot` — `skillToLoot`, gear verbatim) and writes only holds CARRYING
state (empty is **not** load-bearing here, unlike a sold-out muster sheet —
a stateless shelf simply re-rolls). `sanitizeVendorHolds` (registry-
tolerant, never throws): unknown counters drop, site-scoped holds drop with
their culled ground, rows whose gem left the registry drop, a standing
order for a de-registered gem is released. `rebuildVendorHolds` stands rows
back up through the same tolerant rebuild path the corpse reclaim walks.

## Co-op

The snapshot ships each vendor entry's hold flag ON the entry
(`VendorEntryW.lk`: 1 reserve / 2 commission find — never a parallel array,
so a row that fails rehydrate takes its flag down with it) plus the HOST's
capacity (`vendorCap` → `World.netVendorCap`). The client rebuilds a
projection hold so the panel's one read path answers identically both
sides; lock toggles route as intents and the optimistic repaint self-heals
off the 20 Hz snapshot. The commission strip stays host/solo/couch (it
reads the keeper's account); couch seats share the host world and get
everything. (Pre-existing gap, unchanged: `chandlerStock` is not
replicated.)

## The panel

`refreshVendor` (ui/panels.ts): reserve toggles per row (capacity readout
in the header), RESERVED / STANDING ORDER badges, the order strip with the
honest per-restock odds, and the searchable DROP-INDEX picker (eligible
rows commission; in-progress rows show `n/need found`, dimmed — the
bestiary's fill-bar doctrine). The restock countdown ticks IN PLACE (no
rebuild — hovers and the search box survive); a landed restock repaints
whole, and the search box's focus + caret ride through every rebuild.

## Extension recipes

- **New counter with holds**: one `VENDORS` row wearing
  `holds: { locks: true, commission: true }`. Done — panel, intents,
  persistence, sanitizer all follow from the registry.
- **Per-site holds** (e.g. a delver that remembers per shaft): give the row
  `holdKey: w => `delver@${w.zone.id}``; the sanitizer already scopes
  `id@zoneId` keys to living ground.
- **A fourth reserve rung**: append `{ flag, cost }` to
  `VENDOR_CFG.lock.ladder` + the flag in `FEATURE`. The catalog row, the
  cap, and the panel readout follow.
- **Gate content on gem familiarity**: `reqLedgerCounts:
  { [gemDropKey('meteor_storm')]: 10 }` on any unlock row.
