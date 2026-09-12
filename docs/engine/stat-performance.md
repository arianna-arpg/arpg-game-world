# General performance pass — September 12, 2026

The first pass removes work without changing simulation cadence, combat
rules, graphical detail, or the automatic resolution policy.

## Changes

`StatSheet.compute` builds a sorted tag cache key only for queries that can
use the value cache. Skill-local modifiers and explicit base values already
bypass that cache. Recursive reads decide independently whether to cache;
tag membership checks and mutable tag-set behavior remain intact.

The projectile painter rejects flights whose complete visual bounds miss the
viewport before creating gradients, fetching glow sprites, or issuing canvas
commands. Bounds include all current forms, decorative echoes, broad waves,
trails, glows, minimum stroke widths, raster fringes, and camera shake.
`vis/projectileBounds.ts` derives one conservative scale per nonempty pass
from the existing geometry and visual tuning. New projectile painters must
extend that bound if their reach exceeds the existing envelope.

Camera dimensions use the renderer's actual zoom, including render scale and
couch framing. Tethers keep their independent pass because a segment can cross
the view while its projectile endpoint is outside it. Simulation and light
collection continue to see the full projectile roster.

## Verification

- `npm run check` checks the game, launcher, and simulation/probe sources.
- `npm run probe -- conversions` checks stat layering, links, trades,
  source mutations, and tag behavior. A counting set asserts that uncached
  skill queries do not enumerate tags to create an unused cache key.
- `npm run probe -- projectilecull` calls the actual projectile painter with
  a counting canvas. It checks every form near all four edges, large effects,
  reduced resolution, couch framing, camera shake, live trail tuning, and
  independent tethers. A batch of 1,000 distant flights issues zero canvas
  commands. This is a work-count and selection test, not pixel-level GPU QA.
- `npm run probe` runs the complete fast regression roster.
- `npm run perf -- --filter=forest,meadow,metropolis,cave --seconds=4 --allow-dirty`
  measures representative desktop gameplay. Run it after other checks finish.

## Initial findings and limits

The game, launcher and simulation type checks passed, as did all 211 fast
regression probes (237.9 seconds). An interleaved Node microbenchmark of
500,000 skill-local stat reads across eight samples per version measured a
median 306.96 ms before versus 85.30 ms after, with equal result checksums.
The fixture uses five context tags and tagged gear/skill modifiers. This is
about 72% less time for that isolated query path, not an FPS measurement.
Raw samples: `balance/reports/stat-perf-20260912.json`.

The pre-change sweep is `balance/reports/perf_20260912181741/report.json`.
At 2560 × 1377, the forest breached the existing budget: median frame gap
45.9 ms, 95th percentile 61.7 ms, 69 frames above 40 ms in four seconds,
and a 458.4 ms entry burst. The metropolis, meadow and cavern rows passed.
This establishes an existing forest problem, not a regression caused by this
pass. The working tree also contains concurrent content edits, so these runs
are diagnostics of the local work in progress, not an isolated release A/B.

The final sweep, `balance/reports/perf_20260912182658/report.json`, passed all
four environment budgets at the same canvas size. Median / p95 frame gaps
were metropolis 8.4 / 16.7 ms, forest 25.0 / 33.4 ms, meadow 8.3 / 12.4 ms,
and cavern 16.7 / 25.0 ms. Forest had one frame above 40 ms and a 212.5 ms
entry burst. The town control also improved from 20.8 to 12.5 ms median, so
the large scene-level differences cannot be attributed solely to these edits.
An intermediate sweep overlapping regression checks was stopped and is not
used as comparative timing evidence.

The changes avoid general CPU/allocation and canvas submission work; they do
not establish a universal FPS gain. Dense forest rendering remains a profiling
target. Firefox, Safari, integrated graphics, and constrained-memory hardware
need their own real-device checks. Existing automatic render scaling and the
browser/UI follow-up work are documented in `docs/engine/ui-performance.md`.
