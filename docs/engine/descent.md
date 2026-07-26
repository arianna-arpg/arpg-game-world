# The Descent — the Delver, the abyss, and the deep's own economy

The Descent package (`src/packages/defs/descent.ts` + `overlays/descent.ts`)
opens a **boundless, lightless abyss** under ordinary caves: a Delver (neutral
shaft-keeper, rolled per cave mouth on a seeded chance) stands by a platform;
dwelling the platform descends into a streamed, wall-less cavern where
darkness itself is the clock. Every number lives on **one config object**
(`DescentSurge`) the engine reads through `sim.descentField.surge()` — the
whole mechanic is data.

This document is the law of the 2026-07-25 rework: the echo purse is dead, the
depths scale, and the Delver's counter is a real (locked, depth-gated) market.

## The loop

1. Find a Delver in a combat cave (level-gated by the package; seeded per
   mouth — a given cave always/never hosts one, every entry).
2. **THE PROVING LAW**: the Delver's counter does not exist yet. The prompt
   says so; the dwell opens nothing. The shaft comes first.
3. Dwell the platform → descend. Darkness drains the LIGHT meter (survival
   row); light spots push it back; Depthkin stream in from the dark.
4. Go deep — depth = distance from the shaft in `depthUnit` steps. Deeper is
   **higher-level, heavier, denser** (THE PRESSURE LADDER) and **richer**
   (THE DEEP LEDGER).
5. Resurface — by climb (keep all), by darkness, or by death (both keep
   `payoutKeptOnDeath` of the haul; the deep *spits you out*, never a run
   end). The banked essence lands in every player seat's real wallet.
6. The counter now opens: a once-minted, essence-priced shelf whose entries
   unlock at the depths **this shaft's dive** has seen.

One descent per Delver per run (`descentSpent`) — the shaft is spent; the
shop remains.

## THE DEEP LEDGER (the payout)

- Each credited Depthkin kill banks `payoutPerKill × (1 + depth ×
  payoutDepthBonus)` **coarse-equivalent essence units** on the dive
  (`DescentRun.haulBank`). Whole units mint **packets**.
- Each packet rolls `payoutTierRungs` **on the depth axis** (the
  essence-spill `tierRungs` grammar): every rung whose `atDepth` the dive
  currently stands at climbs one essence step on its `chance`, stopping at
  the first miss. Deep kills pay deep tints; a new essence tier is one more
  rung.
- Resurface grants the haul (× `payoutKeptOnDeath` unless climbing) to
  **every player seat** through `grantEssence` — floats, ledger
  (`essence_touched` discovery) and co-op meta sync all ride the standard
  seam. Tuned salvage-grade on purpose: the **shelf** is the prize, essence
  merely pays for it.

There is no descent-private currency anywhere: essence in, essence out —
the ONE economy.

## THE PRESSURE LADDER (depth scaling)

Three axes, all `DescentSurge` data:

- **Level** — the abyss's *own zone level* climbs live:
  `zone.level = baseLevel + floor(depth × levelPerDepth)` (the quickening's
  level-surge precedent, confined to the dive's spent ground and handed back
  on resurface). Drops, XP, gem ilvls and fresh spawns all read the one
  truth; brood bodies mint at `zone.level + enemyLevelBonus`.
- **Composition** — `spawnDepthkin` picks from the faction roster with
  presence envelopes evaluated at `broodAnchor + depth`: **the presence axis
  is DEPTH, not zone level**, so a roster row's `from: 5` means depth five
  under any cave. The pale fodder swims every stratum; brutes, cantors and
  hulks structurally cannot rise shallow. Retuning the brood is a roster
  edit in `defs/descent.ts`, never engine code.
- **Density** — the spawn interval still ramps down (`spawnRampPerDepth`,
  floored), and now the live cap grows (`spawnCap + depth ×
  spawnCapPerDepth`, ceilinged at `spawnCapMax`) while each beat spawns a
  **batch** (`1 + floor(depth × spawnBatchPerDepth)`). The far deep is a
  constant tide shoving you back toward the shaft.

## THE PROVING LAW + THE LOCKED SHELF (the Delver's market)

- `World.delverShopOpen(seat)` is the **one predicate**: near the Delver AND
  this cave's descent resolved. The `VendorDef.near` for the delver row reads
  it, so the dwell that opens the Vendor screen, the panel section, and the
  engine buy handler cannot disagree.
- The shelf is minted **once per shaft per run** (`mintDelverStock`), on a
  stream seeded `(worldSeed, caveId)` via `withSeededRandom`, and remembered
  in `descentStocks` — re-entering the cave re-projects the *same array*
  (purchases stay spliced). No refresh scumming exists, structurally (the
  mercenary lock-in law).
- **Normalized to Brandt**: rolled gear (`stock.gear` pieces at the
  shopper's level, `VENDOR_ITEM_CFG` weights) + skill/support gems
  (`stock.gems`, Brandt's own support-share gate), priced by the standard
  `vendorPrice` essence lanes, under the standard **trade gate** and **gem
  case** account seals, default tabs. The delver's *only* special layer is:
- **THE DEPTH LOCKS**: every entry rolls a rung from `stock.depthRungs`
  (weighted; depth 0 = open at once). `World.delverEntryRefusal(entry)` is
  the per-entry predicate — the panel disables/badges through it (`🔒 DEPTH
  N`) and `buyDelverGem` refuses through it, same words. The witness is
  `descentDeepest` (max depth *seen* by that shaft's dive, recorded live —
  dying forfeits nothing seen). The generic seam is `VendorDef.entryLock`:
  any future counter may lock entries behind anything.

## THE ABYSSAL REGISTER (descent affixes)

Six families in `data/itemaffixes.ts`, exported as
`DESCENT_AFFIX_FAMILIES`, all **weight 0**:

| family | kind | lines |
| --- | --- | --- |
| `deepvein` | prefix | flat life + life regen |
| `hadal_cold` | prefix | added cold + cold res |
| `voidbound` | prefix | `overmatch` (the slayer lane's level axis — the abyss's own fight: the deep brood outlevels you by construction) |
| `lampkeeper` | suffix | `survivalEase_light` (THE EASE LAW's debut) |
| `crushing_deep` | suffix | shove authority + impact damage (the mass fabric worn deep) |
| `deep_echo` | suffix | combo window |

**THE RESERVED-WORD LAW**: weight 0 = structurally unrollable in the wild
(the slotgraft precedent); the economy audit (`src/sim/economy.ts`) classes
weight-0 families as *reserved*, never "dead". They surface only where a
system **forces** the family via `RollItemOpts.withFamily` — the Delver's
gear mint rolls that force at `stock.affixChanceBase + affixChancePerDepth ×
the entry's own depth rung`, so the deep-locked wares carry the fat chances:
**deterministic farming, priced in danger**.

## THE EASE LAW (`survivalEase_<resource>`)

`world/regions.ts survivalEaseStat(id)` names a per-meter stat family
(`survivalEase_light` / `_breath` / `_soul` registered in `STAT_DEFS`); any
modifier source may grant a fraction of **slower drain** for one named
meter. `World.survivalDrainRate` is the ONE fold — `drainSurvival` and every
predictive read (the abyss's consume check) share it, so drawn == tested —
capped by the meter row's `easeCap` (default `SURVIVAL_EASE_CAP` 0.7):
slowed, never stopped. The Lampkeeper suffix eases light in the abyss and
under the Gloaming alike; a breath- or warmth-easing roll is one data line.

## Probes / gates

`balance/probe_descent.ts` (`npx tsx balance/probe_descent.ts`) pins: the
register census (reserved weights, reachability, known stats, forced-mint
success, 400-mint wild silence), the locked shelf (identity across
re-entry, cross-world seed determinism, rung validity, farm reality), the
proving law (sealed pre-dive/mid-dive, open post-resolve, one predicate at
the VendorDef seam), the pressure ladder (live level math, depth-axis
composition, cap/batch tide), the deep ledger (exact banking, packet
minting, wallet grants, keptOnDeath fraction), the ease law (half-drain +
row-cap floor), and the spent-shaft law. Also relevant:
`probe_vendorlocker.ts` (counter fabric), `sim baseline check --suite
smoke`, `sim -- audit affixes` (the reserved-word filter), `eventqa`.
