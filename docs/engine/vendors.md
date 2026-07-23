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
one row — no literal anywhere counts to three. Rung 1 stands at the far end
of THE MARKET CHAIN (below): it requires the Gem Counter AND a Broader
Wares rung owned, keeps the `LEDGER_VENDOR_BOUGHT` discovery law (stamped
by any counter purchase: you can only reserve at a market you've traded
in), and `tease`s SEALED in the Vault once the chain is walked but the
ledger unstamped.

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
commission card itself gates on a GATEWORK prefix avenue
(`{ ledgerPrefix: 'gemdrop:', n: need }`): it sells exactly when at least
ONE gem is orderable, never on a bare total.

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

## The counter tabs + the counter glass (2026-07-22)

Every counter renders as TWO FACES (`VendorDef.tabs ??
VENDOR_CFG.tabs.default`, a `VendorTabSpec[]`):

- **Wares** (the default open face): the counter's rolled GEAR packed into a
  real grid — THE COUNTER GLASS. `World.vendorGridPack(stock, v.grid?)`
  first-fits scratch copies in STOCK ORDER over the board
  (`VendorDef.grid ?? VENDOR_CFG.gearGrid`) through the player bag's own
  pure cell law (`inventory.ts` helpers, now board-parameterized via
  `BoardDims`) — deterministic, so both co-op sides pack their replicated
  arrays to the identical glass, and DISPLAY-only (a shelf item owns no bag
  cell; the buyer's `autoPlace` writes the real one). Tiles wear the bag's
  own dress (footprints, rarity borders, category glyph, the full item
  tooltip), click-to-buy when affordable, and a corner RESERVE pip
  (stopPropagation — a reserve never falls through into a purchase). A
  reserved tile wears the accent border + badge and rides restocks by the
  overlay law. THE CAPACITY LAW: the probe derives the worst case (widest
  ladder × largest base footprint) and fails the build before content can
  outgrow the glass; a genuine overflow lists honestly below the grid.
- **Gems** (the case): the gem/support rows, the order strip, the picker —
  everything the pre-tab panel was. SEALED at default-tabbed counters until
  the account owns THE GEM COUNTER (`FEATURE.VENDOR_GEMS`): the face stays
  visible and clickable, its body speaks `VENDOR_CFG.tabs.gemsSealedCopy`
  and names the Vault row. A counter that lists one bare face opts out of
  the strip AND the seal — the delver's echo shelf (`tabs: [{id:'gems'}]`,
  gems-only by its arm site: `buildVendorStock({ gear: false })`).

**THE TRADE GATE** (`VENDOR_CFG.trade`): until every gate row holds (all-of;
the default asks one thing — `FEATURE.SALVAGE_STATION` owned), no counter
SELLS anything: browsing stays free, the panel shows the hint strip and
disables every buy, and the engine refuses through the same predicate
(`World.vendorTradeRefusal(v?)` — the swapRefusal shape; refusals mutate
nothing). `VendorDef.tradeGate: false` opts a counter out (the delver:
echoes are earned in-descent, outside the essence economy by construction).

**THE KEEPER'S GATE** (co-op law): trade gate, gem case, and the wares fold
all read the WORLD-KEEPER's account — host/solo/couch — exactly as stock
size and the support share always have. The snapshot mirrors the verdicts
(`vendorTradeOpen`/`vendorGemsOpen` → `netVendorTradeOpen`/
`netVendorGemsOpen`, absent = open) so a client panel disables and seals
with the keeper's own truth.

## The broader-wares ladder

`VENDOR_CFG.wares` — `baseGems` plus a ladder of `WaresRung` rows
`{ flag, cost, gems, gear, gate? }`. `World.waresBonus()` is the ONE fold:
`vendorSize() = baseGems + Σ owned gems`; the gear shelf =
`VENDOR_ITEM_CFG.slots + Σ owned gear` — a rung can never widen one face
and not the other. `unlocks.ts` derives the catalog rows
(`feat_vendor_wares_N`, "Broader Wares I/II/III"): rung 1 chains off the
Salvage Station and wears the LEGACY `brandt_extra_gems` flag (accounts
that bought "Brandt: +2 Wares" own rung 1 outright — ownership rides
flags, never catalog ids); later rungs chain rung-to-rung; a rung wearing
`gate` avenues (rung 3's `[{level:15},{vocation:true},{quest:true}]`)
becomes a GATEWORK any-of rung — sealed in the Vault with its roads
printed until ANY avenue is walked (docs/meta/gatework.md).

## The panel

`refreshVendor` (ui/panels.ts): the per-counter tab strip (faces wear
stock counts; a sealed face wears 🔒), the wares glass + scrap wheel on one
face, the gem rows + reserve toggles + order strip + searchable DROP-INDEX
picker on the other (eligible rows commission; in-progress rows show
`n/need found`, dimmed — the bestiary's fill-bar doctrine). The restock
countdown ticks IN PLACE in the section header, OUTSIDE the tab bodies (no
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
- **A fourth wares rung, gated its own way**: append
  `{ flag, cost, gems, gear, gate: [{ level: 40 }, { quest: 'unmade' }] }`
  to `VENDOR_CFG.wares.ladder` + the flag in `FEATURE`. The catalog row,
  the sealed card, the level-milestone stamp, and both stock folds follow.
- **A counter with its own glass**: `grid: { w: 8, h: 4 }` on the
  `VENDORS` row (the capacity probe reads the DEFAULT board; a bespoke
  board deserves its own check).
- **A tab-less future counter** (maps, consumables…): extend
  `VendorTabSpec.id`, seat the face in `refreshVendor`'s body switch, list
  it in the def's `tabs`.
