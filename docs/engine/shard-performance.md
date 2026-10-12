# Shared foundation performance — 2026-10-11

This implementation starts explicitly at consolidated `7799af63`, the published
tip of both `shard-world` and `codex/seamless-world-foundation` at session start.
It lives in `codex/shard-performance`; dirty root main, the parked prototype,
the integration audit and the active loading-renderer work remain separate.
The architecture and unresolved capacity decisions remain in
`../design/shard-m6-plan.md` and charter cards 31–37.

## Changes and invariants

Native actor restoration retains the factory object's already matching property
layout instead of deleting every property before assignment. It still removes
absent fields and reorders fields when needed, preserves own `undefined` versus
absence, reproduces graph enumeration order, and keeps the actual actor identity
and factory-owned behavior. The checkpoint schema and reference remapping do not
change. A local V8 diagnostic on the real gnoll factory observed fast properties
before restore and dictionary properties afterward on the baseline; with the
change both are fast. Older or genuinely different layouts may still require
deletions. This is a demonstrated mechanism improvement, not by itself a proven
whole-shard timing gain.

Terrain samples and navigation region answers now receive their existing
32,768-entry allowance per focus, matching the already bounded page residency
model (at most 16 foci). Six foci can retain at most 196,608 entries in each
cache. Entries allocate on use; departure shrinks them to the new bound. This
trades bounded derived-cache memory for fewer repeated terrain generations.
Population, actor retention, path-search effort, simulation frequency and every
generation rule are unchanged. Terrain edits, native geometry revisions and
provider replacement retain their existing invalidation paths.

Signed cell parsing keeps at most 4,096 already validated string/BigInt pairs.
It never narrows coordinates to Number, caches invalid input, changes random
streams or persists derived data. Boundary, malformed-input and eviction tests
cover the full signed 64-bit domain.

The host now yields to Node between complete expensive ticks when a catch-up
slice consumes one tick's wall-time budget. It continues the same batch through
`setImmediate`: the fixed timestep, five-tick catch-up ceiling, dropped-tick
accounting and wall input credit are unchanged. Interval callbacks cannot
reenter an unfinished batch, and stopping cancels its continuation. No World,
sim unit, native controller or temporary generation policy spans a yield.
Cheap catch-up ticks still run together. The purpose is to let input, worker
replies and reconnects arrive between slow ticks instead of waiting behind
five of them. This does not reduce an individual tick's simulation cost.

## Reproducible measurement

The standard course is six real WebSocket bots, 60 seconds, seed `0x00ddba11`,
60 Hz, roving off, reconnect enabled, standard gates, either clustered or
3,500-unit spread. The fleet remains a separate process. Do not run correctness
jobs during timing comparisons. Background application sessions remain open;
machine CPU utilization is recorded, not assumed idle. This Windows i9-10900K
machine is not the deployment host and the results do not certify capacity.

Use `--diagnostics` for inclusive phase timing, worker queue/round-trip evidence,
terrain query counts, paging state, machine CPU load and a separately timed
compact world checkpoint. The ordinary soak is ephemeral, so its persistence
beat does not run: the explicit checkpoint is outside the timed window and does
not include disk write/fsync. `runtime.attach` is a cold-boot measurement, also
outside the steady window. Phase durations overlap; do not sum them.

`--profile <path>` captures only the load window through Node's inspector. Never
compare a profiled run's timings with unprofiled runs. `--window-at <Unix-ms>`
lets a baseline and candidate open their windows at the same future time after
warm-up. The report records actual start delay, so a late warm-up is visible.
`--conditions <text>` records the concurrency conditions with the result.

The control checkout uses the unchanged `7799af63` engine with identical
measurement code. Paired runs share changing background load, but also compete
with one another; repeated paired and standalone observations are evidence of
relative behavior, not a quiet-host capacity test. Wall-clock bot combat and
worker completion can diverge, so preserve population, deaths and reconnect
results alongside timings.

The input report now uses actual stepped ticks per wall second. Previously
`fed * 60` overstated service during overload. `hostSeenHzPerSeat` measures
drained input batches per seat per wall second; a batch can hold several client
frames. It is not accepted movement time. `nominalHzPerSeat` retains the old
nominal calculation explicitly and `steppedHz` reports simulation throughput.

## Investigation receipts

The unchanged-engine startup-inclusive CPU profile attributed approximately
23.2 seconds of 47.0 seconds inside host ticks to AI, 22.0 to World update
(including 10.9 in worldmass update). AI movement/pathfinding, terrain sampling,
line of sight and repeated coordinate parsing dominate. These are inclusive
sampled times with profiler overhead, not benchmark phase totals.

A restoration-only load-window profile observed 3,366,275 region reads,
32,301 stream samples and 34,153 terrain generations in 30.64 seconds. The
sample cache stayed full at 32,768 entries while terrain/native revisions were
constant. This identified cross-neighborhood cache eviction rather than
terrain mutation as a source of repeated work. The restoration-only first load
pair showed no timing gain: candidate p95 327.86 ms versus control 297.39 ms,
dropped ticks 88.39% versus 88.11%. These staggered exploratory runs also
overlapped the end of a type check; they are not the controlled final comparison.
Candidate reconnect passed and control reconnect failed. Both receipts remain.

The next synchronized spread pair, before the pump change, measured control
p50/p95/p99 111.39/263.84/422.89 ms against candidate 87.96/185.08/296.52 ms.
Dropped shares were 87.61%/82.94%; nearby minimum stayed 21, means were
35.09/32.80. The candidate generated 13,911 terrain samples over 605 ticks,
versus 55,676 over 450 control ticks. Live heap growth increased from 25.16 to
43.56 MiB, within the unchanged 64 MiB gate. Both windows recorded about 50.9%
machine CPU utilization and started within 0.74 seconds of the requested time.
This supports the cache mechanism but still fails capacity gates. The candidate
also failed reconnect; the final scheduler comparisons keep that gate enabled.
That exploratory pair sampled initial heap before the scheduled-window wait;
the final pairs below move the initial collection to the actual window edge.

## Fixed-work terrain replay

`node --import tsx balance/bench_worldmass_cache.ts <report.json>` boots the real
seeded host without starting its pump, then reads 45,414 terrain cells in six
spread neighborhoods three times in identical order. Both versions return the
same SHA-256 digest on every pass:
`1ad8e90f495c39900902731dbe602d5353483fb4d56d57694fa1ba2c9eb80f37`.

| Engine | First pass | Repeat 1 | Repeat 2 | Generated samples on each repeat |
|---|---:|---:|---:|---:|
| Foundation | 4,960 ms | 6,646 ms | 6,868 ms | 45,102 |
| Candidate | 3,870 ms | 14.74 ms | 15.21 ms | 0 |

These sequential runs isolate repeated terrain answers from combat timing and
worker completion. They prove identical output and elimination of this cache
thrash; the large repeated-query speedup is not a whole-game speedup. Candidate
stream residency ends at 46,696 samples versus the control's 32,768 cap. The
first pass differs in already warm cells, so its timing is secondary evidence.

## Final live comparisons

All runs retain six real bots, the shipped 60 Hz, 60-second windows, roving off,
seed `0x00ddba11`, normal combat and the standard gates. Control and candidate
use byte-identical instrumentation. These are two concurrent hosts with their
own bot fleets on an already busy workstation, with no other correctness jobs
from this course. Reproduce with `npm run soak:shard -- --bots 6 --seconds 60
--seed 0x00ddba11 --spread 3500 --rove 0 --diagnostics --window-at <future-ms>
--conditions <description> --report <report.json>` in each checkout; use the
same future timestamp for a pair and `--spread 0` for the clustered pair.

| Spread run | p50 / p95 / p99 (ms) | Max (ms) | Dropped | Input batches/seat/s | Nearby min / mean | Reconnect |
|---|---|---:|---:|---:|---|---|
| C control | 98.61 / 223.26 / 435.99 | 583.69 | 85.36% | 1.74 | 23 / 34.14 | Fail |
| C candidate | 95.65 / 192.01 / 312.33 | 436.34 | 84.39% | 7.42 | 20 / 32.53 | Pass |
| D control | 103.69 / 230.68 / 373.08 | 549.13 | 85.84% | 1.68 | 21 / 32.58 | Pass |
| D candidate | 80.82 / 170.18 / 271.13 | 438.65 | 81.67% | 8.72 | 17 / 27.33 | Pass |

Spread p95 improves 14.0% and 26.2% in these pairs; actual input service improves
4.3x and 5.2x. Both versions still fail the 20 ms p95 and 5% dropped-tick gates.
Candidate runs step 9.31 and 10.94 ticks/s, controls 8.67 and 8.38. Faster input
delivery does not restore real-time simulation. Zero host faults and harness
errors occur in all four. Both C fleets record four deaths/rejoins and retain
their parties. D control records four deaths/rejoins and retains its party;
D candidate records five deaths, four rejoins, a downed first bot at the end and
a broken party. Population rules and encounter generation are unchanged, but
the realized combat populations differ; these are observed course outcomes,
not equal-actor microbenchmarks. Reconnect passing twice is useful evidence,
not a claim that every overload reconnect issue is solved.

Machine CPU utilization is 49.4–49.9% in C and 51.3–51.4% in D. Candidate window
start delays are 388/376 ms; control delays are 3,491/2,943 ms. Requested starts
therefore align the courses approximately, not exactly.

| Spread run | Live heap start → end (MiB) | Growth (MiB) | Peak sampled RSS (MiB) | Terrain generations | Region reads |
|---|---|---:|---:|---:|---:|
| C control | 289.36 → 292.56 | 3.20 | 951.81 | 49,076 | 5,830,349 |
| C candidate | 301.05 → 315.02 | 13.97 | 918.81 | 12,050 | 7,460,257 |
| D control | 290.26 → 297.77 | 7.51 | 997.19 | 50,076 | 5,485,579 |
| D candidate | 300.32 → 322.41 | 22.09 | 939.49 | 12,125 | 6,398,401 |

The extra derived-cache residency raises live heap; the unchanged 64 MiB growth
gate passes. Short runs do not prove long-term retention safety. Exact native
pages and compact saves remain independently bounded and retain their tests.
These ephemeral steady courses did not trigger native disk paging; the browser
and persistence probes, rather than a zero paging counter, verify that path.

The clustered course was repeated because the first pair favored the control:

| Clustered run | p50 / p95 / p99 (ms) | Max (ms) | Dropped | Input batches/seat/s | Nearby min / mean | Heap growth (MiB) |
|---|---|---:|---:|---:|---|---:|
| First control | 7.61 / 21.52 / 58.32 | 204.08 | 0.61% | 49.33 | 14 / 16.82 | 5.35 |
| First candidate | 7.91 / 34.71 / 56.62 | 102.82 | 1.75% | 40.96 | 15 / 18.57 | 2.41 |
| Repeat control | 8.96 / 45.34 / 69.50 | 218.18 | 2.68% | 38.27 | 14 / 20.02 | 5.02 |
| Repeat candidate | 8.88 / 34.93 / 66.07 | 157.82 | 0.97% | 44.30 | 16 / 18.83 | 4.63 |

Every clustered run passes reconnect, retains its party, records no deaths,
faults or harness errors, and fails only the 20 ms p95 gate. Machine utilization
changes from 42.07% in the first pair to 51.1–51.2% in the repeat; starts lag
their requested time by 285–328 ms. The directional p95/input result reverses
between pairs while combat populations differ. There is no reliable clustered
improvement or regression attribution from these observations. The candidate
is not presented as universally faster. Live heap ends at 231.0–231.7 MiB;
sampled peak RSS is 914–928 MiB candidate versus 880–882 MiB control. Compact
clustered checkpoint capture takes 119–150 ms before JSON encoding.

## Remaining bottlenecks

The final standalone 30-second CPU diagnosis starts after ordinary join warm-up,
without the paired courses' extra scheduled-start wait. It is an earlier and
profiled workload, not another comparable benchmark. Its 30.31-second profile
contains 29.44 seconds inside host ticks: 14.69 seconds under `updateAI` and
13.25 under `World.update`, including 5.35 in worldmass update. Inclusive
movement/pathfinding accounts for 6.16/5.40 seconds, target acquisition 4.28,
region lookup 4.76 and terrain sampling 3.56. The largest sampled self costs
include native obstacle candidate lookup (1.38 seconds), deterministic random
draws (1.25), reserved-population scanning (0.99) and region lookup (0.86).
These overlap. Profile/meter overhead is visible and is not engine work.

The early-load profile still fails p95 and dropped-tick gates (322.69 ms and
88.92%); reconnect also fails because its cut lands at 30.51 seconds and the
short window ends before return. That failed diagnostic receipt is retained.
The full 60-second unprofiled courses above are the reconnect comparisons.

In spread C's unprofiled candidate window, `World.update` totals 21.33 seconds,
including 3.69 in worldmass update. Full snapshot construction/encode/send
totals 2.08 seconds, of which transport encode/send is 0.49; input application
is 0.17. The runtime's p99 remains 197.49 ms, so removing repeated terrain work
does not remove occasional main-thread admission/validation spikes.

Worker samples report cumulative process lifetime, including boot. Spread C
has 15 candidate completions and 12 control completions, no worker failures,
and no queued/inflight work during sampled steady load. Round-trip maxima are
5.00/5.74 seconds; these include queueing and host delivery delay, not just
compiler CPU. Geographic validation's observed largest slices remain
242/366 ms. Native readiness costs only 48.92 ms total in the candidate window,
with no pending-resume samples; it is not the steady bottleneck in this course.
Cold host boot is 12.11/12.91 seconds, including 6.37/7.24 seconds in runtime
attachment. Boot and steady-state need separate work.

Outside the windows, compact spread checkpoints are 3.13–3.41 MB. Capture and
serialization take 234–287 ms, plus 22–29 ms JSON encoding; this deliberately
does not measure disk/fsync. Persistence spikes therefore still need a real
disk-backed course before making a latency guarantee.

Next work should profile and reduce repeated target/obstacle queries and
reserved-population scans with exact invalidation and gameplay parity, then
separately address large native/geographic validation slices. The unresolved
M6 governor, activation and simulation-rate decisions require their documented
design review. This change preserves population and simulation-rate policies.
Capacity remains unproven and the spread course is far below the shipped 60 Hz.

## Correctness verification

All four type targets and the production build pass (the existing bundle-size
warning remains). All 22 shard probes pass, including slow persistence and the
new pacing probe, with retries disabled. The five-scenario simulation smoke
course passes all 25 episodes. Generation QA passes 2,607 cases with zero
failures: four existing overlap warnings and one 527 ms metropolis timing
warning while correctness jobs ran concurrently.

Thirteen focused probes pass: dormancy, character resume, multi-focus residency,
compact checkpoints, native host, brittle restoration, occurrences, processions,
procession gameplay, navigation cache, dirty terrain, worldmass addresses and
installed native sources. The navigation test retains its 1,860 independent
ray/collision comparisons and adds cache growth/shrink and terrain-edit checks.
Restore tests cover object identity, exact graph order, absent/undefined fields,
reordered fields and factory behavior. The installed-source guard retains its
original receipt; no source guard or test threshold was repinned.

Isolated client boot and the actual wilderness course pass with zero client
errors. The player follows a complete generated path, then visits eight distant
stops. Nearby counts are 43/63/28/20/8/0/15/16 (mean 24.125); the empty stop is
preserved in the receipt. Cold Continue retains all 275 original identities,
admits 17 additional bodies and restores the saved fang priest at 239.4 life.
The existing page-readiness check remains; this run needs no pending-page wait.

The full 124-probe worldmass suite was not repeated in this performance pass.
The foundation's three known failures remain unresolved: terrainvariation hash
`f24109327cf6e53f` versus `4225203d67bebfb4`, courtcontinuity line 99 and
processioncontinuity line 247. Native sky's stale whole-World count receipt
(2,522 versus 2,351) also remains unresolved. Passing focused tests does not
replace those known release failures.

Raw reports, profiles and logs stay local; generated artifacts are not
committed. `final-*.local.log` holds verification output and
`balance/reports/wilderness-ui.json` holds the client receipt.
Candidate reports are `.claude/final-{spread-c,spread-d,clustered,clustered-repeat}.local.json`.
Control reports and their exploratory predecessors are preserved under
`.claude/ownership.performance-control-evidence/` before archiving the temporary
control checkout. Initial full-process profiles are under
`.claude/ownership.performance-profiles/`; the final load-window profile is
`.claude/final-window.local.cpuprofile`. The final candidate source is unchanged
through both spread pairs, both clustered pairs and the final profile.

## Second performance pass: exact query work

This pass starts at `f9bef84d708140b3339eca8bc0d62a9a67a5fc1c`, so its
control already contains the first pass above. It changes three runtime files,
without changing tick rates, encounter density, population budgets, admission
rules or load-test gates:

- Navigation skips a previously admitted neighbor only when its known route
  cannot improve through the current node. Every edge remains positive; heap
  ties, neighbor order, pop budgets and cache order remain unchanged. The
  seeded source is exempt because its coarse center may still need its first
  physical query, including native ownership hydration.
- The common navigation lattice reuses its GCD only after reading and matching
  all three live numeric sizes. Mutable provider sizes, equal revisions,
  replacements and removal still invalidate the derived answer.
- Native obstacle candidates use a bounded linked LRU instead of deleting and
  reinserting a hot Map key. Exact five-component JSON keys and eviction order
  are unchanged. Empty rows share one frozen array; collision still reads live
  doors, shapes, destruction, margins, channels and the current local frame.
- Population reservations reuse only the immutable candidate map. Page changes,
  journey/descriptor replacement and reservation flags invalidate it. Live
  ownership and missing seats are counted on every query. Origin, focus-group
  and distance calculations are shared within a query, and available capacity
  uses one fresh synchronous population census.

Three focused critics challenged correctness and measured the proposed work.
They caught the source-cell first-observation case and a reentrant provider
lookup that could insert duplicate LRU nodes; both are covered by regression
checks. Reentrant replacement now preserves the original Map insertion order.
At 32,768 entries, an actual runtime dependency scan visited zero residency or
LRU nodes through its World and non-owned actor roots. No dependency-scanner
exemption was added. A proposed cache-key concatenation was slower and was
discarded. A targeting-grid shortcut was rejected because detection ranges,
segmented bodies and roster ties require more than a simple radius query.

### Fixed-work evidence

`probe_worldmass_searchwork` retains the previous search body as an independent
oracle. Its 191 comparisons preserve exact steps/null, FIFO contents/order,
frame budgets, weighted/invalid/subnormal/overflow prices, revisions, overlays
and first obstacle observations. Synthetic obstacle queries fall from 7,670 to
4,895 (36.2%); the real cold-native course falls from 723 to 441 (39.0%), with
identical born/sparse snapshots and no scene admission.

An actual `MassNativeResidency.obstacleAt` replay uses 32,768 exact points and
262,144 hot queries per trial, five trials after warm-up. Each version records
exactly 32,768 provider calls, no timed misses and 1,310,720 timed hits. The
point digest matches:
`c2da8998e7233c5a795f945c65ddd272bb403050cdf3a54d86f1a1b5bca5fa47`.
Control-then-candidate medians are 373.34/344.60 ms (7.7% less); reversing the
order gives 321.29/275.21 ms (14.3% less). Both client correctness courses were
running concurrently. These are hot-cache observations on a busy machine,
not whole-frame speedups or independent live-load gates.

`probe_worldmass_reservationwork` passes 1,833 comparisons against the original
capacity calculation, including same-tick births, movement, casualties,
sleeping/paged owners, geographic exclusions and unlocated seats, distance ties,
focus merge/split/empty transitions, real page invalidation, and a complete
nine-node native puzzle's admission, retained dormancy and exact restoration.
The obstacle probe preserves 1,908 live shape/channel/margin comparisons and
adds independent Map-model LRU churn, exact-address edge cases, nested lookups
and retained-graph bounds. The navigation cache keeps its 1,860 independent
ray/collision comparisons and now checks in-place lattice mutations.

### Second-pass correctness and the client retry

All four type targets and the final production build pass. All 22 shard probes
pass with retries disabled, including persistence, reconnect and honest input.
Eighteen focused worldmass/native probes pass: searchwork, reservationwork,
nativewalkcache, nativeobstaclecache, foci, wilderness, exploration, dormancy,
dormancypinattribution, puzzles, nativehost, occurrences, processions,
processiongameplay, checkpoint, resumeworld, nativepaging and
nativeinstalledsources. Generation QA passes all 2,607 cases with four existing
overlap warnings; all 25 simulation smoke episodes pass. The existing build
size warning remains. The final reservation refinement and test typing repair
were followed by another complete type check/build and reservation oracle run.

The first client run failed the unchanged final `nearby > 0` assertion. Its
eight counts were 36/66/23/19/8/0/11/0 (mean 20.375), with 238 retained bodies,
145 sleepers and no fatal error. This is a real failed receipt, not a passing
Continue course. The code audit found no mutation/publication between the two
old population reads; the test fixes terrain seed 99 but does not seed combat
`Math.random`, and native worker arrival also varies. Those are possible
sources of variation, not proof that the initial failure is unrelated.

The final unchanged candidate build and `f9bef84d` control then both passed the
original client course without changing its assertions. Candidate counts were
44/69/25/22/11/0/11/13 (mean 24.375); control counts were
39/68/34/18/5/0/1/2 (mean 20.875). Candidate Continue preserved all 270 original
identities, admitted 16 additional bodies, and restored the saved mockthrush at
45 life. Both courses reported zero client errors. The failed initial receipt
is retained; passing a repeat does not establish deterministic encounter
density or make that first failure disappear.

The full worldmass suite was not rerun. The previously documented generation
receipt/continuity failures and native-sky source-count failure remain unresolved;
no guard, expected hash or threshold was repinned.

### Second-pass live spread comparison

Both versions run the same existing six-bot, 60-second, seed `0x00ddba11`
course with `--spread 3500 --rove 0 --diagnostics` and a shared future
`--window-at`. Pair B reverses launch order. The two hosts and their bot fleets
run concurrently; this session's correctness jobs are stopped for the measured
windows. Other workstation activity is uncontrolled. Instrumentation is
identical and no CPU profiler runs in these comparisons.

| Spread run | p50 / p95 / p99 (ms) | Max (ms) | Dropped | Input batches/seat/s | Nearby min / mean | Reconnect |
|---|---|---:|---:|---:|---|---|
| A control | 90.83 / 180.13 / 324.36 | 543.60 | 83.67% | 7.73 | 20 / 30.56 | Pass |
| A candidate | 85.61 / 140.20 / 231.90 | 314.93 | 81.73% | 8.63 | 22 / 31.55 | Pass |
| B control | 105.55 / 218.44 / 384.41 | 462.87 | 86.07% | 6.66 | 20 / 36.26 | Fail |
| B candidate | 79.19 / 153.04 / 273.05 | 324.39 | 81.05% | 8.92 | 19 / 31.69 | Pass |

Observed p95 improves 22.2%/29.9%, p99 improves 28.5%/29.0%, and actual input
service improves 11.6%/33.9%. Candidate simulation advances 10.81/11.19 ticks/s
versus 9.68/8.35 for control. The unchanged 20 ms p95 and 5% dropped-tick gates
still fail in every spread run. All four retain their party, record four deaths
and four rejoins, and report zero host faults/errors. Realized populations and
worker admission histories differ: these are whole-course observations, not
equal-actor speedup proofs. The independent oracles above establish exact
query behavior separately.

Candidate runtime-update p99 is 134.74/148.66 ms versus control 227.65/291.36 ms.
This phase includes admission work, so it still contains visible stalls.
Machine busy time is 51.51–51.55% in A and 49.53–49.86% in B. Start delays are
330/473 ms for A control/candidate and 1,112/287 ms for B. The shared requested
timestamp does not make the realized starts identical.

| Spread run | Live heap start → end (MiB) | Growth (MiB) | Compact checkpoint bytes | Capture / JSON (ms) |
|---|---|---:|---:|---|
| A control | 301.30 → 315.16 | 13.87 | 3,197,236 | 314.73 / 27.37 |
| A candidate | 300.72 → 325.72 | 24.99 | 3,482,460 | 336.40 / 25.10 |
| B control | 303.46 → 317.27 | 13.81 | 3,196,254 | 337.21 / 31.67 |
| B candidate | 304.17 → 327.70 | 23.53 | 3,505,740 | 343.23 / 31.75 |

Candidate live heap is higher; all growth readings remain inside the unchanged
64 MiB gate. The bounded-cache tests do not substitute for long-session heap
evidence. Checkpoint measurements occur outside the load window and exclude
disk/fsync; they still expose several-hundred-millisecond synchronous work.

The clustered pair uses the same method with `--spread 0`:

| Clustered run | p50 / p95 / p99 (ms) | Max (ms) | Dropped | Input batches/seat/s | Nearby min / mean | Heap growth (MiB) |
|---|---|---:|---:|---:|---|---:|
| Control | 8.17 / 24.94 / 58.94 | 148.26 | 0.36% | 48.97 | 16 / 17.79 | 3.07 |
| Candidate | 8.11 / 24.55 / 54.51 | 110.11 | 0.31% | 48.94 | 15 / 18.51 | 3.01 |

Clustered p95/input service are essentially unchanged in this observation;
one pair does not establish a general clustered improvement. Both versions
fail only the 20 ms p95 gate, pass reconnect, retain their party, and have no
deaths, faults or errors. Machine utilization is 44.96–44.99%; start delays are
252/312 ms for control/candidate. Candidate live heap ends at 233.60 MiB versus
232.26 for control. This pass mainly helps the heavier spread-out course.

### Early load and remaining work

A final standalone 60-second CPU diagnosis begins after ordinary join warm-up,
without the comparisons' extra scheduled-start wait. Of 60.32 sampled seconds,
58.78 are inside ticks: 30.22 under AI and 24.77 under World update. Target
acquisition accounts for 9.85 inclusive seconds, movement 9.23, path search
6.21, and worldmass update 5.68. The largest relevant self costs include stat
calculation (2.34 seconds), deterministic random draws (2.18), obstacle candidate
lookup (2.01), region lookup (1.77), and faction stance (1.56). These overlap;
profile overhead and a different world age prevent direct timing comparison
with the paired runs or the first pass's 30-second profile.

That diagnostic still fails: p95 157.29 ms, 80.54% dropped ticks, 81.12 MiB live
heap growth (242.01 → 323.13 MiB), and reconnect returns a new seat. Its largest
tick is 1,096.13 ms. To avoid attributing these failures to profiling alone, a
further unprofiled pair runs the same earlier load window on both versions,
without `--window-at`:

| Early run | p95 / p99 / max (ms) | Dropped | Input batches/seat/s | Nearby min / mean | Live heap growth (MiB) | Reconnect |
|---|---|---:|---:|---|---:|---|
| Control | 218.05 / 571.87 / 1,538.87 | 85.38% | 6.93 | 26 / 40.76 | 65.40 | Fail |
| Candidate | 192.53 / 335.05 / 1,398.76 | 83.21% | 8.33 | 23 / 38.62 | 76.37 | Fail |

Both fail timing, dropped-tick, heap-growth and reconnect gates with no host
faults/errors. Both lose the cut seat and return it as a new seat; both retain
their original party. Control records three deaths/rejoins, candidate four
deaths and three rejoins. CPU utilization is 43.05–43.11%. This reproduces the
early-load problems on the baseline; it does not resolve them. Candidate heap
growth is again roughly 11 MiB higher, and these short courses cannot establish
long-term retention safety. All original gates remain in place.

The next focused targets are repeated target/stat/hostility reads, exact physical
queries, synchronous native/geographic validation, and checkpoint preparation.
Any targeting change must preserve unusual detection ranges, segmented anatomy
and roster tie order. Reconnect under overload, early heap growth, the variable
client density assertion and the existing generation/continuity failures remain
open. Large simulation scheduling changes still need their separate M6 design
review; no population or simulation-rate reduction is part of this pass.

Raw second-pass candidate reports/logs are `.claude/perf2-*.local.*`; the profile
is `.claude/perf2-window.local.cpuprofile`, with its summary in
`.claude/perf2-profile-summary.local.json`. The first failed client receipt is
`.claude/perf2-client-first.local.json`; the passing final receipt is
`.claude/perf2-client-final.local.json`. Control reports, the final client receipt
and the exact cache replay script are preserved in
`.claude/ownership.performance2-control-evidence/` before archiving the temporary
control checkout. No production source changes occurred between the paired
timing runs, the final profile and the early-load follow-up.

## Third pass: exact target rejection and stat folds

This pass starts at `401dfdfab68c53bee0e33f60c56aa9d4d4c7c01b` in the same
isolated performance branch. The control uses that unchanged engine. Both
control and candidate use the corrected fleet eligibility described below;
no population, simulation frequency, path budget or load gate changes.

The full target scan first rejects non-segmented bodies provably outside their
current reach. It compares the largest absolute coordinate delta with the
maximum of the existing front/rear `senseReach` results, including current
detectability, concealment, alert state and authored multipliers. Nearby bodies
bypass the extra stat reads. Infinite reach, NaNs and hittable segmented bodies
fall through to the original checks. Survivors retain original roster order,
diplomacy, invisibility, exact distance, sight, scoring and lock bookkeeping.
There is no spatial-radius cap, target cache or change to rescan cadence.

Stat computation folds source modifiers, then skill-local extras through two
loops instead of allocating an `apply` closure on each uncached resolution.
Filter/property-read order, floating-point arithmetic order, gauges, overrides,
link copies/recursion, trades and cache invalidation are unchanged. A proposed
faction-string hoist was discarded: the diagnostic made one-layer lookups
10–19% slower, despite helping a four-layer fixture.

### Reconnect harness correction

The earlier early-load failures did not demonstrate a production reconnect
expiry bug. In both preserved failing reports, the drop bot died, rejoined,
then was cut before the new hero acted on the host. The host deliberately
releases an untried spawn-grace seat. Its first standing snapshot can still
carry the previous life's input acknowledgment, so merely checking for a
sequence number is insufficient.

The fleet now resets eligibility on `runEnd`, `newRun` and socket resume,
records the first willed sequence actually sent in that life, and waits for
that sequence to be acknowledged before its planned cut. Existing quiet-time
and failure deadlines remain in force; a bot that never qualifies still fails
the required resume gate. The host, tokens, spawn grace and resume gate were
not changed. Full/delta snapshots pass through the existing decoder, and
transport-identity checks reject events from replaced sockets.

The expanded real-host `sharddormant` probe reproduces the old failure
(send, close before a tick, release, fresh seat), then exercises a real
death/rejoin with an old acknowledgment, new willed acknowledgment, dormant
cut and exact same-seat/same-actor resume. Its full 73 checks pass.

### Fixed-work evidence and limits

`statfold` embeds the original evaluator, independent of the current fold:
21,449 exact comparisons, 65 analytic assertions and two value/property-read
trace checks pass. `targetwork` preserves the original picker and helpers
(SHA-256 `736c7157786eeed87d8071bb1c784913cb00abc4ae10b611cd69505e31e02daa`):
453 cases / 487 scans agree on target, distance, authoritative actor/sheet
state, random draws and 773 ordered sight queries. Hostility calls fall from
1,538 to 1,103; the far-roster fixture falls from 65 to 2. These are operation
counts, not frame-rate claims. Derived stat caches can warm earlier for far
friends; raw serialized cache contents need not have identical residency.

A local benchmark using real player/monster sheets compared the archived and
candidate fold over 1,536,000 reads per trial, alternating order across three
trials. Every result digest matched. Skill-local queries were 1.21–1.45 times
faster (median 1.31); condition/gauge-invalidated mixes were 1.08–1.19 times
faster (median 1.10). Cached timings were short/noisy and do not support a
whole-game claim.

A static real-native roster diagnostic found 69,707 of 73,168 spread-scan
candidates provably beyond reach (95.3%), with no false exclusions and equal
picked-ID digests. Unmetered picker times over twenty forced scans per observer
were 814–863 ms before and 214–248 ms after. A natural clustered roster also
improved; packing the same 346 bodies into a small rectangle gave noisy
changes from 2.0% faster to 5.6% slower. Those provisional times overlapped a
type check, use warm fixed-time sight caches and base tuning, and are not
live gameplay measurements. Integrated measurements follow below.

### Correctness and client receipts

All four type checks and the production build pass (the existing bundle-size
warning remains). Generation QA passes 2,607 cases with four existing overlap
warnings. Simulation smoke passes five scenarios / 25 episodes. Statfold,
targetwork, conversions, applyarm, nativehostility, hellwar, tacticalai,
watchers, stealth, segments, worldmass_targets, stalkercommitment and aiverbs
pass. These checks retain their original assertions.

The actual production-client wilderness course passes on its first attempt:
nearby populations are 38/64/41/18/11/0/6/6 (mean 23), with 255 native identities
before Continue and 162 sleepers. Continue preserves all originals, admits 16
more identities and has 176 sleepers. The saved fang priest returns at exactly
239.4 life with zero readiness waits. No console errors or fatal crashes were
reported. The captured scene also renders normally. This is an automated
travel/save/continue course, not a claim of measured rendering frame times.

The broader checks also preserve two failures for adjudication:

- `foragercommitment`: both unchanged control and candidate report exactly
  11→21 melee casts and 6.15→9.23 seconds close engagement for seed 42, then
  fail the seed-451 improvement assertion at line 40. This is a reproduced
  baseline failure; it was not changed or silenced in this performance pass.
- The first shard suite passes 21/22 probes, including all 73 dormant-seat
  checks, but `shardcounters` reports A's writ paying no counted reward. The
  unchanged control passes. A subsequent candidate diagnostic, retaining the
  assertion and adding receipt logging, also passes: A gains eight coarse
  essence, B/keeper gain nothing, and the correct hand's receipt is recorded.
  The initial failure remains unresolved. The probe's reward counter omits
  legitimate XP-only recipes, and asynchronous waits can change the live
  slate inputs; neither explains the specific failure without its missing
  receipt. No reward logic or assertion was changed to obtain a pass.
  A final retry of the original, unmodified probe at `f3062726` also passes:
  A gains 8,000 counted reward units, then B gains 10,000, with the other hand
  and keeper unchanged. Its log is `.claude/perf3-shardcounters-retry.local.log`;
  the initial failure is still recorded as intermittent and unresolved.

The full worldmass suite was not rerun. The previously recorded foundation
failures remain outside this change; no source guards or expected hashes were
repinned. A successful subset is not a flawless-gameplay certification.

### Repeated integrated comparisons

Three paired 60-second courses use six real clients, seed `0x00ddba11`,
60 Hz simulation, `rove=0`, diagnostics enabled and CPU profiling disabled.
The paired hosts compete on the same workstation; the second spread pair
reverses launch order. A future shared window allows the worlds to warm first.
No correctness jobs from this task run in these windows. Other workstation
activity is uncontrolled, and elapsed-time courses do not advance identical
numbers of simulation steps. Treat these as capacity observations rather than
fixed-work proofs. Population settings are identical on both sides.

| Course | Engine | Tick p50 / p95 / p99 (ms) | Worst tick (ms) | Dropped ticks | Steps/s | Input Hz/seat | Heap growth (MiB) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Spread A | control | 110.80 / 204.84 / 282.36 | 359.30 | 86.00% | 8.37 | 6.68 | 17.90 |
| Spread A | candidate | 90.95 / 184.74 / 303.65 | 336.73 | 83.28% | 9.91 | 7.89 | 18.26 |
| Spread B | control | 125.61 / 262.06 / 388.53 | 855.50 | 88.55% | 6.85 | 5.47 | 7.71 |
| Spread B | candidate | 128.23 / 269.25 / 341.72 | 379.10 | 88.44% | 6.87 | 5.48 | 8.88 |
| Cluster | control | 8.57 / 22.16 / 59.02 | 198.03 | 0.75% | 59.73 | 47.80 | 6.56 |
| Cluster | candidate | 8.90 / 22.46 / 60.27 | 142.97 | 0.50% | 59.73 | 46.23 | 3.88 |

Spread A improves p95 by 9.8% and input throughput by 18.1%, but worsens p99
by 7.5%. Spread B has effectively unchanged throughput, a 2.7% worse p95 and
12.0% better p99. Machine-wide CPU averages are about 64% in A and 76% in B;
clustered play averages 53%. Clustered typical timings are essentially neutral.
The lower individual maxima do not establish a repeatable worst-tick gain.
Both spread courses still fail the unchanged 20 ms p95 and 5% drop gates;
both cluster courses fail p95. All six runs pass heap, same-seat reconnect,
party, error and fault gates. Each spread run has four deaths/four rejoins;
clustered runs have none. Nearby mean counts are control/candidate 33.50/31.81,
34.90/32.78 and 18.89/18.00, with unchanged admission/density rules.

The second spread control's 855.50 ms tick includes 42.98 ms of recorded GC;
GC does not explain most of the stall. Its world-update maximum is 714.55 ms,
versus 323.22 ms in the candidate. Runtime-update p99 remains roughly 192–194 ms
on both sides, making individual runtime phases the next profiling target.

Raw paired reports and logs are `.claude/perf3-pair-a.local.*`,
`.claude/perf3-pair-b.local.*` and `.claude/perf3-cluster.local.*` in the candidate
and exact-baseline control checkouts. The later standalone early-load profile
and per-tick trace are `.claude/perf3-profile.local.json`,
`.claude/perf3-spikes.local.cpuprofile` and `.claude/perf3-spike-trace.local.json`.
That diagnostic run again exceeds the early heap-growth gate (+81.68 MiB),
despite passing reconnect with the corrected fleet. Warm-window heap passes
do not resolve this early-load limit.

## Fourth pass: measured tick-spike sources

The third pass is checkpointed as `f3062726`. Its unchanged engine is the
fourth-pass control. Prior control reports are retained in the candidate's
`.claude/ownership.performance3-control-evidence/`; the temporary control
checkout is then advanced to `f3062726` for subsequent comparisons.

A standalone 60-second early-load CPU profile adds per-tick timestamps and
inclusive runtime phases. Sample intervals are matched to each tick's monotonic
clock bounds. These diagnostic durations include profiler/wrapper overhead and
workstation scheduling delays; they are not comparable to unprofiled soak times.

The largest traced tick is 1,142.50 ms, with 1,080.36 ms in `world.update` and
only 2.33 ms in `runtime.update`. Approximately 1,035.0 ms of sampled time is
under objective update → geographic intel access validation → a cold terrain
sample. That sample triggers wilderness path admission, native-country planning,
reservations, base terrain and place-page generation. Nested sampled totals are
790.5 ms for base terrain, 550.5 ms for place pages and 357.1 ms for noise; they
overlap and must not be added. The intel loop's existing two-millisecond check
cannot bound a single synchronous terrain query. This pass preserves its
scheduling and verification policy.

A separate 418.90 ms tick spends 188.42 ms in dormancy. About 183 ms of sampled
time is in dependency reflection, including at least 130 ms in recursive
immutable-data certification. Across the profile, pin discovery accounts for
about 1,740 ms, certificate checks 498 ms of self time and actor capture 123 ms.
This identifies reflection work before capture deferral as the narrower target.

### Dependency-scan work

Map/Set traversal avoids recursive calls for primitive values that cannot
express a dependency without a field name. Numeric Map keys and Set members
still pin their actors; every object and unknown owner retains ordinary scanning.
Certified immutable graphs also bypass insertion into the temporary `seen` set.
Uncertified graphs, cycles, getters and mutable/weak collections retain the
original visit guard. No owner class is exempted and no sleep policy changes.

The independent original pin oracle agrees on both identities and insertion
order, including shared frozen aliases, primitive collections and an aliased
live getter read exactly once. Existing real-world, late-owner, mutable-map,
weak-ledger and cycle checks pass. Fixed-work measurements use one unchanged
102-actor world with 75 owned natives, 25 pages and 32,768 cached samples.
Three alternating trials of 25 warm scans take 643/597/567 ms before and
523/497/495 ms after (13–19% less elapsed time). Three cold scans per trial
improve only 0–6%; the expensive first certification remains. Ordered output
digests and actor/resource/dormancy/terrain receipts match in every trial.

A descriptor-allocation experiment is not retained: cold timings vary from a
2% gain to a 7% loss against the narrow change. Raw benchmark source/results
are `.claude/ownership.pin-fold-bench.local.*`. These are exact fixed-work
observations, not evidence that all gameplay spikes are resolved.

### Cold terrain placement work

Base terrain now enumerates only place recipes that can paint a surface. Its
acceptance calculation still checks competing candidates from every family,
including non-surface encounters. The shared collector preserves full signed
coordinates, candidate bounds, circle intersections, inhibition and final ID
sorting. Already resident full pages retain their original reuse and LRU
refresh; otherwise a separate cache holds at most 128 frozen surface pages.
Public content queries always return complete pages. On a full-page cache miss,
they reuse an already resident surface subset and enumerate the remaining
recipes. An empty subset is also complete negative evidence. Cold content
queries do not force an extra terrain-only pass; all-family inhibition and the
final full-page ID ordering stay intact.
No admission, encounter, route, terrain or saved-manifest rule is changed.

The cache can retain equal-but-distinct immutable place objects after candidate
eviction; its additional memory is bounded, but not necessarily references only.
It does not authorize any new dependency-scan exemption. An explicit native
substrate and descriptors without surface recipes keep their existing bypasses.

`worldmass_surfaces` embeds the exact original generator class from `401dfdfa`
with a SHA-256 guard. Seven fixtures / 1,148 exact comparisons cover surface
tangencies and lexical precedence, higher/equal-ranked non-surface inhibition,
large signed addresses and dimensions, mixed query order, both caches beyond
128-page eviction, current and historical descriptors, full planner terrain,
reservations, content and native-substrate bypass. Independent review confirms
that the oracle shares no changed query kernel with the candidate.

For 32 cold pages from the actual current descriptor, candidate requests fall
from 33,364 to 8,499 and generated candidates from 4,656 to 1,179 (about 75%
less). Generated counts mean construction calls, including rejected/null results,
not admitted encounters. A repeated warm pass adds no candidate work. Requesting full content
after terrain still generates exactly 4,656 candidates in total on both sides;
the initial split queries perform more cached requests (40,343 versus 33,364). This
tradeoff is measured separately from the terrain-only improvement. None of
these operation counts is a claim of equivalent improvement in whole ticks.

Four unmetered alternating-order runs of those same pages give median cold
terrain times of 183.18 ms before and 36.74 ms after (80% less elapsed time).
The subsequent 1,024 warm samples have medians 40.15 and 38.64 ms. All eight
terrain result digests match. The deferred full-content query costs 152–164 ms
in the candidate versus a cache hit in the original; combined terrain followed
by all content is 7.3% slower at the median. This is a targeted reduction for
terrain-only reads, not an unconditional reduction in total generation work.
The real spike's distant intel query needs terrain without immediately
admitting those encounter pages. Raw timing, operation counts, digests and
method are preserved in `.claude/ownership.perf4-initial-surfaces-bench.local.json`.

The subsequent resident-subset reuse removes that duplicate candidate-request
work: terrain followed by content makes exactly 33,364 requests and constructs
4,656 candidates on both sides. Additional fixtures cover empty negative pages,
complete candidate/decision-cache eviction between queries, unchanged frozen
subsets, and exact cold-content request/decision order across three descriptors.
The reuse-only timing trial still has a mixed cost: combined cold terrain and
later content has medians 156.09→165.69 ms (+6.15%), while cold content alone is
163.01→165.74 ms (+1.67%). Matching request counts do not prove that the extra
pass is free. Source, probe and all eight matching result digests are retained
under `.claude/ownership.perf4-reuse-only-*` before the next optimization.

Candidate admission now evaluates only the fields referenced by its range
conditions. Each demanded field keeps the exact original layer-order arithmetic;
a local null-prototype record reuses repeated field names only within that
candidate. Range order and the original `>= minimum && < maximum` comparisons
are unchanged, including overflow/NaN behavior. Public `fieldsAt` still returns
every field, and there is no persistent point cache. Valid native-substrate
descriptors prohibit these independent place recipes. Noise/hash evaluation is
pure and consumes no shared random stream, so omitted fields have no placement
side effect. Independent review finds no correctness blocker.

The expanded archived-generator probe passes 12 fixtures / 1,216 exact
comparisons. Additional coverage includes natural positive/negative infinity,
explicitly synthetic NaN, exact range edges, repeated/prototype-like field names,
empty conditions and noisy distant coordinates. Cold full-content candidate
requests and decision order are identical across all three descriptors, while
noise calls fall from 14,355→6,303 (current), 7,569→3,427 (pre-wilderness) and
6,156→3,036 (pre-streaming). The 32-page terrain course reduces candidate noise
calls 31,671→2,161; public output-field noise remains 288 on both sides. After
all content is requested, candidate noise totals 31,671→13,001, with identical
33,364 candidate requests and 4,656 constructions. These fixed-work receipts
prove less computation without reducing terrain detail or encounter content.

Four final alternating-order timing rounds pass the same eight result digests
and 1,224 comparisons (including the eight timed-content equivalence checks).
Median cold terrain falls 166.69→23.50 ms (85.9% less), cold complete content
172.88→112.61 ms (34.9% less), and terrain followed by all content
166.71→117.74 ms (29.4% less). The 1,024 warm samples are 35.68→36.95 ms
(3.6% higher, with overlapping ranges); no warm-query speedup is claimed.
The final variant removes the measured mixed-course regression seen in the
two earlier variants. These isolated fixed-work loops do not establish a
matching percentage reduction in live tick times. Final source/probe snapshots,
raw timing output, work counts and phase comparisons are retained under
`.claude/ownership.perf4-final-{generator,surfaces-probe,surfaces-bench}.local.*`.
The archived generator class is unchanged between `401dfdfa` and the
fourth-pass control `f3062726`.

The original spike attribution and reproducible reader are preserved as
`.claude/ownership.perf3-spike-attribution.local.{json,cjs}`. Inclusive sampled
durations identify a synchronous planning chain, not an exact cost for each
invocation or a guarantee about its next occurrence.

### Fourth-pass verification

All four type checks and the production build pass. Generation QA passes
2,607 cases with four existing overlap warnings and one elapsed-time warning
under concurrent correctness work. Simulation smoke passes all five scenarios
/ 25 episodes. All 18 additional focused probes pass on their first runs:
worldmass, terrainpatches, landforms, landformhabitats, wilderness,
nativeregional, nativeseating, neutralground, geographicaccess,
geographicacceptance, physicalintel, dormancy, engine, formations, nativepaging,
resumeworld, foci and shardworkers. This is a focused suite, not the full roster;
the earlier baseline and intermittent failures remain recorded above.

The actual production-client course passes walking, all eight distant arrivals,
cold Continue and saved-survivor return. Nearby populations are
44/71/39/18/14/0/18/17 (mean 27.625). Continue retains all 289 original native
identities, adds 16 and retires 14 more bodies, reaching 305 identities and 210
sleepers. The saved dune stalker returns at exactly 34 life with no readiness
waits. No console errors or fatal crashes occur, and both the path destination
and distant-encounter screenshots render normally. As before, asynchronous
preparation and elapsed-time courses can change observed counts without a
density-policy change; these are functional receipts, not FPS measurements.

Raw verification is `.claude/perf4-{check,build,genqa,sim}.local.log`, the
18-probe summary `.claude/perf4-checks.local.json` and individual logs,
and `.claude/perf4-client.local.{json,log}`. All correctness/client processes
exit before the timing comparisons begin.

### Initial fourth-pass stress comparisons

Two paired early-load courses compare the initial surface-only/pin-scan
candidate with `f3062726`. Each uses six real clients, 60 seconds, seed
`0x00ddba11`, spread 3,500, rove zero, 60 Hz and diagnostics without a profiler.
These use the default warm-up, not the third pass's delayed shared window.
Pair B reverses launch order. The two hosts compete on one workstation; no
other correctness or profiling jobs from this task run during either pair.
Other workstation activity is uncontrolled. These elapsed-time courses advance
different numbers of steps and do not prove identical fixed-work costs.

| Course | Engine | Tick p50 / p95 / p99 (ms) | Worst tick (ms) | Dropped ticks | Steps/s | Input Hz/seat | Heap growth (MiB) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Early A | control | 121.69 / 318.84 / 660.70 | 1858.80 | 89.37% | 6.41 | 5.12 | 71.37 |
| Early A | initial candidate | 126.71 / 282.61 / 706.90 | 1419.71 | 89.09% | 6.53 | 5.23 | 68.08 |
| Early B | control | 100.30 / 257.19 / 518.52 | 1422.70 | 86.79% | 7.94 | 6.34 | 56.34 |
| Early B | initial candidate | 105.50 / 232.24 / 499.33 | 1498.57 | 87.21% | 7.74 | 6.19 | 69.55 |

The candidate's p95 improves 11.4% and 9.7%, but the tails are mixed: A's p99
worsens 7.0%; B's maximum worsens 5.3%. Both candidates fail the unchanged
tick, drop and early-heap gates. Both also cut the dormant seat too late to
resume before the window ends (59.87 and 59.45 seconds). Control A never
qualifies its seat for the cut and fails resume/heap; control B cuts at 51.33
seconds and resumes the same seat at 56.87, passing resume/heap. All four
pass party, error and fault checks. No gate or eligibility rule is relaxed.

Machine-wide CPU averages approximately 71% in A and 64% in B. Nearby mean
populations are control/candidate 42.40/43.82 and 40.67/42.20. The maximum
ticks contain only 11–16 ms of recorded GC, so collection does not explain
most of those stalls. Population/admission settings are identical. Raw
reports and logs are `.claude/perf4-pair-{a,b}.local.*` in each checkout.
These initial timings predate the additional resident-surface reuse below;
they must not be presented as measurements of that later implementation.

### Final fourth-pass validation

After resident-subset reuse and selective fields, all four type checks and the
production build pass again. Generation QA passes 2,607 cases with the four
existing overlap warnings and three elapsed-time warnings under concurrent
correctness work. Simulation smoke passes five scenarios / 25 episodes. All
18 focused probes listed above pass again on their first final runs, including
native seating, geographic access/intel, dormancy, native paging, save/restore,
multi-seat foci and worker compilation. The expanded pin oracle also passes
exact identity/order, late dependencies, mutable and weak owners, accessor and
immutable-cache checks against the final generator. Earlier baseline and
intermittent failures remain recorded; neither assertions nor timing gates
are relaxed. Raw final receipts use `.claude/perf4-final-*.local.*`.

The final production client also passes the complete walked route, all eight
distant arrivals, cold Continue and saved-survivor return. Nearby counts are
35/62/26/15/8/0/1/2 (mean 18.625). Continue retains all 234 original native
identities and admits 15 more; sleepers rise 140→153. The fang priest returns
with exactly 239.4 life and zero readiness waits. There are no console errors
or fatal crashes, and both captured scenes render normally. Counts are lower
than the initial candidate's functional run; asynchronous preparation makes
this course unsuitable as a controlled population or FPS comparison. Exact
full-content parity is established separately by the archived-generator oracle;
population budgets, recipe density and gameplay scheduling are unchanged.
All correctness/client jobs exit before the final stress comparisons begin.

### Final repeated stress comparisons

The final two spread pairs use the same early-load conditions as the initial
fourth-pass pairs: six clients, 60 seconds, seed `0x00ddba11`, spread 3,500,
rove zero, 60 Hz, diagnostics on, profiler off. Control remains `f3062726`.
A launches control first; B launches candidate first. No correctness, client,
or profiling jobs from this task overlap either pair. Other machine activity
is uncontrolled; average machine CPU is approximately 78% in A and 86% in B.
They are repeated capacity observations, not identical-step experiments.

| Course | Engine | Tick p50 / p95 / p99 (ms) | Worst tick (ms) | Dropped ticks | Steps/s | Input Hz/seat | Heap growth (MiB) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Final early A | control | 136.54 / 348.55 / 777.70 | 2295.78 | 90.49% | 5.75 | 4.59 | 47.04 |
| Final early A | candidate | 141.02 / 331.19 / 836.38 | 1505.67 | 90.28% | 5.83 | 4.66 | 53.14 |
| Final early B | control | 165.03 / 440.71 / 1263.86 | 1995.03 | 91.87% | 4.83 | 3.87 | 53.39 |
| Final early B | candidate | 153.13 / 340.90 / 715.79 | 1340.41 | 90.94% | 5.45 | 4.35 | 55.34 |
| Final warm cluster | control | 12.42 / 29.96 / 80.18 | 300.94 | 5.34% | 56.44 | 33.57 | 9.47 |
| Final warm cluster | candidate | 12.29 / 32.21 / 79.97 | 226.07 | 4.21% | 57.28 | 32.21 | 8.59 |

The candidate's worst ticks are 34.4% and 32.8% lower; p95 improves 5.0% and
22.6%. A's p99 is 7.5% worse, while B's is 43.4% better. The two repeats
support reduced early maxima in these conditions, but do not prove uniform
jitter improvement or remove second-long stalls. Both engines still fail the
unchanged 20 ms p95 and 5% drop gates. All four runs pass heap, same-seat
reconnect, party, error and fault gates. Earlier early-heap and reconnect
failures remain recorded; these passes do not invalidate them.

Nearby mean populations are control/candidate 44.22/43.71 and 44.78/43.61.
The maximum-tick GC contributions are only 8–17 ms. World-update maxima are
2,263.52→1,360.62 ms in A and 1,886.50→1,291.81 ms in B; runtime-update maxima
are 2,229.13→1,320.04 and 1,815.26→1,256.73 ms. These inclusive phase maxima
overlap and must not be added. Raw reports/logs use
`.claude/perf4-final-pair-{a,b}.local.*` in each checkout.

The final clustered pair keeps all other load settings and uses spread zero
with a shared earliest start 60 seconds after dispatch. Its measured windows
start 36 ms apart; average machine CPU is approximately 82%. The candidate
maximum is 24.9% lower and its drop gate passes (4.21%, versus the control's
5.34% breach), but p95 is 7.5% worse and fails on both sides. Typical/p99 tick
times are essentially neutral; input delivery per seat is slightly lower in
the candidate. Both pass heap, reconnect, party, error and fault checks, with
no deaths/rejoins. Nearby mean populations are 20.65/20.46. This single noisy
pair does not establish a warm-play improvement. Raw clustered reports/logs
use `.claude/perf4-final-cluster.local.*`. All five control pairs' raw fourth-pass
reports/logs are preserved in `.claude/ownership.performance4-control-evidence/`
before the temporary control checkout is archived.

### Remaining worst-tick work

A final standalone six-client early-load profile uses the final candidate with
the same timestamp wrappers as the earlier attribution. No other correctness,
client or control jobs from this task run alongside it. Profiler/wrapper and
machine scheduling overhead remain part of these diagnostic times, so do not
compare their absolute durations with the unprofiled pairs or infer a causal
percentage gain from the earlier profile.

The largest tick is 1,087.09 ms: `world.update` takes 1,001.54 ms and
`runtime.update` only 2.93 ms. Approximately 936.25 ms of sampled time remains
under `checkIntelAccess`: wilderness admission asks for cold native-country
candidates and landform reservations. Inclusive base-terrain time is 439.53 ms,
place collection 280.76 ms and noise 286.01 ms; these overlap. The second tick,
1,021.93 ms, spends 899.03 ms in runtime update. Its full place-page query
accounts for approximately 864.44 sampled milliseconds and triggers native
footprint checks, country planning, landform reservations and all-family place
inhibition. The third-largest tick follows the same full-content chain.

Candidate lookup/key construction and public terrain-noise evaluation remain
concrete profiling targets. The profile does not separate cache hits from misses
or prove that a different key representation is safe or faster. No wider cache,
looser inhibition, skipped content, reduced population or scheduling change is
introduced on that evidence. The existing two-millisecond intel loop budget
still cannot interrupt one expensive synchronous query.

This diagnostic run passes heap (+63.66 MiB), reconnect, party, errors and faults,
but fails p95 (324.01 ms) and dropped ticks (91.04%). It does not establish
release readiness. Raw profile/trace/report files are `.claude/perf4-spikes.local.cpuprofile`,
`.claude/perf4-spike-trace.local.json` and `.claude/perf4-profile.local.*`;
the reproducible attribution reader/output are
`.claude/ownership.perf4-spike-attribution.local.{cjs,json}`.

## Fifth pass: cold reservation work

The fourth-pass checkpoint `448c07fc` is the unchanged control. The remaining
worst-tick stacks above include landform admission calling `patchSitesClear`:
it obtains complete place pages, then discards ordinary habitat encounters
because these owners are compatible with the landform. Generating and testing
those discarded candidates is avoidable when all protected sites have surfaces.

The generator now records that invariant from its frozen descriptor. Only
`patchSitesClear(..., true)` with that invariant uses the existing surface-page
query. Ordinary patch admission and descriptors containing an unpainted,
non-habitat site keep the full-page path. Native-regional reservations, page
bounds, circle/box intersections and early rejection order remain unchanged.
Surface acceptance still checks competing candidates from every family,
including habitats. A resident full page still takes precedence; the existing
surface-to-full completion supplies every encounter on a subsequent content
query. This adds no cache or cache capacity and changes no density, admission,
simulation or scheduling policy.

Geographic noise also uses a module-level corner sampler instead of creating
a closure for every sample. The four hash inputs, full coordinate strings,
dimension reads, corner order and interpolation arithmetic remain unchanged.
This targets function setup visible in the hosted TypeScript profile; a
production-bundle gain must be measured separately.

### Exact output and isolated work

`worldmass_sitework` embeds the exact `448c07fc` generator class with SHA-256
`202fb9d326985d132c9491bc24db0921e32b2168cbb429a76766e53dc479408d`.
Eight fixtures / 940 exact comparisons cover high/equal-priority habitat
inhibition, unpainted protected-site and historical fallbacks, both admission
flags, circle tangencies, distant signed coordinates, all six terrain/reservation/
content orders, empty subsets, eviction, full-page reuse and native-regional
veto precedence. Complete current/historical planner output and saved descriptors
match. Independent review checked the embedded class against the actual commit.

The fixed-work reservation course uses the shipped fields, surfaces and recipes
on 24 cold pages, after the original native-regional veto. Candidate requests
fall 17,004→5,320 and construction calls 3,732→578. Constructions include rejected
and null results, not admitted encounters. Four alternating-order rounds give
median cold reservation time 59.16→9.95 ms (83.2% less). Subsequent 384 warm
queries take 0.781→0.690 ms. All eight output digests match.

When terrain and complete content are subsequently requested, total requests
and constructions are exactly 17,004 and 3,732 on both sides. Median combined
cold reservation, terrain and content time is 59.83→60.30 ms (0.8% higher).
This avoids work for reservation-only reads and postpones encounter work until
needed; it is not a full-course throughput improvement. Both class variants
share the current noise module, so this measurement isolates reservation work.
Raw rounds and summary are `.claude/ownership.perf5-sitework.local.log` and
`.claude/ownership.perf5-sitework-summary.local.json`.

The independent `worldmass_noisework` oracle preserves the original noise body
with SHA-256 `5e84eeee8ebd625e0c5928597f5c671e0b1b4860f903e5ab258555fbd9d8e947`.
Its 4,090 checks cover exact floating-point results, ordered hash bytes and
salts, lattice calls, full signed coordinates, large periods, invalid-input
errors, changing/throwing getters and independently bundled output. This
separate oracle addresses the generator probes' shared noise dependency.

Four alternating rounds per runtime/workload each execute 131,072 identical
queries. In the actual hosted TypeScript runtime, nearby median time falls
444.08→362.99 ms (18.3%) and distant cache-churn time 1,032.48→902.95 ms (12.5%).
The minified production-style bundle is essentially unchanged nearby
(250.22→248.17 ms), and slower for distant churn (731.99→746.12 ms, 1.9%).
All checksums agree. These bundled functions run in Node V8, not a browser
frame benchmark; no client FPS gain is claimed. Existing address-cache capacity
and key/eviction behavior are unchanged. All isolated timing finishes before
broader verification and the live paired comparisons.
Noise raw rounds/checksums and the exact source snapshot are
`.claude/ownership.perf5-noise-bench.local.{json,log}` and
`.claude/ownership.perf5-noise-source.local.ts`.

Because live tails are mixed below, the sitework benchmark also measures the
complete shipped terrain/landform planning chain at eight fixed, widely spaced
points with fresh generators. Each point calls `terrainAt` and real landform
reservation, then all points request full `regionalPlacesInCell` content. The
native catalogue's minimum/median/maximum footprint radii happen to be the same
1,392.7922 units in this descriptor; the course therefore uses that one actual
radius. Seed 713, query order and output are identical. Constructors are outside
timing. Both classes share current noise and other unchanged planner modules;
this isolates reservation work, not the combined noise change or an actual
native-country/runtime/shard owner.

Four alternating rounds retain identical cold, content and combined digests.
Median cold planning falls 3,407.06→2,692.13 ms (21.0%); the median of each
round's worst query falls 594.95→482.81 ms (18.8%). All eight per-point repeated
cold medians improve. The observed maximum across rounds is 693.72→525.54 ms.
Deferred full content rises 327.70→375.81 ms (14.7%), while median combined
planning/content time falls 3,726.11→3,079.05 ms (17.4%). This is repeatable
fixed-work evidence of lower cold planning stalls, not proof of lower live
tick tails. Per-query timings and all digests are retained in
`.claude/ownership.perf5-completeplanner.local.log` and
`.claude/ownership.perf5-completeplanner-summary.local.json`.

### Fifth-pass verification

All four type checks and the production build pass. Generation QA passes
2,607 cases with four existing overlap warnings and one elapsed-time warning
under concurrent correctness work. Simulation smoke passes all five scenarios
/ 25 episodes, and the probe roster census passes. All 22 focused probes pass:
the fourth pass's 18-probe set plus surfaces, sitework, noisework and
dormancypinattribution. The type gate initially caught two unused imports in
the new site probe; removing those imports resolves it without changing the
oracle or assertions. Earlier unrelated baseline/intermittent failures remain
recorded above, and no timing or correctness gate is weakened.

Final checks/build/generation/simulation logs, the focused-probe summary and
individual receipts are `.claude/perf5-final-*.local.*`. Independent critics
reviewed the production changes and archival-oracle independence with no
remaining correctness finding.

The production client passes the full 1,102-frame, 3,213-unit wilderness route,
eight distant arrivals, cold Continue and saved-survivor return. Nearby counts
are 39/68/28/20/13/0/13/13 (mean 24.25). Continue retains all 275 original
identities and admits 15 more, with sleepers rising 181→194. The fang priest
returns at exactly 239.4 life with no readiness waits. There are no console
errors or fatal crashes; both captured destination/encounter scenes were visually
checked. Asynchronous preparation makes these counts a functional receipt,
not a controlled density or FPS comparison. Full-content equivalence is checked
by the archived-generator probes. The client exits before paired timing starts.

### Fifth-pass repeated stress comparisons

Two early-load pairs compare the final production changes with `448c07fc`:
six real clients, 60 seconds, seed `0x00ddba11`, spread 3,500, rove zero,
60 Hz, diagnostics on and profiler off. A launches control first and B reverses
the order. Both hosts compete on one workstation; no correctness/client/profile
jobs from this task overlap. Other workstation activity is uncontrolled.
Average machine CPU is approximately 66–67%. These elapsed-time courses advance
different numbers of steps and do not represent identical fixed work.

| Course | Engine | Tick p50 / p95 / p99 (ms) | Worst tick (ms) | Dropped ticks | Steps/s | Input Hz/seat | Heap growth (MiB) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Early A | control | 109.80 / 234.65 / 458.80 | 1277.00 | 87.10% | 7.79 | 6.21 | 66.67 |
| Early A | candidate | 100.67 / 226.55 / 363.70 | 1402.11 | 86.07% | 8.39 | 6.70 | 77.75 |
| Early B | control | 99.96 / 209.83 / 295.04 | 1069.64 | 85.78% | 8.69 | 6.94 | 61.83 |
| Early B | candidate | 109.20 / 222.51 / 457.85 | 842.38 | 86.69% | 8.05 | 6.41 | 55.22 |

A improves p95 by 3.5% and p99 by 20.7%, but its maximum worsens 9.8%.
B improves its maximum 21.2%, while p95 worsens 6.0% and p99 55.2%.
These repeats do not establish lower worst live stalls or uniform jitter
improvement. All four runs fail the unchanged p95 and dropped-tick gates.
Both A runs also exceed the early heap-growth gate; both B runs pass it.
Control A cuts its dormant seat at 56.07 seconds and cannot complete the
five-second return before the window closes; candidate A resumes at 52.73
seconds after its 47.56-second cut. Both B runs resume (control 52.27→57.53,
candidate 52.64→57.75 seconds). Party/error/fault gates pass in all four runs.

Nearby mean populations are control/candidate 40.86/39.22 in A and 41.27/41.21
in B. The changed production files preserve all admission/density settings;
exact content parity is established separately. Candidate A's largest stall
contains 16.83 ms of recorded GC and 1,287.00 ms of runtime update, so the
remaining synchronous runtime work still dominates that tick. Raw reports/logs
are `.claude/perf5-early-{a,b}.local.*` in the candidate and control checkouts.

Two clustered pairs keep the same seed/client/rate settings with spread zero
and a shared earliest measurement start 60 seconds after dispatch. The second
pair reverses launch order because the first candidate's p95 crossed the gate
while its control passed. Average machine CPU is approximately 67% in A and
71% in B. All task correctness, client, profile and other timing jobs are stopped.

| Course | Engine | Tick p50 / p95 / p99 (ms) | Worst tick (ms) | Dropped ticks | Steps/s | Input Hz/seat | Heap growth (MiB) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cluster A | control | 9.50 / 18.80 / 65.03 | 146.09 | 0.80% | 59.71 | 47.06 | 3.04 |
| Cluster A | candidate | 9.51 / 29.53 / 65.00 | 244.01 | 0.72% | 59.46 | 42.36 | 2.86 |
| Cluster B | control | 10.27 / 32.39 / 75.93 | 234.77 | 2.48% | 58.26 | 40.25 | 5.85 |
| Cluster B | candidate | 10.38 / 21.47 / 71.62 | 240.65 | 1.95% | 58.66 | 42.11 | 5.24 |

Typical/p99 times in A are essentially unchanged, but candidate p95 worsens
57.1% and its maximum worsens 67.0%. In B, candidate p95 improves 33.7% and
p99 5.7%, while the maximum is 2.5% higher. Both candidates still fail p95;
only control A passes every gate. All four pass dropped ticks, heap, same-seat
reconnect, party, errors and faults. This reversal does not establish a stable
p95 regression, but neither pair demonstrates lower clustered worst ticks.
Nearby mean populations are control/candidate 20.33/18.29 and 16.63/17.25.
Raw reports/logs are `.claude/perf5-cluster.local.*` and
`.claude/perf5-cluster-b.local.*`. The independently repeated fixed-work planner
course above establishes the targeted savings; these live comparisons do not
justify a broader jitter or release-readiness claim.
All four control courses' JSON/log receipts are SHA-256 checked and preserved
in `.claude/ownership.performance5-control-evidence/` before the temporary
control checkout is archived.

### Fifth-pass remaining stalls

The final standalone six-client early-load diagnostic uses the candidate only,
CPU profiling and the same inclusive per-tick timestamp wrappers. Other task
correctness, client and timing jobs are stopped. Its durations include profiler
and scheduling overhead; they are not a before/after performance comparison.

The worst traced tick is 732.51 ms, with 666.10 ms in world update and only
5.38 ms in runtime update. Sampled `checkIntelAccess` takes 612.40 ms inclusive,
through wilderness path admission, cold native-country candidates and landform
reservations. Within that chain, landform reservations take 535.92 ms,
base terrain 341.55 ms, noise 194.68 ms and place collection 82.55 ms. These
durations overlap and must not be added. The changed noise closure is gone,
but hash work, lattice/address setup, regional terrain grammar and the remaining
candidate work still contribute. The intel loop still cannot interrupt a single
expensive synchronous query; its schedule and budget are unchanged.

The second tick, 557.89 ms, includes 226.96 ms in dormancy update. Sampled pin
discovery is 221.00 ms inclusive, with 168.81 ms of self time in immutable
dependency certification. That earlier conservative scan remains another
independent spike source. The third tick combines cold pathfinding terrain and
regional content preparation. No owner exemption, admission delay or scheduling
change is introduced in response to these samples.

The diagnostic passes heap (+54.76 MiB), reconnect, party, errors and faults,
but fails p95 (178.21 ms) and dropped ticks (84.59%). Raw profile, trace and
report are `.claude/perf5-spikes.local.cpuprofile`,
`.claude/perf5-spike-trace.local.json` and `.claude/perf5-profile.local.*`.
The reproducible reader and output are
`.claude/ownership.perf5-spike-attribution.local.{cjs,json}`. The fixed-work
improvements justify this narrow checkpoint; persistent cold queries and mixed
live tails remain unresolved rather than being recast as flawless play.

## Sixth pass: cold terrain and dependency certification

The fifth-pass checkpoint `a6f62a2d` is the control. The initial candidate targets three
operations visible in the remaining cold spikes, without changing generated
content, actor scheduling, encounter density, cache capacities or tick gates.

- Dependency certification reuses `freezeData`'s existing proof of recursively
  frozen own data descriptors. Proven objects can expose their enumerable values
  without constructing descriptor records again. Every numeric reference key
  is still checked, including an ID that becomes owned later. Arbitrary frozen
  objects retain descriptor inspection; accessors, cycles, depth/work limits,
  mutable containers and unknown classes retain the conservative fallback.
- Regional terrain paint skips geometry sampling for a cell already set to dry
  floor, because that value wins every later merge. Both internal samplers are
  pure geometry, with random draws outside the raster loops. Clipped integer
  bounds are computed once per paint. Complete rasters, nested content, random
  cursors and subsequent processing remain unchanged.
- Generation lattice calculations evaluate x and then y directly, removing a
  per-query closure and intermediate tuples. Full signed coordinates, integer
  arithmetic, validation, field-read order and error behavior remain unchanged.

### Sixth-pass independent equivalence and work measurements

`worldmass_dormancywork` embeds the exact `a6f62a2d` scanner declarations
(SHA-256 `93bbe3995f28790fe91517665e765243300d29408ee484c2000758ee0845c783`).
Its 23 comparisons cover ordered pins, future numeric owners, named array
references, getter reads, hidden keys, cycles, weak/mutable containers and
depth/work fallbacks. A proven synthetic graph takes 514→1 descriptor calls.
The populated-world course retains 102 actors, 75 owned identities, 32,768
terrain samples across 25 pages, and ordered pins `[46,47,48]`. Actor/resource/
sleep/terrain state is unchanged before and after timing.

In that real fixture, cold descriptor calls fall 169,788→131,409 (22.6%). Four
alternating rounds, three fresh-certificate scans per side per round, give
median cold totals 1,899.87→1,752.82 ms (7.7% lower; three of four rounds favor
the candidate). Absolute totals drift upward across rounds. Warm totals over
25 scans are 1,264.95→1,242.82 ms (1.7% lower; only two of four improve), which
is treated as unchanged. The scanners use the same transform and fixed world;
this isolates certification, not a live dormancy or frame-tail measurement.
Raw rounds and exact state digests are
`.claude/ownership.dormancy6-bench.local.{json,log}`.

`worldmass_grammarwork` embeds the complete archived grammar module (SHA-256
`04445787e5a25da3ea054264b88c87b5b097d3f4aa46b3dc2883c8e9f531268a`).
Five fixtures / 803 comparisons cover all 12 court families, historical/current
policies, full shape equality, per-stream RNG draws/cursors, immutable inputs,
refusals, errors and missing motifs. It observes 180 generated shapes, 15
refusals and one throw. Both independent critics verified the archive and
the terminal-floor/pure-sampler argument.

Eight-seed work counts fall 282,315→212,759 for historical circles (24.6%),
282,315→222,771 for historical morphology (21.1%), and 310,496→241,424 for
current weave (22.2%). Four alternating timing rounds use the same plain ES2022
TypeScript transform for both full kernels; the actual hosted import is an
independent correctness target. Median totals are 76.69→76.30, 119.43→106.97
and 271.40→267.51 ms respectively. Current-weave paired totals range from a
9.1% reduction to a 21.3% increase. Its median per-round maximum is
47.71→44.42 ms and worst observed query 50.31→50.17 ms. These noisy times do
not establish a repeatable live improvement; the exact reduction in geometry
calls is the stronger evidence. Raw rounds and summary are
`.claude/ownership.perf6-grammarwork.local.log` and
`.claude/ownership.perf6-grammarwork-summary.local.json`.

`worldmass_latticework` retains the original lattice function with SHA-256
`016c04500a04442b3fd5d95ca5e68f2afd24cde368be51722e47455e0a1dd809`.
Its 6,803 comparisons cover signed-64 limits, fractional and large integer
inputs, cache eviction, changing/throwing getters, validation interleaving,
exact errors and minified output. The cell cache and validation helpers are
unchanged and shared; the lattice function itself is independently archived.

A first module-level helper variant was rejected after minified nearby work
slowed 9.4% (three of four pairs). The final explicit-axis version uses four
alternating rounds of 262,144 queries per workload/runtime, after 8,192 warm-up
queries. All 32 checksums match. Actual hosted TypeScript median times fall
348.12→149.37 ms nearby (57.1%) and 1,407.40→1,126.79 ms with distant cache
churn (19.9%); all eight pairs favor the change. Minified medians fall
171.17→162.98 ms (4.8%) and 1,242.04→1,219.94 ms (1.8%), each favoring the
change in three of four pairs. The bundled effects are modest and measured in
Node V8, not browser frames. Final and rejected raw rounds, sources and summaries
are `.claude/ownership.perf6-lattice-{final,rejected}.local.*`.

### Sixth-pass live comparison protocol

Repeated live comparisons run one host and its six real clients at a time,
in predeclared control/candidate/candidate/control/control/candidate order.
Each engine gets three 60-second windows with seed `0x00ddba11`, 60 Hz,
rove zero, diagnostics on and profiler off. Early spread is 3,500 with the
unchanged join/party/settle warm-up. The clustered course uses spread zero
and `--window-after-host 60`, a measurement option that keeps recording warm
ticks until that individual host has run for at least 60 seconds. Forced GC
and its original settling period still precede the measured window.

The same measurement harness is copied into the control checkout; all control
engine code stays at `a6f62a2d`. Its fleet watchdog includes the selected warm
period. Reports record actual host age at window start, every warm-up maximum,
tick/input counts, nearby populations, machine load and all unchanged gates.
The local runner rejects abnormal exits and stale reports. No task correctness,
client, benchmark or profile jobs overlap these runs. Other workstation activity
is uncontrolled. Equal elapsed windows and a common seed do not mean identical
simulation work: inputs, joins, deaths and target choices depend on wall time
and delivered snapshots. Repeated controls expose some of that variability.
The raw runner and combined receipts are
`.claude/ownership.perf6-serial.local.cjs` and
`.claude/perf6-{early,cluster}-serial.local.json`.

### Sixth-pass initial spread results and joining investigation

The initial six unprofiled spread runs completed in the declared order. Values
below are milliseconds except drop percentage; each pair uses repeat numbers,
not simultaneous execution. Other machine activity remained uncontrolled.

| Repeat | Engine | p95 | p99 | Window maximum | Joining maximum | Dropped ticks |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Control | 283.58 | 477.99 | 1694.70 | 1202.70 | 88.13% |
| 1 | Candidate | 260.71 | 487.87 | 1257.31 | 1336.49 | 88.42% |
| 2 | Control | 337.22 | 638.02 | 1181.44 | 1695.20 | 90.40% |
| 2 | Candidate | 210.34 | 338.36 | 1064.28 | 2221.76 | 85.30% |
| 3 | Control | 345.78 | 556.53 | 1335.13 | 1696.93 | 90.30% |
| 3 | Candidate | 329.27 | 791.04 | 1131.65 | 2725.41 | 90.35% |

Window maximum improves in all three pairs, with median 1335.13→1131.65 ms
(15.2%). Median p95 falls 337.22→260.71 ms and p99 556.53→487.87 ms, but
the first and third individual p99 comparisons regress. More importantly,
joining maximum regresses in every pair: 11.1%, 31.1% and 60.6%. The median
maximum across joining and measurement rises 1695.20→2221.76 ms (31.1%).
This is not an overall stall improvement. All six runs fail the unchanged p95
and dropped-tick gates. Repeat 1 on both engines also fails heap growth; repeat
3 on both engines fails the resume course because the selected bot never
stood to be cut. Errors and faults remain zero and the party gate passes.

Recorded machine CPU (67–87%) covers only the measurement window and cannot
explain joining. Joining GC overlaps are only 12–38 ms. Candidate host ages at
window start are 7.09/8.16/10.59 s versus 6.98/7.22/7.96 s for control, so
the windows do not enclose identical cold work. All unfavorable receipts are
retained in `.claude/perf6-early-serial.local.json`.

Separate full-process diagnostic runs capture joining as well as measurement.
The candidate's 1767.73 ms joining tick includes 1125.18 ms in scenery sync,
139.66 ms in geographic preparation, 169.67 ms surveying five foci and
58.72 ms in dormancy. Control's 1866.02 ms joining tick includes 1094.79 ms
in scenery sync, 121.96 ms preparation, 181.77 ms surveying four foci and
40.21 ms dormancy. These identify cold scenery/terrain as the dominant joining
work; different focus counts prevent an exact cost comparison. They do not
establish dependency scanning as the cause of the initial joining regressions.
Canonical serialization's recursive visitor accounts for roughly 287/295 ms
self time in those candidate/control ticks. Dependency certification remains
a later-window hotspot (approximately 195/147 ms self time on different states).

The scratch wrappers capture phase timings and main-process CPU samples from
before host startup to after measurement. They leave bots/workers unprofiled.
Inclusive phase/sample costs overlap and must never be added. Function keys
retain source columns, because the hosted TypeScript transform puts many
different functions on line 1. Instrumentation changes absolute timings; these
runs are attribution evidence, not substitutes for unprofiled comparisons.
Both diagnostic runs still fail p95, dropped ticks and heap gates. Raw files in
each checkout are `.claude/perf6-profile.local.{json,log}`,
`.claude/perf6-spikes.local.cpuprofile`, `.claude/perf6-spike-trace.local.json`
and `.claude/ownership.perf6-spike-attribution.local.{cjs,json}`.

The six initial clustered runs also completed, using the same frozen initial
candidate. Their medians are:

| Metric | Control | Initial candidate |
| --- | ---: | ---: |
| Window p95 | 34.12 ms | 23.10 ms |
| Window p99 | 87.01 ms | 81.56 ms |
| Window maximum | 279.28 ms | 111.39 ms |
| Joining/window maximum | 439.74 ms | 358.46 ms |
| Dropped ticks | 6.69% | 1.31% |
| Simulation steps/s | 55.67 | 59.01 |
| Nearby population | 15.61 | 15.18 |

Window maxima improve in all three clustered pairs, and joining maxima also
improve. All six still fail p95; control repeats 1 and 3 also fail dropped
ticks. All other gates pass, with zero errors/faults. These are results for the
initial implementation containing the subsequently rejected proxy shortcut.
They cannot establish the performance of the corrected implementation. All
individual rows, machine loads and counts are in
`.claude/perf6-cluster-serial.local.json` and `.claude/perf6-results.local.json`.

### Sixth-pass initial correctness verification

All four type checks, the production build, roster census and simulation smoke
(five scenarios / 25 episodes) pass. Generation QA passes 2,607 cases with four
existing overlap warnings and four elapsed-time warnings under concurrent
correctness work. The build retains its existing large-chunk warning.

Twenty-eight of 29 focused probes pass on their first run: all 22 fifth-pass
probes, the three new independent work probes, regionalweave, regionallayers
and regionalextents. `worldmass_terrainvariation` fails its historical hash
assertion at line 108: actual `f24109327cf6e53f`, expected `4225203d67bebfb4`.
The isolated `a6f62a2d` control fails identically, confirming the earlier recorded
baseline failure. No oracle, assertion, timing limit or content is altered to
make it pass. Other historical failures recorded above were not rerun in this
focused set. Type/build/generation/simulation and per-probe receipts are
`.claude/perf6-final-*.local.*`; the control hash receipt is
`.claude/perf6-baseline-terrainvariation.local.log` in the control checkout.

Three critics reviewed the scoped changes. They verified archive provenance,
getter/error ordering, conservative dependency handling, the pure raster
samplers and identical candidate/control timing harnesses. The first lattice
variant's bundled regression was rejected, and two harness robustness findings
(watchdog allowance and stale/abnormal report refusal) were corrected before
live runs. No remaining correctness blocker was identified in that initial review.
A later adversarial proxy review found the dependency shortcut invalid; see below.

The production client passes the 1,102-frame / 3,213-unit walking route, eight
distant arrivals, native dormancy, cold Continue and saved-survivor return.
Nearby counts are 43/59/25/19/10/0/11/13 (mean 22.5). Continue retains all
253 original identities and admits 21 more, reaching 274, while sleepers rise
160→179. The fang priest returns at exactly 239.4 life with no readiness waits.
There are no console errors or fatal crashes; both destination and encounter
screenshots were visually checked. As in prior passes, asynchronous preparation
makes this a functional receipt rather than a controlled density or frame-time
comparison. The client exits before live timing starts. Raw receipts are
`.claude/perf6-final-client.local.{json,log}`.

### Rejected direct-value dependency shortcut

Two critics confirmed a counterexample after the initial validation: a proxy
over a plain data object can pass `freezeData` and still run side effects or
throw from its `get` trap. The archived descriptor certification never invokes
that trap. Reading proven values with `Object.entries(value)` introduces it.
Frozen-property invariants constrain returned values; they do not guarantee
inert or nonthrowing proxy traps. No project contract excludes such proxies.

The direct-value shortcut is rejected. Its initial exact-work measurements,
client check and live comparisons remain recorded above as evidence about
that initial candidate, not as validation of the final implementation. The
initial production sources are retained in
`.claude/ownership.performance6-initial-sources/`. Subsequent dependency work
must retain descriptor inspection and cover proxy read/throw behavior explicitly.

### Refined sixth-pass candidate

The refined candidate keeps the exact lattice and terminal-floor changes. Its
dependency loop obtains the original descriptor dictionary, then walks its keys
without materializing `[key, descriptor]` pairs. It retains every source-object
reflection operation, numeric-reference guard, fallback, budget and certificate.
The dictionary is newly created by the builtin; the loop never reads source
values directly. The archived/proxy probe now makes 31 exact comparisons. Both
paths inspect 514 descriptor dictionaries in its synthetic graph. The refined
loop's entry-pair allocation count falls 1,026→0 in that graph while reflection
stays unchanged. The rejected
implementation's real proxy-test failure is retained in
`.claude/ownership.perf6-rejected-proxy.local.log`.

Four fresh processes use paired orders AB/BA/BA/AB against one unchanged real
world per process. Both private scanner copies use the same transform. Their
first call is unprimed; later cold-certificate scans reset only the private
certificate WeakSet while retaining the same function instance. Fixture setup,
reset hooks, state verification and descriptor counters stay outside timing.
This measures first scanner use after world construction, not cold host startup.
All four preserve 102 actors, 75 owned identities, 25 pages/32,768 samples and
pins `[46,47,48]`, with 169,788 descriptor calls on both sides.

| Scanner phase | Samples per engine | Control median | Refined median |
| --- | ---: | ---: | ---: |
| First invocation | 4 | 419.95 ms | 396.70 ms |
| Warm code, cold certificates | 12 | 394.67 ms | 386.58 ms |
| Warm certificates | 40 | 29.97 ms | 28.79 ms |

The latter two medians are medians of each process's median. First-use pairs
favor the refined loop three of four times. Cold-cert individual comparisons
split 6/12, warm comparisons split 20/40; these are modest typical savings.
Observed maxima rise 451.65→455.18, 433.32→462.71 and 37.69→40.22 ms
respectively, so this does not establish a scanner worst-stall reduction.
GC overlaps and full sources/fixture hashes are retained in
`.claude/ownership.perf6-scanner-first-current.local.json` and its four timestamped
child receipts. There are 112 timed scans in total, without task-job overlap.

Cold profiles also implicated canonical serialization across scenery, terrain
keys, geography and candidate identities. Its shared module-level visitor now
receives each call's cycle set through the callback receiver. `Array.from` keeps
custom iterator, array-like fallback and iterator-closing behavior. Sorted
record keys are reused for serialized entries, eliminating the map callback and
second record array. Finite-value validation, plain-record checks, getter order,
errors, aliases/cycles and root-only memoization remain unchanged; no cache or
content policy is added.

`worldmass_canonicalwork` embeds the full `a6f62a2d` module, SHA-256
`4a2a5d79ab39ed752804d7142a368f0e66f8526014128a2802d0dd2e6daf650d`.
Its 84 adversarial fixtures plus full workload-byte comparisons total 6,564
checks against actual TypeScript and matched keepNames/minified ES2022 bundles.
Two critics verified archive provenance and the installed helper's exact match
to the tested candidate. Four alternating timing rounds give:

| Serialization workload | Host-style control→refined | Minified control→refined |
| --- | ---: | ---: |
| 32,768 fresh tuples | 123.05→90.46 ms | 86.14→88.01 ms |
| 32,768 fresh scenery snapshots | 175.17→133.53 ms | 134.30→120.46 ms |
| 262,144 warm memo calls | 186.49→40.95 ms | 34.38→32.14 ms |

All host-style pairs favor the change, as do all four minified scenery pairs.
Minified tuple and memo pairs each split 2/4 and are inconclusive; the nested
gain also narrows across rounds. Both timed variants use identical transforms;
actual TypeScript is an independent correctness target. Fresh construction and
checksum work are included equally, while frozen certification and memo priming
are excluded. These Node V8 measurements are not browser-frame measurements.
Raw rounds and metadata are `.claude/ownership.perf6-canonical-bench.local.log`
and `.claude/ownership.perf6-canonical-bench-summary.local.json`.

### Identical cold terrain and scenery replay

The scratch replay runs the real synchronous `WorldMassRuntime.update` chain
with seed `0x00ddba11`, normal boot/predecessor caches, and the host's existing
`massRenderPages=false` setting. Fixed four-focus, additional six-focus and
resident-six batches run at world times 0.5/1.0/1.5. The same script in both
checkouts has SHA-256
`3e6d28409a6ecbd923b0a1e946002d8156cb8afc504c926d96ac165e30b0c2d0`.
No production scheduling, policy, density or cache limit changes are needed.

A separate proof run takes fresh snapshots for every captured call, preserving
local aliases/cycles and special primitive values, then deduplicates by exact
snapshot text. Identity-only interning was rejected because it could hide later
mutation. The proof matches 10,885 terrain results, 262 place results, 112,020
reservation queries/results, 43,426 RNG draws/cursors and 88,432 snapshot values.
All nine digests, descriptor/run hashes and query counts match. Critics also
verified all recorded source hashes and that control modules remain `a6f62a2d`.

| Checkpoint | Native identities | Doodads | Ecology pieces | Terrain samples |
| --- | ---: | ---: | ---: | ---: |
| Boot | 25 | 863 | 401 | 2,173 |
| Four cold foci | 227 | 2,320 | 1,625 | 8,637 |
| Six cold foci | 312 | 2,927 | 2,070 | 11,412 |
| Six resident foci | 312 | 2,927 | 2,070 | 11,412 |

The phase requests are 81/107/107 cells, with 107 unique cells and 9,239 new
terrain generations. Global random use remains 31 draws at every checkpoint.
These checks show no observed terrain, content, identity or density reduction
on this course. Native snapshots cover identities, positions and vitals;
`pieceState` supplies the static-scenery contract, not every hidden actor field.

Six separate timing processes use C/A/A/C/C/A order, with heavy proof tapes
disabled. All captured content/state digests and query counts still match.
Every paired cold phase favors the refined candidate:

| Phase | Control repeats (ms) | Refined repeats (ms) | Median change |
| --- | --- | --- | ---: |
| Four cold foci | 2349.88 / 2036.04 / 1844.45 | 1679.45 / 1566.48 / 1565.02 | −23.1% |
| Additional six cold foci | 1403.55 / 1263.77 / 1182.64 | 1100.55 / 1018.05 / 992.71 | −19.4% |
| Six resident foci | 168.70 / 147.45 / 127.91 | 126.35 / 123.07 / 117.52 | −16.5% |

Four-focus paired reductions narrow 28.5%→23.1%→15.1%; additional-six
reductions narrow 21.6%→19.4%→16.1%. Controls trend down, so these are
descriptive results from three pairs, not a precise population estimate. Phases
share process/caches and are not independent experiments. Lightweight wrappers
remain in both timing paths; post-timing snapshots can influence later GC.

This isolates combined synchronous admission/ecology work, not a whole host's
socket batching, input, worker adoption, combat, browser frames or an individual
change's contribution. `makeSimWorld` disables expedition packages and starting
companions before ordinary mass attach. Proof-mode timings have no speed claim.
Raw scripts are `.claude/ownership.perf6-cold-replay.local.ts` and
`.claude/ownership.perf6-cold-series.local.cjs`; combined receipts are
`.claude/ownership.perf6-cold-{proof,timing}-series.local.json`; full individual
receipts remain in each engine checkout.

### Refined verification and diagnostic correction

All four type checks, production build, 569-probe roster census and simulation
smoke (25 episodes) pass. Generation QA again passes all 2,607 cases, with four
existing overlap warnings and two elapsed-time warnings during concurrent
correctness work. The build retains its existing large-chunk warning.

The 30 focused probes initially yield 28 passes, the unchanged historical
`worldmass_terrainvariation` failure (`f24109327cf6e53f` versus
`4225203d67bebfb4`), and one diagnostic-counter failure. That counter counted
`Object.entries`, including temporary descriptor dictionaries; using keys
removed those temporary enumerations without removing source inspections.

The attribution probe now counts each source descriptor inspection directly,
avoiding duplicate counting when a scanner later enumerates its descriptor
dictionary. Ordinary source enumeration remains a separate read. Every prior
assertion, including the greater-than-10,000 traversal threshold, exact pin
order, live dependency leases, sample certificate checks and actor resources,
is unchanged. The identical corrected probe passes on both refined and control
engines, with identical counts: 77,640 cold inspections, 11,768 warm, and 7,458
with the diagnostic walk exclusion. Both retain pins `[46,47,48]` and inspect
16,384 actual sample wrappers cold, zero warm. These instrumented durations
are not performance comparisons. Node-side types pass again after this
test-only correction. The final focused outcome is 29 passes and the one
previously control-confirmed historical hash failure; no assertion is waived.

Initial failures and corrected receipts remain in `.claude/perf6-refined-*.local.*`,
including `perf6-refined-pin-counter.local.log` in both checkouts. The production
source fingerprint is `.claude/ownership.perf6-refined-production-hashes.local.json`.

The final production client passes actual input along the complete wilderness
path, all eight distant arrivals, native dormancy, cold Continue and saved-enemy
return. Nearby counts are 43/65/32/20/6/0/11/13 (mean 23.75). Continue preserves
all 259 prior identities and admits 20 more, reaching 279, while sleepers rise
166→183. The returned mockthrush has its exact saved 45 life, with zero readiness
waits. There are no console errors or fatal crashes. Both destination and
distant-encounter screenshots were visually checked. The harness disables
hardware acceleration and advances explicit frames: this is functional client
evidence, not a frame-rate or controlled density comparison. It exits before
the final live timings. Receipts are
`.claude/perf6-refined-client.local.{json,log}`.

### Final refined live comparisons

The final early-spread series repeats the six-bot, 60-second, seed `0x00ddba11`,
3,500-unit spread course in C/A/A/C/C/A order. Both engines use the identical
soak harness, diagnostic counters, 60 Hz target and unchanged gates; neither
uses a CPU profiler. No task client, tests, build, benchmark or other host runs
overlap. The candidate fingerprint matches before and after this series. Other
workstation activity remains uncontrolled. Each window follows its ordinary
join/party/settle sequence, so actual simulation states and cold admission batches
are not identical. All joining ticks remain in the warm-up receipt.

| Early repeat | Control→refined p95 | Control→refined p99 | Window maximum | Joining maximum |
| --- | --- | --- | --- | --- |
| 1 | 284.66→459.24 ms | 677.97→763.55 ms | 1514.73→1085.47 ms | 2005.33→1354.58 ms |
| 2 | 515.14→489.76 ms | 1184.86→1164.36 ms | 1515.49→1212.11 ms | 3792.50→2521.81 ms |
| 3 | 486.58→465.69 ms | 1238.00→887.76 ms | 1536.78→1087.93 ms | 3694.04→3183.40 ms |

Every joining and window maximum favors the refined candidate. Median window
maxima fall 1515.49→1087.93 ms (−28.2%); median combined joining/window maxima,
all in joining, fall 3694.04→2521.81 ms (−31.7%). Host boot and the original
GC/settling gap are outside these recorded tick lanes, so this is not a
whole-host maximum. These are descriptive three-pair results, not
a general latency guarantee. Pair one's p95/p99 and input rates regress; its
window CPU load differs 73.27→94.96%, and the other four windows are 99.93–100%.
CPU readings cover only the window and cannot explain earlier joining spikes.

Median stepped rates are 3.99→4.40 Hz, host-seen input rates 3.19→3.51 Hz per
seat, and dropped shares 93.33→93.15%. The unchanged 20 ms p95 and 5% dropped
gates fail in all six runs. Control repeat one's heap growth is +66.49 MB,
exceeding 64 MB; the other five heap gates pass. All six resume and party gates
pass, with zero faults/errors. Median nearby living counts are 44.83→44.60;
these are observed live populations, not a controlled equality proof. The
fixed-work replay above supplies the stronger captured-content equivalence.

These results support a repeated reduction in the observed worst early stalls,
while the spread workload remains far outside a playable timing budget on this
machine. They do not supersede the rejected initial scanner results or convert
the isolated scanner's mixed maxima into a scanner tail-latency claim. Raw final
receipts are `.claude/perf6-refined-early-serial.local.json` and each checkout's
`.claude/perf6-refined-early-{1,2,3}.local.{json,log}`. The combined reader is
`.claude/ownership.perf6-refined-results.local.cjs`.

The final clustered series uses the same serial order, six bots/60 seconds and
seed with zero spread. `--window-after-host 60` enforces a common minimum host
age; actual measured windows begin at 60.36–60.76 seconds. It does not equalize
simulation state. Production fingerprints match after both complete series.

| Cluster repeat | Control→refined p95 | Control→refined p99 | Window maximum | Warm-up maximum |
| --- | --- | --- | --- | --- |
| 1 | 48.94→39.35 ms | 130.04→112.37 ms | 260.53→167.60 ms | 521.84→413.12 ms |
| 2 | 21.40→44.60 ms | 83.79→126.78 ms | 147.48→191.02 ms | 479.35→431.04 ms |
| 3 | 17.90→29.08 ms | 84.36→78.26 ms | 222.30→121.31 ms | 384.64→376.09 ms |

Warm-up maxima improve in all three pairs, while window maxima improve in two.
Median maxima fall 479.35→413.12 ms during warm-up and 222.30→167.60 ms in the
window. However, p95 worsens in two pairs, including repeat three despite its
lower candidate CPU load; median p95 rises 21.40→39.35 ms and p99 rises
84.36→112.37 ms. Window CPU pairs are 100→99.36%, 81.48→99.96% and
82.30→76.10%. The series does not establish an overall steady-state latency win.
A clustered sustained-latency regression remains unresolved.

Median simulation/input rates are 58.27→51.35 Hz and 37.28→25.22 Hz per seat;
median dropped shares rise 2.48→13.09%. Control repeat three passes all gates.
The other five fail p95; control repeat one and candidate repeats one/two also
fail dropped ticks. All six pass heap, errors, faults, resume and party gates.
Nearby means are 17.51→19.90, 17.06→16.90 and 16.30→17.91. They show no broad
density collapse, but differences in population and simulation state prevent an
identical-live-work claim. Raw receipts are
`.claude/perf6-refined-cluster-serial.local.json` and each checkout's
`.claude/perf6-refined-cluster-{1,2,3}.local.{json,log}`. Both courses are summarized
in `.claude/perf6-refined-results.local.{json,log}`.

### Remaining final-version hotspots

After both unprofiled series finish, a single final-fingerprint diagnostic
startup course repeats the spread settings. It profiles the main process after
the diagnostic module's static imports and includes host boot, pre-window and
window work. Fleet/workers are not profiled. Per-tick inclusive phase times and
terrain call counts are aligned with sampled stacks using microsecond timestamps.
The pre-window lane includes the original GC/settling gap; it is not automatically
equivalent to the soak's joining lane. End-state foci/native/scenery counts are
detached scalar observations after each trace tick end, not admission batch sizes.
The outer soak timer includes that additional diagnostic work. Nested phases
overlap and must not be added together.

The largest pre-window trace tick is 1405.42 ms, with ecology/scenery sync
852.59 ms, geography preparation 124.36 ms, survey 144.61 ms and dormancy
47.21 ms. It makes 6,863 terrain-generation calls and ends with four foci,
201 native identities and 2,572 doodads. Sampled self time is led by canonical
serialization (243.90 ms), followed by hashing (82.26 ms), corner sampling
(67.68 ms) and native placement (65.40 ms). This confirms that cold scenery
and terrain remain a larger target than dependency scanning in that tick.

The largest window trace tick is 1348.34 ms: ecology/scenery sync 648.52 ms,
dormancy 268.78 ms and survey 93.72 ms, with 3,595 terrain-generation calls.
It ends with six foci, 277 native identities and 3,308 doodads. Sampled
dependency-certificate self time is 185.28 ms and canonical self time 184.72 ms.
A separate 902.84 ms window tick has 148.37 ms of sampled candidate self time,
showing that encounter-candidate work remains another cold cost. These are
diagnostic observations, not speed comparisons with unprofiled or earlier runs.

There are zero after-tick observation errors. Diagnostic p95, dropped-tick and
heap gates fail; fault/error, party and resume checks pass. All eight final
production/harness fingerprints remain unchanged. Raw trace/profile, ordinary
report and log use `.claude/perf6-refined-{spike-trace,spikes,profile}.local.*`;
the attribution is `.claude/ownership.perf6-refined-spike-attribution.local.json`.

Next exact-work investigations should classify serialization/hash callers and
count repeated fresh scenery/terrain identities before adding bounded caches or
private fast paths. The profile includes both terrain-source serialization and
geographic plan hashing; total hash cost is not all corner noise. Count candidate
hits, cached nulls, misses, evictions and key bytes on the cold placement trigger
before changing its lookup. For dependency work, count cold descriptor inspections,
certificate hits, graph roots and budget/depth refusals separately from timing.
Preserve every source reflection operation: the rejected proxy shortcut is a
concrete regression.
Any follow-up also needs controlled steady-state work to investigate the mixed
clustered p95 results. No new cadence, population, admission or timing-gate
changes are part of this checkpoint. The pass improves fixed cold work and
recorded early maxima; it does not certify consistently smooth gameplay.

All 42 control-side sixth-pass scripts/receipts, including the baseline hash
failure and corrected pin-attribution receipt, are copied and SHA-256 verified
under `.claude/ownership.performance6-control-evidence/manifest.json` before
archiving the temporary control checkout. Candidate receipts remain alongside
the working checkout. Three independent critics found no remaining semantic
blocker; their live-results audit explicitly retains the unresolved clustered
latency concern. The ownership gate attributes all 19 staged hunks to this pass.

## Seventh pass: repeated identity work and grouped-play reproduction

The comparison baseline is `d4b96ef0`. A separate historical control at
`a6f62a2d` investigates the preceding pass's grouped regression. These are
different comparisons and must not be combined into one speed claim.

The count-only cold replay reproduces all four uninstrumented state/content
digests. Four-focus cold work performs 388,436 hashes over 9,138 distinct
text/coerced-seed pairs; six-focus cold work performs 114,704 over 2,148 pairs.
These are opportunity counts, not observed cache-hit rates. The same four-focus
course queries the candidate map 256,990 times, including 253,998 hits. Its
8,401 base-terrain source serializations produce only 127 distinct strings.
The bundled diagnostic changes execution cost; its durations are not evidence.
Receipts: `.claude/ownership.perf7-identity-counts.local.json` and
`.claude/ownership.perf7-identity-course.identity-counts.timing.local.json`.

A separate unchanged populated dependency fixture has 102 actors, 75 owned
native identities and 32,768 terrain samples. The cold scanner constructs
169,788 descriptor dictionaries, reads 746,241 descriptor properties, and
allocates 42,714 active-set/budget pairs. Almost all certificate reflection is
reached through `world.walk`. Warm repeated scans perform only one descriptor
inspection but still visit 64,842 Map entries and 153,055 values. A blanket
terrain exclusion would therefore be both unsafe and an inaccurate account of
the remaining warm cost. Exact pins, actor/sample identities and getter/Proxy
tapes match the pristine scanner. Receipt:
`.claude/ownership.perf7-dependency-counts.local.json`.

The candidate memoizes hash results by primitive string and freshly coerced
uint32 seed. It retains at most 4,096 pairs and 1,048,576 logical UTF-16 units;
inputs longer than 65,536 units bypass retention. These are logical retention
limits, not an exact heap-byte promise. FIFO eviction only repeats arithmetic.
Non-string inputs retain the original property reads; coercion runs even on a
hit. Standard JavaScript arithmetic/string intrinsics are assumed stable, as
in production generation. Arbitrary global intrinsic replacement is not part
of this memo's equivalence claim. No source object identities are shared.

A scan-local context reuse trial passed 45 exact comparisons, including
reentrant scans, error recovery and work/depth boundaries. It reduced a 512-root
fixture from 512 Set/budget pairs to one, with identical reflection. However,
four alternating populated-world comparisons made cold scans slower in three
pairs: three-scan totals 1141/1238, 1219/1275, 1156/1038 and 971/1074 ms
(baseline/trial). Warm comparisons were mixed. The trial is rejected and the
production scanner remains unchanged. Smaller allocation counts alone are not
performance evidence. Receipt: `.claude/ownership.perf7-dependencycontext.local.log`.

The actual bounded memo's count replay has 378,790 hits in 388,436 four-focus
calls (97.52%), and 112,556 in 114,704 six-focus calls (98.13%). Four/six
oversized-input bypass counts are four/two. The unchanged large-input work
matters: hashed UTF-16 units fall from 17,185,144 to 9,808,869 and from
9,731,785 to 7,461,062, much less than the call-count reduction. Resident
replay has 169/169 hits. All count balances, actual private Map/ring entries,
retained units, original content digests and runtime query counts pass. Receipt:
`.claude/ownership.perf7-hash-counts.hash-counts.local.json`.

The separate unbundled cold proof also matches all nine digests, including
terrain/place/reservation outputs, captured object values and complete random
draw/cursor tapes. Both fresh processes execute the original complete descriptor,
population budgets and focus course. Its instrumentation excludes it from
timing evidence: `.claude/ownership.perf7-cold-proof-series.local.json`.

The first hash-only timing series uses fresh processes in C/A/A/C/C/A order.
Each process checks its source fingerprints, the same four state/content
digests and every measured query count. The complete course remains equal.

| Hash-only pair | Four-focus cold, control→candidate | Six-focus cold | Six-focus resident |
| --- | --- | --- | --- |
| 1 | 2469.59→2744.04 ms | 1561.19→1339.46 ms | 186.59→147.94 ms |
| 2 | 1916.07→1903.01 ms | 1288.73→1308.43 ms | 165.16→135.75 ms |
| 3 | 2439.51→1890.16 ms | 1374.43→1322.34 ms | 191.41→191.65 ms |

Both cold phases improve in two pairs, but this is mixed evidence. Four-focus
paired changes are +11.1%, -0.7% and -22.5%; its worst recorded candidate is
slower than the worst control. Comparing separately sorted medians would
overstate the consistency. Six-focus changes are -14.2%, +1.5% and -3.8%.
The high memo hit rate alone does not establish a reliable worst-stall win.
Receipt: `.claude/ownership.perf7-cold-timing-series.local.json`.

### Controlled historical grouped comparison

The independent resident course compares `a6f62a2d` with `d4b96ef0`, before
this pass's hash changes. It runs six ordinary seats through 3,600 warm-up
steps and 600 measured steps at fixed 1/60 simulation time, with deterministic
walk/strike inputs and no invulnerability or healing. All six remain standing.
The separate proof matches all 4,200 inputs, 7,698 global random draws,
169,546 stream draws, 19,568 stream initializations/cursors, 600 measured
per-tick state/query tapes and three complete captured boundaries. Timing
processes omit those detailed tapes and check inputs, aggregate query counts,
boundaries and source/harness fingerprints against that proof instead.

| Historical pair | Whole-step p95, a6→d4 | Whole-step p99 | Whole-step total over 600 steps |
| --- | --- | --- | --- |
| 1 | 38.80→35.21 ms | 74.54→62.45 ms | 8958→7931 ms |
| 2 | 40.37→27.88 ms | 84.01→53.13 ms | 10117→6305 ms |
| 3 | 30.28→44.52 ms | 58.07→89.80 ms | 7167→10446 ms |

All six C/A/A/C/C/A timing runs pass captured-work equality. Results remain
mixed: two pairs improve and one regresses substantially. In the third pair,
input, AI and World phase sums rise together by 43.77%, 50.26% and 42.65%;
World's share falls from 56.82% to 55.62%. This does not isolate the changed
World helpers as the cause or exonerate them. Run medians improve, but neither
a consistent regression nor a broad sustained-latency win is established.

This simulation fixture disables expedition packages, uses the sim's count
governor, has six ordinary seats, and omits sockets and async worker adoption.
The real host retains its keeper, six remote seats, near-scale/party/vessel
policies, wall-paced snapshot-driven bot inputs, input merging, snapshots and
bounded catch-up/drop behavior. Matching this fixture is not proof of equal
live-host work. The live grouped concern remains open. Analysis:
`.claude/ownership.perf7-resident-analysis.result.local.json` in the d4 control;
preserved source-specific receipts are indexed under
`.claude/ownership.performance7-resident-evidence/manifest.sha256.json`.

An additional actual-host historical diagnostic runs a6/d4/a6 serially with six
grouped clients, the original drop/resume course and a window starting after
60 host seconds. A bounded ledger observes every World, input application,
nested runtime work, wire work, terrain query counts and GC overlap. All three
ledgers are complete and agree with the ordinary soak tick census; unchanged
sources/harnesses and fresh receipts are verified. Instrumentation overhead is
present, so this is attribution evidence rather than an unprofiled comparison.

| Historical live window | a6 | d4 | a6 repeat |
| --- | --- | --- | --- |
| Tick p95 | 25.70 ms | 20.58 ms | 31.51 ms |
| Tick p99 | 94.22 ms | 65.00 ms | 66.89 ms |
| Maximum tick | 141.72 ms | 104.21 ms | 186.45 ms |
| Dropped ticks | 3.44% | 0.25% | 3.30% |
| Warm-up maximum | 484.30 ms | 623.82 ms | 586.25 ms |

All three fail only the p95 gate; errors, faults, reconnect/resume and party
checks pass. No death-driven bot rejoins occur. The earlier grouped-window
regression is not consistently reproduced, but d4's warm-up maximum is worse
than both controls. Baseline repeat drift alone raises p95 22.6% and maximum
31.6%, while reducing p99 29.0%. This does not establish a causal win.

Live work differs materially. Window terrain generations are 1,192/1,031/5,280;
mean actor counts are 69.11/70.96/75.27. The second a6 reaches 86 actors and
1,364 doodads, versus 67/70 actors and 1,019 doodads in the other runs. Per-seat
host input rates are 36.28/47.33/42.13 Hz. Zero recorded `moves` arrays are not
zero movement: these bots use legacy dx/dy inputs, which this ledger does not
record. An unrelated agent receipt search took approximately 11.4 seconds,
followed by a 2.3-second extraction during the series; the UTC interval/lane is
unknown. Preserve this possible contention rather than assigning false bounds.

World/runtime dominates each largest window tick: total/World/runtime is
141.71/137.47/125.59, 104.20/96.24/88.37 and 186.44/173.97/162.06 ms. Another
second-a6 tick spends 172.83 of 178.78 ms in the unwrapped host remainder and
performs 1,534 terrain generations. That remainder contains AI, other host
work and observation overhead; it cannot be called AI time alone. Wire work
does not dominate these maxima. GC-untouched p95 is still 19.96/14.63/23.16 ms;
GC contributes but is not a complete explanation. Nested runtime GC overlap
was not recorded and is explicitly unknown, not zero.

Raw series and analysis v2 are
`.claude/ownership.perf7-resident-live-series.2026-10-12T01-22-38-272Z.local.json`
and the adjacent `.analysis-v2.local.json`. This evidence keeps the focus on
authoritative CPU work and establishes why live before/after durations alone
cannot isolate intrinsic grouped-play code cost.
All raw historical live receipts and observer sources are also preserved under
`.claude/ownership.performance7-resident-live-evidence/`; its manifest verifies
13 files and 71,581,162 bytes against their source copies.

### Further component trials

A fresh-copy record factory permits direct own-value reads without trusting
arbitrary frozen objects. Its scanner still spends the original recursive
budget, discovers numeric references and records the same certificate entries.
The oracle passes 31 cases/96 comparisons, including a negative control proving
that an entire-subtree exemption suppresses an original Proxy error after the
4,096-object limit. However, constructing and scanning clean terrain-shaped
records is mixed: 83.6→79.7, 154.0→131.6, 84.0→90.4 and 100.0→283.5 ms.
The copying design is rejected for the current clean-terrain workload. Faster
mixed-reference synthetic scans do not establish a gameplay benefit. Receipt:
`.claude/ownership.perf7-dependency-factory-bench.local.json`.

An oversized-digest trial retains the original two hash arithmetic streams
but visits each UTF-16 unit once. It applies only above the existing 65,536-unit
memo bypass threshold and retains no input. All 576 independent comparisons
pass, including Unicode, canonical getters/iterators/errors, the threshold and
frozen-root memo behavior. Creator-inclusive large ASCII work improves in all
four host-style and all four minified pairs; nested geography-shaped work
improves in three/four host-style pairs and four/four minified pairs. Short and
frozen workloads are mixed. These are component results, not live latency
evidence: `.claude/ownership.perf7-digestpair-bench.local.json`.

The subsequent constructor trial creates the original three fixed record
shapes directly: default terrain provenance, default terrain, and a stream
cache entry. A private WeakSet marks only these fresh ordinary records. It
does not mark caller inputs, field records, or painted/native/patch outputs,
and a Proxy around a marked object is not marked. No child is copied or
certified by construction. Dependency recursion and fallback remain original.
Construction-plus-first-scan clean pairs are 152.5→179.6, 99.3→83.0,
140.6→104.6 and 163.8→65.4 ms; mixed-reference pairs improve four/four.
These results justify testing the integrated path, not a live speed claim.
Receipt: `.claude/ownership.perf7-ownedTerrain-bench.local.json`.

The integrated hash/digest probe passes 37,371 comparisons and the integrated
constructor/scanner probe passes 165. In the real populated attribution
fixture, the first observed scan uses 46,430 owned-record inspections, including
16,384 sample wrappers; those wrappers receive zero descriptor inspections.
All 32,768 retained wrappers have the constructor brand. Warm scans perform
zero wrapper descriptor/direct-key inspections. Ordered pins, unknown mutable
children, future numeric owners, patch/restore replacement and old-entry
immutability pass. Instrumented durations are not performance evidence.

Pre-coordinate integrated verification passes all game/launcher/sim/shard type checks,
31 of 32 focused probes, the 571-probe roster census, 2,607 generation cases
(four warnings, zero failures), all 25 smoke episodes and the isolated client
build. The remaining focused failure is the unchanged terrainvariation fixture:
actual `f24109327cf6e53f`, expected `4225203d67bebfb4`, independently reproduced
on the immutable d4 control. No expected value or gameplay fixture was weakened.
The actual client walks the full generated path in 1,104 frames, performs eight
distant arrivals with 600 simulation frames each, saves/continues, and restores
the original saved survivor's species and life on return. Both rendered scenes
were inspected. Client errors and fatal errors are empty.

Verification receipts use `.claude/ownership.perf7-validation.local.json`,
`.claude/perf7-checks.local.json` and `.claude/perf7-client.local.json`.
The type-check evidence is specifically `ownership.perf7-check-actual.local.json`;
the driver's initial PowerShell launch did not execute the compiler and its
apparent exit zero is invalid. The corrected `npm.cmd run check` completed with
exit zero after the driver finished.

### Combined cold verification

The pre-coordinate combined candidate passes the separate nine-digest proof. Six fresh
timing processes in C/A/A/C/C/A order retain the same four shared digests,
query counts, 107 requested cells and fixed source/harness fingerprints.
The independent proof includes 9,239 generated terrain samples, 10,885 terrain
outputs, 262 place returns, 112,020 reservation results and 43,426 random draws.

| Combined pair | Four-focus cold, d4→candidate | Six-focus cold | Six-focus resident |
| --- | --- | --- | --- |
| 1 | 1380.16→1410.47 ms | 889.92→867.98 ms | 110.87→91.53 ms |
| 2 | 1467.83→1461.98 ms | 811.46→916.93 ms | 92.57→100.51 ms |
| 3 | 1504.01→1379.04 ms | 1152.53→927.62 ms | 118.75→98.44 ms |

Whole-course totals, including deferred content, are 2383.72→2371.95,
2373.46→2481.17 and 2777.08→2407.41 ms. The median is 0.99% slower: this
does not establish an overall cold-work improvement. The largest recorded
total falls 10.66%, but there are only three observations per version and
the third control also has the slowest boot. Ecology is mixed, with paired
total changes of -0.60%, +5.98% and -8.73%.

Dependency-phase totals improve in all three pairs: 152.61→119.47,
150.48→134.50 and 192.20→125.01 ms (median -18.09%). Both six-focus cold
and resident dependency phases improve in all three pairs. This supports a
repeatable reduction in the measured dependency work, not a general live-tick
or scenery-stall claim. No phases are added twice: runtime subphase durations
are inclusive. Receipts are
`.claude/ownership.perf7-cold-combined-{proof,timing}-series.local.json`.

### Exact coordinate-key refinement

Five district caches repeatedly serialize fresh dense triples of primitive
strings. `canonicalStringTriple` uses native JSON for exactly that shape;
other values retain the original canonical visitor. Full signed coordinates,
escaping, getter and conversion order, null cache entries, eviction and all
generation rules remain unchanged. It adds no retained cache. As with the
generation arithmetic, standard JavaScript intrinsics must remain stable.
The independent coordinate probe passes 2,069 comparisons, including every
UTF-16 unit, invalid/exotic inputs, reentrancy, actual candidate cache paths
and the original wilderness-path method. Canonical and hash oracles also pass.

The first complete coordinate candidate versus d4 proof matches all nine
digests. Its six timing processes also match content and query counts, but
total paired changes are +14.59%, -8.68% and -1.71%. Median complete work
improves only 1.25%; the worst complete total is 5.97% slower and the worst
single update is 9.0% slower. This series does not establish a repeatable
whole-candidate cold-stall win. Baseline course medians changed substantially
between series, so comparing candidates measured in separate series cannot
isolate this helper. Receipts:
`.claude/ownership.perf7-cold-coordinates-{proof,timing}-series.local.json`.

A subsequent incremental comparison keeps the other seventh-pass changes
identical and switches only the helper and its five call sites between fresh
processes in baseline/coordinate/coordinate/baseline/baseline/coordinate order.
Whole-source and replay hashes guard every switch and child; the original
candidate is restored and verified afterward. The four timing digests,
descriptor/run hashes and exact phase query counts match in all six runs.

| Incremental pair | Four-focus cold, earlier→coordinate | Six-focus cold | Six-focus resident | Three updates + deferred content |
| --- | --- | --- | --- | --- |
| 1 | 1470.45→1265.93 ms | 918.27→785.07 ms | 103.43→90.62 ms | 2494.02→2142.72 ms |
| 2 | 1506.54→1365.95 ms | 883.11→886.62 ms | 95.93→97.49 ms | 2487.97→2351.92 ms |
| 3 | 1439.39→1355.18 ms | 914.52→861.45 ms | 103.63→98.00 ms | 2459.47→2315.70 ms |

Complete work improves in all three pairs (-14.09%, -5.47%, -5.85%);
the median falls 6.92% and the largest observed update falls 9.33%.
Scenery-phase totals improve in all three pairs, with a 9.54% lower median.
The six-focus cold and resident phases each improve only two of three pairs.
The critic supports retaining this narrow incremental improvement, without
turning it into a general live-tick claim. Source restoration succeeds with
no run failures. Receipt:
`.claude/ownership.perf7-coordinate-isolation.exact-01.local/series.json`.

The retained coordinate candidate repeats the full validation: all four type
checks, 32 of 33 focused probes, the 572-probe roster census, 2,607 generation
cases (four warnings, zero failures), 25 simulation smoke episodes and the
isolated client build pass. The sole probe failure remains the exact separately
confirmed d4 terrainvariation mismatch described above. The actual-client
fixture walks the generated route in 1,102 frames, completes all eight distant
arrival courses and passes native Save/Continue and survivor return. Continue
preserves the original identities, species, life and sleepers; it admits 15
new identities and retires 13 more bodies, ending with 268 identities and 172
sleepers. The returned gnoll prowler retains 38 life. Both images were inspected;
no client/fatal errors occur. This established traversal fixture uses its
existing invulnerability/untargetability guard; it is not an ordinary combat
survival test. Receipts: `.claude/ownership.perf7-coordinate-validation.local.json`,
`.claude/perf7-coordinate-checks.local.json` and
`.claude/perf7-coordinate-client.local.json`.
Final staging removes one extra terminal blank line from `ownedTerrain.ts` and
its probe; TypeScript emission is byte-identical before/after. The original
measurement fingerprints and this cosmetic transition are both preserved in
`.claude/ownership.perf7-final-whitespace.local.json`.

### Final repeated live comparisons

The retained coordinate candidate and immutable d4 control each run three fresh
processes per course in C/A/A/C/C/A order. Both use six ordinary bots, seed
`0xddba11`, 60 measured seconds, 60 Hz, no roaming, original drop/resume policy
and unchanged gates. The early course spreads seats by 3,500 units; the grouped
course starts its measurement after 60 host seconds. All twelve reports have
matching configuration/harness fingerprints, unchanged production hashes within
each child, nonzero tick counts and no inspector profile. Existing diagnostics
remain enabled. All genuine gate failures and child exit codes are retained.

| Early pair | p95, d4→candidate | p99 | Window maximum | Warm-up maximum | Dropped ticks |
| --- | --- | --- | --- | --- | --- |
| 1 | 166.09→202.13 ms | 288.98→305.32 ms | 539.54→656.83 ms | 899.50→777.40 ms | 82.18→84.66% |
| 2 | 253.54→208.56 ms | 409.67→387.92 ms | 685.96→783.50 ms | 1444.45→2160.91 ms | 87.84→85.65% |
| 3 | 180.65→203.01 ms | 344.38→357.42 ms | 890.69→1069.61 ms | 1267.80→940.12 ms | 83.49→84.64% |

Early p95 worsens in two of three pairs and window maximum worsens in all
three. The candidate's 2,160.91 ms outlier is during warm-up; its largest measured
window tick is 1,069.61 ms. Every early run breaches both p95 and dropped-tick
gates. Each engine breaches heap growth in two runs; control pair 2 also fails
resume. Fault, error and party gates pass throughout. These results establish
neither a repeatable early live improvement nor an acceptable latency result.

| Grouped pair | p95, d4→candidate | p99 | Window maximum | Warm-up maximum | Dropped ticks |
| --- | --- | --- | --- | --- | --- |
| 1 | 30.63→18.89 ms | 72.39→58.59 ms | 98.19→92.46 ms | 312.14→309.20 ms | 1.1398→0.0833% |
| 2 | 19.80→22.00 ms | 54.93→83.02 ms | 101.00→192.32 ms | 356.55→288.97 ms | 0.0556→1.0318% |
| 3 | 16.00→18.51 ms | 52.49→49.96 ms | 90.11→92.07 ms | 314.37→290.12 ms | 0.0278→0.0278% |

Grouped warm-up maxima improve in all three pairs. Sustained p95 and window
maximum nevertheless worsen in two of three; the largest candidate window
stall is 192.32 ms versus 101.00 ms for the control. Median p95 improves
19.80→18.89 ms while median p99 worsens 54.93→58.59 ms. Both engines pass all
gates in two of three runs; only control pair 1 and candidate pair 2 breach
p95. There are no grouped deaths/rejoins or resume, party, error, fault, heap
or dropped-tick gate failures. Do not present the median or warm-up improvement
alone as evidence that grouped play is fixed.

The live courses preserve density settings, not identical emergent histories.
Stepped ticks, actual input rate, nearby living counts and asynchronous content
differ. Terrain counters in the ordinary diagnostic reports cover the initial
keeper runtime only; the World/runtime timing wrappers cover all units. Those
counters cannot establish equal aggregate terrain work across the six foci.
The later diagnostic ledger adds explicit all-world counting separately.

Machine CPU use ranges from 40.94% to 76.55% across these runs; process CPU
averages 0.67–1.36 logical cores on a 20-logical-core machine. The user confirms
other active seamless-branch sessions cannot presently be paused. This is an
uncontrolled covariate, not a demonstrated cause of the regression: grouped
pair 3 worsens despite lower candidate machine CPU use. Aggregate spare cores
also do not establish spare capacity on the authoritative thread. No results
are discarded or normalized for load. No consistent broad live gain is
established; independent critics agree that only the scoped exact-work savings
are supported. The percentages above use separate baselines and are not additive.

Receipts: `.claude/perf7-{early,cluster}-coordinates-serial.local.json`,
`.claude/ownership.perf7-live-coordinates-results.local.json` and the bounded
`.claude/ownership.perf7-final-live-compact.local.json`. Raw child reports remain
in their corresponding candidate/control worktrees. These serial series cover
warm-up and measured windows, not every boot/forced-GC settling gap.

### Rejected segment preparation trial

A scratch woven-link variant prepares segment deltas and squared lengths once
per link while retaining the same bounding tests, projection arithmetic,
segment order, clamping, radius comparisons and random stream. Production code
remains unchanged. The independent archived oracle plus actual raster closures
pass 2,060 exact comparisons (180 generated, 15 refused, one thrown), including
1,200 boundary/degenerate/port/overlap rasters. Current-weave counting retains
227,328 distance evaluations while preparing 1,772 segments; fewer arithmetic
operations alone do not establish lower latency.

Complete creator-inclusive current-weave pairs are 217.28→223.38,
221.47→222.95, 228.80→192.78 and 228.09→198.12 ms. Per-round largest queries
are 37.43→40.94, 40.62→43.53, 39.18→36.55 and 34.59→36.51 ms.
Only two of four total-time pairs and one of four maximum pairs improve.
The largest observed query worsens 7.16%; unchanged historical paths also
show substantial variation. The critic concurs with rejecting adoption for
the worst-stall objective. Preserve the oracle and trial rather than treating
the 6.34% lower total median as a production win. Receipt:
`.claude/ownership.perf7-segment-summary.local.json`.

### Rejected primitive-dispatch trial

The grouped profile motivates removing no-op recursive calls for primitive
values in the generic scanner loop. The scratch variant retains `Object.entries`
and its eager getter snapshot, entry/pin order, exact numeric-ID lookups and
every object, collection, Proxy and certificate path. It passes 20 independent
cases/204 comparisons, including the original 4,096-object and depth-64
boundaries, reentrancy, exceptions, all primitive types and unusual numeric IDs.

On an actual unchanged populated world (102 actors, 75 owners, 32,768 cached
samples), it avoids 66,087 cold and 66,076 warm primitive visitor calls. Object
visits, 1,893 numeric lookups and 79,828 cold/four warm descriptor inspections
are identical. Both variants retain the same ordered pins and fixture state.
Timing includes fresh scanner/certificate construction; shared world setup is
timed separately, and every warm lane includes a separately reported cold prime.

| Pair | Three cold scans, earlier→trial | Largest cold scan | Fifteen warm scans | Largest warm scan |
| --- | --- | --- | --- | --- |
| 1 | 582.74→594.14 ms | 196.88→199.61 ms | 296.23→302.66 ms | 24.61→25.60 ms |
| 2 | 630.73→670.44 ms | 221.89→269.87 ms | 289.00→277.38 ms | 24.68→20.74 ms |
| 3 | 614.94→604.38 ms | 212.81→217.14 ms | 311.11→264.09 ms | 24.57→20.25 ms |
| 4 | 686.76→623.21 ms | 245.96→222.17 ms | 306.29→291.53 ms | 28.54→24.94 ms |

Three of four warm comparisons improve, but cold maximum worsens in three
of four and the largest observed cold scan rises 245.96→269.87 ms. The trial
is rejected for production in this checkpoint: this does not establish the
required worst-stall improvement. The source and exact oracle remain available
for later targeted investigation. Receipt:
`.claude/ownership.perf7-primitive-result-exact-01.local.json`.

### Final-candidate spike attribution

Two separate bounded main-process captures use the unchanged all-world ledger
with inspector sampling. The early capture records 690 ticks (126 before the
window, 564 inside it); grouped records 7,103 (3,507 before, 3,596 inside).
Both finish normally with unchanged source fingerprints, complete ledger
censuses, no recorder errors/overflow and every tick fully inside capture.
The original ordinary verdict is retained: early breaches p95, dropped ticks
and heap growth; grouped passes. A profiled diagnostic verdict is not a new
unprofiled comparison or evidence of a regression fix.

Profiler timestamps are verified against monotonic-clock request brackets.
The measured alignment envelopes are ±513.5 microseconds early and ±441
microseconds grouped; interior drift is not separately sampled. Five tiny
backward sample intervals in each trace are preserved in the raw evidence.
Attribution omits backward intervals and trims subsequent overlap (42 and 50
microseconds respectively), without shifting later timestamps; neither trace
ends with an unrecovered reversal. Sampling gaps reach several milliseconds
in the selected ticks. Interval weights locate stacks, not exact CPU costs:
descheduling, JIT/GC and instrumentation overhead remain unresolved. Inclusive
frames overlap and must not be added together. Workers and bot processes are
not sampled.

The early capture localizes distinct synchronous owners:

| Tick / phase | Measured tick | Enclosing work | Approximate sampled stack |
| --- | --- | --- | --- |
| 96 / pre-window | 1656.6 ms | World 1652.0 ms, runtime 1579.8 ms | Ecology 895 ms; nested stream sampling 587 ms |
| 127 / window | 804.2 ms | World 767.2 ms, runtime 726.4 ms | Ecology 393 ms; dependency pins 117 ms |
| 248 / window | 605.4 ms | World 538.4 ms, runtime update 1.8 ms | Objective intel access → walkability → stream/path planning → native-country candidate, about 487 ms |
| 129 / window | 348.7 ms | World 107.7 ms, host residual 240.4 ms | AI movement → path search, about 210 ms, including cold terrain |

The 248 chain shows why few top-level terrain calls can still be expensive:
six counted sample/generation calls trigger nested planning. Generic host
residual is not automatically AI; the sampled stacks specifically identify
AI in tick 129. The selected ticks implicate synchronous world work rather
than wire encoding, without ruling out transport, GC or scheduling elsewhere.

Grouped window dependency scans appear in seven of the eight largest ticks,
with about 30–51 ms of sampled inclusive work. The largest tick is 107.64 ms
(World 105.3 ms, runtime 97.2 ms, dependency pins about 51 ms); its report also
records 21.85 ms of GC overlap. Another 86.87 ms tick spends about 75.5 ms in
AI path search, including stream/terrain queries. Grouped pre-window stalls
also include geographic preparation and validation that demand cold regional
plans. This prioritizes generic dependency traversal and shared cold-query
preparation; it does not establish which candidate change caused the mixed
live results or explain the prior 192.32 ms unprofiled outlier.
The seven scan-heavy tick indices are congruent modulo 31, consistent with a
recurring scheduled cost; the scan cadence remains unchanged. Certificate
inspection accounts for only about 4.5–10.2 ms in those selected stacks, not
the entire scanner cost. GC overlap cannot simply be added to or subtracted
from sampled function attribution.

The grouped diagnostic additionally overlaps a critic's 2.07-second receipt
read/output and 0.283-second projection; exact wall-clock placement is unknown.
It is retained as a contended diagnostic, never a clean comparison. The early
capture predates those reads. Subsequent critic review uses small projections.
Independent review agrees that offloading ecology alone leaves objective,
pathfinding and sight queries' synchronous terrain/planning work intact.

Receipts: `.claude/ownership.perf7-final-profile-final-{early,cluster}-01.local.json`,
their raw `.cpuprofile` and all-world ledger files, and
`.claude/ownership.perf7-attribution-compact-final-{early,cluster}-01.local.json`.
The full attribution files contain repeated stacks and should be parsed into
bounded projections, not printed in full.

### Architecture and networking review

The severe measured gaps are synchronous authoritative CPU stalls. Existing
code already supplies snapshot interest/delta filtering, 96 KiB snapshot
backpressure, remote interpolation, bounded extrapolation and local movement
reconciliation. Replacing the transport cannot remove the measured hundreds of
milliseconds inside ecology and dependency discovery. At 60 Hz the simulation
has 16.67 ms per step. Riot's server engineering account similarly measures
individual CPU subsystems against a fixed frame budget:
[VALORANT's 128-Tick Servers](https://www.riotgames.com/en/news/valorants-128-tick-servers).

The MMO examples support separating work by responsibility, not copying a
different game's tick rate. CCP describes precomputing character-derived state
and transferring it between systems rather than rebuilding it on each entry;
the same account makes the associated memory cost explicit:
[No Downtime - Again!](https://www.eveonline.com/news/view/no-downtime-again).
Its later Quasar account moves cosmetic serialization/fanout outside the
physics simulation while retaining nearby-recipient tracking. The reported
high-rate cosmetic test is not a higher-rate authoritative physics result:
[Server Deep Dive - The Power of Pretty](https://www.eveonline.com/news/view/paint-your-ship-red-and-make-it-faster).
For this game, the measured CPU placement and exact state-publication contract
determine the useful boundary; neither a message-bus dependency nor a lower
simulation rate follows from those examples.

The next foundational boundary, if synchronous exact-work reductions remain
insufficient, is detached deterministic terrain/scenery preparation with
authoritative publication before native bodies spawn. Factorio describes
background generation and deterministic parallel starting-area generation;
Node recommends worker threads for CPU-heavy JavaScript:
[Factorio FFF 201](https://www.factorio.com/blog/post/fff-201),
[Node worker threads](https://nodejs.org/api/worker_threads.html).
This supports the direction, not a claim that worker integration is complete.

Keep one writer of live actor/scenery state and the existing random draw order.
Scenery reservation rejection precedes rotation draws, so a worker cannot
guess acceptance independently and return an approximate candidate list.
Preparation needs complete detached inputs, revision checks, bounded queued
bytes, deterministic publication order and complete collision geometry. Measure
input construction, cloning, validation and publication as well as worker time.
The existing shared compiler also needs fairness between job kinds. Late work
cannot silently remove scenery, reduce encounters or admit bodies before their
colliders; synchronous fallback preserves behavior but preserves some stalls.

The architecture critic found that the apparent scenery query interface is not
pure. `nativeResidency.sample`/`intersects` can call `ensure`, which compiles or
refuses sources, records durable born entries, reapplies saved changes and evicts
old owners. `geographicGameplay.reserves` can plan and cache a geographic owner;
wilderness path admission calls those providers too. Stream overlays execute
these queries even on sample-cache hits. A worker producing the same doodads
could therefore still change collision, birth/refusal history and saves.

The narrower first seam is only `generator.terrainAt(center)` inside
`MassStream.sample`. Keep revision synchronization, current patches, cache
publication, overlays and all ordered reservation queries on the host. A trial
must compare complete birth/refusal/save receipts and random cursors, not just
rendered scenery. It must also measure clone/adoption/validation cost and stale
reply rejection. Best-effort preparation with synchronous fallback is a useful
increment but cannot promise to remove first-visit or teleport stalls. No new
worker path is implemented in this pass.
