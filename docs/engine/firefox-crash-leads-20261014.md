# Firefox crash leads for the seamless preview (2026-10-14)

A read-only audit of `codex/seamless-world-foundation` at fcbfefd7 (the tree
`scripts/build-browser-previews.mjs` builds for `/dev/seamless-world/` with
`HOLLOW_WAKE_WORLDMASS=1`), made for the Firefox hunt beside Codex's loading
follow-up. Ranked by likelihood; every row names its file and line, its
mechanism, why Firefox suffers more than Chromium, and one test. Nothing here
was reproduced in Firefox; the confirmation recipe at the end says which
reading implicates which row. The brief's API and syntax suspects were ruled
out (the last section).

## The leads

1. **Seamless floor pages are dropped without freeing their pixels**
   (`src/worldmass/paint.ts`). `:196` creates a 960 by 960 canvas per page
   bake (3.69 MB each; `addressSpan: 960` at `preset.ts:96`); `:213-214` a
   240 by 240 scratch canvas plus an ImageData per bake. Pages leave the
   cache through plain `Map.delete`/`clear` at `:90`, `:107`, `:111`, `:147`,
   `:151`, `:160`, never through the renderer's `releaseCanvas()` idiom
   (width and height to 0; `sprites.ts:129-139` says why). The live set is
   budgeted (25 pages, `runtime.ts:264-268`, about 92 MB), the dropped pages
   are not. In Gecko a canvas and its 2D context reference each other, so a
   dropped canvas frees only when the cycle collector runs, and CC starves
   on a saturated main thread; Blink collects canvases in an ordinary GC and
   charges V8 for them. Test: run straight across the wilds for two or three
   minutes, watch about:processes climb, then press "CC" in about:memory; a
   large drop in `canvas-2d-pixels` confirms it. Guard: `releaseCanvas` on
   every canvas leaving `baked`/`pending` and on `small` after `:226`, or a
   small reuse pool as `canopy.ts:159-162` keeps.
2. **The painter rebakes every visible page every frame when more than 25
   are on screen** (`paint.ts:98-111`). The visible loop has no cap; `:111`
   trims to 25 in LRU order, evicting pages drawn this frame, which the next
   frame rebakes (again without releasing). More than 25 pages are visible at
   a Firefox page zoom of about 33 percent on 1080p, with
   `layout.css.devPixelsPerPx` under 1, or a large capture viewport. Effect:
   hundreds of MB a second of canvases waiting for CC. Test: Ctrl and minus
   to 30 percent in the wilds. Guard: never evict a key in `visible`; draw a
   flat stand-in beyond the cap.
3. **The cache steward never trims in the wilds, and the sprite cache has no
   byte limit.** Trims fire on `world.zone` changes (`renderer.ts` HEAD
   `:614-622`); the wilds pin `world.zone` to `MASS_ZONE`
   (`runtime.ts:439-455`), so the sprite cache (`sprites.ts:84-119`) grows to
   its 1,600-entry count cap (`visConfig.ts:110`) and stays, entries from 50
   KB to 227 KB each: an estimated 150 to 500 MB at saturation, and Gecko may
   carry a GPU texture plus a shadow copy per accelerated canvas. Test:
   expose `visCacheStats` from `render/vis/caches.ts` and read the `sprites`
   row after ten minutes of roaming. Guard: a byte budget beside
   `maxEntries`, and trims on page or region crossings.
4. **Total resident canvas memory in the wilds**, count-bounded only: pages
   92 MB, settlement ground chunks about 48 MB (`visConfig.ts:676-678`),
   canopy slices about 87 MB (`visConfig.ts:616`, `:626`; `canopy.ts:160`),
   the sprite cache, and the full-screen buffers (main, crest, light, sight
   and room veils, the settlement layer at `paint.ts:51-56`): 0.4 to 0.8 GB
   before any accelerated-canvas doubling. Test (the A/B): about:config
   `gfx.canvas.accelerated=false`, then separately `gfx.canvas.remote=false`;
   if the crash disappears, rows 1 to 4 are confirmed, and which process the
   crash moves to says who holds the pixels.
5. **Three module workers each carry a full copy of the code** at run start
   (`nativeWarm.ts:111`, `geographicWarm.ts:68`, `processionWarm.ts:108`;
   the compile worker is 3.44 MB and re-imports every data registry through
   `nativeBootstrap`; the plan workers 1.79 MB each), and each job
   structured-clones the large frozen terrain spec (`compilePort.ts:18-30`,
   up to 8 MiB). Worker heaps live in the tab's content process, so a worker
   OOM kills the tab, and this lands on the same frames as the cold first
   bakes of row 1. Test: about:memory `explicit/workers` right after Begin
   or Continue. Guard: lazy or sequential workers; terrain passed once.
6. **A hang that reads as a crash**: the loading iframe (`srcdoc`,
   `sandbox="allow-scripts"`, `ui/loadingScreen.ts:39-51`) shares the game's
   process under Fission, so HEAD's synchronous begin/continue freezes it too;
   "This page is slowing down Firefox" and a forced close files as
   `IPCError-browser | ShutDownKill`. This is what the cooperative loading
   work addresses.
7. **Frame-cost spikes near water and town** (`paint.ts:115-124` rebuilds a
   Path2D of every wet 30-unit cell in view and clips each frame;
   `paint.ts:56-70` recomposites the full-view settlement layer each frame).
   A new complex clip each frame can push Gecko's accelerated canvas into
   fallback rasterization; the long frames starve the CC that row 1 needs.
   Test: the Firefox Profiler, main plus GPU threads, by water or in town.
8. **Saves copy large bodies often and the IndexedDB store never shrinks**:
   every paged-out cohort runs `serializeCharacter`, `JSON.stringify` and
   `encodeCharacterPages` (`meta/character.ts:600-613`); the run store writes
   current and previous bodies in one record (`browserRunStore.ts:121-123`);
   `browserNativePages.ts:59-64` only adds page rows. Transient spikes of
   several save sizes every 20 s and on every page-out; unbounded IDB growth
   that Firefox may evict under disk pressure (data loss, not a crash). No
   save-size budget exists in `src/meta`.
9. **An in-game fatal, not a tab crash: a negative frame time throws**
   (`nativeClientRuntime.ts:38` refuses `value<0`, called at `:164` on `dt`
   and `wallSeconds`; `main.ts` HEAD `:2062` computes `now - last`
   unclamped). Reachable through `__game.step`, the director's tick, or any
   rAF timestamp regression; `reportFatal` then stops the loop and shows the
   game's overlay. Guard: `Math.max(0, now - last)`. `__game.crash()` tells
   this apart from a process crash.

## How to confirm

- Which kind: Firefox's "Gah. Your tab just crashed" page is a process crash
  (rows 1 to 5, 8); the game's own overlay is a JS fatal (row 9 or another
  throw): read `__game.crash()` and `window.__bootErrors`.
- The annotations: `%APPDATA%\Mozilla\Firefox\Crash Reports\pending\*.extra`
  beside the `.dmp`, or about:crashes. `ProcessType` (content or gpu),
  `OOMAllocationSize`, `AvailablePageFile`, the signature. Sizes: 3,686,400
  is a page canvas (rows 1 and 2); 230,400 the scratch canvas or ImageData
  (row 1); 802,816 a ground, canopy or snow chunk (row 4); window width by
  height by 4 a full-screen buffer (row 4); odd 50 to 500 KB a sprite bake
  (row 3). Signatures: `OOM | small` with commit nearly exhausted is general
  pressure (rows 1 to 5); `js::AutoEnterOOMUnsafeRegion::crash` big JS
  strings or clones (rows 5, 8); `IPCError-browser | ShutDownKill` the hang
  (row 6); a GPU-process crash points at remote canvas memory (rows 1 to 4).
- Measurements: about:processes live (the content process and the GPU
  process); about:memory "Measure (verbose)": content `canvas-2d-pixels`,
  `explicit/workers/workers(arianna-arpg.github.io)`, `js-main-runtime`, the
  GPU process's `gfx` and shmem. A drop after "CC" or "Minimize memory
  usage" means canvas garbage (rows 1 and 2); flat and high means live
  caches (rows 3 and 4) or JS growth.
- Reproducers: a long straight run (row 1); 30 percent page zoom (row 2);
  ten minutes of roaming without a native area, then the sprite row (row 3);
  a crash during Begin or Continue (rows 5 and 6); the two about:config
  A/Bs (rows 1 to 4).
- Keep console output across a crash: `devtools.console.stdout.content=true`,
  `browser.dom.window.dump.enabled=true`, launch `firefox.exe -console`.

## Ruled out

No `SharedArrayBuffer`, `Atomics` or `crossOriginIsolated` in `src/`; no
WebGL or WebGPU; every 2D context default (the portrait probe alone passes
`willReadFrequently`); no late-shipping API unguarded (`performance.memory`
optional-chained at `dev/tabs/perf.ts:109`, `requestIdleCallback` typeof
guarded, module workers in try/catch with a fallback, the IDB `durability`
option ignored by older Firefox, `:has()` at `index.html:702-704` layout
only); Vite lowers syntax (even `#private` to WeakMaps); the frame loop
clamps `dt` to 0.05 s with every bake loop step-capped, so coarse timers
lengthen frames and never spin; array spreads are over small arrays (and
SpiderMonkey's argument cap is the higher one); the other render caches
(billows, creep bakes, portraits, ground chunks with `dropChunkImg`) are
bounded and released; the loading generator's yield restores the canvas
state before yielding.
