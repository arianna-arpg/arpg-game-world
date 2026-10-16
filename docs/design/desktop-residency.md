# Desktop residency: policy D and the residency instrument

The desktop performance sweep (`npm run perf`, `src/dev/perf.ts`) measures the
player's frame on the retained native client (`docs/engine/native-desktop-perf.md`).
Every area the sweep mints stays RESIDENT for the rest of the run and keeps
advancing every tick, so the fiftieth row of the matrix is measured while fifty
areas tick beside it and the first row while one does. The rows are honest
native campaign numbers, but they are cumulative-residency numbers, not
per-tileset costs: the 2026-10-15 sampler receipt read the town's own median
rAF gap at 146 ms at the start of a sweep and 2959 ms at its end, with nothing
about the town changed.

## 1. Her ruling (2026-10-16): policy D

"Adopt residency policy D: fresh run per row plus the report-only residency
ramp; keep the original cumulative course and budgets unchanged until the
instrument reports."

So:

- The original cumulative course keeps its control, matrix, aged control,
  budgets, overrides, skip gate, deadman and report files, byte for byte in
  behaviour. Its historical failures stay what they were.
- Two ADDITIVE courses measure the residency itself. They are report-only: no
  cap is applied to their rows, no verdict is printed and nothing gates on them.
- No budget moves until the instrument has reported, and no empty-area sleep,
  freeze or retirement policy for the hosted world follows from it. The
  instrument is what will measure such a policy if one is ever proposed.

## 2. The request, validated before any start

An additive course is asked for with launcher flags and refused twice when it is
malformed or contradictory: once by `launcher/perfresidency.cjs`
(`parseResidencyFlags`, after launcher boot but before the dev start) and again by
`perfSweep` (`validateResidencyCourse` in `src/dev/perfResidency.ts`, before the
save suppression and before any start). The rules: a course needs its matched
seed (the `--run-seed` flag as a decimal or `0x` hex integer, else
`perf.config.json` `residency.seed`, else 20261016; zero is a seed, never lost to
a default); a step count is an integer from 1 to 200 (`Infinity`, `NaN`, a
fraction or a word is refused, never run to the end of time or silently reduced);
a visit list is non-empty, non-repeating, agrees with an explicit step count, and
its length plus the baseline is at most 200 even without an explicit count;
`--fresh` takes no ramp option; `--ramp-list` contradicts `--ramp-age-control`;
`--filter` is undefined for the ramp (its visited order is the list) and refused;
residency options without a course are refused. Every fault is reported, not just
the first. The new flags preserve the entire value suffix, so `--run-seed=7=garbage`
and `--ramp=8=garbage` are refused. The legacy flag helper is unchanged. The launcher
trims comma-separated list entries and discards empty segments; the browser API
requires actual non-empty entries. Before hydration, suppression or startup, every
selected matrix ID must be registered and every ramp-list ID must occur in that
exact matrix. A normally excluded `descent` is refused unless the caller explicitly
selects a registered matrix including it. The report keeps that full matrix and
its override flag, preserving its real mint spread index. The original course
carries no residency option and its former filtering/indices remain unchanged.

## 3. The courses

Both run in THEIR OWN launcher invocation (a separate Electron process), because
their first act is `suppressSaves` (`src/meta/persistence.ts`), which is one-way
for the page's life: every later account and run write is refused with one
console line, so a course that starts runs repeatedly writes nothing durable.
The report says so (`saves.suppressed`, the reason), and the launcher prints
NOT SUPPRESSED loudly if it ever is not.

**THE MATCHED START.** Every fresh run uses the real start path through
`__game.devStartRun(classId, seed)` with the same manifest seed, so each row's
world deals the same town. After the sweep's own first start, a fresh start is:
the same call; the retained runtime read; the PREVIOUS runtime proven retired
(`NativeClientStart.begin` retires it synchronously; a stale callback reaching a
retired runtime latches the fatal, which the course reads after every start and
every ramp step, so resurrection is loud, never silent); no cinematic; the
travel receiver re-bound to the new runtime. Each run carries THE RUNTIME
IDENTITY on its rows: its ordinal (0 is the sweep's own start), its wall start,
its startup cost and the manifest seed its world was dealt from. The entry
window of the next sample is discarded as always.

**`--fresh`: THE FRESH-SESSION ROWS.** For every row of the matrix (the same
registry-derived list, the same id-stable mint seeds and pins, the same
`--filter`): a fresh run, the town CONTROL, the mint through the original
levers, the zone. Each row records both samples, the census each held window
actually carried (`controlCensus`, `zoneCensus`), the synchronous costs that
preceded each window (the travel home before the control, the mint and load
before the zone) apart from the rAF entry burst that follows them, the heap
after the completed control window (`heapMB.afterControl`) and after the zone, and the exact mint receipt (seed, variant,
layout). THE REGIME is READ from the two censuses, never assumed: the course
expects the control at one resident area and the zone at two; a row whose
censuses say otherwise is preserved and marked UNEXPECTED, never dropped. Every
row says what it is: an UNMATCHED residency contrast, raw values, never judged
against the cumulative caps. The first row rides the sweep's own start and
records the measured startup and initial return durations, rather than synthetic
zeroes. Startup includes the actual `withPerfProfile` call and its restoration;
control return includes travel and weather repinning.

**`--ramp[=K]`: THE RESIDENCY RAMP.** One run. Step 0 is the town control. For
each later step one more tileset is minted and ENTERED (the synchronous mint and
load cost recorded as `mintSyncMs`, the rAF load burst that follows as
`visitEntryWorstGap`; no steady row for the visited zone), the walker travels
home (`returnSyncMs`), and the TOWN is sampled with the full window pair, with
the census that window carried, the heap, THE AGES (wall ms since the sweep's
own start and the campaign clock, both read after the window) and THE
COMPLETED HISTORY (every tileset visited so far, every skipped visit) beside it.
The default is 8 steps: the pinned heavy faces that stand in the matrix first
(in matrix order), then light tilesets in matrix order; `--ramp-list=a,b,c`
names the visits; a K that covers the matrix walks it in sweep order, which is
the cumulative course's own order and the reproduction of its stop. The report
folds least-squares slopes of the town's gapP50, gapP99, simP99 and taskMax
over resident areas and over resident bodies per hundred. The slope is an
observed JOINT age/residency curve, not the cost of residency alone, and is
labelled so; no slope here is to be subtracted from another course's.

**`--ramp-age-control`: THE AGE CONTROL.** The ramp that visits nothing: each
step walks the town's own entry window and reloads the town, so the residency
stays at one while the run ages through the same number of windows and reloads.
It is a COMPARISON under unmatched ages, not an isolation: it omits the visited
zone's own load and entry walk, its steps are paced by the town alone, skipped
visits do not occur in it, and the simulation is independently paced, so its
step ages are not the ramp's step ages. Read it beside the ramp by step and by
the recorded wall and campaign ages. Every window boundary must read one resident
area for a valid age-control row. Deviations remain in the raw report, marked
invalid, and do not enter the slope fold. Constant accepted residency produces
a null per-area slope; the instrument checks it instead of assuming it.

## 4. What stays exactly as it is

The original `sampleCurrentZone` and the cumulative matrix loop through cleanup
are preserved verbatim after newline normalization; the launcher gate through
end-of-file is preserved raw. The additive course uses a separate copy of the
sampler with the same native operations, assertions and retry budget, adding
boundary reads. No cumulative budget, assertion, roster or cap changes.
Matrix selection now occurs before startup with the same registry order and
filter expressions, because the additive validator needs its actual membership.
Startup and initial return timers are outside the held windows. The optional
seed still reaches the genuine `startGame` path; undefined retains the old call.
The launcher removes its owned beat listener after the run settles. On ordinary
additive-course rejection it writes banked evidence, destroys its owned window,
and rethrows the original error into the existing server/lock/exit cleanup.

## 5. Reading the report

The launcher prints the additive courses through `launcher/perfresidency.cjs`:
one header (course, start seed, save state, "report-only: raw values, no cap
applied, no verdict"), the fresh table (run ordinal, startup, heaps, the two
synchronous costs, the town's columns with its census, the zone's columns with
its census, the mint receipt; an UNEXPECTED regime called out under its row),
the ramp table (per step: visited, areas, bodies, heap, wall and campaign ages,
the synchronous costs, the town's columns, the visit's entry burst, whether the
visit held; skipped visits called out), the slopes with their note and, on the
age control, the comparison note. Report files land beside the sweep's own as
`balance/reports/perf_<course>_<stamp>/`. Exit 0 when the course completed,
1 when the request was refused, the deadman killed the run or the renderer
failed; never 2.

What a fresh row does not mean: a two-area zone row against a one-area control
is not a matched regime and is not the gate's regime; it is recorded as the
contrast it is, with the censuses that say so. What a ramp slope does not mean:
a cost of residency alone; it is read beside the age control by step and by
age, and never subtracted from it.

`residencyWindows` preserves every entry and steady window, visit entry and
synchronous retry return, including discarded attempts and exceptions. Each
reading contains unrounded wall/performance and campaign clocks, actual runtime,
writer and current-area object identities scoped to this invocation, native ready
and writer/current-world checks, and the whole resident-area/body census.
Both endpoints remain raw. A changed owner/area, unavailable endpoint, unheld
attempt, reversed clock, or unexpected fresh/age-control area count marks the
row invalid; later retries do not erase it. Endpoint reads are not proof of every
intervening frame. Census and receipt work adds boundary overhead; this instrument
has no accepted frame-cost claim until the actual browser/lifecycle course runs.

Every window also rides a beat. Ordinary rejected promises produce a unique
`perf_<course>_failed_<random>/report.json` containing `status: failed-partial`,
`validMeasurement: false`, the original rejection name/message/stack, and the raw
rows/windows already received by the launcher. This covers a later fresh start
throwing after the first row. A failed write is reported separately and never
replaces the original error. A killed or failed course supplies partial evidence,
not an accepted measurement; IPC delivery may not yet have banked every page beat.

## 6. Verification

The first and later `startupMs` timers now bracket the same work: timestamp
capture and the native start/profile restoration call. Subsequent retained-owner
validation, travel rebinding, cinematic/fatal checks, beat IPC and ordinal work
remain outside this field. Those checks still run and still fail the course.
`node balance/check_perfresidencystarttiming.cjs` is a bounded source-derived
pure control: it adds 0, 7000 and 700000ms of synthetic post-start work and
requires both startup fields to remain 31ms. It does not execute a native start.


- `npx tsx balance/check_perfresidency.ts` (pure): the request validation,
  the regime read, the slope fold (including the age control's null slope by
  construction), the visited order, the heap read, the spoken notes.
- `node --test scripts/test-launcher-residency.mjs` (pure): the flag parse and
  the launcher print.
- `npx tsx balance/check_perfresidencyboundaries.ts` (additive pure controls):
  effective list bounds, selected matrix refusal, fractional boundary clocks,
  changed identities, ingress census deviations, retries and separate errors.
- `node --test scripts/test-launcher-residency-boundaries.mjs` (additive pure
  fixtures): full raw CLI suffixes, effective limits, durable failed partials and
  collision-safe output. The original pure checks remain unchanged.
- `electron balance/native-residency-lifecycle-ui.cjs` (finite actual browser
  fixture, unrun at handoff): two real starts with real owned frames, native
  retirement, both boundary censuses, no persistence calls, actual first costs,
  age control and injected second-start failure with durable partial evidence.
  It uses an isolated profile, observational wrappers and an offscreen software
  renderer. These values are lifecycle evidence only. An independently held
  enclosing Job Object, actual helper close and fresh empty native accounting
  are prerequisites; a PID census alone is insufficient. Calling the shared
  report writer here does not prove the real launcher failure arm. The separate
  course below exercises that wiring.
- `node --test scripts/test-residency-launcher-course.mjs` is a finite pure
  consumer control for original errors, raw partial rows, native receipt facts
  and external close requirements. Fabricated control receipts are not native
  containment evidence.
- `scripts/residency-launcher-course.cjs` prepares and verifies two finite actual
  launcher cases: `second-start` and `disposed-webcontents`. The first throws after
  the real second native start, with the real first row banked. The second awaits
  the auxiliary webContents' actual `destroyed` event, checks `isDestroyed`, and
  invokes the real `executeJavaScript` method on that receiver. Electron 43 defines
  this method as async, so the course requires its returned Promise and native
  disposed-object rejection. The earlier synchronous expectation was incorrect;
  its original failed run remains separate evidence. This actual case proves no
  synchronous native refusal. Existing pure adapter refusal tests retain that
  separate synchronous-boundary scope. The corrected disposed case is unrun at
  this handoff.
  Both load the exact candidate launcher module unchanged in a separately built,
  SHA-pinned `capsule-*` checkout with independent Git metadata. Rebuild/update
  spawns are refused. The actual launcher writes its failed partial and owns its
  server/window/lock cleanup; fixture wrappers only observe, route saves/userData
  to private storage and inject the selected failure. `app.quit` is not masked.
  Preparation emits nested requests for the reviewed independent outer Job owner
  and inner broker. It never launches a process. Verification requires actual
  launcher exit1, inner helper0, outer helper0 with actual externally observed
  outer close, fresh empty accounting and closed owned handles, plus the original
  error, exact banked rows, all windows closed, server close requested, former
  loopback port refusing connections and machine lock absent. The fixture exit1
  policy does not change the measured pair's 0/2 policy. Missing evidence fails.
  Both wrappers use process-only `-ExecutionPolicy RemoteSigned`; no persistent
  policy is changed. Exact native acceptance, a pinned external observer/loader
  bridge and candidate build receipts are mandatory dependencies, not supplied
  or accepted by this course. See the source package's `LAUNCHER-COURSE.txt` for
  the input and external-close contracts. No lifecycle or cost result is claimed.
- The courses themselves run only under the desktop harness, in a released
  window: `npm run perf -- --ramp` first (about three minutes), then
  `npm run perf -- --ramp-age-control`, then `npm run perf -- --fresh` (the
  original matrix plus about fifty starts). `npm run perf -- --ramp=51` is a
  proposed reproduction of the cumulative stop, not a standing course. Actual
  repeated-start, no-write, census and lifecycle evidence from those runs is
  required before any measurement is accepted; the pure checks cover only their
  own folds.
- Proposed additive rows for `balance/check_nativeperftravel.ts` (the retained
  receiver's check): a second start retires the first runtime and the first
  refuses dispatch; a prepared manifest seed reaches `World.manifest.seed`
  twice in a row; `suppressSaves` turns the perf profile's persist into a
  refused write while the in-memory gate restore still holds; a travel home
  after a mint keeps the minted area resident.

## 7. Vocabulary for what comes next

Codex's note (2026-10-16): LIVE / HELD / REMEMBERED is a useful vocabulary for
a middle tier, but exact memory coverage and analytic clock catch-up are proof
obligations, not assumptions. This instrument is the measurement such a tier
would be judged by; it proposes none.
