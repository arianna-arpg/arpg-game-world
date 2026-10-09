# Native regional fallback seating

New expeditions save `nativeRegional.seating` and schema 18. The placement
extension preserves every successful schema-17 complete-locale placement,
then searches additional space only in previously empty candidate lattices.
It changes generation, not combat, rewards, objectives or native owner rules.

## Placement contract

The original chance roll and all original source-selection/translation draws
run first, in their original order. A successful source returns immediately.
Saved descriptors without `seating` perform precisely the historical search.
With the shipped policy, failure enables eight additional complete-source
attempts. The native source catalogue, source hashes, scales, geometry, route
proofs and dressing are unchanged.

`nativeRegionalSeating.ts` uses deterministic Latin-hypercube sampling: every
fallback visits a different stratum on each axis, with separately shuffled
axis order and seeded within-stratum variation. This is a finite search, not
an adaptive collision-repair algorithm. A source envelope is selected first;
its conservative containing radius is half the source diagonal plus the
saved clearance plus 30 units for snapping. The source origin then snaps to
the physical 30-unit grid. The final center's geographic recipe selects a
source with exactly the tested envelope. No source is moved into a biome
selected at a different location.

The actual snapped source, complete scenery circle and older terrain
composer's reservation remain inside the owning 9,600-unit lattice. This
matters because point queries inspect only that lattice. Signed coordinates
retain their string/BigInt address representation. Cache residence, visitation
order, streaming and native content loading cannot affect admission.

All existing admission rules remain: protected ordinary sites plus their
120-unit clearances, opening foundations, broad-water refusal, four dry
exterior approaches, exact native material cells and exact scenery orientation.
No source is clipped, carved, shrunk or broken into partial decorations to fit.
Cave-mouth and burial-urn variants still require their complete native owners.

## Bounds and compatibility

The optional policy has kind `source-fit`, version 1, and integer
`fallbackSeats` from one through eight. Unknown fields and versions refuse
loading. The shipped original 16 attempts plus eight fallback attempts give a
24-attempt ceiling, with at most 38 substrate reads each (912 total). Site
enumeration retains its existing finite bounds. The derived cache still holds
32 results. There is no new persistent placement cache.

Schema 18 precedes schema 17 in the runtime detector and older save-schema
headers cannot carry the new behavior. Historical descriptors retain their
old schemas and generation; no saved source is regenerated from current data.
The existing schema-17 regression and client courses explicitly remove the new
option from their fixtures. Fresh-expedition schema assertions now expect 18.

Diagnostic counters distinguish physical site overlap, site-query budget
refusal, biome/envelope mismatch, water, approaches, reads, fallback attempts
and fallback admissions. No diagnostic captions or instructions enter the game.

## Reproducible survey

`balance/nativeSeatingSurvey.ts` compares the same 256 candidate locations at
each of seeds 42, 713 and 2026 with and without the new option. The survey uses
unreserved country, outside the separately tested opening reservation contract.
The probe writes its complete results to
`balance/reports/native-seating-survey.json`.

| Seed | Historical regions | With fallback | Original large sources retained |
| --- | ---: | ---: | ---: |
| 42 | 3 | 5 | 1 |
| 713 | 9 | 12 | 1 |
| 2026 | 8 | 9 | 2 |

All 20 historical plans retain identical hashes, coordinates, native sources
and geometry. Six new plans bring the total to 26. Country regions increase
from 12 to 16, waterland regions from four to six, and highland regions remain
at four. All four original 4,800-unit sources remain. Seed 42 adds complete
linked-court reed islands and a waterside ward. Every added source in this
sample is 3,600 units wide.

This is finite coverage evidence, not complete parity or unlimited novelty.
Neither search admits a woodland source in this survey. The 49 supported
sources all pass controlled flat-biome admission, including explicit fallback
courses for each source; this does not establish natural woodland coverage.
The envelope lottery weights entries by their presence in the saved catalogue.
A geographic recipe lacking the selected envelope spends that attempt rather
than substituting a different envelope; this survey recorded zero such refusals.
Site-query budget refusals were also zero.

The additional search increases substrate reads in this survey from 27,407 to
40,405. Cold planning remains synchronous and can take longer. Existing worker
input-size limits remain unresolved; this change does not make the full modern
terrain descriptor fit the warm queues. Background preparation and incremental
source transfer remain separate generation work.

## Verification

Run `npm run probe -- nativeseating`. The enrolled slow course checks snapped
containment and strata, every native source, explicit fallback-only admission,
strict policy/work bounds, historical source hashes, signed coordinates,
30-unit addresses, eviction, streaming, actual isolated-process generation,
all surveyed native cells and protected circles, and schema-18 cold Continue.
The historical `nativeregional` course retains schema-17 scenery, body, casualty
and source-fidelity coverage. Also run `npm run check`, generation QA and the
seamless regression suite.

The client course shares `balance/native-regional-ui.cjs` without duplicating
its movement, complete scenery, native body and cold browser Continue checks:

    HOLLOW_WAKE_STORAGE_SCOPE=preview:seamless-native-seating-qa
    HOLLOW_WAKE_WORLDMASS=1
    npx vite build --outDir .claude/native-seating.local.work/dist
    npx electron balance/native-seating-ui.cjs

Run the probe first to supply the survey. The course visits the two newly
admitted seed-42 waterlands and the retained 4,800-unit shattered ward. Reports,
contact sheet and six live route views use `balance/reports/native-seating-*`.
Controlled arrivals and short movement samples are visual acceptance evidence,
not an unassisted exploration or combat playthrough.

Observed acceptance for this change: all nine dedicated seating checks pass;
both schema-17 and schema-18 rendered courses pass six movement/body-clear
views and durable cold Continue. The new course loads 44 native scenery items
in the reed islands and 50 each in the waterside and shattered wards. Native
habitat bodies are present in all three visited regions. Game, launcher and
simulation type checks pass; generation QA reports zero failures and four
existing warnings; simulation smoke completes all 25 episodes.
