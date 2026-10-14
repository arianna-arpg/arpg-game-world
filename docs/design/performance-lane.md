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
