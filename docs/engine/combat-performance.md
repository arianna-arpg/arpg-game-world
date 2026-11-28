# Combat, Swarm, and Slab Performance Forensics

## Scope and Architecture

While `npm run perf` (`src/dev/perf.ts`) exercises real `requestAnimationFrame` biome traversal with an invulnerable non-attacking walker, high-density ARPG combat stresses an orthogonal set of simulation and Canvas2D paths: kitted socketed builds (`instanceMods` `extra` modifier arrays), 100–160+ active actors and summons, multi-projectile split/fork/chain volleys, segmented worms, stacking ailment/proc cascades, 200–300 `lite` pool bodies, and per-frame status/elite/veil/doodad rendering.

The combat performance suite pairs zero-overhead opt-in sub-frame instrumentation (`src/engine/perfSlabs.ts`) with a shared 4-scenario deterministic stress suite (`src/dev/combatStress.ts`):

- **`PERF_SLABS` (`src/engine/perfSlabs.ts`)**: `PERF_SLABS.active` defaults to `false` (one boolean check, zero allocations, zero `performance.now()` calls, and zero RNG/state side effects during ordinary play or balance runs). When armed, fixed `Float64Array` ring buffers record:
  - **8 Simulation Slabs**: `input`, `ai`, `worldSweeps`, `lite`, `actorTick`, `projectiles`, `zones`, `separation`.
  - **8 Render Slabs**: `cullLightsVeil`, `groundDoodads`, `fieldsCorpsesDrops`, `actors`, `projectiles`, `veilsCanopy`, `lightsAtmos`, `wordsHud`.
  - **Forensic Counters**: `statGets`, `statCacheHits`, `statUncachedWalks`, `statHitRatePct`, `contextTagAllocs`, `hitsResolved`, `raysCast`, `gridRaysCast`, and live entity census means/peaks.
- **Deterministic Stress Scenarios (`src/dev/combatStress.ts`)**:
  1. `necromancer_court_siege` (`crypt`): Kitted Necromancer court (Skeleton Archers, Warriors, Bone Golem, Wraiths, Raging Spirits + Chain Lightning) vs ~160 mixed undead/elites + masonry pillars + corpse feed.
  2. `projectile_masonry_storm` (`catacombs`): Multi-projectile split/fork/chain/pierce Sorcerer + Ballista Sentries vs segmented worms (`marrow_whip`, `primeval_wyrm_head`) and 16 radial rock pillars.
  3. `affliction_proc_maelstrom` (`forest`): Apothecary stacking poison/burn/chill/shock, AoE novas, and magic/rare/crowned elites in dense woodland.
  4. `lite_throng_stampede` (`sandsea`): Berserker Cleave/Whirlwind/Carve + Swarmlings vs 300 `vermin_tide` lite bodies, full pack foes, and `coil_matriarch` segmented coils.

## Harnesses and Verification Commands

- **Headless Simulation & GC Forensics (`npm run perf:sim`)**:
  - Runs `balance/combat-perf.ts` under Node (`--expose-gc --max-semi-space-size=64`).
  - Records tick `mean / p50 / p95 / p99 / max`, all 8 simulation slabs, `StatSheet` cache hit rate, `skillContextTags` `Set` allocations, raycasts, V8 heap deltas, GC pause counts/durations, and a **32-bit FNV-1a state + `Math.random()` stream fingerprint** per scenario.
  - Flags: `-- --label=baseline --repeats=2`, then `-- --label=after --compare=baseline --repeats=2` (exits `2` automatically if any scenario's deterministic state/RNG fingerprint drifts).
- **Live Electron Canvas2D & GPU Forensics (`npm run perf:combat`)**:
  - Runs `balance/combat-perf.cjs`: builds a fresh production bundle into `dist/`, acquires the machine-wide `hollow-wake-perf.lock` compositor mutex, opens a `1400×900` GPU-composited Electron window (or `--offscreen=1`), and drives `window.__game.combatStress(...)` alongside CDP `Performance.getMetrics`.
  - Flags: `-- --label=baseline`, `-- --label=after --compare=baseline`, `-- --filter=<id>`, `-- --ablate=<passes>`, `-- --no-build=1`.
  - Sequence visible `perf:combat` and `npm run perf` runs one at a time so they never contend for the desktop compositor.

## Key Engine and Renderer Invariants

- **`StatSheet` Caching & Dependency-Precise Invalidation (`src/engine/stats.ts`)**:
  - Immutable `instanceMods` arrays registered via `indexExtraMods` (`EXTRA_MOD_INDEX`) are cached per sheet in `extraCaches` (`WeakMap<readonly Modifier[], ExtraStatCacheSet>`), while ad-hoc caller arrays stay uncached.
  - Immutable tag sets stamped via `markImmutableTagSet` carry pre-encoded `(m1, m2, big)` bitsets so `StatSheet.compute` skips per-read `Set` iteration.
  - `setConditions`, `setGauges`, and `setSource` invalidate sheet caches only when a changed condition/gauge is actually referenced on the sheet (`usesCondition` / `usesGauge`) or a source's modifiers structurally changed.
- **Spatial Doodad Sub-Indices & Ray Dedup (`src/engine/world.ts`, `src/engine/doodadMovement.ts`, `src/engine/los.ts`)**:
  - `ensureDoodadIdx()` maintains `solidDoodadIdx` and `occDoodadIdx` alongside `doodadIdx`, keeping decorative flora/decals out of movement clamping (`clampPos` / `sweepDoodadMove`) and occlusion raycasts (`castRay`) while preserving live dynamic checks (`gone`, `felled`, `door`) at query time.
  - `updateProjectiles` pre-collects segmented actors, domes, bells, and friendly constructs once per tick and merges `actorsNear` with segmented worms in ascending `gridSeq` order to preserve exact hit/RNG determinism.
- **GPU-Resident Veils & Baked Sprites (`src/render/renderer.ts`, `src/render/vis/sightVeil.ts`, `src/render/vis/painters.ts`)**:
  - `SightVeil`'s `buf`, `mask`, and `softMask` canvases stay GPU-resident in live play (`willReadFrequently` only when `visibilityDiagnosticsEnabled` is active) with viewport polygon culling and tight dirty-rect blurs/composites.
  - Actor status rims, elite/crowned rings, remnants, radial terrain flashes, and static world-seeded procedural doodads render through LRU-bounded `baked(...)` / `registerVisCache` sprites rather than per-frame `ctx.shadowBlur` or radial gradient allocations.
