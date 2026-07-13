# The Vertical Fabrics — collapse, traversal, understory

`src/engine/collapse.ts` (dissolving ground) · `src/engine/traversal.ts` +
`src/data/traversals.ts` (vertical crossings) · `src/render/vis/understory.ts`
(the world far below) — the three fabrics the ASCENT rides, each generic on
its own.

The Aetherial's cloud shelf is the reference composition: a geyser LAUNCHES
you (traversal) onto a lattice hung over the very zone you left, whose gaps
look DOWN on that land (understory through `window` region cells) and whose
ground DOES NOT LAST (collapse). Fall, and the land below catches you where
you dropped (traversal again, inverted). Any future rotting bridge-town,
cracking ice sheet, or dive-into-the-maelstrom reuses the same three seams.

## The collapse fabric

A zone whose **theme carries a `CollapseSpec`** is built on dissolving
ground. Needs a grid layout (`GridWalkField`); convex zones decline.

| Field | What it says |
| --- | --- |
| `region` | region kind melted cells become (`cloud_void` — a `window` visual) |
| `melts` | which walkable kinds can melt (default `['ground']` — roads, air pockets, structure floors stand) |
| `crumble` | seconds a cell visibly shivers/cracks before voiding |
| `contact` | `{ delay, radius?, warmup? }` — footfalls arm the floor; it follows you down |
| `ambient` | `{ start, band, jitter, holdout, sweep, halo? }` — the seeded rim-inward wavefront + the spine's own late, entry-first erosion |
| `fall` | `{ kind: 'below'\|'eject', damageFrac?, grace? }` — what losing the floor MEANS |
| `goal` | `{ doodad? }` — the never-melting platform the spine runs to (else the farthest exit) |
| `goalClear` / `entryClear` / `entryGrace` | protected radii (defaults in `COLLAPSE_CFG`) |

**THE GUARANTEE.** The schedule is computed outward-in over the
distance-to-spine field (BFS from the entry→goal walk); the spine erodes on
its own later clock, entry-first, and the goal platform NEVER melts — so a
runner who keeps pace always has standing ground ahead, all the way to the
exit. Dawdle and the causeway crumbles under your heels. Generation owns the
other half of the promise: the `aether_lattice` recipe pushes the gate into
`ctx.mustReach`, so the reachability invariant (and genqa) prove the path the
collapse erodes.

- **Seed discipline** — the schedule rolls on `zoneSeed ^ COLLAPSE_CFG.salt`
  with a dedicated Rng; it never advances layout/spawn rng (the fog contract).
- **Transience** — state rebuilds fresh each loadZone; leave and return and
  the ground has re-knit (the worldstate movers doctrine — the dream re-forms).
- **The grid is the truth** — melting goes ONLY through
  `GridWalkField.fillRegion`, so the grid's own version/dirty machinery
  re-bakes floor chunks (budgeted) and re-flows pathing; clampPos/castRay read
  live. No collapse-specific invalidation exists anywhere.
- **Who falls** — the field reports; the World routes. Fliers/levitators are
  immune (`a.flying || a.levitates`), mid-leap/mid-dash bodies are skipped
  (dash out of a crumbling cell!), the player gets the coyote `fall.grace`
  then the sky-fall crossing, ally seats snap to standing ground, and
  everything else is simply KEPT by the sky — no corpse, no loot, no credit.
- **Where you land** — every fall truly DROPS (`fall.kind: 'below'`): the
  anchored zone beneath (`ZoneDef.below`, 1:1 through the shelf's center),
  else the nearest charted SURFACE zone under the realm (open-ground landing,
  never on a portal), else home. `'eject'` remains the data option for ground
  that should scramble instead of drop. The LIP of a gap is a plain
  confinement — no damage, no per-frame recovery: the only fall is the floor
  leaving you.
- Runtime: `World.collapse: CollapseField | null`, built at the loadZone tail,
  ticked in `updateCollapse` beside fog/heat. Renderer wobble/crack overlay =
  `drawCollapseOverlay` reading `field.active` + `crumbleFrac(i)` (ablate pass
  `'collapse'`, knobs `VIS_CFG.collapseFx`).

## The traversal fabric

A **registered vertical crossing** (`registerTraversal` — rows in
`data/traversals.ts`: `sky_launch`, `sky_fall`): windup → rise (veil closes;
the ZONE SWAP fires at its end, hidden) → land (veil clears). The player is
pinned, skill-locked (`useLock`), untargetable + invulnerable; every dwell in
the game holds its breath (`!this.traversal` guards). The renderer draws the
pose (scale/lift/spin over a pinned, thinning shadow — `traversalPose`), the
wind streaks, and the whiteout veil (`traversalVeil`, covers the HUD by
design).

`World.beginTraversal(id, { swap, done, capture })` is the one entry.
`SidezoneDef.traversal: '<id>'` makes any mouth a crossing (the geyser); the
mint is split (`mintSidezone`) so the pocket def exists BEFORE the veil —
its `below` sizes the understory capture request.

## The understory

**What shows through `window` region cells** (`RegionVisualSpec.window` — the
ground baker CLEARS those cells instead of filling; the `edge` rim still
bakes, so every gap wears a torn cloud-lip). Drawn each frame under the
ground chunks (`drawFloor`), camera-center parallax so the land slides
against the shelf:

- **Captured mode** — during a launch windup the renderer snapshots the
  DEPARTURE zone (floor + coarse mottle + region cells + doodad silhouettes,
  clipped to the land's true bounds, altitude haze + desaturation baked) into
  an LRU keyed by the destination id (`TraversalCapture`). One-time cost,
  hidden under the cinematic.
- **Cloud-sea mode** (`ZoneTheme.understory: 'cloudsea'`) — the endless
  procedural deck; also the fallback when a shelf's capture never existed
  (dev jump, resumed run). Drifting cloud shadows cross both.
- `ZoneDef.below: { zoneId, ax, ay }` is the shared anchor: the shelf's
  center hangs over `(ax, ay)`, so falls map 1:1 and the capture window
  frames the same ground the holes reveal. Pure data; serializes verbatim.

## The Ascent composition (the reference rider)

`sky_geyser` mouths roll per eligible open-sky zone
(`World.placeAscentGeyser`, seeded per zone, gated + ignition-scaled through
`sim.ascentField` — packages/defs/ascent.ts holds every number). The shelf
mints from the `aether` tileset (variant faces per mouth), plays as ESCAPE,
and its far end raises the `ascendant_gate` — a **`DimensionEntry.gateDoodad`**
realm gate: the dwell loop scans every registered dimension's gate doodad
(data, never a kind literal) and `enterDimension('aetherial')` mints The
Firmament. Hell is delved into; heaven must be survived into.

## Extension seams

- A new dissolving biome = a `CollapseSpec` on any grid-layout theme (variants
  override wholesale — the aether's three faces run three tempos).
- A new crossing = one `registerTraversal` row + a `beginTraversal` call (or a
  `SidezoneDef.traversal` tag).
- A new realm gate = `DimensionEntry.gateDoodad` on a dimension row.
- A new below-view = set `ZoneDef.below` at mint (captured) or
  `theme.understory` (procedural).
