# UI performance and browser readiness

## Changes and dials

Map gestures update the viewport immediately and defer atlas work until 100 ms
after the last gesture. All raster layers share a 4 ms work allowance. Reveal,
sampling, coast-distance, shading, and vector stages yield between small units
of work. This is cooperative scheduling, not a hard real-time guarantee:
individual field queries, canvas uploads, and browser allocations can overrun it.

A 240 px overview appears first, followed by a 480 px base and a zoom window
capped at 720 px. Asynchronous PNG Blob encoding replaces synchronous base64
encoding, following the browser's [canvas export guidance](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL).
Eviction/reset releases object URLs; abandoned encodes cannot publish.

The former minimum pixel density defeated the raster cap on very large worlds.
`ui/atlasBudget.ts` bounds image/mask allocations and uses sparse exact reveal
queries when coarse masks would otherwise expose unknown terrain.
`ui/atlasInputCache.ts` retains a small owner-scoped set of geographic inputs,
keyed by region, knowledge, layers, and field state. Hidden overlay painters are
skipped before constructing SVG, including the classic biome wash that painted
maps previously built and discarded on every refresh.

The map sidebar moves below the chart on narrow screens. Short landscape views
use the available width. Map and passive-tree panels have viewport-height limits
with scrolling. Inventory, character, and passive-tree opening join the UI QA.

- `ATLAS_CFG.raster` in `world/atlas.ts`: shared work budget, hard pixel cap,
  sampling lattice, image-cache capacity, and zoom-window thresholds.
- `MAP_CFG.mapPerformance` in `ui/mapConfig.ts`: overview/detail resolutions,
  tick interval, and interaction quiet period.

## Verification

Build first, then run `npm run perf:ui -- --label=current`. This uses real
Chromium, isolated saves, seeded chart growth, desktop/portrait/landscape sizes,
wheel timings, touch pan/cancel, decoded image limits, and common-panel bounds.
Add `--cpu=4` to exercise a slower CPU. Gates live in
`balance/ui-perf.config.json`; reports and screenshots go to `balance/reports/`.
The offscreen UI harness measures handler/painter work, not phone GPU performance.
Run timing comparisons without simultaneous builds or other performance tests.

`npm run probe -- atlasbudget` checks bounded allocations, cache ownership,
sparse reveal, identical pixels across work budgets, fog preservation, skipped
hidden painters, asynchronous cancellation, and image URL lifetime.

The existing visible-window gameplay sweep remains `npm run perf --
--filter=forest,meadow,metropolis,cave --seconds=4`. Its documented
`--allow-dirty` flag deliberately measures an uncommitted build.

## Findings and remaining mobile work

The initial local baseline spent about 25–26 ms at the 95th percentile inside
map wheel handlers. Deferring painting reduced that work to under 1 ms in
ordinary and four-times CPU-throttled runs. The portrait chart grew from about
138 px to 344 px; short-landscape chart height grew from about 131 px to 203 px.
Timing varies with the chart and machine; retain reports for future comparisons.
The final local overview appeared in about 0.7 seconds normally and 6.6 seconds
under four-times CPU throttling. The slower first paint remains a measured
limitation; warm reuse avoids rebuilding that overview.

The representative desktop gameplay sweep passed its existing budgets. Forest
was the heaviest sampled environment: 33.3 ms frame-gap p95 at 2560 × 1377.
This is not a universal 60 fps claim. Automatic render scaling already exists
in `render/renderScale.ts`, reducing buffer pixels while preserving view/aim.

Full phone play still needs touch movement/aim, comfortable access to every
skill, touch inspection in place of hover, and a compact game HUD. See
`docs/design/mobile-touch.md`. Test Safari/iOS and Chrome/Android on actual
devices: CPU throttling does not model GPU limits, memory eviction, thermals,
or battery life. First-time detail refinement can remain slow on constrained
CPUs; the overview and node interactions remain available.

The production bundle remains large (roughly 1.9 MB gzip in this pass). Profile
optional tools/editors and data before splitting their loading: registry
initialization order is a gameplay dependency. Verify compressed delivery and
cache headers on the actual web host, plus cold-load time and memory on real
devices, before declaring mobile support.
