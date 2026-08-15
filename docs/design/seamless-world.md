# THE SEAMLESS WORLD — the unbroken-country charter

*Branch `seamless-world`, chartered 2026-08-11 off her commission: "what would
adjusting zones themselves to actually be one cohesive, concurrent, infinitely
generating world look like (notwithstanding Lastlight)… absolving the actual
zone exit and entries in favor of dynamically adapting and updating the entire
worldmass in accordance with what is approximately on the world MAP." Recon
reports: the landing session's seamless_A/B/C sweeps (zone lifecycle, geometry,
render/perf), 2026-08-11 at HEAD 1f04c5a.*

## The verdict up front

Feasible, staged, and the repo is unusually well-positioned — but it is the
project's largest single transformation, and it must be built as a MODE, never
a rewrite. Roughly half of the problem is already solved by landed fabrics
that were built for other reasons; the other half is one hard, well-bounded
migration (the one-zone simulation plane) plus one design law that must be
committed early (the scale law).

**What is already worldmass-continuous at HEAD:**
- The GLOBAL FIELDS: climate, elevation, biome, continents, seas, rivers, the
  level field — all pure f(MapCoord, seed), no horizon (world/relief.ts,
  world/biomes.ts, world/climate.ts). The country between zones already has an
  answer for "what is here?" at every point; nobody asks it yet.
- The FORECHART: a budgeted sweep already keeps a fully-minted, veiled ZoneDef
  halo around the walker (ring 1000, world/forechart.ts) — the data plane
  already streams; only the sim plane doesn't.
- A REAL TERRAIN CHUNK STREAMER: the scene far-field dress mints 720px chunks
  as pure f(seed, cx, cy) with seed-ahead 760 / cull 2600 (engine/scenes.ts
  ~261-334), and boundless scenes stream collision straight off the continent
  field. The Descent and the voyage are two more streaming-terrain precedents.
- LRU RENDER CACHES: ground chunks (60 × ~0.8MB) and canopy slices (96-cap)
  already evict continuously and were built for boundless walks — their only
  zone residue is zone-local chunk keys + the drop-everything zoneRef flip.
- THE EVICTION MODEL her memory question asks for: ZoneMemory already freezes
  struck-but-unkilled enemies to scalar rows ({defId, level, x, y, life, …} —
  statuses/cooldowns/aggro/brains deliberately drop) and rematerializes them
  on return (restoreZoneEnemies). The law exists; it is merely keyed to
  whole-zone visits instead of distance rings.
- THE LOD SUBSTRATE: the lite tier is a fixed-cost SoA crowd pool with
  promote/demote round-trips; DiscIndex/ActorGrid are Map-bucketed and
  coordinate-unbounded (±4.2M units by design).
- CROSS-NODE INTERIORS ARE LANDED CODE: the Rooted Web's under-spans
  (data/underspans.ts, ZoneDef.underways) already give one interior with
  mouths in different map nodes.
- The MAP IS ALREADY LITERALIZED TWICE: FIELD expanses render node space as
  walkable ground at clamp(3..68) px/unit, while ordinary zones imply
  ~27-51 px/unit — two scales ~6× apart, which is exactly the incoherence
  this charter closes.

**What is structurally one-zone (the actual work):**
- `World.zone` anchors ~130 zone-local fields; `loadZone` is a synchronous,
  indivisible teardown/rebuild (the measured 100-200ms entry-stall class);
  the actor carry keeps only seats + owned minions.
- `World.update` is ~75 subsystem sweeps over singleton `actors`/`doodads`.
- The co-op wire (StateSnapshot.zoneId, one actors array, whole-list ZoneMsg)
  and the save's single SavedPlayerSpot are one-zone-shaped.
- ~30 transient classes (drops, corpses, projectiles) rely on the loadZone
  boundary as their discard moment.

## THE THREE LAWS (committed now, on the branch)

**1. SEAMLESS IS A MODE, NOT A REWRITE.** `World.seamless` gates everything.
The discrete path remains intact and byte-identical with the flag off; the
133-probe lane, genqa, and the balance harness run discrete and stay green on
every branch commit. Seamless grows its own probes beside them. This is what
keeps the branch continuously gated, mergeable, and honest — and it means the
experiment can be judged by play, not by sunk cost.

**2. EMBED, DON'T MERGE — zones stay places.** The worldmass is not "zones
glued edge-to-edge"; it is the world map made literal, with each zone's
authored layout minted at its map seat and THE CONNECTIVE TISSUE poured
between them from the global fields (biome-dressed wilds ground carrying the
literal roads). Zones keep their identities, objectives, memories, event
seats, package keying, and their ZoneDef graph — the graph stops being a
teleport diagram and becomes a map of real places. Exits stop being doors and
become thresholds; the tissue is the country between. (Interiors, caves,
dimensions, the sea's voyages, and Lastlight's rooms stay portal'd — her own
carve-out, and the recon's: they are off-graph or sealed by law already.)

**3. THE SCALE LAW.** One committed, axis-consistent scale: **32 px per map
unit** (inside the implied 27-51 band; median node spacing 78-86 units →
~2500-2750px between node centers, which sits inside today's 2300-4400px zone
width band — adjacent layouts nearly tile at current sizes, which is why this
is feasible at all). FIELD expanses re-anchor to the same constant. Every
future authority reads ONE conversion (`world/coords.ts` grows `PX_PER_UNIT`).
Zone layouts whose rolled size exceeds their map footprint shrink their roll
band per-tileset (a data pass, not an engine change).

## THE ACTIVE SET (the simulation model)

A distance-ringed LOD ladder replacing "the one loaded zone", built almost
entirely from landed law:

- **Ring 0 — LIVE** (the hero's chunk neighborhood, ~today's zone extent):
  full simulation, exactly today's budget. The perf gate's numbers are the
  contract: ring 0 never holds more live bodies than a dense zone does today.
- **Ring 1 — DROWSY** (adjacent country): actors resident but on divided AI
  cadence, no fx, no fine flocking — the lite tier's batch-steering posture
  applied to real actors.
- **Ring 2 — FROZEN** (loaded-but-far): the ZoneMemory freeze applied at
  region grain WITHOUT leaving RAM — bodies demote to memo rows, doodads to
  their seeds + memory deltas. Thaw on approach. Her wounded-enemy concern
  resolves here by existing law: position + life + level survive; brains,
  statuses, and aggro drop, exactly as re-entry works today.
- **Ring 3 — REMEMBERED**: today's ZoneMemory scalars on disk-facing state,
  unchanged.
- **Ring 4 — FOREORDAINED**: ZoneDef graph + pure fields, unchanged (the
  forechart already maintains it).

The one `actors` array stays one array; bodies carry a ring tag maintained by
the streamer, and the ~75 update sweeps gain a cheap ring-mask early-skip
(most already skip dormant/far bodies by other predicates). The ~130
zone-local World fields migrate behind a `Region` handle gradually — `zone`
becomes "the region the hero stands in", which keeps every zone-ID-keyed
consumer (objectives, overlays, packages, vendor beats, zone memory) working
untouched through the whole migration. Transient discard (drops, corpses,
projectiles) re-sites from the loadZone boundary to ring demotion.

## THE PARTITION LAW (M1.5 — her edge-to-edge ruling, 2026-08-12)

Her words, near-verbatim, after walking the ring live: zones should "slot
into entirely non-overlapping indices", their generation "almost push off of
each other"; "the world map and its nodes drive the WHERE of generation, but
the actual HOW of generation is effectively entirely dynamic and maps
directly into the next zone by LEVERAGING the world map"; and the bleed-in
between adjacent zones "would effectively work as the blending of the zones
so that the transition happens nicely rather than being abrupt." This
RATIFIES the edge-to-edge model over embedded-with-wide-tissue, and AMENDS
Law 2's geometry half (zones remain authored PLACES — that half stands;
what changes is how their ground claims the plane):

- **THE CELL FOLD** (world/cells.ts, landed with this amendment): every
  surface node claims an axis-cut cell — midpoint cuts toward each near
  seat, clamped at `PARTITION_CFG.cellMaxHalfPx` — non-overlapping BY
  CONSTRUCTION (the cut axis is a pair property computed identically from
  both ends; both cells clip at the same line). Pure f(seats); probe_cells
  pins the law over grown webs. The fold guarantees NON-OVERLAP, never full
  coverage: axis-cut triple points open small unclaimed WEDGES (~500-600px
  worst measured) that stay tissue — the blend's food, bounded by pin.
- **THE FITTED MINT**: a resident zone's arena derives from its CELL — the
  authored size roll stands down in seamless mode (the tileset band goes
  advisory; THE SIZE TENSION is flagged below). The cell edge is the true
  rim; overlap between residents becomes impossible at the source.
- **THE OPEN BORDER**: where a link crosses a border, the crossing is open
  walkable ground — walled layouts carve a walk-mouth at the way (the
  walled-rim strand find becomes law: walls-with-gaps, D2's own cliff-line
  grammar). Elsewhere the border may wall or hedge per theme.
- **THE BORDER BLEND**: the tissue sampler re-scopes from country-between to
  the BLEND BAND — within `blendBandPx` of a border, both cells' themes
  gradient into each other (the meld grammar at world grain); interstitial
  wedges dress as blended tissue; a wide cell's outer margin reads as its
  OWN zone's sparse outskirts, never no-man's-land. Roads unchanged.
- **WHAT SURVIVES UNCHANGED**: the ring streamer, the threshold rebase (the
  rect test becomes the cell test), all three world-keyed render lanes, the
  open ways, determinism, the mode law, the save/co-op refusals.
- **THE SIZE TENSION (flagged, her eye owed)**: per-tileset size bands
  express identity (a den is small, a field is vast); under the partition,
  cell geometry rules. The web's own spacing clusters at current-size scale,
  so most zones barely change — and a future worldgen pass may seat nodes
  SIZE-AWARE (the map minted WITH the intent, the deepest reading of
  "leveraging the world map"). Expanses keep their standing literal law.

## HER FEEL VERDICT + THE ENCLOSURE DOCTRINE (M2 opens — 2026-08-13)

She walked the partition build. Verdict, near-verbatim: "this is actually
really, really cool… a huge number of kinks, but I kind of really like the
general feel." Her five observations, each ratified into a fix:

1. **Optimization** → the dense soak answered it (section below): quiet sim
   ≈ discrete cost (+0.34ms/tick); the true cost is THE CROSSING STUTTER
   (60-127ms rebase in the open, no door fade to cover it). Quick cuts
   (approach-bearing partner pick, no same-tick admissions on rebase ticks)
   fold into wave 5; THE SOFT CROSSING (the rebase amortized across frames)
   is wave 6's world.ts headliner.
2. **"Zones basically enclosed, with the old entrances carving passage gaps
   in those borders"** → THE ENCLOSURE: per-tileset border dress (wall /
   hedge / cliff / treeline rows) around the cell perimeter, carved open at
   the agreed points — walls-with-gaps everywhere, not only on
   naturally-walled layouts. D2's own edge grammar, universal.
3. **"Massive gaps between zones… filled in as untraversable walls colored
   per the bounding biomes"** → THE SOLID BETWEEN: walkable tissue NARROWS
   to the passage corridors (the roads + mouth aprons); wedges and long-link
   country become impassable mass wearing the blend's tones (the ONE WEIGHT
   LAW already colors them by the bounding zones). This AMENDS the earlier
   open-tissue reading — the world reads as zones joined by passes, never
   featureless country. Roads stay literal: a long link is a mountain pass.
4. **"Entities treat borders as strict walls; zones flash in and out"** →
   THE NEIGHBOR LIFE (wave 6): ring-1 population resident at drowsy cadence
   — visible across borders, no first-arrival flash, crossings through
   passages for aggro'd bodies. The charter's drowsy ring, promoted by her
   observation from LOD nicety to feel-critical.
5. **"The veil acts as if the player has no visibility into bordering
   zones"** → THE VEIL ACROSS BORDERS (wave 5, render): the sight veil
   gathers occluders from resident neighbors' mints and treats their open
   ground as open air — the veil answers walls, never administrative lines.
6. **"You can walk INTO an away zone's walls from outside"** → THE FAR-WALL
   LAW (wave 5, folded into the enclosure lane): a resident neighbor's wall
   cells refuse entry from tissue — walls are walls from both sides; the
   rim consults the resident mint grids, not just cell membership.

## The movements

- **M0 — THE TISSUE WALK (the spike; 1-2 focused sessions).** Behind
  `?seamless`: pick two adjacent wilds nodes, mint both layouts resident at
  their map seats at 32 px/unit, pour tissue between them off the global
  fields using the scene far-field chunk streamer at gameplay grain (walkable,
  collision-honest, road drawn), and WALK from one into the other with no
  loadZone. Combat stays ring-0-only. Deliverable: the feel, on video, plus
  frame telemetry. This answers "how would it play" for the cost of days.
  *M0 keel decisions (committed 2026-08-11 with the keel + the three lane
  briefs):* THE REBASE AT THE THRESHOLD — the live sim keeps the ACTIVE
  region's zone-local frame (every zone-local assumption survives); tissue
  and the neighbor are addressed through the frame transform; crossing the
  threshold rebases all live positions by the seat delta in one
  between-frames step with the camera compensating — visually continuous,
  structurally conservative, replaced by true multi-region sim in M1. The
  away region's population stays unmaterialized until first arrival (M0's
  ring-0-only cut); seamless M0 runs refuse saves and co-op outright.
- **M0.5 — THE OPEN WAY (landed 7a67238, her greenlight 2026-08-12).** The
  direction ratified in her words: the D2 walk — "no actual exit or entry,
  just a marked pathway the player passes through entirely unhindered."
  Between resident zones the door is gone: `seamlessWalkExit` is the one
  predicate (no dwell, no lock hint, no drawn mouth; the exit ROW survives
  as the graph's truth), and a signpost pair flanks the road at each open
  way. Doors beyond the resident set remain doors — M1 grows the set until
  surface doors vanish. Found seam for M3: escape-class objectives speak of
  "the way out" — their semantics on a doorless surface need the laws
  movement.
- **M1 — THE ACTIVE SET.** The ring ladder, freeze/thaw at region grain, the
  ring-tagged array, world-keyed render chunks (re-key ground/canopy from
  zone-local to world coords; doodadFamilyRev is the decoupling seam),
  threshold travel replacing loadZone on the surface. The big one.
  *M1 frame direction (set 2026-08-12 with wave 1):* GENERALIZE THE REBASE,
  don't rewrite the frame — the resident PAIR becomes the resident RING
  (membership by map distance, demotion through the zone-memory law that
  already owns away-state), the threshold rebases into whichever resident
  rect the walker enters, and the active-local frame stays sovereign. The
  world-frame rewrite stays on the shelf unless the ring model hits a wall
  M2 cannot dress.
- **M2 — THE COUNTRY DRESS.** Tissue to authored quality: literal roads
  (the web's own polylines), meld-grade biome blending, wayside dress, water
  honesty at shores; exits→thresholds everywhere on the surface; the world
  map pane becomes a true projection of the ground.
- **M3 — THE LAWS RECONCILED.** Events/packages/forechart/omens/Quickening on
  the continuum; waypoints stay teleports (fast travel is a feature, not a
  casualty); a seamless perf sweep + probe_seamless join the gates.
- **M4 — COMPANY.** Co-op regions on the wire (couch first — it shares one
  camera and mostly rides free; remote co-op ships the host's active set),
  save widening (frozen-ring rows ride zone memory's serialization).

Honest effort: M0 is days; M1 is the largest single engine migration this
repo has attempted (multi-week of sessions, landable in gated slices because
of Law 1); M2-M4 are each ordinary pass-scale. Recommendation: run M0, judge
the feel together, and only then commit to M1.

## Named risks

- **Perf is the sovereign risk**: ring 1 must be genuinely cheap or the
  75-sweep loop pays N×. The lite tier proves the posture works; the perf
  harness gates it (`entryWorstGapMs` becomes a threshold-crossing budget).
- **Determinism across materialization order**: mints are seeded per-zone, so
  proximity-order materialization is safe; the tissue must be pure
  f(seed, chunk) like the far-field dress it copies.
- **The web laws go physical**: roads/degree caps/occupancy were tuned as a
  diagram; as literal ground some numbers will want her eye (M2 flags them).
- **Save compatibility**: Law 1 keeps discrete saves valid; seamless saves add
  rows, never reshape (the save-envelope port's loaders-own-trust precedent).

## Branch mechanics

Worktree `D:/Games/Claude/arpg-seamless` on branch `seamless-world` (node
modules junctioned; gates run in-place). Merge cadence: pull main → branch
after each main landing train; the mode flag keeps merges mechanical. Nothing
merges back to main before M1 is judged. Sessions working the branch declare
ownership in-worktree as usual; the main tree's chip loop is untouched.

### The dense soak (2026-08-13)

*The M1.5 wave-4 measurement pass — the fitted pass's coda 7 and the ring
pass's coda 3, answered with numbers. Headless sim-clock rigs
(`balance/scratch_soak_longwalk / _tightweb / _evalscan / _soaklib`,
untracked), the probe's own seeds (global `0x5ea51e55`, world `0xa11e`),
run SEQUENTIALLY against the LANDED bytes at `8ea9ad8` in a detached
measurement worktree (the mouth-alignment sibling was mid-flight in the
shared tree — half-built engine bytes would have poisoned every number;
the perf-wedge hunt's dirty-shared-tree verdict lane, reused).*

**THE LONG WALK (10 thresholds, road-following, hostiles stripped; web grew
130 → 340 zones under the walk).** Update-tick distribution p50 1.02ms /
p95 5.51 / p99 6.53 / max 127. The tick classes, attributed by wrapped
chokepoints: QUIET 12,480 ticks (p50 1.02, p99 6.28, max 9.5 — the discrete
parked control reads p50 0.68 / p99 5.19 in the same zone, so the seamless
per-tick overhead is ~+0.34ms at 340 zones, almost exactly the eval beat);
CHART-BURST 46 ticks (p50 9.4, max 46 — the forechart sweep's node mints,
discrete-identical class, control shows the same); MINT-BEAT 13 ticks
(p50 20, max 43 — the budgeted admission: one fitted layout mint, a 1-3
frame hitch on a 60fps client); and THE CROSSING, the worst class by far.
**Rebase ticks ran p50 ~60ms, worst 127ms** — the whole loadZone rides the
threshold tick, and the worst stacks THREE costs: the rebase's load, a
partner-miss REFRESH re-mint (4 of 10 arrivals entered by an edge the
record hadn't assumed — `seamlessPartnerFor`'s nearest-linked guess missed
40% on a real walk), and the tail beat's own admission (mintN=2 on the
three worst crossings). Populated lane B: parked ambient p50 3.6ms / p99
12.4 at ~89 actors; the populated crossing cost 43ms with the court riding.
Ring churn over the walk: 24 fresh mints, 4 refreshes, 0 refits, 16
demotions, ring peak 8 members.

**THE TIGHT WEB (692 surface zones charted; 661 eligible cells folded).**
The floor is UNEXERCISED on web-law ground: min cell axis 1,387px, p5
1,836, p50 2,499 — **zero cells below the 900px admission floor, zero even
below 1,200**, and across 2,079 cell-step observations under four growth
steps, 34 cells shrank but **0 crossed the floor while standing**. The
occupancy/hover-clear laws keep the partition far from its own guard rail.
The mint bench (68 smallest admitted boxes, real `seamlessMintResident`,
then demoted): **0 throws, 0 side-misses** — every openable way's side is
reached by the largest walkable component, including all 11 walled faces
(seal >80%: jungle/gloamwood/gutworks/crypt keep their corridor identity at
17-52% walkFrac and stay connected, largest component 93-100%); the 12
"fragmented" mints are sliver pockets (≤3-7% of walkable), the discrete
game's own texture. Forced SUB-floor boxes (what the unguarded refit lane
would pass): generateLayout degrades gracefully to 320px — no throw at any
size, mouths hold, only door-guarantee/portal-overlap heals fire (≤640px).
Mint cost scales with cell AREA: bench p50 13.6ms but p95 103 / max 134ms
on 3-5k-px cells — the admission budget counts MINTS, not pixels.

**THE EVAL SCAN (coda 3 sized).** Quiet-beat `seamlessEnsureBoot` cost is
linear in zoneMap: p50 0.06ms @ 138 zones → 0.29 @ 619 → **0.51 @ 978 →
0.77 @ 1,386 (crosses 0.5ms/beat at ~1,000 zones; slope ≈ 0.57ms per 1,000
zones)** — the candidates() full-map walk plus the seamlessCells KEY BUILD,
which allocates `Object.keys(zoneMap)` per call (0.089ms/call @ 1,386
zones) and is consulted (members+1)× per beat, so a walking ring of 8 at
1,400 zones pays ~1.4ms/beat before anything mints. The two REBUILD terms
are worse and stack on admission beats: `foldCells` is O(S²) — 0.3ms @ 138
seats, 5.5 @ 619, **31ms @ 1,386** — and `buildTissueSampler` (its own fold
+ road capture) reads 1.3 → 8.2 → **40ms @ 1,386**, re-run after EVERY
admission. At today's walk scale (300-700 zones) an admission beat pays
mint + ~2-8ms of rebuilds; at 1,400+ zones it pays mint + ~70ms. The fold
cache itself holds: 99.95% hit rate walking (42 refolds / 80,017 consults),
100% parked.

**MEMORY (engine-side; render caches are code-audited below).** Heap after
gc: 71.7MB at first arrival → 75.8 after ten crossings (+4.1MB ≈ 210 newly
charted defs + 10 zone memories + the standing ring) → parked slope +0.2MB
per 2,500 ticks (≈flat) → resting 76.3 (2.0 of it the rig's own preallocated
telemetry). **Demotion and replacement genuinely release**: a WeakRef
census over all 20 dropped layout records reads 0 reachable after
turn-end gc. (Census law learned the hard way: same-turn WeakRefs sit on
the spec's kept-alive list — a synchronous-script census convicts the rig,
not the engine; the rig yields the turn before judging.) The four
world-keyed render LRUs hold by construction at `8ea9ad8` — tissue 24
chunks / ground 72 / bodies 48 (`SEAMLESS_DRAW_CFG`, seamlessDraw.ts:86/
101/116, eviction loops :225/:404 + ground.ts's working-set guard) and
canopy under the global `VIS_CFG.canopy.maxSlices` LRU — all mint-identity
invalidated; headless can't exercise pixels, so the live qa-drive lane owns
their runtime verdict (the worldchunks pass already flags ground 72 as
pair-sized against a ring of 8).

**The worst finds, each with its prescription:**

1. **The crossing stack (worst tick 127ms).** The threshold tick pays
   loadZone + a 40%-miss partner refresh + the tail admission. Fixes, in
   order of value: predict the partner from the walker's approach bearing
   (the admission already knows the border being neared — feed it to
   `seamlessPartnerFor` instead of nearest-linked), and skip same-tick
   admissions when the beat already carried a rebase (one clause in
   `seamlessEnsureBoot`'s admission slice; the mint waits one beat by law
   anyway). Both live in the mouth-alignment lane's own seam — hand them
   with it.
2. **The ~1,000-zone scaling wall.** Three terms, one shared cure: (a) hoist
   ONE fold read per eval pass and key the cells cache on a maintained rev
   (the scan-lattice's `(identity, count, disturbance)` triple) instead of
   per-call `Object.keys` (world.ts:6551 — 6 allocs of the whole key set
   per beat); (b) give `foldCells` and `candidates()` a coarse seat-bin
   index (reach is already 2×cellMaxHalfPx — 9-bin neighborhoods make the
   fold O(S·k) and the scan ring-local; the webperf lattice precedent);
   (c) take `buildTissueSampler` off the admission tick (defer one beat or
   rebuild bin-scoped). None is due before M2 — today's halo sits well
   under the wall — but M3's long-horizon play will cross it.
3. **Area-blind mint budget.** `mintBudgetPerBeat 1` admits one 134ms mint
   as readily as one 14ms mint. If the admission hitch reads on the live
   client (perf harness's entry-burst lane), budget by area or defer
   oversized mints to consecutive beats; flagged, not urgent — 13 mint
   beats in 12,500 ticks.
4. **The refit lane skips the floor** (world.ts:6797-6807 re-mints on cell
   drift, and updateSeamless's exits-drift loop likewise, with no
   `minArenaPx` clause — the admission filter alone carries it,
   :6818-6820). Empirically unreachable today (0 floor crossings in 2,079
   observations), so this is one cheap insurance clause — demote-to-door
   instead of re-mint when the live cell falls under the floor — not a
   fire.
5. **Two of twelve hops never crossed** (gen_11→gen_17 with a compliant
   border way standing; gen_14→gen_21 without one — the walker routed
   through gen_22 instead). The road chord and the carved mouth can
   diverge: a march crossing the border OFF the mouth meets the far side's
   wall band and defers forever. This is the mouth-alignment commission's
   exact case, now with a headless repro (the soak seeds, park in gen_11,
   target gen_17) — corroboration for the sibling, not a new lane.

### The neighbor life (M2 wave 6 — 2026-08-13, the neighborlife pass)

*Her kink 4, promoted feel-critical, built: ring-1 population RESIDENT at
drowsy cadence — visible across borders, no first-arrival flash, crossings
through passages for aggro'd bodies. All behind `world.seamless`; every dial
FLAGGED (`SEAMLESS_LIFE` in world.ts: drowsyCadence 4 / populatePerBeat 1 /
populateSalt).*

- **THE RING TAG** (`Actor.ringRegion`): set ONLY on bodies standing in a
  neighbor region — the active zone's own bodies and all of discrete play
  leave it undefined, so every consumer clause reads one undefined (the mode
  law's shape). The tag is PROVENANCE, not posture: a roused body keeps it
  while fighting across borders, so THE SCOPING LAW holds mid-chase.
- **POPULATION AT ADMISSION, SLICED**: `spawnZonePopulation` is loadZone's
  population block factored whole (byte-order preserved; the discrete path
  is the same call with both lanes open) behind two lane gates — `bodies`
  (packs/contest/war/boss/spawners/siphon/camps/garrisons/landmark/bounty/
  wildlife) and `fixtures` (spires/hold fixtures/escort/scenery/puzzle/
  throng/lite boots + announcements + zone-scoped state). The ring beat
  gains THE POPULATION SLICE: on beats that mint no layout, ONE unpeopled
  member stands its roster through the bodies lane inside a scoped swap
  (fresh on `def.seed ^ populateSalt`, or a REMEMBERED region's memo
  replayed — spawn-then-swap scoped to the batch), then translates into the
  live frame and tags. Bodies and ground never bill the same tick (THE
  SLICING LAW); the town anchors a ring it never peoples (population defers
  until an active frame stands).
- **NO FLASH AT THE THRESHOLD**: the rebase carries the whole tide — the
  destination's standing bodies PROMOTE (tag drops before the objective
  stamps read the floor; the fresh-spawn ladder and the memory restore stand
  down whole), the departed zone's base population DEMOTES IN PLACE by tag
  (the memo-roster predicate names the set; event transients keep the door
  law), and every position-bearing field shifts by the seat delta through
  ONE helper (`seamlessShiftFrame` — pos, anchors, posts, trails, worm
  segments). The same actor ids stand on both sides; region-local seats are
  the invariant (probe RIG K3 pins it). The landing scatter learned to skip
  tagged bodies — only the party re-seats at the door.
- **THE DROWSY POSTURE**: one world-side predicate pair
  (`seamlessDrowsy` / `seamlessDrowsyGate`) consulted at TWO one-line ai.ts
  seams — updateAI's top (think every Nth beat, staggered by id; roused =
  the standing lock predicate `aggroed || aiTargetId` = full cadence) and
  the aiFlock stamp (no fine flocking while drowsy — the lite batch-steering
  read). No fx built for the tide (its footprint IS the divided cadence);
  statuses/regen/death tick normally — biology never sleeps, so a burn
  landed across the border keeps burning and kills credit normally.
- **HONEST BORDERS FOR BODIES**: the rim verdict's mover gate widened to
  ROUSED enemies — an aggro'd body walks the party's own crossing law both
  directions (in through the mouths, refused off-mouth by the same far-wall
  grid + dress-trunk consults; an active body chasing a fleeing hero follows
  out and stays live while engaged — the lean policy, adopted). Un-roused
  foreign bodies confine INTO their own region (`seamlessForeignConfine`:
  cell bounds + the mint's walk grid through the tier-swap idiom + its
  furniture at trunk grain) — the drowsy tide never roams tissue.
- **THE BANK + THE KILL LEDGER**: demotion sweeps the region's bodies into
  its own zone memory (region-local rows — wounds, names, rarities, rouse
  latches survive; brains drop; corpses die at the seam), and any NON-rebase
  loadZone banks the whole tide first (THE DOOR LAW FOR THE TIDE — frames
  don't survive a door; the arrival then replays the bank it just wrote).
  THE INFORMATION LAW: the bank writes only what it earned — standing rows,
  or an emptiness `SeamlessMint.slainCount` accounts for (kill() books
  tagged deaths); a roster that vanished kill-less leaves the standing memo
  untouched. `SeamlessMint.populated` is the one ledger bit (live XOR
  banked).
- **THE SHOT LANE**: projectiles cull at the RING's footprint (union of
  cells + corridor margin) instead of the arena edge, and out-of-arena
  samples route by grid OWNERSHIP (the veil march's idiom engine-side):
  the owning mint's blocksShot regions + its furniture's true shot faces
  stop the arrow; tissue is open sky. The drowsy population is visible AND
  hittable; kills credit through the ordinary path. Engine LoS keeps its
  administrative dark (out-of-grid = wall), which the perception scoping
  leans on: a drowsy watcher cannot LOCK through the border (pain and kin
  shouts still promote — snipe it, never leave it dumb), and aim assist's
  LoS gate makes auto-aim prefer active bodies for free.
- **SCOPING CENSUS** (every touched consumer): objectiveCountable (the one
  predicate — cull/contest/empty-floor/HUD counts/bounty fallback all
  scope through it), zoneMemorySnapshot (the active memo never speaks for
  foreign bodies), restoreZoneEnemies' sweep filter (+ the factored
  materializeMemoRows), the cave-cleared drop, kill()'s ledger book, the
  landing scatter, and TAG INHERITANCE at the three adjacent-mint
  chokepoints (graftPart, spawnMinion, mount pairing/crew) so a drowsy
  composite's limbs, a spawner's trickle and a rider's steed all share
  their region's ledger. XP/bounty on cross-border kills deliberately
  unchanged (hittable = worth killing).
- **THE VEIL DEPENDENCY held**: nothing in the drowsy posture mutates away
  geometry — no door opens, no doodad breaks (drowsy bodies have no
  targets; population plants land in a throwaway doodad copy so the mint's
  recorded geometry stays byte-pure). The veil's mint-identity × heroT memo
  key stays sufficient this wave.
- **THE TIDE'S PRICE (the wave's own soak, parked populated stand, live
  loop shape — updateAI + update per tick)**: the naïve tide read p50
  +29ms/tick over the discrete control (ring 9 fully populated, 391 tagged
  bodies — the full-brain scans' diplomacy walk over a 450-body roster was
  the frame). Three laws closed it to **p50 +5.7ms at 96 tagged bodies**
  (discrete 3.77ms → seamless 9.43ms, same zone, same mob): THE ADJACENCY
  SCOPE (population stands only in members whose cell BORDERS the active
  one — the charter's own "adjacent country"; the tide recedes behind the
  walker via the bank), THE DROWSY BREATH (per-body upkeep — statuses,
  DoTs, charges, regen — on the same divided clock, dt-compensated:
  chunkier ticks, true rate), and THE DIM EYE (a drowsy scanner's
  candidate walk caps at the actor grid's neighborhood — aiScanRoster,
  the one world-side roster consult). Plus one discrete-shared free win:
  the target scan's diplomacy read now runs only inside sense reach
  (distance-first filter order, byte-identical set). Remaining ~+6ms =
  ~96 standing bodies' divided brains + upkeep; next-cut levers named in
  the pass memory (cadence dial, per-body brain cost, the scan's grid
  query for actives).

**Verdict: the ring model is ready for M2's dress investment.** Nothing
structural must be paid first at today's web scale: the partition holds
under census (no overlap, no strands, no floor breaches, walled faces keep
their mouths), demotion releases memory, the per-tick overhead is ~0.3ms,
and the worst cost class — the crossing — is p50 ~60ms hidden behind no
door. Pay find 1 alongside the mouth-alignment landing, and schedule find
2's binning before M3's long-horizon play. **For her eye:** the crossing
now happens mid-stride with no fade to cover it (discrete doors paid
100-200ms behind a curtain; seamless pays ~60-127ms in the open — the feel
milestone should judge whether that stutter reads), and the 900px floor is
currently decorative — only her size-aware worldgen seating (the charter's
own note) would ever create the tight cells it guards against.

### THE MASS DRESS (M2 wave 6 — movement record, 2026-08-13)

The enclosure pass's coda-1 debt paid: the SOLID BETWEEN wears country,
draw-time only — no doodads, no collision, no engine planting; the
tissue's refusal stays the law and the dress only makes it read.

- **THE KIT VOCABULARY** (data/enclosure.ts, beside the border rows — her
  border-treatment word made the seat deliberate): `massKitFor(tileset)`
  resolves authored `MASS_KITS` rows (mire's drowned timber, downs'
  drystone litter) ▷ THE MASS DERIVATION (every layout+common stamp row
  matching `MASS_STAMP_GLYPHS` contributes, weighted by mean count — the
  between wants the tileset's whole texture, not the border's one fence
  body) ▷ `MASS_KIT_DEFAULT` stone-and-scrub. Kinds are doodad-kind-shaped
  glyph names; there is deliberately no `none` lane (refusal belongs to
  the border line, not the mass).
- **THE READS RIDE THE SAMPLER** (world/tissue.ts): the dress read
  (`massAt`/`landAt`/`shadeAt`/`flanksAt`) is CARRIED by the sampler
  function (`massDressOf` discovers it) — one capture serves the walkable
  law and the dress, the placement lane's rebuild refreshes both, and the
  TissueSample contract in world/seamless.ts is byte-untouched.
  `massStampSeatsForChunk` is the painter's skip predicate made an
  exported pure helper: chunk-salted per-attempt forked streams (skips
  never shift neighbors), flank voiced by the ONE WEIGHT LAW's own
  weights, kit row by kit weights — probe K asserts every seat unwalkable
  through the sampler, shoulder-clear of every ribbon, outside every cell.
- **THE PAINTER** (render/vis/seamlessDraw.ts): pass 2 lays quantized
  hillshade rows on non-walkable land (THE ONE SUN,
  `MASSDRESS_CFG.lightDir` — between-mass and any future border mass share
  one light); pass 3 draws stamp glyphs (tree/dead_tree/rock/cactus/brush)
  gathered over the 3×3 chunk neighborhood so canopies cross seams whole,
  inked off the LOCAL blend tone (shape carries the flank's identity, the
  ground's palette carries the place). Land mass leans `massMix` (0.5),
  lighter than the sea's `waterMix` — the first deliberate look change to
  the between since the blend. Dress-off or a read-less sampler = the
  wave-5 flat bake byte-identically.
- **COST** (measured live, same 20-chunk view fresh-baked both ways):
  chunk bake p50 6.6ms dressed vs 5.1ms flat (+1.5ms, ~+29%), max 9.9 vs
  6.2 — ≤ +3ms/frame at the 2-bake budget. `seamlessTissueDressStats()` is
  the standing clock; `seamlessTissueReset()` the A/B lever.
- **THE WAVE-7 SHARING SEAM (proposal):** the border-treatment painter
  should consume `massKitFor` for its texture vocabulary and the same
  MASSDRESS_CFG sun for its shading; if it paints texture (massif-like
  faces) the glyph library in seamlessDraw.ts is one export away from
  shared — if it plants bodies, the kit rows' doodad-kind-shaped names
  already speak the enclosure's own id space. Either way the between and
  the border read as ONE country by construction.

### THE CROSS-BORDER SIGHT (M2 wave 7 — movement record, 2026-08-13)

The neighbor-life pass's codas 2+3 paid: castRay itself now routes by grid
OWNERSHIP (engine/los.ts — the sight veil's march engine-side, the
projectile sweep's away-ground law at ray grain), so the DECISION to fire
and the line the eye reads stop dying at the administrative border
(GridWalkField.regionAt answers 'wall' for every out-of-grid point — the
pre-wave dark).

- **THE ROUTING** (`seamlessRayOwners` + the seamless march in castRay):
  a ray with an endpoint outside the active arena resolves each
  out-of-arena sample to the resident mint whose CELL owns the ground —
  the owner's grid answers blocksShot/blocksSight with the elevation law
  at the routed sample, the owner's standing doodads (enclosure dress
  trunks included) stop the ray at their true surfaces via the same
  rayShapeT entries (t survives the seat translation), and NO owner —
  the connective tissue — reads OPEN. Both-endpoints-inside rays take an
  O(1) early reject (a segment between two points inside a convex rect
  cannot leave it), so in-zone rays and all of discrete play are
  byte-identical BY CONSTRUCTION (`OccEnv` grew five OPTIONAL structural
  fields — `SeamlessRaySeat`/`SeamlessRayMint` slivers World satisfies
  as it stands; zero World edits, the veil pass's SightView precedent).
- **THE CONSEQUENCES**: a roused ranged body across the border FIRES
  through the carved mouth instead of stalling at its own rim (the
  hold-fire consult reads the routed line — the wave-6 border stall
  dead); the player's hold-fire/clipShot/aim-assist reads agree with the
  geometry the away lane flies; chain hops, target deliveries and dwell
  sight inherit the same law free.
- **THE SIGHT POLICY — FLAGGED CHOICE, sight ROUTES**: bodies visible
  across a border are watchABLE across it (the symmetric read — the
  administrative "a drowsy watcher cannot lock through the border" was
  a blanket the enclosure made obsolete). The standing guards replace
  it: the border's own geometry (dress lines + rim walls block off-mouth
  lines), senseReach's distance/cone gates, the watch fabric's ladder on
  watch-wearing defs, and the drowsy think cadence. Pinned both ways in
  probe_seamlesslos rig D: behind a border blocker a drowsy body NEVER
  locks; at the carved mouth with a clear line it DOES — and fires.
  Dial `LOS_CFG.crossBorder.sight: false` restores the sight dark alone.
- **DIALS — ALL FLAGGED** (`LOS_CFG.crossBorder`): `shot: true` /
  `sight: true` (per-channel routing; false = that channel's pre-wave
  administrative dark, the A/B forensics lever) / `ownerPad: 96` /
  `bodyPad: 12` (prune-only bbox slacks).
- **COST (micro-lap, the staged probe ring — gen_2 active, 3 members,
  547/816 neighbor doodad rows)**: in-arena rays 8.40µs/ray flag-on vs
  8.86 flag-off on identical rays — the early reject is measurement-noise
  free; routed cross-border rays 24.7µs (shot) / 25.5µs (sight) vs 8.7µs
  under the dark — ~+16µs per cross-border ray, paid only by rays that
  actually leave the arena (losCached memoizes perception pairs at
  0.25s TTL, so a border pack's worst case stays ≪0.1ms/frame). The
  neighbor doodad fold runs bbox-first over the mint's whole array
  (predicate-first measured ~5× dearer at 816 rows).
- **THE DEFERRED SEAM (world.ts — the sibling lane's file, reported for
  the coordinator)**: the projectile sweep's MASONRY march
  (updateProjectiles' active-grid blocksShot sweep) still consults
  `this.walk.regionAt` for out-of-arena samples, so an out-flying or
  born-out bolt dies at the administrative wall ~one grid pad past the
  rim BEFORE the wave-6 away lane (which already applies the owner's
  law) gets to rule — in GRIDDED active zones the away lane is
  effectively unreachable for border-crossing flights. The one-line fix,
  inside the masonry march's sample loop, mirroring the away lane's own
  boundary: `if (ring && (sx < 0 || sx > this.arena.w || sy < 0 || sy >
  this.arena.h)) continue;` — discrete play byte-identical (ring null).
  Until it lands, probe_seamlesslos rig E pins the decision half (the
  released gate, per-channel) and the blocked-line flight agreement
  (both laws refuse at the same trunk, verdicts equal at ±nose); the
  open-line crossing pin joins when the seam lands.
- **NAMED ASYMMETRY**: the SOLID BETWEEN refuses feet but not rays —
  tissue is OPEN to shots and sight by the charter's own law, while the
  mass dress draws scree/thickets there (draw-only by that pass's
  charter). If her eye wants the between to occlude, the sampler's
  massAt read could feed a tissue occluder lane later — a fork, not a
  defect.

### THE BORDER TREATMENT (M2 wave 7 — movement record, 2026-08-13)

Her ruling built: "have the borders themselves be something similar to the
massif structures OR potentially border rocks, with the biome itself
possibly being the thing doing that placement; deserts might be more apt to
have rocks as its borders, while something like an internal jungle… better
served with the massif-like structure." The enclosure vocabulary carries
TWO CLASSES, and the biome chooses through its own texture.

- **THE TREATMENT CLASS** (data/enclosure.ts): `EnclosureRow.treatment` —
  `'bodies'` (the landed wave-5 line, byte-unchanged) vs `'massif'` (rim
  MASS: a coherent impassable band carved into the zone's OWN walk grid).
  Resolution: authored row ▷ THE CLASS DERIVATION ▷ the body election ▷
  the rock default. THE CLASS DERIVATION rides `massKitFor` — the sharing
  seam made structural: the tileset's own mass-kit glyphs elect the class
  (tree/brush = grown ⇒ massif at `massifShareMin` 0.6+ share; rock/
  cactus/dead-tree = stone ⇒ bodies), so the border and the between-mass
  speak one vocabulary. Census at the landing: 14 of 113 tilesets derive
  massif — jungle, deepwood, meadow, grassland, farmland, marsh, beach,
  glimmervale, peninsula, petalfields and the green kin; desert lands
  bodies-rocks and jungle lands massif exactly as she named. Jungle's old
  authored `none` is gone (the derivation IS the intent now); `none`
  survives as the refusal face.
- **THE RIM MASS** (`World.seamlessCarveRimMass`, both mint chokepoints
  beside the wave-5 dress): the band paints a REGISTERED region kind —
  the massif fabric's own doctrine, so collision, shot/sight policy and
  the whole drawn look ride the region row (grown country walls itself in
  `hedgewall` — sight-blocking, shot-threading bocage; stone country in
  `crag`; authored rows may name any registered region via
  `massifRegion`, e.g. `sandstone`, `verdure`). Geometry: a guaranteed
  BASE STRIP (`ENCLOSURE_MASSIF_CFG.bandBasePx` 55 — no walkable pinhole
  can survive inside the band, by construction) plus overlapping inner
  LOBES (`bandLobeR` [45,85] × `lobeSpacingMul` 1.35, fixed rolls per
  slot on the treatment's own salted stream) — the organic edge. GAPPED
  at every placed exit through the wave-5 gap ladder (agreed side ▷ def
  side ▷ nearest rim; factored `seamlessExitGapSides`); THE FIXTURE
  CLEAR punches a ground corridor inward for any entrance-class doodad in
  the band's reach (doors/hollows/wells/seed-paired cave mouths — the
  rampage fabric's state-carrier fields), so the band can never entomb
  content the layout guaranteed. A massif zone plants NO body line; the
  walled detect (factored `seamlessRimWalledFrac`) stands the band down
  where a layout already walls its own rim (jungle's verdure faces keep
  their own walls — no double border), and convex grid-less ground
  degrades to the tileset's body line (`enclosureBodiesFor` — the
  treatment never leaves a rim bare).
- **THE FREE LAWS, proven not assumed** (probe RIG L, 20 checks): the
  far-wall law refuses a tissue step INTO the band with zero new code
  (the mint-grid consult), the agreed gap admits the same step at
  Δ0.000px, the drowsy tide confines off the band, population placement
  never seeds a body in rim mass, the memo replay heals through the
  origin-less clampPos snap, record == live at the rim's region grain
  through BOTH chokepoints, and the discrete load of the same
  massif-class def carves nothing (the mode law).
- **NAMED FOR THE RING AT LARGE**: the massif recipe's INTERIOR mass
  seats are entry-sensitive across chokepoints (record minted through the
  partner door vs the live arrival's own entry) — the site-tolerant
  ground comparator's variance class, now visible at region grain. The
  rim band itself is pure f(def.seed, cell, exits) and agrees exactly;
  only interior tors drift. If an entry-sensitive-recipe zone ever
  stands resident naturally, the D6b walk-grid pin will surface it —
  flagged in the wave-7 pass memory, not silently absorbed.

### THE ROAD DRESS (M2 wave 8 — movement record, 2026-08-13)

The mass-dress pass's coda-3 debt paid: the tissue ribbon stops reading as
a flat lightened slab and reads as the zones' own roads continuing between
them. DRAW-TIME ONLY — the ribbon's walkable verdict is byte-untouched;
this movement changes only how it reads.

- **THE EXACT-RIBBON LAW (the de-stair-step)**: the walkable verdict
  (segDist ≤ roadHalfPx) IS geometrically a round-capped stroke of the
  captured segments at width 2×roadHalfPx — so the face STROKES that
  (render/vis/seamlessDraw.ts `drawRoadFace`), and the drawn edge equals
  the tested edge to the canvas's own anti-aliasing. The 30px lattice's
  stair-step dies structurally: pass 1 paints a road-centered lattice cell
  its UNDER color instead of the flat lift (`massSansRoadAt` — the
  walkable law verbatim minus the road clause, so off-ribbon remainders
  wear their true country and relief shade continues to the road's edge),
  and the opaque strokes cover the exact ribbon.
- **THE GRAMMAR IS gravelPath's OWN** (painters.ts — the discrete road):
  bed band, worn center, two-tone position-hashed grit at the discrete
  30px lay step, kerb stones marched along both edges — recolored per
  stretch by `roadToneAt` (each cell's `theme.road` ▷ the packed-grey
  `ROAD_TONE_DEFAULT` '#574f44', blended through THE ONE WEIGHT LAW), so
  the crossing reads as ONE road changing country exactly as the ground
  does. Alpha composites are precomputed against the local ground —
  every stroke lands opaque, piece joins and crossings never
  double-darken. All geometry derives from GLOBAL arc lattices + the
  segments' own endpoints: neighboring chunks paint identical pixels at
  the seam, re-bakes byte-stable forever.
- **THE READS RIDE THE SAMPLER** (world/tissue.ts, the carried-read
  idiom; the TissueSample contract stays byte-untouched):
  `roadSegsForChunk` (the capture's own bins — the very lists the ribbon
  test consults, so face and verdict share one geometry),
  `roadToneAt`, `massSansRoadAt`, and `shoulderSeatAt` — the wayside
  seat test (land ∧ outside every cell ∧ off the mouth aprons + shoulder
  ∧ body-clear of every ribbon ∧ inside THE ONE SHOULDER).
- **THE WAYSIDE DRESS**: `waysideSeatsForChunk` (exported pure helper,
  the massStampSeatsForChunk idiom) marches each segment's own arc at
  `ROADDRESS_CFG.waysideStepPx` (300 — generous; the M0.5 mouth
  signposts keep their stage, the aprons excluded outright) with
  per-candidate forks off a segment-keyed salted stream (endpoints
  quantized at 0.1px are the identity — every chunk derives identical
  candidates; skips never shift neighbors), drawing from the closed
  `WAYSIDE_GLYPHS` pool (cairn / post / brush verge tufts — road-culture
  furniture in the doodad-kind-shaped vocabulary; two new glyphs join
  MASS_GLYPHS). Seats live IN the clearway shoulder the mass stamps stop
  AT — one shared read (`MASSDRESS_CFG.shoulderPx`), the two dress bands
  partition the roadside BY CONSTRUCTION (`waysideOff` max + widest
  glyph ≤ shoulderPx, probe-pinned arithmetic). Wayside glyphs ride the
  stamp scatter's own 3×3 gather and y-sort.
- **PROBES** (balance/probe_tissue.ts RIG L, 93 checks total): segment
  lists deterministic + real-pairs-only + midpoint-complete + THE
  COVERING LAW (every road:true sample finds its segment within the
  ribbon in its OWN chunk's list — the face can never hole); road tones
  deterministic/pure/50-50-at-the-equidistant-middle/defaulted; wayside
  seats deterministic, never walkable, shoulder-banded, body-clear,
  outside cells, apron-clear, on land, pool-closed — alive along a
  synthetic 9,600px long link; the seam stays null (discrete play reads
  none of it).
- **COST** (live, same 16-chunk wedge view fresh-baked three ways):
  flat wave-5 bake p50 13.7ms → mass dress 14.9 → mass + road **16.4**
  — the road lane costs **+1.5ms p50**, total dress **+2.7ms** over
  flat, inside the ~+3ms/chunk budget. (Absolute costs on this view run
  high for every lane — the tone fold's O(nCells) at a ~200-zone web,
  the massdress pass's named scaling wall; the deltas are the lane's
  own.) `seamlessTissueDressStats()` remains the standing clock;
  `SEAMLESS_DRAW_CFG.roadDress` false restores the wave-6 flat lift
  byte-identically.
- **NAMED HONESTLY**: the ribbon is the web's center-to-center chords,
  so at most borders the face meets a rim band OFF its gap (the chord
  and the carved mouth diverge — the soak's find-5 class, now VISIBLE
  as a road running into a hedge). Where they align (gen_13→gen_17
  lands 1px off its door) the face threads the gap exactly. The fix is
  a WALKABLE-LAW change (route segments via agreed points / door
  seats), proposed for the soft-crossing sibling — not built here.

### THE SOFT CROSSING + THE TRANSIENT FLOW (M2 wave 8b — movement record, 2026-08-14)

*Her transients ruling ("the world flows… an event or entity that does not
transition with the player across a zone while chasing them would be less
alive") split by the build order: THIS wave is THE CARRY — the
transition-with-the-player half — plus the crossing stutter's re-measure and
amortization. Wave 9 owns the drowsy away-event ticking; the full transient
ledger stays parked by her word. All behind `world.seamless`; dials FLAGGED
in `SEAMLESS_SOFT` (world.ts: adoptLayout / deferRefresh / approachPx 520 /
transientPadPx 600).*

- **THE RE-MEASURE FIRST** (the commission's own order): the soak's
  60-127ms rebase predated population-at-admission. The fresh phase table
  (driven populated crossings, probe seeds): typical crossing 13-52ms
  p50 ~32, worst 192 — and the anatomy named the true remainder:
  generateLayout REGENERATED at arrival (7-102ms — the record already
  built the identical layout on a quiet beat), the arrival refresh
  re-minting the record in the load tail (13-57ms on 6/10), the horizon
  chart's frontier work, and 4-19ms of same-tick AI/warm glue. The
  seamlessShiftFrame actor sweep measured NOISE (~1.5µs/body) — the
  amortization aimed at builds, never the shift.
- **THE ADOPTED LAYOUT**: an arrival whose standing record is CURRENT for
  its exact entry (same partner edge, same cell, same exits + mouths
  keys, the def's own seed, no crusade works) adopts the record's layout
  instead of regenerating — and restores the mint's stored post-gen rng
  state (`SeamlessMint.postGenRng`) so every downstream roll (POIs,
  altars, spawns) is byte-identical to a fresh build (RIG M7 pins ground
  + fixture equality A/B). THE PURE RECORD held: the live zone takes
  COPIES of the mutable containers — doodad objects and the walk grid
  through the co-op pack/unpack seam — so site plants, effect attach,
  breaks and door carves never write into the record (the G-rig byte
  pins and the veil's identity key stay law).
- **THE DEFERRED REFRESH**: the load tail flags `seamlessRefreshDue`; the
  next ring beat serves seamlessActiveMintRefresh (a re-mint that fires
  is the beat's whole job — THE SLICING LAW). The crossing tick sheds the
  record re-mint; a second rebase inside the window overwrites the flag
  with its own arrival (RIG M3 pins the double crossing).
- **THE APPROACH PRE-STAGE**: a walker within approachPx of a bordering,
  linked neighbor names the crossing's edge before the threshold fires —
  a facing record whose assumed partner differs re-mints through THIS
  zone on a quiet beat (one per beat, below the rebase-tick admit gate),
  so the arrival's adoption guard meets a record built for its entry.
  RESULT (same rig, same seeds): 8 of 10 crossings 8.5-15ms, worst 49
  (a frontier first-entry whose horizon chart weaves exits mid-load —
  adoption honestly refuses; named, not fixable this wave). Live
  (qa57, in-page driver overhead included): steady-state adopted
  crossings 14-64ms by zone weight, `carved: 0` both directions.
  A chart-dedupe cut (skip loadZone's twin chartWithin) was tried and
  WITHDRAWN: it shifts when settle-drift stragglers chart, perturbing
  same-seed web history for a ~10ms frontier-only win.
- **THE TRANSIENT FLOW — THE REBASE IS NOT A DEPARTURE**: every transient
  category rides the crossing shifted by the seat delta: ground loot,
  corpses, orbs, remnants, ALL live flights (pos + origin + anchor +
  catch spot + arc destination + fissure chain + patrol ring — the
  party-only carry's single-field shift was a latent staleness),
  standing skill zones (emptied before the load so the expire loop can't
  strip live domain mods mid-crossing), tethers, and the drawn floaters
  (already riding since M1). `seamlessShiftWorldTransients` is the
  non-actor half of the one shift law. Discards RE-SITE to ring
  demotion: `seamlessDemote` sweeps the departing cell's ground
  transients (skill zones expire honestly) plus anything stranded
  outside every resident cell + pad — the ring boundary is the discard
  boundary. The adjacency RECEDE deliberately does not sweep (a receded
  region still stands in the ring). A true DOOR discards everything by
  the standing law, untouched (RIG M6).
- **EVENT BODIES RIDE** (her ruling's heart): the rebase's demote-tag
  predicate widened — every enemy body with a def (door guards excluded
  by doorId) tags `ringRegion` and crosses in place, so a warband
  mid-chase follows you over the border and wave 9 finds every event
  body addressable by region. Their demotion fate stays the door law's
  (the bank's memo write still speaks only for zone-gen rows); THE KILL
  LEDGER gained the fromZoneGen guard so an event body's tagged death
  can never let an empty bank overwrite a memo the base population owns
  (RIG M2).
- **THE LIVING LEDGER** (the double-spawn guard): every per-visit
  materialization latch resets each load, so a rebase-return over
  carried event bodies would re-mint the event over its own survivors
  (a second world boss, a twin warband). The guard is the world itself:
  `seamlessEventSurvivors(zoneId, {tag|eventKey})` — live bodies wearing
  the event's marker latch the materializer WITHOUT spawning; gone
  bodies re-open it (RIG M4 pins never-twin + honest re-materialize).
  Guarded: warbands (eventKey stamped at spawn), demon epicenter,
  crusade garrison, hell court + marshal (escorts stamped), world boss
  (+ wbBoss re-adopt) and the passing glimpse-body, hunt beast
  (re-adopt), contagion, deepwinter, verminfall, swarming broods +
  caches, longcandle, starfall, mycelia, incursion observer, vendetta,
  haunt + deadwake + long-night leaders, conclave (survivors adopted
  into a rebuilt ritualSite), amalgamation (necromancer + boss ref
  re-adopt), miniboss, warlord. NATURALLY SAFE by their own shape
  (documented, untouched): every live-capped pour (rift/spire/fracture/
  eldritch/soulriver/procession robbers, all stream spawners), patient
  zero (a native one-body guard — the pattern's prior art), brigands
  (overlay retire), dig ambushes (memory charges), encounters
  (insideCount counts live bodies), caravan return (a live scan),
  theater (memory-guarded entry + budget dampening — wave 9's own
  flagship). Non-enemy event bodies (folk, carts, escorts of the
  player's) keep the door law this wave, named in the pass memory.
- **PROBES**: probe_seamless grew RIG M (29 checks, 189 total ALL GREEN
  — carry exactness per category, the double crossing, the kill ledger,
  the living ledger end-to-end on spawnWarband, demotion discard vs the
  standing ring, the door control, adoption ground/fixture A/B
  byte-equality, the mode law). Fast lane 133/133. Discrete play:
  byte-identical by construction — every new lane is seamless-gated.

### THE ROUTED RIBBON (M2 wave 8b — movement record, 2026-08-14)

*Her feel report ("we also likely want to ensure that the transitions line
up on both sides of the zones — as right now there are instances where the
transitions don't actually align, and this causes finicky instances of
navigation") + the three converging codas (the road dress's chord-off-gap
divergence, the border treatment's non-abutting way, the dense soak's
never-crossed hops) made ONE commission: route the tissue's ways through
the crossings the engine actually carves. ONE geometry change at
buildTissueSampler's capture (src/world/tissue.ts); every consumer rides.*

- **THE ROUTED WAY**: a linked pair's captured way is a POLYLINE through
  its true crossing, never a bare center-to-center chord. ABUTTING
  resident-eligible pairs bend through their agreed border point —
  `borderAgreedPoint`, the SAME pure derivation the engine seats and
  carves the mouth by — so ribbon and carved mouth meet at ONE world
  point BY CONSTRUCTION. NON-ABUTTING eligible pairs (a real tissue strip
  between) route center → door SEAT → door MOUTH → partner mouth →
  partner seat → center: the seat is placeExit's own edge formula over
  the fitted cell (the fitted arena IS the cell, its origin the cell
  corner; worldgen's `PORTAL_EDGE_INSET` the one shared inset — no new
  number anywhere), the mouth its rim projection along the def side —
  exactly where the mint carves its corridor and the border treatment
  opens its gap window. Pairs no pairing applies to (an ineligible end, a
  missing cell, a one-sided link's unknown half) keep the chord — towns
  keep their doors; degradation, never a strand.
- **THE MOUTH ELBOW (the census's forced refinement)**: the commissioned
  bare seat→seat strip piece crosses the cell rim OBLIQUELY — the 08-14
  route census (620 pairs, scratch_routecensus.ts) measured 62% of
  non-abutting rim crossings landing OUTSIDE the carved gap window
  (p50 128px off, p90 451px), which would strand the walker at the very
  door the routing promises. Routing through the seat's rim projection
  (the mouth) puts the strip piece's endpoints AT both gap centers, so
  the corridor is walkable door-to-door BY CONSTRUCTION. Census after:
  agreed points 365/365, door seats 408/408, rim mouths 408/408 read
  road:true through the built sampler.
- **EVERY CONSUMER RIDES THE CAPTURE** (the design's whole point — zero
  edits beyond it): the walkable ribbon (segDist over pieces), the chunk
  bins, THE EXACT-RIBBON drawn face (strokes the same pieces — the face
  now visibly threads every gap), the mouth aprons (pair-grain,
  unchanged), the mass/wayside shoulder reads and both stamp scatters
  (segment-keyed streams re-key to the routed endpoints). world.ts is
  untouched: the carve, the gap ladder and the agreed seats already
  stood at these points — the tissue came to meet them.
- **THE MISALIGNMENT, QUANTIFIED (the before)**: on the census web the
  old chords crossed borders p50 150px / p90 508px / max 718px off their
  agreed points, and non-abutting doors stood p50 389px / max 2549px off
  the chord's rim crossing — every one a finicky transition or a hedge-
  face dead end. After routing both distances are 0 by construction.
- **PURITY + STALENESS**: the route is pure f(def rows, the fold,
  PORTAL_EDGE_INSET) — no live mint state, no rng; the capture law and
  the determinism pins hold unchanged. A partner re-fit moves the route
  only at the next sampler rebuild (the ring's own admission beat) — the
  mouths pass's active-stand residual at tissue grain.
- **PROBES**: probe_tissue grew RIG M (93 → 115 checks ALL GREEN): stage
  honesty through the engine's own eligibility predicate + non-trivial
  displacement oracles (Δ240px agreed / Δ1920px-over-640px oblique
  stages) · THE ALIGNMENT PIN (the sampler's own chunk segments pass
  within 0.5px of P, both seats and both mouths, all road:true) · THE
  DEAD CROSSING WALKS (mouth-to-mouth 338/338 steps road+walkable while
  the OLD chord's strip crossing reads solid mass — the swap pinned both
  ways) · chord country endpoint-exact where no pairing applies ·
  determinism ×3 · THE COVERING LAW over routed pieces (168 march
  points, 0 uncovered — the face can never hole) · the solid between +
  the mass-dress subset law survive routing · the rig installs nothing.
  Existing rigs A–L byte-untouched (the boot web's one pair is
  ineligible, so its chord stands — proven by the census before a line
  moved).

### THE DROWSY EVENTS (M2 wave 9 — movement record, 2026-08-14)

*Her transients ruling's alive-when-away half, built ("we want to simulate
so that the world really feels alive… it doesn't necessarily have to be an
exact 1-to-1, but I would certainly like for the world to flow"): an away
ADJACENT region's event life keeps running while the player stands
elsewhere. Wave 8b carried events ACROSS the seam (THE CARRY); this wave
makes them live BEYOND it. All behind `world.seamless`; dials FLAGGED
(`SEAMLESS_EVENTS` in world.ts: driveEverySec 1.5 / driveSubstepSec 0.4 /
maxCatchupSec 8 / entryBeat / wheelArrivePx 40 / heelDistPx 64).*

- **THE CENSUS FIRST** (the commission's order — every active-zone event
  driver classed): TICKS AWAY — the theater fabric (runs, pours, the dwell
  lattice), warband marches, invasion arrivals; ALREADY LAWFUL, untouched —
  migrant wheeling (the straggler wheel is unconditional and walks tagged
  bodies in the active frame), occurrence clocks (the world-clock watermark
  settles absence spans at arrival by exact arithmetic), every package
  overlay's MAP half (sim.update runs regardless); ACTIVE-ONLY BY LAW,
  documented — zone objectives + contest (the player is the contest),
  encounters/extraction/borough (player-triggered, arrival-placed),
  package stream pours + their discovery beats (ledger stamps are
  player-met facts; seats read player position), the lite/creep/fog/track
  zone fabrics (zone-scoped pools), and all announcements/FX.
- **THE LIVING EVENT STATE** (`SeamlessRegionEvents`): each away region's
  theater cluster (runs, dwell clock, pour ledger, visit ordinal, spots,
  budget) + march ledgers + queued invasion arrivals, kept ZONE-LOCAL —
  THE ZONE-LOCAL LEDGER LAW: the active frame IS the active zone's local
  frame, so the rebase stash (old active → state) and the promote adopt
  (state → new active) are both identity moves and no payload coordinate
  ever shifts; only BODIES commute between frames (the standing shift
  law), and the re-fit position policy already preserves region-local
  seats. Born at population (with the discrete ENTRY BEAT rolled fresh,
  muted, its bodies joining the population batch) or at the rebase stash;
  adopted whole by the promote; dead with its region's bodies at every
  bank (door / demotion / recede) — one delete beside the bank's sweep.
- **THE EVENT SLICE**: on a quiet ring beat that stood no population
  roster, ONE due region's bookkeeping drives (least-recently-driven,
  driveEverySec-paced) under the population slice's scoped swap widened
  to the whole zone-identity + theater cluster + THE ACTORS ARRAY — the
  region's bodies shuttle into their zone-local frame for the beat (tags
  cleared, the one shift helper both ways) so every mover clamp, crowd
  shoulder and placement law reads the region's own ground; texts +
  flashes swap to throwaways (away announcements are nobody's frame).
  dt-COMPENSATED: the beat settles the whole wall span since the last
  drive (capped), substepped so kind ticks that move bodies never tunnel
  (the swept-beat law); the dwell lattice therefore accrues TRUE wall
  time — an away zone breathes at the standing cadence, and a quick
  return meets the zone's one continuing life. THE DRIVE CONTEXT caches
  the swap's derived furniture (arena, placed exits, walk views, the
  throwaway doodad copy) per mint record — the per-beat derivation was
  the whole cost (4.8ms → 0.09ms mean measured).
- **THE MARCH WHEEL**: drowsy march bodies (theater columns — carts and
  prey included — and warband packs) walk their patrol routes at TRUE
  pace in the active frame every tick, the migrant straggler wheel's
  exact precedent (engine-moved; moveActor keeps collision + the foreign
  confine honest; waypoints are actor-side state the one shift helper
  already carries). The wheel is these bodies' whole mind while un-roused
  (`seamlessDrowsyGate` stands their brains down — no AI double-drive);
  pain rouses them back to the AI mid-fight. Probe-measured EXACT rate
  parity: away 95px/s vs live 95px/s.
- **THE ADOPT KILLS THE STACK** (the softcrossing coda 4): a rebase into
  a member whose event state stands ADOPTS the whole cluster — the same
  run objects continue from their away positions, the visit ordinal never
  re-mints, NO entry beat re-rolls — so quick re-crossings meet the
  zone's one continuing life, never a second first-impression (RIG N4
  pins bodies + runs + visit stable across a double re-crossing).
- **ARRIVALS RIDE** (her ruling's heart): an invasion host reaching an
  away RESIDENT region queues on its event state and marches in on the
  next drive beat — visible across the border — instead of being
  silently dropped; the player's own arrival drains any still-pending
  hosts into the standing spawn path.
- **THE DRESS REPLANT** (the softcrossing coda 2): survivor-latched
  materializers that plant runtime furniture re-stand it — the conclave's
  pentagram at the ring's own centroid, the Bonewright's grave ring
  around its planted stand, the world-boss lair throne under the
  survivor — each through the def's own seeded placement derivation,
  each only when missing (RIG N6 pins plant-once).
- **NON-ENEMY EVENT BODIES** (the softcrossing coda 3, resolved): theater
  march members are team-'enemy' by spawnEventActor's law (carts and prey
  included), so they already tag and cross — their march LEDGERS now
  survive via the stash/adopt, and the demote-tag predicate widened to
  march-ledger membership regardless of team (future-proofing the first
  neutral member). The remaining named classes keep the door law with
  documented refusals: procession carts (a LOSEABLE zone objective — the
  contest law's ground), borough folk/refugees + extraction nodes
  (encounter fabric — player-triggered, arrival-placed by construction).
- **COST** (scratch_soak_drowsyevents, parked populated stand, marches
  walking, 3000 ticks, A/B): drive beats 0.09ms mean (0.01ms/tick
  amortized), wheel 0.03ms/tick, whole-lane delta p50 −0.12ms — the
  event slice costs measurement noise, far inside the drowsy tide's own
  +5.7ms envelope.
- **PROBES**: probe_seamless grew RIG N (24 checks): the away entry beat
  seats a march with its population · the march advances between slices ·
  the away dwell clock accrues ≈ wall time · the scoping pin · the
  arrival adopts (same run object, same lead, no visit bump, world-seat
  continuity, no doubles) · away/live rate parity within the stated band
  (measured exact) · double re-crossing stacks nothing · the replant
  plants once at the centroid · THE MODE LAW (discrete builds no state,
  wheels no body). J1c re-aimed to sample the ROUTED way through the
  public carried read (the routed-ribbon coda 1) — oblique stagings can
  no longer flake the lane, and the pin STRENGTHENED (walkable AND road).

### M2 movement — THE MESH (wave 9, 2026-08-14; the solid-world commission)

Her ruling, near-verbatim: *"it's fine to occlude sight and arrows and the
like, as long as the between is actually solid in appearance. I would
almost want the between to truly be a mesh that links the zones, and the
unlinked portion is filled in with actual massif or doodads, which would
genuinely fill an enclosure and effectively carve the zones out… What
isn't traversable wouldn't actually be viewable either."* Plus her items
1 + 3: the transition ground must gradient into the zones' own graphics,
and the invisible-wall read must become a visually honest mechanism.

- **THE SOLID FIELD (the one derived truth)**: `solidAt` on the tissue
  sampler's carried read (world/tissue.ts) — `massAt` quantized at the
  draw lattice's own 30px cells (`TISSUE_CFG.solidCellPx`;
  `SEAMLESS_DRAW_CFG.latticePx` now BINDS to it), memoized per (seed,
  cell). The painter's pass-1 mass verdict samples the SAME centers, so
  the country that draws as solid mass is EXACTLY the country that stops
  rays — drawn == tested at one grain BY CONSTRUCTION. The clearway
  shoulder and mouth aprons are massAt-false, so every corridor plus its
  verge stays open sky: the walls start where the packed bodies start.
  FIVE consumers read the field: feet (already refusing via the walkable
  law), the ray march, the veil, the painter — and the projectile sweep
  via the DEFERRED world.ts consult (below).
- **THE SOLID FILL (dense country)**: `MASSDRESS_CFG.stampAttempts` 26 →
  96 with per-tileset acceptance `MASS_DENSITY` (`massDensityFor`,
  data/enclosure.ts — jungle 0.95 packs a thicket wall, desert 0.28
  breathes; the weight-law blend rules wedges), plus THE SOLID FORMS
  (`solidFormsForChunk` — crag mounds / hedge banks at 60–150px on their
  own salted stream, whole-footprint massAt-tested so no form overhangs a
  corridor) drawn UNDER the stamp scatter. Stamps now also gate on the
  solid field, so no drawn trunk stands on ray-open ground. THE SEAT MEMO
  (painter-side, the massdress coda-4 cut) pays each chunk's derivation
  once — the 3×3 gather reuses it.
- **THE OCCLUSION (her condition honored)**: castRay's tissue lane
  (engine/los.ts) consults the field for un-owned out-of-arena samples —
  solid between blocks BOTH channels at its drawn lattice surface, per
  channel behind `LOS_CFG.crossBorder.solidShot`/`solidSight`; open
  tissue (corridors, aprons, verge) stays open — the wave-7 "never blocks
  as a line" core survives, RE-STATED. Elevation rides the doodad band
  law at story 0 (a butte line clears the scrub). The sight veil
  (render/vis/sightVeil.ts, `SIGHT_VEIL_SOLID`) marches the same field
  AND emits THE SOLID FRINGE — boundary faces at the field's lattice
  edges through the ONE mergeGridFaces law — so standing in a corridor
  you SEE the walls, and the dark begins exactly where the mass draws.
- **THE ZONE-EDGE GRADIENT (her item 1)**: THE EDGE FADE bakes each
  zone's own theme FLOOR tone into the tissue as an apron outside its
  cell rect (full at the rect, gone by 96px — the arena-rect seam melts
  without touching a zone pixel; unminted claims pre-echo their future
  ground), and THE GRAMMAR SPECKLE flecks the flanks' own theme inks
  (grass/tree, mud/sand) through the weight law's falloff
  (`grammarSeatsForChunk`). Both captured at build as minted data.
- **THE ZONE-SIDE WAY (ribbon coda 4b)**: `wayStubs` on the carried read
  — one row per crossing end (agreed point or door mouth), unit normal
  along the carve's own perpendicular; drawSeamlessCountry overdraws the
  road-face bed+worn grammar `wayStubPx` (120) inward OVER every ground
  and UNDER every body, so the carved in-zone corridor finally WEARS its
  road and the way no longer reads as ending at the border.
- **THE ROAD-TONE SWEEP**: 55 `theme.road` rows authored in
  data/tilesets.ts (every surface-frontier tileset that lacked one; the
  registry's own eligibility filter is the scope; palettes from each
  country's own ground language, one line each, ALL FLAGGED) — the
  in-zone gravelPath and the tissue ribbon now slide through the same
  authored color between countries.
- **THE DEFERRED WORLD.TS CONSULT (the masonry-gate precedent)**: the
  projectile sweep's away lane must eat tier-0 flights where the solid
  field answers true (`!owner` today means `continue` — open sky). The
  exact hunk is reported in the pass memory
  (seamless-mesh-pass.md) with probe_seamlesslos RIG H already ARMED: the
  rig flies a real bolt down a solid-blocked line with a dial-off CONTROL
  flight — it reports PENDING while the consult is un-landed, pins death
  at castRay's own distance once it lands, and fails on any death
  elsewhere.
- **PROBES**: probe_tissue grew RIG N (115 → 139: the quantize law ×9600,
  solid ⊆ unwalkable, corridors hold no solid cell, the density lever
  jungle-vs-desert on flat-dress unit fixtures, the form footprint law on
  a half-plane oracle, grammar band/alpha/ink pins, way stubs at agreed
  points + door mouths + the ineligible refusal, determinism ×2 builders)
  · probe_seamlesslos re-aimed RIG C to OPEN tissue (the re-statement) and
  grew RIGs G+H (a pure-tissue ray dies at the field boundary ±24px both
  channels, per-channel dial A/B, the story-1 band law, the armed flight
  pin) · probe_sightveil grew RIG B6 (march occludes solid / spares open,
  the fringe face at the exact lattice line, drawn==tested via the sheet's
  own edges, dial + seed-lane + null-sampler stand-downs).

### M2 movement — THE SEAM POLISH (wave 10, 2026-08-14; three banked codas, one commission)

Pure look — the laws stay untouched. Three named codas paid: the tone
lines (massdress coda 2, mesh coda 6), the town-door stubs (ribbon coda
6, mesh coda 7), the thin-strip fullness (mesh coda 5).

- **THE TONE LINES DIAGNOSED, then killed (the gutter)**: the commission
  named two candidates — cross-chunk tone smoothing and lattice phase
  dither. The diagnosis rig (scratch_seamtone.ts) measured the BAKED
  tones stepping exactly **0** across 960 chunk-boundary cell pairs: the
  color law is pure f(world pos) on a globally-aligned lattice, so the
  bake carries no boundary discontinuity and neither candidate has
  anything to smooth. The lines are COMPOSITE-TIME: the world pass draws
  under `ctx.scale(zoom ≈ 1.3)` with a fractional camera translate, so
  every chunk canvas blits at fractional device coordinates and its edge
  bilinear-samples against out-of-canvas transparency — a faint straight
  seam at every 720px boundary, visible over flat mass, masked by
  texture. THE GUTTER + THE OVERLAP BLIT kill the class by construction:
  `SEAMLESS_DRAW_CFG.seamGutterPx` (2, FLAGGED; 0 = the old bake + blit
  byte-identically) bakes each chunk with a ring of its NEIGHBORS' own
  content (the same pure laws at the same world positions — the lattice
  loops extend one cell, the glyph/road culls widen by G) and the whole
  guttered canvas lands at −G, so adjacent chunks OVERLAP by 2G with
  byte-identical content: every boundary device pixel is fully covered
  by at least one draw and the fringe composites same-over-same. (A
  source-rect inset alone was tried first and proven insufficient live —
  it fixes the sampled color but not the destination rect's partial
  edge coverage, which still lets the underlay bleed through; the live
  A/B at one camera measured the boundary crack 20.0 → 0.2 luminance
  units.) Pass 1's per-cell decision
  is extracted as `tissueCellColor` (exported, DOM-free): no chunk term
  exists in its signature, so a chunk-relative term can never enter the
  color law unnoticed (probe O6 pins determinism through it).
- **THE TOWN-DOOR STUBS (the look meets the door)**: an ineligible
  pair's drawn way met the town's rim wherever its chord crossed — off
  any door. The wayStubs derivation grew THE TOWN-DOOR LANE
  (world/tissue.ts): each ineligible end that resolves a def exit row
  toward its partner grows ONE stub at that door's rim mouth pointing
  mouth → seat — the SAME doorWayFor read the routing uses for eligible
  pairs (placeExit's edge formula over the fold cell, the town's one
  drawn frame) — marked `door: true`. The painter gates the lane on
  `SEAMLESS_DRAW_CFG.mesh.doorStubs` (FLAGGED); the derivation always
  carries the rows. Towns stay doors by law — nothing walkable changes;
  a doorless end (a one-sided link's silent half) grows nothing; an
  abutting ineligible pair's two mouths legitimately coincide on the
  shared border, told apart by their opposed normals (the agreed-point
  pair's own grammar).
- **THE THIN-STRIP FULLNESS (the strip response)**: thin strips (~157px)
  read as plazas because the full 40px clearway shoulder owned most of
  their width. `MASSDRESS_STRIP` (data/enclosure.ts, mutable for probe
  A/B — ALL FLAGGED): where the LOCAL gap (the two nearest claims'
  rect-distance sum, `gapAt` on the carried read) falls below gapWidePx
  340, the shoulder eases from 40 toward shoulderFloorPx 24 (full at
  gapTightPx 170) through `stripShoulderPx` — monotone, clamped, and
  floored ABOVE the solid lattice's half-diagonal so no wall cell can
  ever touch the walkable ribbon (THE FLOOR LAW, probe-pinned). massAt
  and shoulderSeatAt fold the SAME response (THE ONE SHOULDER survives —
  the two dress bands still partition the roadside by arithmetic), and
  the solid field follows massAt, so drawn == tested rides along: thin
  strips read walled where they ARE walls, sight and shot agree. THE
  FLANK BIAS (`stampBiasAt`, stampFlankPull 0.65) pulls stamp attempts
  toward the nearest claim's rim by the local tightness — no roll
  consumed (the fork law and every determinism pin hold), identity in
  wide country BY the response's own clamp — so the surviving flank
  slivers seed densely (live fixture: mean seat rim-distance 45.6 →
  16.8px). The crossing plaza stays clear: the road + aprons keep their
  exclusions, and stamps never stand inside pad + floor of any routed
  piece (THE PLAZA LAW at seat grain). The WALKABLE margins were never
  read — the walkable law is byte-untouched (probe-pinned at every
  fixture point).
- **PROBES**: probe_tissue 139 → 171. RIG O (the seam polish): the
  response law (monotone/clamped/THE FLOOR LAW), three aligned-door
  fixtures (thin 160 / mid 256 / wide 640px gaps) — THE WALLS STAND on
  the thin flanks while the wide control keeps the wave-9 verge, the
  crossing walks, the walkable law never moves; THE PLAZA LAW; THE FLANK
  BIAS (hug + wide-identity + determinism); INERTNESS (dial off == the
  degenerate response byte-identically); THE CELL COLOR LAW ×2 builders
  over boundary-spanning windows + the gutter dial pin. RE-AIMS
  (documented, never weakened): N3 derives each sweep point's owning
  center and asserts openness inside pad + the center's OWN local
  shoulder (wide regime = the wave-9 bound verbatim); K's seat-shoulder
  oracle now measures the ROUTED pieces (the chord approximation
  predated the routed ribbon) at the local width; N7's ineligible
  control narrows to its true core — no CROSSING stub, door-flagged
  rows only, at the oracle mouths, doorless ends bare.

## Wave 10 — THE OPEN DOOR (M2/M3: the hub joins, the mints affix)

Her two asks made one law: WHO joins the country, and WHEN.

- **THE DERIVED SEED** (`World.seamlessSeedOf` — the one layout-seed read):
  an authored/minted `def.seed` answers first, mode-blind, byte-untouched.
  A SEEDLESS STATIC under the mode derives a stable per-world seed —
  `(worldSeed ^ FNV(zone id) ^ SEAMLESS_STATIC_SEED_SALT) >>> 0`, the
  acceptQuest/wire-in idiom with its own stream identity — scoped by
  `seamlessStructuralOk` to exactly the class that can ever stand resident
  (never caves, scene stages, or sealed kinds). Every seamless authority
  reads THIS method: the resident mint's layout rng, the arrival's
  layoutSeed chain (`memory ?? seamlessSeedOf ?? rollSeed`), the adoption
  guard's seed identity, the enclosure/rim/population salts, and the
  demotion bank's memory row — record == arrival for the derived class by
  construction. THE DISCRETE BYTE LAW: out of the mode the method returns
  `def.seed ?? null` and the rollSeed() re-roll runs draw-for-draw as ever
  (RIG O pins twins byte-identical, the derivation unconsulted, and the
  expired-memory re-roll still re-rolling).
- **THE HUB JOINS**: the eligibility seed clause reads through the
  derivation, so the Wayfarer's Crossroads — seedless by authorship, its
  def untouched — mints into the town's own boot ring (live: cell
  3049×2443 at the canonical seed, partner lastlight), adopts on the
  door-in arrival, and opens its outward borders while the town way keeps
  its DOOR (lastlight still refuses on START_ZONE/'safe'/kind). The first
  minutes are door-once-then-one-world.
- **THE SEED BELT**: `seamlessMintResident` refuses a def whose seed
  resolves null (the mid-flip re-mint hazard) — loudly, via seamlessNote.
- **THE AFFIXED MINT**: every dynamic placer (quests, events, soundings,
  sea ports, gate fans, lair dens — all through placeZoneAt) moves the
  standing signals (zone count, webDisturbance); the ONE bypass was the
  floating wire-in (connectFloatingZone flips z.floating and forges roads
  with no new node, no settle residue) — closed by `seamlessGraphRev`, a
  world-local rev bumped at the wire-in call site and folded into the
  fold's cache key and the sampler freshness key. A wired-in quest target
  joins the fold — and the country — on the very next ring beat.
- **THE SAMPLER FRESHNESS LAW** (`seamlessTissueEnsure` — the
  routed-ribbon coda 5 closed): the tissue sampler rebuilds when the WEB
  changed, not when an admission happened to land. The key is every input
  class the capture reads — zone count, webDisturbance, the surface
  road-row sum ('?' consolidations, wire-ins, severs), the eligibility
  census (concealed clears, quest stamps), and the graph rev. Checked at
  every ring beat's head; same key → the capture is byte-identical by the
  sampler's purity law → skip. RIG O pins the gate exact over 40 live
  beats: quiet heads stand, drifted heads rebuild, zero churn, zero lag.
- **THE ELIGIBILITY FRESHNESS**: the demotion sweep demotes a standing
  member whose def FLIPPED out of the resident class (quest stamps,
  future seals) on the next beat — back to its door, the degradation
  grammar; a flip back rejoins through the ordinary admission. The
  ACTIVE zone stays exempt mid-stand (its next departure resolves it).
- **PROBES**: probe_seamless 189 → 239 (RIG O, 25 checks: the hub's
  eligibility/mint/arrival byte-pins, the door-and-mouths shape, the
  discrete twins, the affixed mint end-to-end — connected + unveiled +
  eligible + fold re-deal + next-beat sampler rebuild + no-twin + member
  re-fits — the quest zone's own ring and its agreed-border crossing at
  drift 0.00px, the freshness gate, and the flip dance). Existing rigs
  recalibrated where the enlarged town ring re-dealt their stages
  (witness fallback to the zone's own packs table; G4 drives the two-leg
  agreed-point grammar — ★DRIVE-THE-POLYLINE; K3b's clamp-nudge budget
  2 → 8 with the class verified body-by-body; L1o's corridor claim
  re-bounded to the band's 30px-grid quantization-proof span) — no
  assertion weakened: the teeth of every pin (ids, tags, walkability,
  Δ-bounds) stand.
