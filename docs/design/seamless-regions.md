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
  - Regions within `SEAMLESS_CFG.ringInPx` (`1,080`px) stream onto the surface; regions beyond `SEAMLESS_CFG.ringOutPx` (`2,250`px — `>1,150`px disjoint hysteresis measured on the same seat/mouth metric) demote into standard region-local `ZoneMemory` (`-(ox, oy)` coordinates, un-namespaced door/hollow IDs), keeping `WORLD_SCHEMA_VERSION` saves 100% compatible and making mount/unmount thrashing structurally impossible.
  - `SeamlessAtlasLayout` seats unveiled regions + their 1-hop frontier outward in concentric map rings (`placeRegionPlanar`), maximizing simultaneous flush borders across graph cycles while preventing perpendicular overhang over unseated hub exits (`openSides`), and guarding non-planar graph chords against carving through third regions (`corridorBlocked`).
- **Off-Screen Hibernation, Spatial AI & Viewport Culling**:
  - Un-aggro'd non-roaming enemies beyond `liveAiRadiusPx` (`1,350`px) enter `Actor.seamlessSleep`, skipping timers, charges, magic-pack mechanics, terrain sweeps, actor separation, and AI ticks until a seat approaches, damages, or aggros them; awake seamless AI scans `ActorGrid` (`actorsNear`) instead of `O(N²)` full-roster walks.
  - `Renderer` pre-culls `visActors` and `hullRects`/`drawRoofs` against the live camera viewport, preserves `trimVisCaches` across seamless border crossings (`groundCacheToken`), and `sampleThemeAt` checks only the 2–4 currently mounted seats with zero allocations.
- **Home-Region Kill Attribution**:
  - Slaying an enemy with `homeRegionId = R` after luring it across a border into region `Q` still credits `R`'s cull objective (`creditCrossRegionKill`) and bleeds `R`'s `FactionField` influence.

---

## 5. World Events, Swarms, Off-Graph Returns & Launcher Builds

- **World-Space Region Bounds & Physical Seam Anchors**:
  - `World.activeRegionBox()` returns the active region's world-space `{ ox, oy, w, h, cx, cy }`, and `World.activeExitAnchors()` synthesizes crossing anchors from physical border seam mouths (`seam.mouthA` / `mouthB`), uncharted `'?'` rim slots, and owned discrete portals.
  - Traveling world systems — Theater patrols/columns (`marchEndpoints`), roaming Titans (`titans.ts`), Odyssey scouts, sieges, and risings (`odyssey.ts`, `odysseyRisings.ts`), Geyser Pilgrimages (`pilgrimage.ts`), Holdfast border chevrons (`holdfast.ts`), Deadwake/Migrations/Brigands (`world.ts`), World Boss passing walls, and ambient sky/lightning/wisplight spawns — anchor directly to `activeRegionBox()` and `activeExitAnchors()`.
- **Continuous Cross-Border Great Hunts**:
  - When a wounded Great Hunt Beast reaches a border seam mouth (`onBeastEscape`), `SeamlessCoordinator.ensureMounted(dest)` streams the destination region in place and re-homes the live `huntBeast` (`homeRegionId = dest`, `roamsCrossRegion = true`) to march across the border without despawning.
- **Dynamic `LitePool` Spatial Hashing & Background-Mount Isolation**:
  - `LitePool` (`lite.ts`) computes a dynamic `(boxX, boxY)` spatial-hash origin across live motes (`(0, 0)` in discrete mode) so Swarmlord throngs and ambient critters hash in `O(1)` at negative and far-positive world coordinates, and `buildRegionSliceForSeamless` preserves live `LitePool` motes, Tracker traces, transient weather/ground layers, and open NPC dialogues across background region mounts.
- **Off-Graph Sub-Zones & Seamless Corpse Runs**:
  - Cave mouths, chasm pitfalls (`beginPitDescent`), and pocket realms (`enterRealmArena`) convert `caveReturn.pos` via `seamless.toLocal(...)` so climbing back out resumes the continuous surface at the exact world-space coordinate without double-offsetting `originPx`.
  - `recordDeath` / `recordSeatDeath` persist region-local `DeathRecord.pos` (cross-compatible with discrete mode) while `SeamlessCoordinator` shifts and tracks `playerCorpses` in world space across mounted regions.
- **Desktop Launcher Branch Testing**:
  - In Developer mode (`"developer": true` in `launcher.config.local.json`), the Desktop Launcher discovers `seamless-regions` from GitHub branches and downloads its prebuilt `game-<branchHash>-<commit>.json.gz` bundle from the `launcher-builds` prerelease tag (built with `scripts/build-launcher-branch.mjs` and verified with `scripts/smoke-launcher-branch.cjs`).
