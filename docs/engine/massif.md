# THE MASSIF FABRIC — open country that also says NO

`src/engine/massif.ts` · content vocabulary `src/data/massifs.ts` · probe `balance/probe_massif.ts`

## What it is

The generation gamut ran from pure openness (`plains`/`expanse`/`parkland`:
convex floors, small solids) to carved claustrophobia (`thicket`/`flesh`/
`winding`: solid negative space threaded by lanes) — with nothing between.
The massif fabric is the **mixture archetype**: a wide-open zone studded with
LARGE impassable interior bodies, so the field plays open — long sightlines,
wide floor — while the way across is a negotiation around the bones. The
D2 Act-1 / PoE-field read: you see the country; you walk AROUND it.

## The three registries (everything is data)

**Mass shapes** (`registerMassShape`) — silhouette painters over genkit masks.
Built-ins: `blob` (noise-lobed disc), `slab` (the plopped rectangle, rotated,
ragged corners), `ridge` (a short wandering cliff line — never zone-spanning;
long marches stay the dunefield's business), `chain` (lobes fused along a
bearing), `court` (a lobed annulus punched by 1–2 MOUTHS, interior reported).
Each declares a bounding `reach` (multiple of r) and **clamps its paint inside
it** — the spacing law below measures bounding circles, so the guarantee is
enforceable whatever the noise rolls.

**Mass kinds** (`registerMassKind`) — what a body IS. A kind names a
**registered region** (`world/regions.ts` carries collision, shot/sight
policy, pathing price, and the entire drawn look — the fabric adds no second
truth), picks weighted shapes, and bands skirt/crest dressing rows
(`MassDressRow`: doodad kind + weight + radius). Engine ships the reference
stone country — `tor` (crag blobs/chains), `bluff` (crag slabs/ridges),
`fold` (a drystone court) — and `data/massifs.ts` grows the world's
vocabulary: `hedge` (hedgewall lines), `ruincourt` (ruin_wall courts),
`barrow` (low crag mounds crowned with stones).

**The `massif` layout recipe** — `ensureGrid` + `carveMassifs` + the per-exit
belt + `scatterDecoration` (the tileset's own kit walk-gates into the open
weave for free). Every dial is a layoutParam (spec ▷ tileset ▷ biome):

| param | default (`MASSIF_CFG`) | meaning |
|---|---|---|
| `massifMasses` | tor 3 / bluff 2 / fold 1 | weighted kind mix |
| `massifSizeR` | [170, 320] | base radius band (px) |
| `massifCoverage` | [0.13, 0.22] | arena fraction the bodies aim to paint |
| `massifLaneW` | 110 | guaranteed open weave between bounding circles |
| `massifPortalClear` | 250 | portal standoff (mouths open onto country) |
| `massifMaxMasses` | 11 | body ceiling |
| `massifLobe` | 0.34 | radial noise amplitude |

## The three block TEXTURES

The configurability axis — same fabric, three different fights, all carried by
the region row, never by code:

- `crag` / `ruin_wall` — **TRUE WALL**: bodies, shots and sight all stop.
- `hedgewall` — **BLIND COVER**: bodies and sight stop, shots THREAD it —
  firing blind through your own hedge is the kind's whole conversation.
- `drystone` — **PARAPET**: bodies stop; you duel ACROSS the wall and walk
  around to the fold's mouth.

## The weave law (why you can never get stuck)

1. **By construction**: mass seats keep `laneW` of open ground between
   bounding circles and `portalClear` off every portal; shapes clamp inside
   their declared reach; skirt dressing re-checks the lane law per piece.
2. **`healMassifWeave`** then walks the painted truth: sealed pockets ≤
   `swallowCells` FUSE into the mass that trapped them (majority adjacent
   wall kind — no dead floor for spawns/loot); larger ones RE-OPEN at their
   natural pinch (a BFS from the pocket THROUGH the wall to the main
   component finds the thinnest crossing — the carve reads as a broken pass).
   Draw-free: zones that never pinch are byte-identical.
3. Court interiors become POIs, which joins them to the universal
   reachability invariant's required points — the mouth (or a rescue breach)
   is guaranteed.
4. The universal invariant + `ensureDoodadNavigability` + genqa's
   `reachable`/`portals` checks hold as belt-and-suspenders, not mechanism.

## Who wears it

- **THE DOWNS** (`downs` tileset, `forceLayout: 'massif'`; biome `downs` —
  the mild belt's drier SETTLED half, low-wildness gated): the fabric's home
  country. Three faces re-mix one vocabulary through variant layoutParams
  alone — `the grey tors` (crag-heavy), `the old fields` (folds, hedges,
  swallowed steadings), `the barrowfield` (mound country). Cache/ambush
  hollows carve into tor wall mass (the hollows fabric rides along).
- **Retrofits**: `grove` rolls the odd BOCAGE face (hedge/fold/tor),
  `grave` the SACKED ACRES (ruincourt/barrow/hedge), `tundra` the SCOURED
  FELLS (reference stone mix) — one allowedLayouts weight + a massifMasses
  row each.

## Growing it

- New mass kind = one `registerMassKind` in data (region + shapes +
  dressing). New silhouette = one `registerMassShape` (declare honest
  `reach`, clamp inside it). New block texture = one region row.
- `carveMassifs(ctx, def)` is exported — any future recipe can stud its own
  country with bodies and inherit the weave law (call it before your own
  scatter; it heals and dresses off the live grid).
- Registration rides `src/data/massifs.ts`, imported by `main.ts`,
  `sim/arena.ts`, and `balance/genqa.ts` (the one side-effect set).

## Verification

`balance/probe_massif.ts` (rigs: weave law end-to-end + determinism, the
placement law directly, courts reachable, heal under starved-lane pressure
with structural crowding proof, block textures + registry). `npm run genqa`
sweeps the downs faces and the bare recipe under the standard invariants
(portals, reachability, determinism, forbidOn, caveSeeds).
