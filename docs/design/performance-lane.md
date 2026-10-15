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
the near and busy bodies never bank, a struck body thinks at once, the
walkers of a 24-body ring cover the same distance per tick of held wander
direction with the edge on, and the off-beat ticks walk the roster less the
edged bodies; §7.6a records how the walk rig was re-posed).
Both halves of every pair below run the same tree and the same harness; only
the switch differs, so the pair noise is the course's own.

**7.6a THE PINNED CLOCK and THE STROLL REACH (2026-10-14, the shard lane's
ask on 4d22bb50).** Rig E as first cut compared the raw mean distance a
second of 24 far wanderers over two boots of one seed, edge off against on,
within 20 percent. It failed once under a parallel probe lane (5.58 against
7.13 px/s) and passed on the retry. The cause is not the edge: the mass
runtime's preparation, intel and cold slices break on `performance.now()`
at 2 ms, and the forechart's beat on `FORECHART_CFG.beatBudgetMs`, so a
hand-ticked, seeded boot still does different work per tick under machine
load, and that work draws the global stream, so two boots of one seed drift
apart. THE PINNED CLOCK: the rig runs every arm under a monotone counter in
place of `performance.now` (real timers untouched), every slice breaks on
its call count, and the course is a pure function of the seed: a third boot
of the off arm walks the identical distance (7.15829252511243 px/s, byte for
byte, in two processes run at once under the foundation's full probe lane).
What determinism showed: the raw means are 7.16 off against 4.98 on, every
run, and that is two realizations of a random process, not the edge's
kinematics. Fifteen of the ring's 24 bodies never move (minted against
solids); the nine walkers' legs are random draws (a 35 percent dead stop and
a 1.5 to 4.5 s clock at each expiry) off the GLOBAL stream, and the edge
changes the order every body draws in, so the two arms hold a wander
direction for 5,097 against 3,802 body-ticks. The raw mean was never a law
of the edge; the old rig passed on a quiet machine by luck. THE STROLL
REACH is the law the edge controls: over the bodies that walk in both arms,
the distance covered per tick of held wander direction, 0.5056 off against
0.4715 on, within 10 percent. THE STEP RESIDUAL is the honest remainder: a
three-tick stroll step covers 1.22 px against three one-tick steps' 1.317
(about 7 percent short) although `moveActor` is linear in `dt` on solid
ground; the candidates are the wander clock's expiry read up to two ticks
late, the tether's return read once per call, and position-sampled speed
scales. It is bounded by the law and a card for her word, not a fix taken
in the dark. The recipe is the scratch rig in the session (per-body
distance, held-direction ticks, moved ticks for both arms); a future ring
should mint its walkers on free ground.

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

## 8. The merge, the push and the merged tree (2026-10-13, her word)

Her rulings: push the lane; merge whatever is ready; THE LOCAL ROSTER if it
is real optimization; a deep dive into whatever makes the hosted world
playable; the long road is one seamless branch as the core, with an online
shard beside a server-free offline game.

- Codex's reconciliation `d025d99f` (local `shard-world`, in
  `D:/Games/Claude/arpg-shard`) merged `codex/shard-performance` into
  af891eb7: the restored projected goldens, compact `ZoneW` + `zonePaint` at
  wire protocol 6, the browser opening worker beside the terrain preparation
  generator, the derived caches capped at twice single-focus capacity, F1
  (`setPopulationBudget`, `populationStats`) and F3 delivered. Its own serial
  soaks: clustered p95 34.2 ms, spread 250.7 ms, heap growth 18.1 and 54.2 MB.
- The lane merged it (`4d22bb50`): three conflicts, all harness files
  (`shardPerformance.ts` takes the foundation's whole; the soak keeps the
  lane's census and edge rows beside the ported harness; the roster keeps
  the incoming pacing row with the lane's two and drops its duplicate
  responsiveness row); `server/shardHost.ts` auto-merged (the pump yield and
  the meter marks in different regions). Gates on the merge: four type-check
  lanes clean, 24 of 24 `probe_shard*` rigs green (the four digest rigs, the
  foundation's pacing rig and the lane's edge rig among them), `probe_phasemeter`,
  `probe_shardthink` and `probe_loskey` green, the smoke episodes identical to
  d025d99f line for line (the three standing baseline drifts unchanged).
- `shard-world` fast-forwarded to 4d22bb50 in Codex's worktree and pushed;
  `perf-lane` pushed as a new remote branch.

### 8.1 Pair S2: the merged lane against d025d99f alone (spread, 6 bots, 60 s, together)

| | d025d99f alone | the lane on it (4d22bb50) |
|---|---|---|
| tick p50 / p95 / p99 / max ms | 83.5 / 189.8 / 303.9 / 693 | 32.3 / 80.7 / 186.4 / 284 |
| ticks stepped in the window | 635 | 1,483 |
| dropped | 82.9% | 57.4% |
| living least / mean | 24 / 38.4 | 20 / 25.1 |
| actors, mean | 356 | 241 |
| fleet stepped Hz / fed | 10.6 / 80% | 24.7 / 80% |
| deaths / rejoins | 5 / 4 | 5 / 5 |
| heap growth MB | 61.0 | 25.1 |
| the lane's rows: AI loop share, thought / edged (p50) | | 43%, 155 / 89 |

The course-level receipt of the lane on the cached tree: the tick halves
and more, 2.3 times the ticks stepped, dropped from 83 to 57 percent. The
pair is confounded the way E1b was and more so: the faster host let its
fleet kill the roster down to 241 bodies against the control's 356, which
feeds the gap. The lane's own rows on the cached tree: the AI loop 43
percent of the tick (p95 39 ms over 155 thought bodies), `update` 51 (the
runtime 12 inside it, down from 19 to 24 before the caches). Both halves
breach by an order of magnitude still. WATCH, the foundation's: the
control's heap grew 61 MB in 60 s against the 64 MB gate (Codex's own
spread run read 54 MB), the capped caches' residency; a byte budget for
them is owed (§2).

### 8.2 W1 THE NEIGHBORHOOD GOVERNOR, built and measured

Built on the delivered F1 seam as `server/governor.ts` (the ladder and its
numbers in docs/engine/shard.md "THE NEIGHBORHOOD GOVERNOR"; her card 32:
floor 24 a group, 40 Hz allowed, no door), fed by the pump, judged once a
world second, detecting the seam on the keeper's runtime of the moment and
running cost-only without it. `probe_shardgovernor` is green on 25 checks:
the synthetic ladder down to the floor and back to the withdrawn budget
with every hold, no seam, the switch, a classic host on its pump, and a
real wilds host whose per-group limit follows the seam's clamp while the
setter retires no body. Two findings on the way: a calm world must never be
written to, not even a null (fixed: a runtime that never held a budget has
nothing to restore), and a budget thinned under fewer groups goes stale when
the players spread into more (fixed by a re-base to the new floor total; the
seam's clamp held the per-group floor throughout).

**G1, the spread course, one tree, `--govern off` against on (6 bots, 60 s,
3,500 px, no drop, together):**

| | governor off | governor on |
|---|---|---|
| tick p50 / p95 / p99 / max ms | 73.4 / 153.8 / 259.7 / 629 | 34.5 / 112.0 / 157.6 / 208 |
| ticks stepped in the window | 714 | 1,374 |
| dropped | 80.0% | 44.4% |
| the governor's path | law, 60 Hz throughout | at the floor by the first sample (budget 55 over 4, then 3 groups: 24 a group), 40 Hz from 10 s to the end, 6 moves |
| actors, mean | 309 | 145 |
| living least / mean (1,300 px) | 20 / 30.3 | 11 / 17.2 |
| seen least / mean (1,000 px, the view) | 8 / 16.7 | 7 / 10.3 |
| the AI loop p95 ms, thought / edged (p50) | 78, 183 / 143 | 54, 124 / 39 |
| fleet stepped Hz / fed | 11.9 / 80% | 22.9 / 63% |
| heap growth MB | 27.9 | 18.3 |

The governor halves the spread tick's p50 and cuts the dropped share from
four ticks in five to fewer than one in two, and the price is visible in the
census: the world thins to 145 bodies, the living least to 11 and the seen
least to 7. THE FLOOR IS A CAP, not a delivered count: 24 natives a group is
the most the runtime admits, the fleet kills them faster than births refill
under the cap, so the delivered least settles under half the floor. The M6
plan's gate "living least at or above the floor" cannot hold with the floor
set at the delivered least of the ungoverned world; the gate must name the
delivered count the floor is meant to protect, and the floor be set above it.
The tick still breaches both gates on this machine (p95 112 ms at 40 Hz,
dropped 44 percent); the hundred busy bodies of §7.6 became about seventy
and still cost 35 ms a tick.

CARD for her word (unblessed): THE FLOOR'S MEANING. A: keep the floor at 24
as the admission cap (today's receipt: a thin world, the tick halved). B: a
floor of 48 a group, so the delivered least under kills lands near today's
ungoverned least of about 20 (less relief for the tick). C: the floor as a
DELIVERED count the governor holds by reading `populationStats().groups[].live`
and raising the cap while a group's live count stands under it (a second
controller; needs the runtime's live-per-group read, delivered with F1).
Rec: C, with 24 as the delivered floor; B meanwhile.
**RULED (2026-10-14, her word): as recommended. C, the floor as a DELIVERED
count of 24 held by reading the runtime's live-per-group census, with B (48
as the admission cap) standing until that read exists on the host the shard
will keep (the retained-area host; the giant-zone runtime's
`populationStats` is the transitional seam). The governor keeps shipping
OFF until the pairs on that host pass W1's gate.**

**G2, the clustered course, one tree, `--govern off` against on (4 bots
together, 30 s, no drop, together), with the gate still fixed at 60 Hz's
budget:**

| | governor off | governor on |
|---|---|---|
| tick p50 / p95 / p99 ms | 9.2 / 29.6 / 76.1 | 11.1 / 48.8 / 78.2 |
| ticks stepped in the window | 1,766 | 1,194 |
| dropped | 1.83% | 0.42% |
| tick time per wall second | 54% | 44% |
| fed | 69% | 87% |
| the governor's path | law, 60 Hz | budget 24 (one group, the floor) and 40 Hz from the first sample, 13 moves |
| living least / mean | 18 / 21.2 | 20 / 21.6 |
| seen least / mean | 8 / 11.8 | 9 / 13.3 |

The M6 plan's clustered gate ("the governor moves no dial") assumed a
machine where the clustered course passes the 20 ms gate, as it did on
2026-10-09 (p95 11.6 ms at four bots). On this loaded box the course
breaches by itself (p95 29.6 ms with the governor off), so the governor
read the breach and spent both dials, and the course's one group sat at
the floor with the living radius unchanged (the hearth's world is 70
bodies either way). The rate dial's effect reads two ways: the per-tick
cost ROSE (a 40 Hz tick simulates 25 ms of world and costs more) while the
tick time per wall second fell from 54 to 44 percent and the players'
inputs landed in 87 percent of ticks against 69, with fewer dropped. The
governor was judging that heavier tick against a gate fixed at 60 Hz's
budget, so it could never read its own rate dial as relief: the gate now
SCALES WITH THE RATE (20 ms is 1.2 budgets at 60 Hz, so 30 ms at 40 Hz),
the probe re-run green, and both pairs were run again on the scaled gate
(G2b, G1b below), so the receipts match the shipped code.

FINDING for the soak's own gate: `tickP95Ms` is 20 ms whatever rate the
host holds, so a governed host at 40 Hz is judged against 60 Hz's budget.
The gate should be stated in budgets (1.2 of the held rate's) or the soak
should read the governed rate; that is a gate change and waits for her word.
**RULED (2026-10-14, her word): in budgets. `tickP95Ms` becomes 1.2 budgets
of the rate the host actually held, so a governed 40 Hz host is judged
against its own 25 ms and never against 60 Hz's.**

**G2b and G1b, both pairs again on the rate-scaled gate** (the shipped
arithmetic; a calmer minute of the machine than G1 and G2):

| G2b clustered, 4 bots, 30 s | governor off | governor on |
|---|---|---|
| tick p50 / p95 / p99 ms | 8.8 / 16.4 / 71.7 | 9.8 / 36.3 / 73.5 |
| dropped | 0.17% | 2.61% |
| verdict against the soak's gates | PASS | BREACH (tick p95) |
| the governor's path | law, 60 Hz | thinned to the floor during the warm-up's joins, at the floor from the first sample, 40 Hz from 20 s, 13 moves |
| living least / mean | 16 / 18.0 | 14 / 15.3 |
| seen least / mean | 8 / 10.7 | 7 / 8.4 |

| G1b spread, 6 bots, 60 s, 3,500 px | governor off | governor on |
|---|---|---|
| tick p50 / p95 / p99 ms | 66.9 / 157.6 / 239.6 | 24.8 / 87.6 / 152.6 |
| ticks stepped | 769 | 1,729 |
| dropped | 78.6% | 45.3% |
| the governor's path | law, 60 Hz | thinning from 5 s (104 over 4 groups), the floor by 10 s, re-based as the groups fell to 3 (72), 40 Hz from 45 s, 13 moves |
| actors, mean | 300 | 157 |
| living least / mean | 20 / 30.2 | 13 / 20.3 |
| seen least / mean | 7 / 16.9 | 9 / 12.6 |
| the AI loop p95 ms, share | 88.9, 52% | 43.5, 40% |
| fleet stepped Hz / fed | 12.8 / 80% | 28.8 / 63% |

**W1's verdict, honestly.** The spread gate's direction holds twice (the
tick's p50 down 53 and 63 percent, the dropped share from four in five to
under one in two, 2.2 times the ticks) at the price the floor's semantics
set (the living mean a third lower; the seen least unchanged within noise).
The clustered gate ("the governor moves no dial") FAILS: in G2 the course
itself breached and the move was right; in G2b the control passed the 20 ms
gate and the governor's half still thinned to the floor during the warm-up's
join spikes (a 2 s p95 window reads every spike) and never found five calm
seconds under this machine's wobble to climb back, then dropped the rate and
read p95 36 against the control's 16. A governor that can make a passing
course worse does not ship on. DECISION: `GOVERNOR_CFG.enabled` ships
false; `--govern on` is the switch; the code, the probe (26 checks, the
default pinned first) and the receipts land, and the signal's robustness is
the next tuning, its numbers hers.

CARD for her word (unblessed): THE SIGNAL. A: a longer p95 window (5 s) and
a breach that must stand for three beats before a dial moves, with the EWMA
(a smoother read) required above half the gate beside the p95; the climb on
the EWMA under 60 percent of the gate for five seconds rather than the p95.
B: arm the governor only once the warm-up is over (no dial inside the first
30 s after a join) and otherwise as A. C: the governor only ever thins and
never slows the rate (the rate dial read worse per tick on the clustered
course), as A. Rec: B with A's signal, measured on the same two courses.
**RULED (2026-10-14, her word): B with A's signal: no dial inside the first
30 s after a join; a 5 s p95 window; a breach must stand three beats before a
dial moves, with the EWMA above half the gate beside the p95; the climb on
the EWMA under 60 percent of the gate for five seconds. Measured on the same
two courses before the governor may ship on.**

### 8.3 E10: the edge's long soak (the heap watch §7.6 owed), 2026-10-14

One tree (beb1d978), `--think off` against on, both hosts at once, the
spread course for a 600 s window:

| | edge off | edge on |
|---|---|---|
| tick p50 / p95 / p99 ms | 28.2 / 106.6 / 181.3 | 19.4 / 90.0 / 183.4 |
| ticks stepped in the window | 15,164 | 19,587 |
| dropped | 56.4% | 43.8% |
| living least / mean | 10 / 20.1 | 13 / 18.8 |
| actors, mean | 193 | 173 |
| live heap, forced GC at both edges, MB | 520 to 580, +59.6 | 525 to 582, +56.8 |
| trough slope MB a minute | 6.7 | 11.3 (one transient to 946 at the ninth minute, back to 627) |
| deaths / rejoins | 6 / 6 | 6 / 6 |

The edge is clean of retention: ten minutes grow the live heap the same on
both halves, so the short pairs' gaps were the course's kills and spoils,
and the edge's one WeakMap entry per edged body is all it keeps. The gain
holds over the long window (a third off the p50, a quarter fewer dropped
ticks, the living least higher). WATCH, the world's own: both halves grow
about 6 MB of live heap a minute on the spread course (the allowance is 320
MB for 600 s, so the gate passes), which is 360 MB an hour of a standing
shard; the capped caches (F9), zone memory and spoils are the suspects, and
the real host needs an hours-long soak before a session length is promised.

### 8.4 THE OBSTACLE MEMO (the walk's blocked() answered once per point per revision), 2026-10-14

The callers view of the profile (`balance/profile_summary.ts --callers`)
put 99 percent of `pointInSolid`'s 3.2 s under one lambda in the mass
runtime: the walk field's obstacle predicate, asked at every cell the A* and
the line tests touch. THE DOODAD CHURN measured on the spread course: the
global doodad revision moves 0.6 to 1.0 times a second and every one of those
moves is a nav-block family move (scenery grows as the focus walks), the
predicate is asked about 3,000 times a tick (p95 of samples 4,700). Built as
`server/walkMemo.ts` (docs/engine/shard.md "THE OBSTACLE MEMO"): the host
wraps the walk's obstacles object with an exact-point memo keyed on the
nav-block family's counter, the doodad count, the bridge count and the native
features' version; `probe_shardwalkmemo` green (two thousand probes answer as
the predicate beneath; a blocking doodad's report clears it and a campfire's
leaves it; a doodad added clears it; a full memo clears itself; off, the walk
is untouched; solo and the sim never import it).

**M3, the spread course, one tree, `--walkmemo off` against on (6 bots, 60 s,
3,500 px, no drop, together):**

| | memo off | memo on |
|---|---|---|
| tick p50 / p95 / p99 ms | 37.1 / 91.4 / 132.2 | 27.2 / 59.1 / 176.3 |
| ticks stepped in the window | 1,336 | 1,765 |
| dropped | 61.6% | 49.1% |
| the predicate's calls a tick | 3,078 (p95 4,731) | 107 misses of about 3,000 (92% served) |
| the AI loop p95 ms, share | 52.6, 50% | 25.0, 34% |
| living least / mean | 16 / 20.6 | 18 / 21.4 |
| actors, mean | 230 | 216 |
| heap growth MB | 13.8 | 9.5 |

A quarter off the p50 and a third off the p95, a third more ticks stepped,
the living radius unchanged. The memo's first-touch profile (P2, 30 s, no
diagnostics wrappers) reads the AI loop at 48 percent of the tick and the
runtime at 10 with the memo serving 93 percent of 2.4 million asks in 30 s.
The engine-side half, keying the walk's own path cache on the same family
revision instead of the global one (every scenery birth clears it today) and
memoizing per cell inside the walk field so solo play gains too, is the
foundation's: ask F14.

### 8.5 THE NATIVE HOST'S OWN TICK (2026-10-14, a contended exploratory baseline of the end-state host)

Her rulings tonight made the retained-area host (`server/nativeShardHost.ts`,
`npm run shard -- --native`) the host the shard keeps, so the lane measured
it before the merge, read-only: a detached worktree at the foundation's pushed
tip 65021420 (`D:/Games/Claude/arpg-native`, no branch, nothing committed), a
scratch driver that boots `NativeShardHost({ seed: 0x1231, saveDir: null,
open: true })`, listens on loopback, forks the foundation's own
`balance/soak_bots.ts` with four bots at the keeper's hearth (spread 0), runs
the host's own pump and wraps the host's own `tick` for wall cost. Node 24.9
on Windows under tsx. CONTENDED: Codex's sealed full gate ran beside it (six
probe workers, the machine near 90 percent), so every absolute number here
is pessimistic and only the attribution shares are the finding; the same
course repeats on a quiet machine at the repaired merge candidate, as Codex
asked, before any number is an acceptance.

**The numbers (four bots idle in Lastlight, 49 actors, 42 s of wall):** tick
p50 76.2 ms, p95 98.4 ms, p99 112 ms, max 321 ms against the 16.7 ms budget at
60 Hz; 511 ticks stepped and 1,854 dropped; the world advanced 8.5 simulated
seconds in 42 (status: clock 8.5, droppedTicks 1854). The classic giant-zone
host runs the clustered course at 5 to 10 ms and the far heavier six-bot
spread course at 27 to 37 ms on this machine.

**The attribution (a 30 s profile of the same course, 84.5 s sampled, `tick`
29.7 s inclusive):** the engine's own work is about 7 s of the 29.7
(`World.update` 3.3 s, `updateAI` 2.6 s, `applyInputs` 0.8 s,
`serializeSnapshot` 0.4 s). The rest is the native ownership bookkeeping, per
tick, in an idle town: `worldmass/nativeAreaActorAuthority.ts` 13.8 s self,
of which `#finalMembers` 11.0 s (13 percent of every sample taken), called
from `assertFinalPhysical` (62 percent), `#finalSelections` (20 percent) and
`selectOrdinaryEntryRows` (15 percent); `nativeAreaSceneTransitionCoordinator.ts`
5.3 s self (`readyOwn` 2.1 s, all of it from `#ordinaryReady`;
`#assertProjection` 1.0 s); `nativeAreaCombatOperation.ts` `enter` 0.8 s;
`nativeAreaSceneCombat.ts` 0.8 s; the campaign frame 1.2 s. The tsx module
loader and `readdir` (about 7 s) are start-up, not steady state.

**Ask F16 (docs/design/shard-world.md §7g, the mailbox 2026-10-15):** a
revision-keyed memo of the final membership, computed once per membership
change and never per call per tick, and the projection and final-physical
assertions run at ownership transitions and on a cadence under a flag rather
than on every frame of a quiet town: the shape THE OBSTACLE MEMO and the
doodad families use on the classic host, keeping every authority law. Until
F16 lands, no edge, memo or governor work on the classic host can move the
end-state host by more than the engine's seven seconds in thirty. The lane
runs the concurrent pairs on the native host the day a candidate exists; the
scratch driver becomes the `--native` soak lane after the merge.
