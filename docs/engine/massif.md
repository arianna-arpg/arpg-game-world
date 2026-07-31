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

## The four registries (everything is data)

**Mass shapes** (`registerMassShape`) — silhouette painters over genkit masks.
Built-ins: `blob` (noise-lobed disc), `slab` (the plopped rectangle, rotated,
ragged corners), `ridge` (a short wandering cliff line — never zone-spanning;
long marches stay the dunefield's business), `chain` (lobes fused along a
bearing), `court` (a lobed annulus punched by 1–2 MOUTHS, interior reported).
Content adds `crescent` (the hemicycle — massifs.ts) and `block` (the built
plot — settled.ts). Each declares a bounding `reach` (multiple of r) and
**clamps its paint inside it** — the spacing law below measures bounding
circles, so the guarantee is enforceable whatever the noise rolls.
Annulus shapes honor two kind dials through `MassShapeOpts`: `ringInner`
(ring thickness — thick fortress wall at 0.45, thin garden rail at 0.75;
per-shape historical default when absent: court 0.6, crescent 0.62) and
`mouthScale` (mouth width multiplier — applied INSIDE the lane-floor max, so
a dial can widen a gate but never narrow a punch below the weave guarantee).

**Mass kinds** (`registerMassKind`) — what a body IS. A kind names a
**registered region** (`world/regions.ts` carries collision, shot/sight
policy, pathing price, and the entire drawn look — the fabric adds no second
truth), picks weighted shapes, and bands its dressing and its residents:

- `skirt` / `crest` rows (`MassDressRow`) + chance/spacing — foot and crown.
- `inner` rows + `innerChance`/`innerSpacing` — **the stocked ring**: a
  court's own floor dressed off the live grid (brittle urns and pots paying
  through the ordinary breakage/drop chokepoints — no chest doodad exists,
  on purpose), standing 42px off the interior POI seat so the reachability
  promise and the garrison's spawn scatter keep their floor. Inner draws run
  LAST per body (after skirt → crest), so a kind that grows inner rows keeps
  its older dressing streams byte-identical.
- `garrison` (`MassGarrisonSpec`) — **the court comes pre-inhabited**: an
  ordinary `ctx.garrisons` row at the interior (the levelgen pre-inhabited-
  POI law: reachability guards it, world.ts posts the pack from the faction's
  own roster at zone load). `faction` absent = **the zone's PATRON** (the
  biome's power, `world/biomes.ts`) — a kind never hardcodes who holds it;
  the same ruincourt garrisons gnolls in the waste and the dead in a
  graveland. THE FORK LAW: the chance rolls on a per-mass fork of the body's
  own shape seed (`GARRISON_SALT`), never the layout stream — authoring a
  garrison perturbs garrisons ALONE; masses, weave and dressing are
  byte-identical with it on or off (probe rig G pins this).
- `sizeR` — a kind-default base-radius band (mesas run big in any pool).
- `mouths`, `ringInner`, `mouthScale`, `lobe`, `poiInterior` — court anatomy.
- `tenants` (`TenantRow[]`) — **THE RING TENANTS**: see the registry below.

**Tenant kinds** (`registerTenantKind`) — who HOLDS a court. Where the
standing garrison/inner chances are INDEPENDENT rolls (they can only sum —
"either garrisoned or stocked or empty, weighted" was unwritable), a kind
(or a pool row via `over.tenants`) may author a weighted TENANT TABLE: **ONE
occupancy draw per ring** on a per-mass fork of the body's own shape seed
(`TENANT_SALT` — the garrison fork law's sibling), resolving to ONE
registered tenant kind whose handler seats the occupant off the same forked
stream. The laws:

- **THE FORK LAW** — the layout stream never moves: the carve, the weave,
  every skirt/crest draw are byte-identical with a table present or absent
  (a vacant table leaves the WHOLE layout byte-identical — probe rig K).
- **THE REPLACEMENT LAW** — a non-empty table REPLACES the kind's
  independent garrison/inner chances (the table IS the occupancy law); the
  garrison spec and inner rows remain as the handlers' defaults. A kind
  without a table (or with an empty one) keeps today's independent rolls
  byte-identically.
- Courts only (needs a reported interior — the garrison's own rule);
  unknown tenant ids warn once and seat nothing.

The core four ship from standing machinery only: `garrison` (the
MassGarrisonSpec lane — patron default, ctx.garrisons row, reachability
guarded; row tailoring `size`/`faction`), `stock` (the inner dress lane —
`dressCourtFloor`, the SAME lattice/standoff law, rows/cadence from row ▷
kind ▷ framework), `cache` (a container KNOT past the POI seat's standoff,
paying through the ordinary brittle/drop chokepoints — no chest doodad
exists, on purpose, so the spoils law holds by construction; `rows`/`count`
per row, `tenantCacheCount`/`tenantCacheSpread` defaults), and `vacant`
(nothing — the weighted breather that keeps a court country from feeling
stamped). Content composes richer occupants by delegation (`tenantKindOf`):
`held_stock` (data/massifs.ts — a garrison keeping a stocked ring) is the
reference registrant. Dress handlers stand down under lite mints; occupancy
(garrisons) seats regardless, so a lite and a full mint agree on who holds
the ring.

**Future registrants, recorded not built**: a shrine tenant belongs to the
puzzle fabric's pass, a lair-mouth tenant to the lair fabric's, a
watch-post tenant to the watch fabric's — the registry is the door; those
passes walk through it without this fabric learning their names.

Engine ships the reference stone country — `tor` (crag blobs/chains),
`bluff` (crag slabs/ridges), `fold` (a drystone court; deliberately bare —
the reference vocabulary demonstrates the mechanism OFF) — and
`data/massifs.ts` grows the world's vocabulary: `hedge`, `ruincourt`,
`barrow`, the settled belt's `tenement`/`manor`/`butte`/`croft`, the
bastion's `bastion`/`high_court`/`curtain`/`gilt_ring`, the seraph city's
`pantheon`/`rotunda_court`/`amphitheater`/`grand_colonnade`, and the
tableland's `mesa`/`sand_court`. Garrison + inner debut authors: sand_court,
ruincourt, high_court, rotunda_court, gilt_ring.

**The `massif` layout recipe** — `ensureGrid` + `carveMassifs` + the
hollow-tor bores + registered post hooks + the per-exit belt +
`scatterDecoration`. Every dial is a layoutParam (spec ▷ tileset ▷ biome):

| param | default (`MASSIF_CFG`) | meaning |
|---|---|---|
| `massifMasses` | tor 3 / bluff 2 / fold 1 | weighted pool of `MassPoolRow`s (see below) |
| `massifSizeR` | [170, 320] | base radius band (px) |
| `massifCoverage` | [0.13, 0.22] | arena fraction the bodies aim to paint |
| `massifLaneW` | 110 | guaranteed open weave between bounding circles |
| `massifPortalClear` | 250 | portal standoff (mouths open onto country) |
| `massifMaxMasses` | 11 | body ceiling |
| `massifMinMasses` | 0 | body FLOOR (arms the rescue pass; see probe rig F) |
| `massifRescueShrink` | 0.45 | rescue ramp's size-relaxation floor |
| `massifPlaceTries` | 90 | dart budget |
| `massifLobe` | 0.34 | radial noise amplitude |
| `massifMouths` | [1, 2] | zone default court-mouth band (kind outranks) |
| `massifInsetMin` | 90 | dart border-inset floor (bodies may still bleed) |
| `massifSwallowCells` | 26 | heal: pocket size that fuses instead of breaching |
| `massifSeatGround` | false | darts must seat on walkable ground (cloud isles) |
| `massifBores` | — | the hollow-tor gallery spec (chance/max/minR/region/halfW) |

**`MassPoolRow`** — the per-zone tailoring grain: `{ kind, weight, sizeR?,
over? }`. `sizeR` remaps that row's bodies into its own band — a pure affine
remap of the already-rolled size (row ▷ kind ▷ zone; the rescue ramp's
shrink composes through as the bands' ratio), so it is **draw-free**: absent
bands touch neither the stream nor the value. `over` is a partial
`MassKindDef` (id excepted) merged over the registered kind at carve time —
EVERY kind dial (mouths, ring, dressing, garrison, inner, tenants…) is
reachable per row without minting a sibling kind, and the resolved def is
carried to dressing so tailoring reaches skirts/crests/inner too. The
court-of-sands face ships the demonstration: a second `sand_court` row with
`sizeR: [260,380]` and `over: { mouths: [2,3], tenants: [...] }` — the
GREAT courts, one data row, wearing their own occupancy table (held_stock
dominant, vacant 5% — what was worth building big is worth holding).

## The block TEXTURES

The configurability axis — same fabric, different fights, all carried by the
region row, never by code:

- `crag` / `ruin_wall` / `sandstone` — **TRUE WALL**: bodies, shots, sight all stop.
- `hedgewall` — **BLIND COVER**: bodies and sight stop, shots THREAD it.
- `drystone` / `gilt_parapet` — **PARAPET**: bodies stop; you duel ACROSS.

`sandstone` (the tableland's stone) is deliberately its own row rather than
`butte_top`: no tier semantics — a tableland mesa is a wall you round, never
a summit the needles recipe cuts ramps to.

## The weave law (why you can never get stuck)

1. **By construction**: mass seats keep `laneW` of open ground between
   bounding circles and `portalClear` off every portal; shapes clamp inside
   their declared reach; skirt dressing re-checks the lane law per piece.
2. **`healMassifWeave`** then walks the painted truth: sealed pockets ≤
   `massifSwallowCells` FUSE into the mass that trapped them; larger ones
   RE-OPEN at their natural pinch (BFS through the wall — the carve reads as
   a broken pass). Draw-free: zones that never pinch are byte-identical.
3. Court interiors become POIs → the universal reachability invariant's
   required points; garrison rows join the same net.
4. The universal invariant + `ensureDoodadNavigability` + genqa's checks
   hold as belt-and-suspenders, not mechanism.

## THE DIAL AUDIT (2026-07-30 — every constant opened or ruled)

The commission: "as equally modifiable, tweakable and customizable as
everything else." The walk covered `carveMassifs`, the dart, the shapes,
`healMassifWeave`, `dressMasses`, and `MASSIF_CFG`. Verdicts:

**Opened this pass** (absent == byte-identical, probe rig G + genqa diff):

| lever | grain | mechanism |
|---|---|---|
| per-row size band | `MassPoolRow.sizeR` | draw-free affine remap |
| per-kind size band | `MassKindDef.sizeR` | same remap, row outranks |
| whole-kind tailoring | `MassPoolRow.over` | partial merged at carve; carried to dressing |
| garrison | `MassKindDef.garrison` | fork-stream roll; patron-faction default |
| the stocked ring | `MassKindDef.inner` + chance/spacing | live-grid lattice, POI-seat standoff |
| ring thickness | `MassKindDef.ringInner` | court + crescent; per-shape default |
| mouth width | `MassKindDef.mouthScale` | inside the lane-floor max |
| zone mouth band | `massifMouths` | kind ▷ param ▷ CFG |
| dart inset floor | `massifInsetMin` | was literal 90 |
| heal swallow size | `massifSwallowCells` | optional arg on `healMassifWeave` for composition callers |

**Opened by the ring-tenants pass** (2026-07-30, probe rig K):

| lever | grain | mechanism |
|---|---|---|
| tenant tables | `MassKindDef.tenants` / `MassPoolRow.over.tenants` | ONE fork-stream draw per court (TENANT_SALT); replaces the independent garrison/inner chances |
| tenant kinds | `registerTenantKind` / `tenantKindOf` | open occupant registry; core garrison/stock/cache/vacant from standing machinery, content composes (held_stock) |
| garrison tailoring | `TenantRow.size` / `.faction` | passes through the MassGarrisonSpec lane (patron default intact) |
| stock tailoring | `TenantRow.rows` / `.chance` / `.spacing` | row ▷ kind inner ▷ framework, through the ONE `dressCourtFloor` law |
| cache knot | `TenantRow.rows` / `.count` + `tenantCacheCount` / `tenantCacheSpread` | container hoard past the POI-seat standoff, ordinary brittle/drop chokepoints |
| future occupants | `TenantRow.params` | open config door for later fabrics' registrants |

**Ruled fixed** (a structural guarantee is not a dial):

| constant | why it stays fixed |
|---|---|
| mouth lane floor (`laneW × 0.55`) | "the punch always goes through" — narrowing below the weave lane breaks the guarantee; `mouthScale` widens inside the max only |
| mouth seat/band derivation | pure corollary of `ringInner` (seat = band center, punch spans the band) — a second dial would let them contradict |
| dart inset slope (`r × 0.35`) | proportional bleed keeps a body from living outside the arena; the FLOOR is the honest lever and is open |
| `seatOnWalkable` ring (0.9r, 2-of-8, beyond-ring 1.7r 2-of-4) | the measured cloud-seat law (2026-07 bastion sweep) — data must not be able to author a floating bastion |
| rescue ramp shape (`placeTries/2`, linear) | measured convergence recipe; `massifRescueShrink` IS the dial |
| `healMaxIter` (6) | convergence bound, belt-and-suspenders |
| `healHalfW` derivation (`max(cell×1.1, min(48, laneW×0.45))`) | the breach must pass a body and never outscale the lane; rides the open `massifLaneW` |
| skirt fringe `grow(1)` / crest crown `erode(1)` | the rim IS one cell — a dial detaches dressing from the painted truth |
| skirt lane standoff (`laneW × 0.8`), reservation pad (20) | the weave guarantee at dress grain |
| inner POI-seat standoff (42) | the reachability seat + garrison scatter keep floor; ≈1.4 walk cells |
| cosmetic jitters (±5/±8/±6, rot ±0.5) | cosmetic grain; radius bands are the authored lever |
| `GARRISON_SALT` / `TENANT_SALT` | fork identity — changing either re-rolls every garrison/tenancy in the world, expressiveness zero |
| cache knot geometry (anchor tries, 24px piece sep) | cosmetic grain of the hoard read; `count`/`spread`/`rows` are the authored levers |
| shape `reach` values | per-shape structural declarations the spacing law trusts; new shapes declare their own |
| coverage measured on painted cells | definition of coverage, not a lever |
| `DEFAULT_MIX` | reference data; `massifMasses` replaces it wholesale |

**Known partial reach**: the `block` shape (engine/settled.ts) keeps its own
ring/mouth constants (`SETTLED_CFG.blockInner`) and ignores
`ringInner`/`mouthScale` — the settled belt owns its own dials; recorded
here so nobody hunts a phantom.

## Who wears it

- **THE DOWNS** (`downs`, `forceLayout: 'massif'`) — the fabric's home
  country; three faces re-mix one vocabulary through variant layoutParams
  (`the grey tors`, `the old fields`, `the barrowfield`).
- **THE TABLELAND** (`tableland`, biome `desert`, own depthAffinity band) —
  the desert's massif country: `mesa` tables (kind-band sized) and
  garrisoned, stocked `sand_court` rings in sandstone. Its
  **`the court of sands`** face is THE COURT COUNTRY — the extreme regime:
  court kinds ONLY at high coverage (0.24–0.3, 14 bodies), the walk between
  the walls IS the zone; probe rig I censuses it (weave one component, exits
  + interiors reachable, shipped chances seating guards, the great-court row
  live). A DEDICATED all-courts biome is a sanctioned follow-on — this face
  plus this audit are its readiness proof.
- **THE COURTLANDS** (`courtland` — the sanctioned follow-on, landed): the
  regime grown into a BIOME on the desert's rim. THE IDENTITY THESIS (full
  text at the courtland tileset header, data/tilesets.ts): the Sand
  Sarcophate walled every well along the one band where the waste gives out
  — and THE THRESHOLD RHYTHM is the country's law, the inversion no other
  country runs: **the open ground is the peril, the rings are the relief.**
  Structural, not narrated — sandstone TRUE walls end every open-ground
  engagement at a mouth you hold; the open between is hunted (the waste's
  packs), watched (posted `ushabti_sentinel` bodies sweeping watch-fabric
  fans), sun-hammered, and crossed by sandstorms that birth over the deep
  erg and arrive here as a neighbor's weather. Nothing but ring
  architecture, pinned: every pool row on every face rolls court/crescent
  silhouettes only — `sand_court` retuned per row (mostly-quiet 0.3, the
  KEPT courts 0.8 at [270,390]), the new `well_court` (thin ring, cistern +
  palm stock — the watered relief; THE RING-TENANT DEBUT: its occupancy is
  a kind-level table now — stock 56 / held_stock 14 / garrison 6 / cache 12
  / vacant 12, keeping the measured one-in-five dynasty answer exactly
  while opening the rare DRY WELL) and `fallen_court` (the breached
  crescent — free cover, no tenant). A BORDERING country by
  measurement, not intent: its climate row hugs the desert's wetter verge
  and the `desert_verge` field-band tilt coheres the family along that
  stratum (world/biomes.ts carries the measured numbers). Probe rig J
  censuses all of it; the tomb_dove's urn-roost (`WILDLIFE.courtland`) is
  the quiet-ring tell.
- **Highlands** (`foothills`/`snowcrown`/`stonecrown`), **tendersrows**
  (garden planter beds), **aether_bastion** + the seraph-city faces, and the
  settled belt's recipes via exported `carveMassifs`.
- **Retrofits**: `grove` bocage, `grave` sacked acres, `tundra` scoured fells.

## Growing it

- New mass kind = one `registerMassKind` in data (region + shapes + dressing
  + residents). New silhouette = one `registerMassShape` (declare honest
  `reach`, clamp inside it; honor `ringInner`/`mouthScale` if annular). New
  block texture = one region row. New OCCUPANT = one `registerTenantKind`
  (compose the core handlers via `tenantKindOf` before writing machinery —
  held_stock is the reference).
- A zone re-tunes ANY kind per pool row (`over`) — mint a sibling kind only
  when the identity is genuinely new, not for a chance tweak.
- `carveMassifs(ctx, def)` and `healMassifWeave(ctx, grid, laneW,
  swallowCells?)` are exported — any recipe can stud its own country and
  inherit the weave law.
- Registration rides `src/data/massifs.ts`, imported by `main.ts`,
  `sim/arena.ts`, and `balance/genqa.ts` (the one side-effect set).

## Verification

`balance/probe_massif.ts` — rigs: A weave law end-to-end + determinism,
B placement law, C courts reachable, D heal under starved-lane pressure,
E block textures + registry, F the floor + rescue prefix law, G the garrison
fork law + row grain + inner + ring dials, H the mesa/tableland census,
I the court-country regime census (incl. the shipped tenant tables),
J the courtlands biome census, K the ring tenants (fork law both ways,
replacement law, one-occupant exclusivity + weights, row grain, the cache
knot, registry resolution — every pin bite-verified at landing). `npm run
genqa` sweeps every tileland face beside the downs under the standard
invariants.
