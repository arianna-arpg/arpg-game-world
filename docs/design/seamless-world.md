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
