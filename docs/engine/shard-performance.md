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
