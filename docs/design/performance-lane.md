# THE PERFORMANCE LANE: charter and kickoff (2026-10-13)

A dedicated session for the hosted world's speed. It exists because two lanes
have now measured the same wall from two sides: the shard lane's M6 plan
(`shard-m6-plan.md`) and the foundation's eight-pass performance branch
(`codex/shard-performance`, its record in `docs/engine/shard-performance.md`
on that branch). This page is the one handoff both sessions read. It names
what is known, what was tried, what the lane may touch, and the gates every
change must pass. Numbers here are measurements, never targets; the targets
are hers.

## 1. The wall, measured

- One World runs the whole surface on one thread (THE WILDS LAW); only pockets
  wake sim units. Cost is about 0.2 ms per live actor per tick on average,
  growing faster than linear: roughly 0.13 ms at 150 actors and 0.3 to 0.4 at
  345. One thread carries about 80 live actors inside a 60 Hz budget.
- Six players spread 3,500 px stand about 345 natives and the tick falls to
  p50 100 to 150 ms with most ticks dropped; four players together pass every
  gate (p95 12 to 18 ms). The living radius itself is delivered (least 20,
  mean 23 foes within reach of every spread player).
- The foundation's 30 s profile of a spread course: 29.4 of 30.3 s inside host
  ticks, 14.7 s under `updateAI` and 13.3 s under `World.update` (5.4 s in the
  worldmass update). Inclusive: movement and pathfinding 6.2 s, target
  acquisition 4.3 s, region lookup 4.8 s, terrain sampling 3.6 s. Largest self
  costs: native obstacle candidate lookup 1.4 s, deterministic random draws
  1.3 s, reserved-population scanning 1.0 s, region lookup 0.9 s.
- Whole-roster scans in `ai.ts` (squad leader and formation posts every tick,
  muster and focus fire, morale and support, the 0.25 s target rescan) and
  every projectile walking every actor are the structural suspects; the
  foundation's far-target rejection already attacks the cheapest half of it.
- Cold host boot is 12 s (6 to 7 s in runtime attachment); the shell's attach
  on a client is one synchronous block of seconds. Boot and steady state are
  separate work.
- The snapshot is about 1 to 2 percent of a spread tick after W6 THE WIRE DIET
  (24 kB to 5.8 kB together, 141 kB to 11 kB spread). The wire is not the wall.

## 2. What was tried, and what measured true

The foundation's branch (eight passes, every pair measured against a control):

- KEPT, verified by an independent critic on 2026-10-13: far-target rejection
  before diplomacy (can only reject bodies the old check rejected), the stat
  fold's memo (same order, same arithmetic), path search skipping neighbours
  the cost check rejects, reservation and terrain caches keyed on immutable
  identities, hash and serialization memos, fast-property native restores
  (`restoreNativeActorState` no longer deletes every property). Sim smoke
  episodes are byte-identical across base and branch; every shard rig and
  every digest rig passes; concurrent-pair soaks read 12.1 vs 15.3 ms p95 and
  0.6 vs 3.5 percent dropped (four players together), 106 vs 159 ms p95 spread
  (both breaching), boot 8 s vs 11 s.
- REJECTED by the branch's own pairs: the combined early-exploration change
  (tick p95 worsened in two of three early pairs and three of three grouped
  pairs), the terrain-only cold start (worst tick and service p95/p99 worsened
  three of three), the direct-value dependency shortcut, the segment
  preparation trial and the primitive-dispatch trial. Both experimental
  switches ship off (`HOLLOW_WAKE_DEPENDENCY_CACHE`,
  `HOLLOW_WAKE_TERRAIN_PREPARATION`); default-off is not zero overhead.
- WATCH: the per-focus terrain and region caches (32,768 entries per focus, up
  to 16 foci) grow the heap 51 vs 34 MB in 30 s spread; under the 64 MB gate,
  but a byte budget or a capped multiplier is owed.
- The branch is UNMERGED (three conflicts into shard-world: the roster,
  `generator.ts`'s constructor, `runtime.ts`'s `createTerrainPreparationGenerator`
  needing the shard's `opening` parameter and `adoptOpeningCache`); the two
  prepared-terrain schemes (the browser opening worker and the Node terrain
  lane) must be reconciled by the foundation, which owns both files.

## 3. The plan the lane inherits (the M6 plan, cards 31 to 37 unruled)

- W0 THE ONE-THREAD DIET: a phase meter (half built as
  `balance/shardPerformance.ts` behind the soak's `--diagnostics`,
  `--profile`, `--window-at`, `--window-after-host`; missing the AI loop,
  per-unit marks, status rows and THE DISTANCE CENSUS), THE THINKING EDGE
  (idle bodies run their AI only on the 20 Hz snapshot ticks with dt 0.05,
  lossless to every observer), THE LOCAL ROSTER (if the profile points at the
  whole-roster scans; gated on the sim smoke baseline staying byte-identical),
  THE TICK DIAL (60 to 40 Hz keeps the 20 Hz wire; 30 Hz would halve it).
- W1 THE GOVERNOR (`server/governor.ts`): needs the foundation's seam
  `WorldMassRuntime.setPopulationBudget({ total, floor } | null)` plus
  `populationStats()` (charter §7g F1, open); `populationLimitFor` in
  `runtime.ts` still holds both `maxPopulation` reads the budget replaces.
- W2 THE GLASS UNIT and W3 THE THREAD HOST, then M6+ THE ISLANDS: a keeper
  thread for the chart, the hearth and the desks; workers for pockets and far
  islands; one lockstep clock. Islands split where no player can see across
  (about 3,200 px). Needs a 4 to 8 core host; the codespace has two.

## 4. Ownership and the law

- `src/worldmass/**` is the foundation's (Codex). The lane asks for seams in
  the charter's §7g ledger and never edits those files without a recorded
  one-line seam. The engine (`src/engine/ai.ts`, `stats.ts`, `world.ts`) is
  shared: a change there must keep single player and the co-op host
  byte-identical (THE SOLO INVARIANT) and the balance harness's smoke
  episodes byte-identical, proven by the digest rigs and `npm run sim -- run
  --suite smoke` before and after.
- A wire change bumps `SHARD_WIRE_PROTOCOL`. A probe is never loosened to go
  green; a red row is a named debt in `balance/proberoster.ts`.
- Measure before you cut: every change ships with a CONCURRENT control pair
  (the candidate and the base soaked at the same time, `npm run soak:shard --
  --bots 4 --seconds 30` and `--bots 6 --seconds 60 --spread 3500 --no-drop`;
  the soak listens on port 0) and a `--cpu-prof` attribution. Sequential pairs
  drift by 5 ms on a shared machine and prove nothing.
- Report in the charter (§7g for asks, §7d for built rows) and keep the
  per-pass record the way `shard-performance.md` keeps it: every pair, every
  rejection, every covariate.

## 5. The first week, in order

1. Finish THE PHASE METER: the AI loop, per-unit marks, THE DISTANCE CENSUS
   (how many actors stand within sight of any player, how many idle), status
   page rows. One profile of the spread course with the meter, attributed.
2. THE THINKING EDGE and THE LOCAL ROSTER against that profile, each with its
   own pair and its own digest proof.
3. Merge the foundation's performance branch once the foundation resolves the
   `runtime.ts` and `generator.ts` conflicts, and cap its cache multiplier.
4. THE GOVERNOR the day F1 lands.
5. Boot: the 6 to 7 s runtime attachment and the client's synchronous attach,
   as separate work with their own measurements.

## 6. Kickoff prompt for the new session

Paste this into a fresh session rooted at the repo:

> You own THE PERFORMANCE LANE of Hollow Wake's hosted world. Read
> `docs/design/performance-lane.md` first, then `docs/design/shard-m6-plan.md`
> and the charter's §7g in `docs/design/shard-world.md`; read
> `docs/engine/shard-performance.md` on the branch `codex/shard-performance`
> for what the foundation already tried. Work on a branch `perf-lane` in your
> own worktree off `origin/shard-world`. Follow §4 of the performance page to
> the letter: concurrent control pairs, digest proofs, a protocol bump for any
> wire change, no probe ever loosened. Start with §5 step 1 and report every
> measurement into the charter before you cut anything.

## 7. The lane's record (branch `perf-lane`, off `shard-world` af891eb7)

Every row here is a measurement on the dev machine (i9-10900K, 20 threads,
Windows 10, Node 24.9) with co-sessions holding most of the CPU (82 percent
busy at the lane's start); pairs are CONCURRENT (both hosts and both fleets
at once), so both halves see the same load. Nothing here is a capacity claim.

### 7.1 THE PHASE METER, finished (2026-10-13)

- Ported from `codex/shard-performance` verbatim: `balance/shardPerformance.ts`
  (the inclusive prototype wraps, the inspector profile of the window, machine
  busy percent, the checkpoint timed outside the window), the soak's
  `--diagnostics`, `--profile`, `--window-at`, `--window-after-host`,
  `--conditions` and its corrected input-service rows, and the fleet's
  sequence-service meter (`soakResponsiveness.ts`, `soak_bot_lifecycle.ts`,
  `probe_shardresponsiveness`). One line adapted: the runtime's `terrainWarm`
  read (a perf-branch field) is a typed optional read until that lane lands.
- Built on the host (`server/phaseMeter.ts`, `server/distanceCensus.ts`): the
  marks inside `ShardHost.tick` per unit (input, inputs.apply, actions, the AI
  loop with `#ai.ran`, update with the mass runtime's share through an
  own-property wrap on the runtime instance, settle, drain, desks, wire.zone,
  wire.serialize, wire.send, persist, sweep), one sample per tick per phase in
  a 600-tick ring, the status page's `phases` and `census` rows, the soak's two
  per-sample tables and window rows, `balance/profile_summary.ts` (bottom-up
  and watched-root reads of a .cpuprofile), `balance/soak_compare.ts` (the
  pair read). Probe `probe_phasemeter` (A the ring, B the wrap, C a real host's
  frame, D the census classes and bands, E the cost: ten thousand marks in
  about 8 ms, so about 12 microseconds a tick for the fifteen marks a tick
  carries, 0.1 percent of an 11 ms tick).
- Not built here: the foundation's pump yield (`setImmediate` between slow
  catch-up ticks) stays on its branch for the merge (§5 step 3).

### 7.2 Pair M1: the meter against the base (4 bots, 30 s, together)

Candidate = this branch with the meter and the ported harness; control = the
untouched base in a second worktree; launched within a second of each other.

| | control | candidate |
|---|---|---|
| tick p50 / p95 / p99 / max ms | 10.94 / 20.32 / 79.64 / 413 | 11.40 / 23.07 / 89.65 / 512 |
| dropped | 6.92% | 10.29% |
| living least / mean | 21 / 22.9 | 19 / 21.6 |
| fed / input batches per seat per s | 67% / 40.1 | 63% / 33.7 |
| GC inside ticks ms | 99.6 | 205.9 |
| heap growth MB | 11.7 | 11.5 |
| boot s | 16.1 | 15.5 |

Both breach the 20 ms and 5 percent gates on this loaded machine. The 3 ms
p95 gap is inside the pair noise of a shared box (the foundation's own
clustered pairs reversed sign between repeats; the candidate's worst window
carried a 62 ms runtime admission spike and a 512 ms GC-marked tick), and the
meter's deterministic cost is bounded by the probe at about 12 microseconds a
tick. The candidate's harness also does more work a tick (the per-tick phase
copy into the window's arrays), which no control can share. Pair M2 below
repeats it reversed and longer.

The meter's first read of the hearth course (4 bots together, the window's
shares): `update` 71 percent of tick time (the mass runtime 24 percent inside
it, with one 62 ms admission spike), the `ai` loop 20 percent (p95 5.0 ms over
74 bodies), the wire 7 percent (serialize 5, send 2), inputs 1 percent, the
desks, drain, settle and sweep under 1 percent together. The census: 74
bodies, 42 of them scenery, 5 seats (the parked keeper among them), about 24
idle, of which about 24 stand beyond 600 px of every seat: THE THINKING
EDGE's candidates are a third of the hearth roster, and the AI loop they
would leave is a fifth of the tick there.

### 7.3 Pair M2: the same, reversed and longer (4 bots, 60 s, control launched first)

| | control | candidate |
|---|---|---|
| tick p50 / p95 / p99 / max ms | 10.77 / 43.87 / 78.70 / 495 | 10.44 / 35.64 / 79.38 / 459 |
| dropped | 6.48% | 5.27% |
| living least / mean | 18 / 20.6 | 17 / 20.2 |
| fed / input batches per seat per s | 64% / 38.5 | 66% / 37.3 |
| GC inside ticks ms | 338 | 235 |
| heap growth MB | 16.7 | 16.8 |

The sign reverses (M1 read the candidate 3 ms worse at p95, M2 reads it 8 ms
better): the meter's cost is inside the pair noise of this machine, which is
what the probe's 12 microseconds a tick predicts. The 4-bot hearth course
breaches the 20 ms gate on both sides under the co-sessions' load (the
foundation's clustered pairs read p95 21 to 45 ms on the same box). The
candidate's window shares: `update` 70 percent (the runtime 20 percent inside
it), `ai` 22 percent (p95 4.0 ms), the wire 7 percent.

### 7.4 Pair S1: the spread course (6 bots, 60 s, 3,500 px, roving off, no drop, together)

Candidate = the meter build (560662a1); control = the base; the candidate's
window opened 3.2 s after the shared `--window-at` moment, the control's at
its own warm-up's end (the base soak has no such flag).

| | control | candidate |
|---|---|---|
| tick p50 / p95 / p99 / max ms | 137.0 / 353.7 / 724.9 / 2,068 | 116.4 / 249.5 / 492.5 / 835 |
| ticks stepped in the window | 360 | 450 |
| dropped | 90.1% | 87.5% |
| actors, mean of samples | 344 | 312 |
| living least / mean | 21 / 41.0 | 22 / 33.9 |
| deaths / rejoins | 2 / 1 | 4 / 4 |
| heap growth MB | 23.3 | 11.5 |

Both breach by a wide margin, as every spread run has. The candidate read
faster, but it also carried fewer bodies through the window (four deaths
and rejoins against two and one; the fleet's combat is not deterministic
across hosts), so this pair says nothing about the meter's cost beyond what
M1 and M2 said; it is the course's own receipt. (The control's input-service
row prints the old nominal `fed × 60`; the ported harness prints drained
batches per seat per wall second, so those two rows do not compare.)

**The meter's first read of the spread course** (the candidate's window):

| phase | share of tick time | p50 / p95 ms |
|---|---|---|
| the AI loop (`ai`) | 63% | about 95 / 174 over about 340 bodies |
| `update` (the per-actor loop, projectiles, the sweeps) | 34% | about 40 / 57 |
| of which the mass runtime (`runtime`) | 8% | 0.5 / 2.3, with two admission spikes of 131 and 216 ms |
| the wire (`wire.serialize` + `wire.send` + `wire.zone`) | 3% | 11 / 13 and 3.5 / 5 |
| inputs, actions, settle, drain, desks, sweep | under 0.2% together | |

The AI loop costs about 0.28 ms per body per tick at 340 bodies against
0.034 at the hearth's 74: eight times the per-body price at 4.6 times the
roster, the superlinear curve the M6 plan predicted, and it lives in the
AI loop, not in `update` or the runtime. The census (means over the window,
the roster thinning from 341 to 234 as the bots killed): 312 bodies, 63
scenery, about 44 engaged, 17 alerted, 37 busy by their squad, 145 idle, of
which 142 stand beyond 600 px of every seat (least 68, at the window's end).
THE THINKING EDGE would therefore lift about 140 of 340 bodies out of two
ticks in three; if the loop's cost were uniform per body that is about 28
percent of the AI phase and 18 percent of the tick. The remaining 100 busy
bodies pay the N-squared walks whatever the edge does, which is THE LOCAL
ROSTER's case; the profile in 7.5 names the kernels.

### 7.5 P1: the attributed profile of the spread course (the meter build, alone)

`npm run soak:shard -- --bots 6 --seconds 30 --spread 3500 --rove 0 --no-drop
--diagnostics --profile <window.cpuprofile>` on 560662a1, the inspector
sampling every millisecond over the 30 s window alone (the first 30 s after
the warm-up, so colder ground than S1's 60 s), then
`npx tsx balance/profile_summary.ts <window.cpuprofile>`. Profiled timings
are attribution, never a benchmark: the window read tick p50 121 ms, p95 414,
344 bodies, the machine 64 percent busy, the host holding 1.34 cores.

The meter's own rows of that window agree with the sampled tree: `ai` 49.7
percent of tick time (p50 65 ms over 341 bodies), `update` 47.4 (the mass
runtime 18.8 inside it, p95 227 ms: the cold window's admission; 2.18 million
region reads and 23,227 terrain samples in 30 s), the wire 2.6. The census:
197 idle of 344, 190 of them beyond 600 px of every seat (least 188).

Inclusive, by watched root (a stack counts once per name; 31.0 s sampled,
95.6 percent inside ticks):

| root | s | share | reading |
|---|---|---|---|
| `updateAI` | 14.5 | 46.8% | the AI loop |
| `update` (every method of that name: World, the runtime, others) | 13.9 | 44.6% | the per-actor loop and the runtime |
| `regionAt` (worldmass/walk.ts, 3 sites) | 6.0 | 19.4% | region lookup under movement and the runtime |
| `moveToward` | 6.0 | 19.3% | movement and pathing, mostly idle wanderers' steps |
| `sample` (terrain samples, 8 sites) | 5.5 | 17.6% | terrain sampling |
| `acquireTarget` | 4.6 | 14.7% | the target scan over the roster |
| `losCached` / `castRay` | 3.0 / 2.9 | 9.8% / 9.3% | the sight rays inside the scan |
| `terrainAt` | 2.9 | 9.4% | terrain under movement |
| `updateProjectiles` | 0.8 | 2.5% | |
| `enemiesOf` | 0.7 | 2.2% | the filtered roster copy |
| `serializeSnapshot` / `sendStateTo` | 0.6 / 0.2 | 1.8% / 0.6% | the wire |
| GC | 0.5 | 1.6% | |
| `separateActors`, `actorsNear`, `resolveHit`, `applyInputs`, `useSkill` | under 0.15 each | under 0.5% | |

Self time, bottom-up: the mass runtime's query modules carry the largest
share (address.ts 9.7 percent, generator.ts 7.3, random.ts 5.6, walk.ts 4.7,
nativeResidency.ts 4.6, noise.ts 3.9, dormancy.ts 3.2, runtime.ts 3.1,
sanctuary.ts 1.8, stream.ts 1.4: about 46 percent of self time together,
led by `cellInteger` 1.33 s, the deterministic draws 1.17 s,
`cachedObstacleCandidates` 1.14 s, generator `candidate` 0.96 s, `regionAt`
0.82 s, `reservedPopulation` 0.68 s, `isDependencyFreeData` 0.53 s); the
engine's own lane next (world.ts 11.5 percent with `World.update` self 0.77
s, `pointInSolid` 0.38, `hostileTo` 0.29; ai.ts 5.4 with `updateAI` self
0.70 and `acquireTarget` 0.26; stats.ts 3.4 with `compute` 0.75;
nativeSceneGeometry 2.8; levelgen `doodadRule` 1.4; `factionStance` 1.4;
nativeHostility 1.2; brain `mergeTuning` 0.7); the profiler's own cost shows
as `node:inspector` 2.1 percent, the ported diagnostics wraps 1.2 and an
unattributed `set filename` 2.8.

**What the profile decides.**

1. The mass runtime's repeated terrain, region, obstacle and reservation
   queries are the largest self cost on this tree (about 46 percent), and
   they are exactly what the foundation's performance branch already attacks
   (per-focus terrain and region caches, the obstacle LRU, the reservation
   candidate map, the random and hash memos: §2). Step 3, merging that
   branch, is worth more than any engine cut the lane could make alone; the
   lane's work must compose with it, not duplicate it.
2. THE THINKING EDGE's case is stronger than the census alone says: idle
   wanderers pay `moveToward` (19 percent) through the runtime's region and
   obstacle queries on every step, and a step costs per call, not per pixel.
   Thinking on the beat alone removes two steps in three for about 190 of 344
   bodies. Expected (unblessed): a fifth to a third of the tick on the spread
   course, confined to the AI phase; measured in 7.6.
3. THE LOCAL ROSTER's case: `acquireTarget` is 14.7 percent inclusive, two
   thirds of it the sight rays (`losCached` 9.8) that only run on candidates
   the distance check did not reject, and `enemiesOf` 2.2 percent; the
   formation and squad walks do not surface as named roots (they are inlined
   into `updateAI`'s 0.70 s self and the idle ladder). The whole-roster
   walks are real but second to movement and the runtime's queries; the
   foundation's far-target rejection (kept, §2) takes the cheapest half of
   the scan. The lane takes the roster walks after the edge, with the squad
   index, and measures them against this attribution.

### 7.6 THE THINKING EDGE, measured (one tree, `--think off` against the edge on, together)

Built as `server/thinkingEdge.ts` on the meter build (the law and the probe
in docs/engine/shard.md "THE THINKING EDGE"; `probe_shardthink` green: the
wander clock falls by exactly three ticks on the beat and not at all between,
the near and busy bodies never bank, a struck body thinks at once, 24 far
wanderers walk 7.1 px/s with the edge against 6.0 without, inside the pinned
20 percent, and the off-beat ticks walk the roster less the edged bodies).
Both halves of every pair below run the same tree and the same harness; only
the switch differs, so the pair noise is the course's own.

**E1, the spread course** (6 bots, 60 s, 3,500 px, no drop; the control
launched first; the windows opened at one shared moment, 2.9 s late each):

| | edge off | edge on |
|---|---|---|
| tick p50 / p95 / p99 / max ms | 167.4 / 531.1 / 831.8 / 2,483 | 145.1 / 566.9 / 956.7 / 2,576 |
| the AI loop: p50 / p95 ms, share | 106.2 / 261.7, 58.7% | 86.1 / 320.8, 58.0% |
| bodies thought / edged per tick (p50) | 343 / 0 | 168 / 155 |
| `update` p50 / p95 ms | 51.8 / 183.2 | 49.0 / 124.1 |
| dropped | 92.1% | 91.7% |
| living least / mean | 23 / 40.1 | 20 / 39.2 |
| actors, mean | 336 | 339 |
| census: idle / engaged / squad / alerted | 156 / 59 / 39 / 10 | 180 / 39 / 26 / 15 |
| deaths / rejoins | 2 / 2 | 3 / 3 |
| heap growth MB | 7.1 | 7.5 |

The edge skipped 155 of 340 bodies on every off-beat tick and the tick's p50
fell 13 percent (the AI loop's p50 19 percent); the tail did not move. The
per-sample rows disagree with each other more than the halves do: the edge's
window opened on three samples of 158 to 243 ms AI p50 (the control's first
three read 93 to 152) and closed on 37 to 43 ms against the control's 86 to
127 at a similar roster, so a 60 s window on this machine resolves a
difference of this size only in aggregate. Read: the idle bodies the edge
lifts are the CHEAP ones; the AI loop's cost is in the hundred busy bodies
(engaged, squad-busy, alerted) that chase, scan and ray, exactly the profile's
`moveToward`, `acquireTarget` and `losCached` roots. Every one of those still
thinks every tick, by the edge's own law.

**E2, the clustered course** (4 bots together, 30 s, no drop):

| | edge off | edge on |
|---|---|---|
| tick p50 / p95 / p99 / max ms | 7.22 / 28.27 / 52.27 / 133 | 6.87 / 30.19 / 55.60 / 174 |
| bodies thought / edged per tick (p50) | 71 / 0 | 54 / 12 |
| dropped | 0.33% | 0.72% |
| living least / mean | 21 / 22.3 | 14 / 15.8 |
| heap growth MB | 1.5 | 6.4 |

No worse within the pair's noise (the two halves fought different fights:
the edge's fleet killed its roster down to 67 bodies and 16 living against
72 and 22). The heap gap is one 30 s reading; E1 read 7.1 against 7.5 MB
and the edge keeps one WeakMap entry per edged body, so the gap is the
course's, to be watched in longer soaks.

### 7.7 THE LOCAL ROSTER: the profile's verdict on the walks (no engine cut)

The charter made this cut conditional ("if the profile points at the
whole-roster scans"). On this tree the profile and E1 point elsewhere:

- The squad walks (`formationPost`, `surroundGoal`, the focus-fire `find`,
  the muster count) each read the whole roster once per call with two
  property reads a body; at 340 bodies and about 60 squad members that is
  about 20,000 reads a tick, a fraction of a millisecond, and none of them
  surfaces as a root in P1 (they sit inside `updateAI`'s 0.70 s self time).
- The target rescan is the one walk with weight (`acquireTarget` 14.7
  percent inclusive), and two thirds of it is the sight rays
  (`losCached` 9.8) on candidates already inside reach: a local roster cuts
  the walk, never the rays. The walk's own cheap distance cut is the
  foundation's far-target rejection, kept on `codex/shard-performance` and
  verified by the critic (§2); it arrives with the merge (§5 step 3) and
  must not be built twice.
- `enemiesOf` (the filtered roster copy) is 2.2 percent inclusive, the
  largest allocation among the walks; it is the only roster-walk lever
  worth an engine line on its own, and it is small.

Decision: THE LOCAL ROSTER is not built in this pass. The squad index would
change `ai.ts`, shared by every lane and gated on the smoke baseline, for a
measured ceiling under 3 percent of the spread tick. The lane records it as
the first candidate AFTER the foundation's merge re-profiles the tree: if
the walks rise into the top roots once the runtime's queries are cached,
the squad index and a padded `actorsNear` scan in `gridSeq` order (byte-
identical picks, the M6 plan §1.4) are the recipe, with `probe_localroster`
as the equivalence gate.

What the measured tree says the next levers are (unblessed, for her word):
the foundation's branch for the runtime's queries (46 percent of self time,
§7.5); the per-actor `World.update` loop (38 to 47 percent of the spread
tick, p50 44 to 52 ms over 340 bodies: about 0.14 ms a body in bookkeeping,
with `pointInSolid`, `nativeScenePointInSolid`, levelgen's `doodadRule` and
sanctuary's `blocks` among its self costs, terrain and solid checks per body
per tick that look memoizable per cell and revision); and the busy bodies'
own thinking (the rays and the chase), which the governor's population dial
thins and the islands parallelize.

**E1b, the spread course reversed** (the edge's host launched first; the
machine calmer than E1's hour: the control itself read half E1's p50):

| | edge off | edge on |
|---|---|---|
| tick p50 / p95 / p99 / max ms | 83.4 / 199.1 / 274.6 / 414 | 54.3 / 162.5 / 269.5 / 480 |
| ticks stepped in the window (60.5 s) | 625 | 875 |
| the AI loop: p50 / p95 ms, share | 53.8 / 138.7, 65.4% | 28.6 / 105.7, 58.4% |
| bodies thought / edged per tick (p50) | 266 / 0 | 187 / 83 |
| `update` p50 / p95 ms | 24.2 / 40.3 | 19.8 / 38.8 |
| dropped | 82.5% | 75.2% |
| living least / mean | 19 / 26.2 | 19 / 25.8 |
| actors, mean (342 falling to 240; 353 to 205) | 280 | 266 |
| deaths / rejoins | 5 / 4 | 4 / 4 |
| heap growth MB | 7.9 | 14.8 |

**The edge's aggregate, three pairs.** The spread tick's p50 falls 13 percent
under heavy machine load (E1) and 35 percent on a calmer machine (E1b), with
the p95 unmoved in E1 and 18 percent lower in E1b, and the shard stepping 40
percent more ticks in E1b; the AI loop's p50 falls 19 and 47 percent; the
clustered course is unchanged within noise (E2); the living radius holds on
every pair (least 20 against 23, 19 against 19, mean within one body). The
gates still breach by an order of magnitude on this machine: the edge lifts
the cheap bodies, and the hundred busy ones keep the tick far above 20 ms.
A faster tick serves the bots better (stepped 14.5 against 10.3 Hz in E1b),
so the edge's fleet kills more and its roster thins faster, which flatters
its late samples and probably explains its larger heap growth (14.8 against
7.9 MB in E1b, 6.4 against 1.5 in E2, 7.5 against 7.1 in E1: more kills,
more spoils retained); the edge itself holds one WeakMap entry per edged
body and nothing else. WATCH: a long soak (`--seconds 600`) on both halves
before the edge is called clean of retention.

Kept: the edge ships ON (`THINKING_EDGE_CFG.enabled`), nearPx 600,
unblessed; `--think off` is the A/B; the governor's first dial (§3 W1) is
this switch.

**The digest proofs on the edge tree.** All 23 `probe_shard*` rigs green
(the four digest rigs `probe_shardunits`, `probe_shardcharacter`,
`probe_shardspoils`, `probe_shardforesight` among them, `probe_shardthink`
beside them; 192.9 s wall clock). `npm run sim -- baseline check --suite
smoke` prints the identical five episode lines on the base worktree and on
this tree (dps_out 17.21 / 27.63 / 50.51 / 68.42 / 274.07, kills 0 / 5.7 / 6
/ 0 / 0): the sim never meets the edge, byte for byte. FINDING, not this
lane's: both trees report the same three metrics beyond tolerance against
the committed `balance/baselines/smoke.json` (ttk_parity_warrior_l5
ttk_wave_mean 20.97 to 15.26; skillmode_duelist_solo_l20 dps_out and
dps_dummy 235.61 to 274.07), a standing drift of `shard-world`'s base against
its own baseline (main re-baked the duelist at 269c2e1c on 2026-09-30; the
foundation's merges moved the warrior's wave). The lane re-bakes nothing:
the baseline is the owner's deliberate act (`npm run sim -- baseline write
--suite smoke` once the drift is adjudicated).
