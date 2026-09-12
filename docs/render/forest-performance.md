# Forest and jungle performance pass — 2026-09-12

Baseline: published checkpoint `7f00b787`. Work was isolated on
`codex/forest-jungle-performance` while other sessions continued editing main.

## Findings and changes

The pinned forest and jungle walks put roughly a thousand tree crowns and
trunks in the visible scenery set. The first instrumented baseline spent
about 6–7 ms in ground scenery and 4–5 ms in canopy drawing per frame.
These are CPU submission times, not total GPU costs. A CPU profile also
showed sight-shadow geometry and canvas image submission among the costs.

Three changes address repeatable waste without changing tree density,
presence radius, lighting quality, or performance budgets:

* `VeilIndex.matches` compares the ordered, live crown inputs when the
  world's scenery dirty keys change. Unrelated additions, removals, broad
  revision bumps and equivalent list replacements retain the index and
  cached canopy patches. Movement, radius, rotation, kind, veil settings,
  felling, regrowth and crown membership changes still invalidate them.
  Unreported list-length changes remain detected. The check is linear and
  only runs on dirty keys; ordinary frames retain the existing fast path.
* `wholeKindSprite` bounds trunk textures by the painter's actual shadow,
  root caps and bark stroke, with antialiasing padding. The original pixel
  center alignment is retained. Explicit `bakeScope` values still override
  the default. All other painters keep their previous sizing. This reduces
  transparent texture storage and the area submitted for each trunk blit.
* Ground membership now reads the requested region directly. The old
  `doodadGroundIds().includes(kind)` rebuilt and filtered the full region
  registry per scenery piece; the CPU profile attributed about 75 ms of
  sampled load work to that enumeration. The new `isDoodadGround` predicate
  preserves zero move scale, late registration and in-place edits.
  Enumeration remains available to callers that need a list.

The texture check covered 20 authored trunk definitions at six sizes:
12,422,700 pixels became 1,134,480 pixels, a **90.9% reduction** in those
test textures. This is texture area, not a claim of 90.9% lower game memory
or frame time. The real Chromium comparison permits small edge rasterization
differences (observed maximum alpha difference 11/255; maximum premultiplied
color difference 9/255). No density or detail setting was reduced.

The cache regression first failed against the baseline on a non-canopy
push. With the fix, the browser test records **zero canopy bakes** during
120 alternating non-canopy addition/removal frames and zero bakes while
walking back and forth over warmed slices. The ordinary baseline walk did
not reproduce this churn; this fix targets scenery-changing gameplay.

## Verification and measurement

```text
npm run check
npm run probe -- canopypresence --jobs 1
npm run probe -- ground --jobs 1
npm run genqa -- --seeds 2 --filter forest
npm run genqa -- --seeds 2 --filter jungle
npm run probe -- rampage --jobs 1
npm run probe -- sightveil --jobs 1
npm run build
npx electron balance/canopy-visual.cjs
npx electron balance/foliage-visual.cjs
npx electron balance/forest-profile.cjs --label=optimized
npm run perf -- --filter=forest,jungle,mycelia --seconds=8 --allow-dirty
```

`forest-profile.cjs` uses the standing performance sweep's seed, weather,
layout pins and walk. It writes pass timings, crown-index changes, canopy
bake counts and a Chromium CPU profile under `balance/reports/forest-profile`.
It is diagnostic; the usual `npm run perf` remains the performance gate.
`foliage-visual.cjs` compares real painter pixels and writes a before/after
contact sheet under `balance/reports/foliage-visual`.

The instrumented baseline/optimized walks measured these median frame gaps:

| Scene | Baseline | Optimized |
| --- | ---: | ---: |
| Forest | 41.6 ms | 20.9 ms |
| Jungle | 41.6 ms | 25.0 ms |
| Mycelia control biome | 16.6 ms | 8.3 ms |

These runs are **not a controlled speedup estimate**: machine contention
also subsided, including in the control biome. The reliable quantitative
claims are the texture-area saving, avoided cache rebuilds and eliminated
per-doodad registry enumeration.

After the direct ground lookup, the final standard gate run
`perf_20260912194955` passed every unchanged budget at 2560×1377:

| Scene | Median frame gap | 95th percentile | Entry burst | Frames >40 ms |
| --- | ---: | ---: | ---: | ---: |
| Forest | 16.6 ms | 20.9 ms | 233.3 ms | 0 |
| Jungle | 16.7 ms | 20.9 ms | 204.2 ms | 0 |
| Mycelia | 12.5 ms | 16.7 ms | 120.7 ms | 0 |

Each steady sample lasts eight seconds. The preceding standard run
`perf_20260912194414`, before the ground lookup change, measured jungle's
entry at 362.6 ms. These are machine-specific observations, not a guaranteed
frame rate or a controlled percentage speedup; town timing varied too.
Browser verification here covers Chromium; other browser engines and
low-end physical devices have not been measured in this pass.
