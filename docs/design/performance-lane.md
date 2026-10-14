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
