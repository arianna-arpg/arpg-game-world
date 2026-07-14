# The Flux Fabric — living, shifting ground

`src/engine/flux.ts` (sim: FluxField + ConjuredGround) ·
`src/engine/gridSpine.ts` (the grid geometry both vertical fabrics share) ·
`src/render/vis/fluxLayer.ts` (draw) — the collapse fabric's sibling
(`docs/engine/collapse.md`): where collapse ground dissolves ONCE, flux
ground COMES AND GOES.

A zone whose **theme carries a `FluxSpec`** is built on cloud-stuff in
motion — the old-platformer promise, walked: PADS (stepping-stone platforms)
gather, stand, fray and disperse on seeded rhythms; CARRIERS (drifting cloud
rafts) shuttle along their lanes bearing whoever stands on them; GUSTS shove
the unwary toward the edge. Reading the environment's rhythm IS the
navigation; miss it and the sky lets you go (the collapse fall, shared —
the Aetherial's proportional drop to the world below).

## Everything derives from the painted grid

A layout paints three region kinds and is DONE — the field discovers the
rest at build:

| Painted kind | Becomes |
| --- | --- |
| `cloud_flux` / `_b` / `_c` | PADS — connected components OF ONE KIND phase as one platform each |
| `cloud_lane` | LANES — each band's skeleton hosts spaced, shuttling carriers |
| `flux_void` | the sky inside a flux basin (a `window` visual, NO edge) |

**THE ALTERNATOR IDIOM** — the trio exists so stepping-stone chains can be
CONTIGUOUS at generation (the reachability invariant walks them) yet
SEPARATE platforms at runtime: interleave `cloud_flux` / `cloud_flux_b`
down a chain (touching pads of different kinds never fuse — components are
per-kind) and hang satellites off it in `cloud_flux_c` (which fuses with
neither chain kind). A union flood here once welded whole chains into
200-cell mega-pads; the per-kind flood is the fabric's load-bearing line.

Any generator, stamp, formation or composition that can paint cells can
build flux country; the `FluxSpec` on the theme sets only the TEMPO. Pads
and lanes are WALKABLE at generation time, so the reachability invariant
(and genqa) prove the static layout; the runtime field then makes that
ground honest about not lasting.

## The data surface

**`FluxSpec`** (`ZoneTheme.flux`; variants override wholesale):

| Field | What it says |
| --- | --- |
| `phase` | `{ period, solidFrac, form, fray, scatter? }` — the pad rhythm: cycle seconds, walkable share, gather ramp, tatter warning |
| `carrier` | `{ radius, speed, dwell?, per? }` — raft rolls + end-rest + spacing (one per `per` units of lane) |
| `gusts` | `{ every, warn, hold, push, liftFliers? }` — the zone-wide shove and its warning |
| `fall` | the collapse `fall` shape verbatim (`below` / `eject`, damageFrac, coyote grace) |
| `warmup` | seconds the whole drift stands solid after entry (read the zone first) |
| `region` / `phases` / `carries` / `stable` | the kind vocabulary (defaults `flux_void` / `cloud_flux` / `cloud_lane` / `ground`) |
| `goal` / `portalClear` | ladder anchor (named doodad, else farthest exit) + solid-forever portal radius |
| `look` | `{ body, crest, fray }` render tints (defaults in `VIS_CFG.flux`) |

Omit `phase` and painted pads stand as permanent cloud; omit `carrier` and
lanes stay solid bands — each subsystem activates on its spec alone.

## The guarantees

- **THE LADDER** — pads the entry→goal spine crosses (± `rungHalo` cells)
  get COORDINATED offsets: consecutive rungs alternate half a period apart
  (entry-first order, small jitter), so a traveler who reads the rhythm
  always has a next step forming ahead. Off-spine pads scatter freely.
- **Waiting always works** — carriers shuttle forever (the raft comes back);
  a rung's neighbor re-forms within one period.
- **Doors hold** — flux cells inside `portalClear` of any exit (or the goal)
  SOLIDIFY at build into honest, baked, never-phasing ground.
- **The warmup warns** — everything stands solid for `warmup` seconds; pads
  that will open GONE fray visibly through the warmup's last seconds, and
  the lane-bands thin before they let go ("the drift begins" fires once).
- **Slivers solidify** — components under `minPadCells` / `minLaneCells`
  become plain ground (a two-cell blinker is noise, not rhythm).

## Contracts

- **Seed discipline** — the field rolls on `zoneSeed ^ FLUX_CFG.salt` with a
  dedicated Rng; it never advances layout/spawn rng (the fog contract).
- **Transience** — rebuilt each loadZone; leave and return and the drift
  restarts whole (worldstate movers doctrine).
- **Pure function of the clock** — pad phases and carrier positions are
  COMPUTED from t (never integrated), so the drift cannot desync; carriers
  hold still through the warmup and begin their runs at drift-begin.
- **The grid is the truth** — all mutation goes through `fillRegion`, so
  pathing, clampPos, castRay and spawn reachability read live ground with no
  flux-specific seams. AI crossings emerge free: a flow-field refresh after
  a pad re-forms routes the pack across it.
- **QUIET writes** — every kind the fabric writes is a `window` visual with
  no edge (bake-identical pixels), so its steady churn uses
  `fillRegion(..., quiet=true)`: version bumps (pathing stays honest), no
  dirty rects (floor chunks never stale, the ring never floods). The living
  cloud is DRAWN by the flux layer from field state — form, breathe, tatter
  exactly where the walkable truth is. Never paint a flux kind with a baked
  visual — and never let one BORDER an edge-bearing kind (`cloud_void`'s
  sunlit lip bakes by its neighbors' LIVE walkability; a pad that phases
  beside it strands a stale lip in the sky). Generators interpose the
  fabric's own lip-less `flux_void` — the drift recipe grows its basins
  under every pad and carries a gen-time tripwire warn genqa surfaces.
- **THE EDGE IS A DOOR** — the flux voids carry `boundaryPolicy: 'skyfall'`:
  stepping (or being SHOVED — a gale_lash sentence is real) past standing
  cloud IS the proportional fall to the world below. No confinement lip, no
  hard-lock: mistime every pad in a basin and the honest out is always down.
  Wings, levitation and airborne moves (dash/leap) are exempt — a
  zephyr_step sails the gap its own trail is still building.
- **Who falls / who rides** — the World prefilters (grounded, not flying /
  levitating / mid-leap / traversing) and routes: riders travel their raft's
  delta THROUGH `clampPos` (the mover contract), gusts shove through the
  same confinement, and every fall lands in `routeSkyFalls` — the ONE
  consequence path collapse and flux share (player → skyfall crossing,
  allies snap, the sky keeps the rest). The walkResolve hold-still guard
  (`flux.voidAt` beside `collapse.voidAt`) keeps a teeter a teeter, never a
  rescue-teleport.
- **Drift-begin scramble** — packs the spawn tables stood on cloud that has
  now left snap ONCE to standing ground at drift-begin (nothing rains out of
  an uncrossed zone); after that the drift claims what it claims.
- **Composition** — a theme may carry BOTH `collapse` and `flux` when their
  governed kinds are disjoint (melting decks between phasing stones).

## Conjured ground (the fabric's second half)

`World.conjureCloud(x, y, r, secs)` — walkable cloud CALLED INTO BEING, the
seam skills ride (a dash that leaves a cloud trail; a pad cast at the
cursor; a bridge over a melted causeway). Works in ANY grid zone, gated by
DATA: only region kinds flagged `conjurable` (cloud_void, flux_void) take a
conjure — the registry answers, never a biome check.

- Cells are ANNEXED from whichever fabric governs them — a collapse melt
  schedule marks them Immune and restores its conclusion on release
  (mid-crumble moments PASS while held); a flux pad skips annexed cells and
  rewrites its own truth when they return.
- Honest to the last: conjured cells tatter through `CONJURE_CFG.fray`
  seconds, keep a post-release teeter grace (`voidAt`), and route their
  falls through the same skyfall. Past `CONJURE_CFG.maxCells` the OLDEST
  release early — no infinite bridges.
- Zones with no vertical fabric (the sanctum) still take conjures over
  their authored sky-gaps; an expiry there scrambles (rescue snap) instead
  of dropping — no fall spec, no fall.

## Runtime shape

`World.flux: FluxField | null` + `World.conjured: ConjuredGround | null`,
built at the loadZone tail beside the collapse, ticked in `updateFlux` /
`conjured.update` beside it. Open predicates: `ownedAt`, `voidAt`,
`gustNow()`, `warmupFrac()`, `padPhase(pad)` — AI drives, packages and the
renderer all read the same field. Renderer: `drawFluxLayer` right after the
collapse overlay (clouds are GROUND: under doodads and actors); knobs in
`VIS_CFG.flux`; ablate pass `'flux'`.

## Extension seams

- A new shifting biome = paint the kinds + a `FluxSpec` on any grid theme
  (variants override wholesale — run three tempos on three faces).
- A new conjure skill = one `world.conjureCloud` call from any effect.
- Monster flux-craft: `FluxField` pads/carriers are open — an
  `x_ride_flux` AI action (seek a standing pad; hop before the fray) rides
  `padPhase` exactly like `x_seek_fog` rides the fog field.
- Packages may re-tempo a zone's drift by minting variants; event-spawned
  one-shot pads can ride `ConjuredGround` directly.
