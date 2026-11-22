# Seamless Regions — Continuous Overworld Architecture

**Status:** Active (`seamless-regions`)  
**Probe:** `balance/probe_seamless_regions.ts`  
**Core Modules:** `src/world/tiledWalk.ts`, `src/world/seamlessRegions.ts`, `src/engine/seamlessWorld.ts`

---

## 1. Core Doctrine: "Effectively No Zones, Mechanically Regions"

Moment-to-moment exploration, pathfinding, line-of-sight, lighting, and combat take place on **one continuous 2D surface coordinate space** (`Bounds.boundless = true`) with **zero loading screens** and **zero origin rebasing**.

At the same time, every region remains a genuine `ZoneDef` built by `main`'s unchanged `generateLayout` pipeline (`layoutRecipes`, stamps, landmarks, adventure complexes, stories, hollows, annexes, and objectives):
- **Moment-to-moment gameplay** sees one unbroken walk grid (`TiledWalkField`), spatial doodad/actor indices, sight veil, light sightlines, and ground/canopy chunk caches.
- **Mechanical systems** (`WorldSim`, `FactionField`, `LevelField`, region objectives, quests, bounties, and `ZoneMemory`) read each region's `ZoneDef` as a spatial bounding domain (`RegionSeatRect`).

Discrete `loadZone` remains intact for off-surface pockets: subterranean caves (`caveDepth` / sidezones), special boss stages, Mu/prologue scenes, and other dimensions (`hell`, `aetherial`), as well as `?discrete` fallback and headless discrete micro-probes.

---

## 2. 30px Lattice & Lastlight Origin Anchor

1. **1:1 Cell Mounting (`TiledWalkField`)**:
   - Every region's `originPx` and box dimensions (`w`, `h`) snap to `DEFAULT_CELL = 30`px (`60`px box multiples).
   - A region's local `GridWalkField` mounts cell-for-cell into `TiledWalkField`'s `64×64`-cell spatial chunks with zero resampling, carrying `owner` region indices per cell.
   - `CellWalkField` (`isCellWalkField`) unifies `GridWalkField` and `TiledWalkField` across `los.ts`, `sightVeil.ts`, `sight.ts`, `ground.ts`, `wallEyes.ts`, `boilLayer.ts`, `lakeLayer.ts`, and `renderer.ts`.
   - Flow-field pathing (`pathStep` and `tierPathField`) runs zero-allocation chunk-prefetched Dial/BFS over a `209×209`-cell (`6,270×6,270`px) target-centered window so multi-region chases route cleanly across borders with bounded O(1) cost.

2. **Lastlight Anchored at `(0, 0)` + Sanctuary Gate**:
   - `START_ZONE` (`lastlight`) always seats at `originPx = { x: 0, y: 0 }` inside a `2640×1800` reserve plot (accommodating all `TOWN_TIERS` from hamlet up to township without colliding with neighbor plots).
   - Because `originPx` is `(0, 0)`, every `townSeat()` coordinate (`waypoint`, `font`, `salvage`, `oracle`, `bounty_board`, `tracker`, `recruiter`, `training_yard`, and Borough cottages) matches its table seat verbatim.
   - **Sanctuary Gate (`sanctuary_gate`)**: Players walk straight out of Lastlight along its sited road lane (`siteZoneExits`) into the Crossroads with no portal dwell or loading screen. Wilderness monsters (`clampPos`) and hostile projectiles halt/fizzle at the Sanctuary boundary (Diablo 2 Rogue Encampment rule).

---

## 3. Mixed Border Porosity & Spatial Theme Blending

Adjacent surface regions are joined by `SeamlessAtlasLayout` (`src/world/seamlessRegions.ts`) using a deterministic per-seam mixture:
- **`sanctuary_gate`**: Framed watch-gate with lanterns, banners, and Sanctuary leash on safe settlements.
- **`open_frontier`**: Wide porous border spanning ~65–75% of the shared edge on open biomes (`field`, `downs`, `desert`, `steppes`, `tundra`, `beach`, `farmland`), blended smoothly across `blendBandPx`.
- **`broken_divide`**: Natural barrier (trees, boulders, cliffs, masonry) breached by 2–3 tactical gaps.
- **`chokepoint_pass`**: Enclosed border funneling travel through a primary road pass (~20–22% seeded rate even within open biomes for navigational texture, and default on rugged/walled biomes).
- **`sealed_gate`**: Locked frontier (Holdfast toll, Harborhold siege, boss seal, or edge blockade) that carves open in place (`openSeamInPlace`) the instant its lock resolves.

`GroundRenderer` (`ground.ts`) and `CanopySlices` (`canopy.ts`) key cache resets on `world.groundCacheToken ?? world.zone`, keeping baked offscreen canvases alive across region crossings while blending floor/wall palettes across `blendBandPx` and painting cross-border doodads/structures in their own `regionTheme`.

---

## 4. Cross-Region Entities, Factions & Streaming Persistence

- **Ring Streaming & `ZoneMemory` Compatibility**:
  - Regions within `SEAMLESS_CFG.ringInPx` (`1,450`px, plus direct neighbors of the active region) stream onto the surface; regions beyond `SEAMLESS_CFG.ringOutPx` (`2,650`px) demote into standard region-local `ZoneMemory` (`-(ox, oy)` coordinates, un-namespaced door/hollow IDs), keeping `WORLD_SCHEMA_VERSION` saves 100% compatible between seamless and discrete modes.
- **Ring-1 Drowsy AI & Home-Region Tether**:
  - Un-aggro'd actors beyond `liveAiRadiusPx` (`1,450`px) step `updateAI` every 4th frame at `4× dt`, snapping to 60 Hz immediately upon aggro or proximity.
  - Un-aggro'd ambient enemies (`!roamsCrossRegion`) loosely drift back toward their `homeRegionId` if idle wander carries them across a border; once aggro'd, they pursue and fight freely across any number of regions (stopping only at Sanctuary gates).
  - Patrols, faction warbands, and travelling world events wear `roamsCrossRegion = true`, marching and skirmishing across borders even while un-aggro'd.
- **Home-Region Kill Attribution**:
  - Slaying an enemy with `homeRegionId = R` after luring it across a border into region `Q` still credits `R`'s cull objective (`creditCrossRegionKill`) and bleeds `R`'s `FactionField` influence.
