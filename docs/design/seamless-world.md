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
