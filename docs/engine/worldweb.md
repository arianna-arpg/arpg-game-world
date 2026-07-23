# The World-Web Laws — the map's link graph kept legible

The overworld is a graph of zone nodes joined by roads, grown at its frontiers
(`src/engine/worldgen.ts` mints, `World.chartFrontier` resolves, the eager web +
the forechart halo + survey pulses all drive resolution through ONE core:
`World.chartNeighborsOf`). These laws keep that graph **legible** — bounded
degree, no roads through nodes, no roads across places — so the chart stays
readable as it densifies, and so zones never *spatially* overlap (the
open-world groundwork: navigation must stay meaningful when the map is the
world).

Everything here is a data dial or a registry read. Nothing is a special case
hardcoded to one biome.

## THE ROAD BUDGET (`BiomeInfo.maxRoads` → `roadBudgetOf`)

A zone's total charted-road allowance is its biome's `maxRoads`
(`src/world/biomes.ts`), defaulting to `MAX_DEGREE` (worldgen). ONE read —
`roadBudgetOf(z)` — serves every road-former:

- the **weave** (`weaveConnections`) respects both ends' budgets,
- the **proximity linker** (`nearestLinkable`) refuses a candidate at budget,
- the **expanse inbound snap** (chartFrontier's field-region branch)
  consolidates instead of linking once the hub is at budget,
- the **frontier-resolution gate** (`chartNeighborsOf`): once a zone's charted
  roads reach budget, its remaining unlocked `'?'` frontiers consolidate.

The gate is the load-bearing half: `'?'` frontiers never counted toward
degree, so the weave filled a node to cap and the forechart halo then *cashed
every promise anyway* — 6-7 roads on ordinary country, 14-16 on a Fields
expanse. The world keeps growing from its under-budget rim; a **locked**
frontier (a purchased Holdfast pocket) is a deed and is never dropped.

Authored uses of the lever:
- `field: maxRoads 8` — the expanse is a deliberate HUB, more doors than
  country but bounded.
- `jungle: maxRoads 6` — THE PRESS: one past the world cap, on the game's
  tightest spacing — the deep green reads as a tangle. (The lever runs both
  ways: a lonely country could sit *below* the default.)

## THE HUB LAW + THE LANDINGS (Fields)

`fieldifyZone` deals the expanse's doors as a boundary SPREAD
(`FIELD_GEN.hubSpread` stops per cardinal side) and stamps a map **berth**
(`ZoneDef.berths` — the soulriver's many-mouthed law) at each stop on the
region boundary. The map's `anchorOf` then lands every road at the region's
true edge instead of converging on the centre dot. Expanse mints skip the
opportunistic weave (`ZoneSpec.noWeave`) — their doors are the spread plus
budgeted inbound links, never a cluster at the discovering corner.

## THE SHARD LAW (`FIELD_GEN.maxSpanCells`)

A contiguous Field blob bigger than the macro window mints as a CHAIN of
window-sized expanses: the region flood runs inside the fixed world-anchored
macro cell of its start cell, so the flood stays **entry-independent per
shard** (mint-once holds; probed by re-flooding from a second interior cell).
Neighbouring shards meet through the ordinary boundary-frontier law. Old
saves' pre-shard mega-regions are grandfathered by CONTAINMENT: a frontier
target inside a standing expanse's core rect resolves to that zone, so no
overlapping twin can mint.

## THE FOOTPRINT LAW (`footprintBars` + `fieldCoreRect`)

An expanse claims its **core rect** (stored region minus the pixel hedge
frame). Three enforcement points:

- **spacing**: `placeZoneAt`'s anti-crowd loop measures point-to-RECT distance
  for field zones — mints keep the biome spacing from the meadow's edge and
  can never stand on the expanse;
- **routing**: no auto-forged road whose BOTH ends stand outside the rect may
  cut across it (the shortcut over the meadow) — enforced in the installed
  route guard (weave), `nearestLinkable`, and `linkBackTo`; notarized deeds
  are exempt, and a road with an end INSIDE the rect is a spoke or a bay
  pocket's honest way out and passes;
- **retroactively**: roads forged before an expanse stood (the halo weaves
  the approach ring first) are severed at expanse mint
  (`severFootprintCrossers`, belt-protected: never a zone's last road, never
  a deed), and `World.reconcileWebLaws` runs the same sweep on restore.

## THE BYPASS RULE + THE MAP CLEARWAY (`WEB_CFG`)

- `chordNodeClear`: an opportunistic road whose chord passes within this of a
  third node's point is refused (drawn, it would run through that node's map
  disc) — the web reaches the far country through the neighbour instead.
  Checked by the weave and `nearestLinkable`; back-edges are exempt
  (reachability trumps).
- `mintRoadClear`: a fresh mint pushes perpendicular off any standing road
  chord until clear (deterministic, no rng — replays and co-op re-derive the
  same nudge) — a node minted on a road's line reads as a junction that
  doesn't exist.

## THE HEAL (`World.reconcileWebLaws`)

On restore (main.ts, beside the sea/river reconciles): field expanses stamp
missing berths, shed spokes past their budget (the sea-anchor degree-trim
precedent — farthest un-notarized first, belt kept), fold surplus `'?'`
promises, and sever footprint crossers. Ordinary over-budget country from
pre-law saves is left standing: the resolution gate stops new leaks, and
trimming a walked web's roads out from under a player is worse than
tolerating its history.

## Probe

`npx tsx balance/probe_webqa.ts` — grows real webs headless (3 seeds × 11
resolution rounds ≈ 600 zones) and pins: the budget law (0 over-budget), hub
berths + budget, the shard span + entry-independence, 0 footprint crossers,
0 one-way / duplicate edges, crossing/node-hit/crowding ceilings (the "messy
interlinks" gauge — 0.34 crossings/edge vs 0.89 pre-law), and the restore
heal end to end. `--report` prints per-expanse detail; `--seeds/--rounds`
scale the sweep.
