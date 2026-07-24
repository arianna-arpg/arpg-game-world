# The Visual Fabric — Hollow Wake's rendering system

The renderer keeps the game's thesis: **everything is open, modular data.**
Content defs say one color and (optionally) one material word; the vis layer
derives complete shaded looks, bakes them once, and blits them forever. No
draw code enumerates content ids.

```
src/render/
  renderer.ts        — frame orchestration, passes, HUD (reads registries, owns no looks)
  screenFx.ts        — status ailment → full-screen FX registry, incl. THE
                       FALTER (ScreenFxDef.falter — deliberate SIMULATED
                       frame-stutter while light-headed; bounded,
                       presentation-only, settings-switchable; design
                       charter in docs/render/falter.md — never "fix" it
                       as a perf bug)
  vis/
    visConfig.ts     — VIS_CFG: every tunable (light angle, shadow alpha, chunk size…)
    color.ts         — hex/HSL math, shade/mix/withAlpha, hash01, valueNoise
    materials.ts     — MATERIALS registry: one flat color → shaded ramp + surface
    sprites.ts       — the LRU bake cache + shared glow/shadow primitives
    body.ts          — actor body/adorn baker (shape grammar, volume, texture, outline)
    ground.ts        — baked floor chunks (noise mottle, speckle, wall bevel + AO)
    painters.ts      — the parametric doodad painter library + canopy crown painters
    lights.ts        — the darkness/emissive light layer
    weatherFx.ts     — WEATHER_FX registry: weather kind → particle look
    fogLayer.ts      — the LIVING FOG passes (engine/fog.ts banks: body
                       under actors, tall share over canopies — the drawn
                       lobes are the same states the gameplay hit-test
                       reads; knobs VIS_CFG.fog, ablate pass 'fog')
src/data/
  doodadVisuals.ts   — DOODAD_VISUALS: every doodad kind → painter + params + light
```

## The five layers

1. **Materials** (`vis/materials.ts`). A `MaterialDef` shapes how one base
   color becomes a 5-tone ramp (outline/shadow/base/light/highlight) plus
   surface treatment: specular, gloss band, translucency, emissive halo, and
   a baked texture stipple (`cracks`, `plates`, `facets`, `grain`, `fur`,
   `drips`, `weave`, `pit`, `scales`, `starfield`). Monsters opt in with one word:
   `material: 'bone'` in a `MonsterDef` (replicated over co-op snapshots).
   Add a surface = add a row; nothing else changes.

2. **Baked bodies** (`vis/body.ts` + `vis/sprites.ts`). Actor bodies bake to
   offscreen canvases keyed by shape/radius/color/material/adorn — volume
   gradients keyed to `VIS_CFG.lightAngle`, material texture, silhouette
   outline, white hit-flash variants. Runtime is `drawImage` plus live
   transforms (facing rotation, idle breathing, leap swell). Adorns bake as
   their own facing-tracked overlay; `tentacles` stays live (it writhes).
   The cache is LRU-capped (`VIS_CFG.sprite.maxEntries`).

3. **Ground chunks** (`vis/ground.ts`). The floor bakes per 448-unit chunk:
   value-noise mottle derived from `theme.floor`/`theme.grid` (contrast-curved
   so near-black themes still texture), speckle read from the theme's own
   vocabulary (tufts only where `theme.grass` exists, embers where
   `theme.lava`), a whisper-faint grid, static walk-grid region visuals,
   themed wall cells with lit/shaded bevels, and contact occlusion bleeding
   onto floor beside walls. Chunks key on `GridWalkField.version` — door
   breaks and terraforms repaint themselves. **Animated** region visuals
   (`visual.animate`) stay live in `renderer.drawAnimatedRegions`.
   Palette themes can also sample **by position**: `ground.coast` slides the
   gradient toward the wet end near water-family doodads (dark damp banks),
   `ground.clearing` lifts gaps where crowns stand near-but-not-over (sun
   wells inside forests — presence-gated so open country never washes).
   **Rampart** cells (raised structure walls) additionally bake running-bond
   masonry — mortar courses, per-block quarry tone — so built walls never
   read as cave rock.
   **THE ASYNC UPLOAD SWAP** (`VIS_CFG.ground.asyncUpload`): every (re)bake
   rasters into ONE shared scratch canvas and swaps into the chunk as an
   `ImageBitmap` when `createImageBitmap` resolves — the chunk's live image
   is never mutated, because blitting a just-mutated canvas re-uploads its
   whole texture *synchronously inside `drawImage`*, and that upload (not
   the ~2-4ms raster) was the 40ms hitch class behind every runtime ground
   mutation in liquid-heavy biomes (flood-front wake stamps, temp grounds,
   geyser pools, brittle carves — pinned by a JS self-profiler trace: ~all
   spike-window samples on the native `drawImage` leaf). One snapshot in
   flight at a time (the queue is "still stale next frame"); a chunk draws
   its old self — or the flat stand-in on first appearance — until its
   bitmap lands, which is the stale-chunk contract that always existed.
   `false` restores the legacy sync path (A/B, rollback). Measured: browser
   spike windows 131 → 1 on the flood-wake repro (same-context A/B); the
   desktop compositor reads neutral-in-noise across an interleaved
   off/on/off/on forensic set. If desktop hitch storms ever correlate with
   `grB` again, suspect the bitmap alloc/close churn first (the sync path
   reused one canvas; bitmaps are immutable and must reallocate ~0.8MB per
   swap) — a pooled OffscreenCanvas front/back scheme would be the answer.

4. **Doodad painters** (`vis/painters.ts` + `data/doodadVisuals.ts`). Every
   doodad kind maps to a painter + params. Painters are parametric families
   (`liquid` covers water/bog/lava/gore/ice/chasm…; `mound`, `shard`, `vent`,
   `pod`, `slab`, `plank`, `campfire`, `pentagram`, …). Params accept
   `'theme:<key>|#fallback'` color specs so one entry reskins per biome.
   The def also declares paint `order` (liquids < pits < bridges < objects),
   optional contact `shadow`, the `canopy` crown painter for occluding kinds,
   and `light` emission. **Adding a doodad kind = one data entry.** Kinds
   with no entry draw a themed disc and warn once.

5. **Lights + atmosphere** (`vis/lights.ts`, `vis/weatherFx.ts`). A low-res
   darkness buffer follows the day/night curve, lifted by
   `ZoneTheme.ambientDark` (interiors stay dim at noon), punched by every
   light in view: doodad `light` specs (negative radius = multiple of the
   doodad's radius; `flicker` for fire), projectiles, impact flashes, exits,
   and the hero's after-dark lantern. An additive bloom pass rides on top.
   Every punch is **wall-occluded** (`vis/sight.ts`): rays against
   `blocksSight` region cells clip the glow to its lit polygon, so a hearth
   pools at the wall instead of bleeding through it — and windows/parapets
   pass light for free, because they don't block sight. Open-ground lights
   skip all of it (the polygon is null). The campfire painter clips its warm
   ground halo through the same helper.
   The Descent keeps its own survival darkness — the layer defers to it.
   Weather kinds get particles from `WEATHER_FX` (streaks, flakes, fog
   banks, motes) — stateless, deterministic, intensity-scaled.

## The part grammar — entity portraits (`vis/parts.ts` + `data/looks.ts`)

Entities graduated from "geometry as graphics" to composed top-down
portraits. `PART_PAINTERS` speaks anatomy — `skull` (dome, brow, eye pits,
nasal notch, jaw), `ribs` (spine + curved spokes), `hood`, `tatters`,
`scythe`, `staff` (orb or skull-tipped), `crown`, `claws`, `maw`, `snout`,
`mandibles`, `fins`, `wings`, `torso` (head + shoulders), `robe`, live
`wisps`/`flames`, ~45 parts — and a `LookDef` stacks them with placement in
body radii (+X = facing), palette ROLES (base/bone/metal/cloth/glow/dark;
each part has a sensible default), per-part scale/rot/mirror, and painter
params. `LOOKS` composes the portraits: skeleton = ribs + skull + sword;
reaper = cowl + tatters + scythe; lich = crowned glowing skull over burial
cloth. Identity lives in silhouette, so families read even desaturated.

Defs opt in with `look: '<id>'` (MonsterDef, ClassDef, replicated to co-op);
no look = the legacy shape+adorn body. Looks bake through the sprite cache,
always rotate with facing, and `live` parts animate per frame. Composing a
new monster is a few lines of part specs; add a painter only for a new limb
of vocabulary.

## The color drift — bodies whose color is weather (`vis/colorDrift.ts`)

A look may declare that its base color is not identity but WEATHER:
`LookDef.drift = { palette, period?, desync? }` names a row in the
`COLOR_DRIFTS` registry (stops + period + per-body desync), and the drawn
body's base color MORPHS through the palette's stops on a slow clock. Every
derived tone follows for free — part ramps, glows, outlines, live parts —
because the whole look already derives from the one base color. The morph is
QUANTIZED (`VIS_CFG.colorDrift.steps` ticks per palette leg) so the bake
cache meets a small bounded set of colors per look; texture stipple placement
is seeded color-blind in `body.ts`, so a starfield shimmers without its stars
re-rolling. Registered skies: `nightsky`, `aurora`, `starlight` (the
vesperkin debut — the cosmos country's fauna as pieces of one moving
firmament, their brass orrery keeper deliberately still), and `prismatic`
(the rainbow-keyed lever, standing ready for a future faction).
`registerColorDrift` extends the vocabulary from packages. Portraits and the
bestiary keep the def's own representative color — the drift is a world
phenomenon, not a record-keeping one. Pairs naturally with the `cosmic`
material (nebula body under baked pinprick stars).

## Composite monsters — plural hitboxes (`MonsterDef.parts`)

A root def may declare `parts: MonsterPartDef[]`: each part names its OWN
monster def (body, life, skills, look) plus an anchor `(dx, dy)` in root
radii within the root's facing frame. Parts lazy-attach on the root's first
update tick (any spawn path), fight through the normal skill pipeline, and
BREAK individually — `breakDamage` chunks the root (SUNDERED), `breakMods`
layer torn-guard modifiers, `breakDisables` disarm root skills. `lifeFrac`
pools rescale through the level curve; the root's death cascades its parts;
pristine parts wear no health bar. The Marsh Leviathan (body + venomous
head + two claws + reaping tail) is the shipped exemplar — dragons and
world bosses are data from here, and huge creatures keep moderate root
bodies (sane casting cones) while their bulk lives in parts.

## The portrait fabric — defs drawn as themselves, anywhere (`vis/portrait.ts`)

Any def-like (`MonsterDef`, `ClassDef`, a website JSON row) renders into a
standalone tile through the SAME bakes the world blits: `portraitSubjectOf`
resolves the def (look, material, adorn, faction horn-style stamped by the
caller, worm trail, composite parts expanded via a `resolvePart` callback),
and the compositor mirrors `drawActor`'s stack — contact shadow, the facing
rule (part-grammar looks and oriented shapes rotate; discs hold), the body
bake, live parts on a pose clock, adorns facing-rotated, the live tentacle
writhe. Drawn == shown: a bestiary page or database card can never drift
from the in-game body, because it IS the in-game body.

Fit is MEASURED, never guessed: a probe composition rasterizes once per
geometry, its opaque bounding box is cached, and the tile bakes at exactly
the radius that fills it (`VIS_CFG.portrait.fill`) — content-centered, so a
trailing worm sits composed. Per-def dials ride `MonsterDef.portrait`
(`PortraitTune`: zoom/nudge/facing/pose-clock/trail). Finished tiles live in
their own steward-registered LRU (`'portraits'`; zone-swap floor + run-swap
clear); the underlying body bakes share the global sprite cache and re-fetch
through `baked()` as ever. `portraitTile` is the cached blit path (list
rows, cards); `drawPortraitInto` repaints live with your own clock — breathe
plus `live` parts — for the animated study portrait.

Seats shipped: the Tracker's bestiary (rows + the open entry's breathing
study portrait + grimoire slot chips; undiscovered pages show the true dark
SILHOUETTE of the body — `BESTIARY_CFG.portrait` picks sizes and the
silhouette-vs-glyph policy), the BOSS MARQUEE bar (the boss itself beside
its name, subject memoed per actor, built from the ACTOR's replicated look
so co-op clients read it too; dims while WARDED), the bonded-companion
release rows (actor-based: the collar tack and all — `PortraitDefLike.
extraParts`), the build-flap Spectre chip, the mercenary offer sheet
(class-look hero bodies) — non-book seat sizes in `VIS_CFG.portrait.seats`,
any panel refresher opts in with one `paintPortraitsIn(root)` call over its
declared `data-bport`/`data-bactor`/`data-bclass` canvases — and the
WEBSITE database — `npm run
build:portraits` (vite.portraits.config.ts) bundles the fabric + painters +
LOOKS into `site/assets/portraits.js` (iife global `HWPortraits`, ~43 KB
gz), built by CI beside the JSON export and gitignored like it, so site
pixels regenerate from src/ exactly as site facts do. The exporter stamps
`demonHorns` per monster (the one fact `raw` can't carry — it derives from
FACTIONS, which the vis-pure bundle never imports). The module imports only
body/parts/sprites/caches/visConfig — never World, never the renderer; keep
it that way or the website bundle grows an engine.

## Climates — ambient FX, desert heat, living skies

`ZoneTheme.ambientFx` declares a zone's standing sensory weather
(`vis/ambientFx.ts`): underwater `caustics` (sweeping light bands) +
`bubbles` (drifting columns + periodic splay-bursts), desert `heatHaze`,
generic `motes`. Stateless, deterministic, one draw branch per kind.

DESERT HEAT is a doodad + a status + one world loop: `heat_shimmer` fields
(painter `shimmer`, stamped by desert layouts) bake `sunscorched` stacks
onto players (fire res −5%/stack, cap on the status def); SHADE — a canopy
crown, a roof, or night — dwindles them. Cadence in `HEAT_CFG`; the loop is
`World.updateHeat` / `World.isShaded`, reusable by any future heat hazard.

WEATHER TRANSITIONS are configurable at two levels: `WeatherDef.rampFrac`
shapes how much of a front's life is spent gathering/clearing (storms break
fast, fog seeps), and `WEATHER_FX.fadeIn` crossfades the DISPLAYED weather
per kind in the renderer (`smoothWeather`) — a kind may still slam in by
design with a small fadeIn.

## Walk-under trees, sun shadows, fog, Foresight

TREES have TRUNKS: `DoodadRule.bodyScale` makes movement/projectiles/spawn
clearance use `bodyRadiusOf` (the bole) while sight, occlusion, and shade
keep the full canopy radius. Crowns come from the canopy registry —
`leafCrown` (deciduous), `pineCrown` (conifer), `bramble` (thicket) — and
the `conifer` + `ancient_tree` kinds anchor dense forests. Anyone beneath an
unfaded crown is unseen until the hero steps under too.

VEILS (`DoodadRule.veil`, `engine/veil.ts`): the crown escalated to the
PATCH. Veil-bearing kinds' crowns MERGE into contiguous canopy masses
(union-find over overlapping discs, per `group`), and the patch behaves as a
unit: sealed near-opaque `cover` alpha over everything beneath — monsters,
loot, ground — until the LOCAL hero stands under the same mass, when the
whole patch fades to `reveal` together (per-crown smoothing toward the
shared target; the per-tree `occlude` near-fade composes via min so the
crown overhead always opens a little further). Concealment is GAMEPLAY, not
just pixels: `World.veilPatchAt`/`isConcealedFrom` gate aim assist (a held
lock BREAKS when its target slips under unbroken leaves), labels ride the
same `frameOccluders` fade, and standing under cover wears the veil's
`standStatus` (default `canopied`, detectability −35% — fogveiled's
pattern). The whole walk-under family veils (tree/conifer/palm/briarwood/
ancient_tree/forest_oak/giant_mushroom/fruiting_tower/giant_kelp); one rule
row opts any future kind in. The index rebuilds lazily off the same doodad
list/rev keys as `doodadsAt` (brittle pops self-heal; co-op clients derive
identical patches from the shipped list). Fade speed: `VIS_CFG.canopy`.
The FOREST biome is built on this — its layout recipe plants crowns closer
than they span so whole stands read as single sealed roofs, coverage scaling
with `geo.biomeDepth` (see `docs/worldgen/climate.md`).

THE CANOPY COMPOSITE (`vis/canopy.ts`, `VIS_CFG.canopy.composite`): a patch
fades as ONE BODY, so in steady state a sealed roof was hundreds of per-crown
sprite blits a frame expressing one number. The STATIC (`CANOPY_STATIC`,
non-`live`) crowns of each veil patch now flatten into world-space chunk
SLICES — one baked canvas per chunk per patch alpha-group — and the roof
draws as a dozen `drawImage` calls at the patch's smoothed alpha (same-mint
A/B: forest 20.8 → 12.6ms gapP50, jungle tail 25 → 20.9 gapP99; the palm
crown joining `CANOPY_STATIC` had already halved the jungle's p50). The
per-crown near-fade still dissents: a crown pulled away from its patch's
alpha (peeking under a covered eave) LEAVES the composite (hysteresis-
guarded) and draws itself until it converges back; live crowns (the cut
contract), non-veil occluders, dynamic painters, and patches under
`minPatchMembers` never enter. Slices bake under a frame budget with the
per-crown path as a pixel-identical stand-in, recycle through a canvas pool
(GPU alloc churn is the faad384 hitch class), release eagerly on zone swap,
and LRU-cap globally. Invalidation is free: patch identity is the object and
the veil index rebuilds off doodad revs, so pops/pushes/zone swaps mint new
patches and the WeakMap-keyed cache follows. Forensics: `npm run perf --
--ablate=canopyslices` measures the old per-crown path.

THE SIGHT VEIL (`vis/sightVeil.ts`, `VIS_CFG.sightVeil`): positional
occlusion shadows — the LoS ray's drawn half. From the local hero's eye,
sight-blocking GRID cells (rampart lines, cave walls, verdure; closed doors
seal into the grid and reopen with it) throw dark from their merged facing
edges, and solid doodads throw tangent wedges from their SHOT surface (the
trunk — crowns stay the canopy veil's business). Composites after the actor
pass and UNDER canopies/roofs, so a building's far side goes dark while the
building and the skyline stay lit; actor sprites in shadow fade out
(smoothed) and labels gate through the same occluder test the sheet draws
from. Occluder gathering caches against hero-bucket × `doodadRev` ×
`GridWalkField.version`; per frame it is a facing test per edge, a wedge per
disc, two union fills into a downscaled sheet (overlap never stacks), one
composite — and zones with nothing in reach skip the sheet entirely. The
room veil supersedes it as confinement wraps. Levers: `ZoneTheme.sightVeil`
multipliers, `DoodadRule.sightShadow` per-kind overrides. Forensics:
`npm run perf -- --ablate=sightveil`. Docs: `docs/engine/los-pathing.md`.

THE WHOLE-KIND BAKE (`bakeWhole` on a `DoodadVisualDef`, `wholeKindSprite` /
`paintBakedWhole` in vis/painters.ts): ground kinds whose painter is a pure
function of (radius, position seed, params, theme) blit variant-baked
sprites — 8 looks minted through the REAL painter with a fake position, so
baked doodads are pixel-true to live ones — instead of re-stroking paths,
gradients and clips per doodad per frame. `'sway'` adds the whole-sprite
shear (reeds, kelp); `PAINTER_IGNORES_ROT` keeps upright/sun-anchored
painters from spinning with `d.rot`. The TIME-FREE CONTRACT is the only
entry fee, and the light layer is where a kind's pulse goes to live instead
(the glow_cap doctrine: `light.flicker` breathes at parity with every other
emissive, the painted body holds its mid glow). 2026-07-16: the shard
family took this wholesale — 20 moteless kinds (ice spikes, icicles,
crystals, obsidian, ley fonts, resonance nodes, …) bake; `glowworm_veil`
and `light_spot` keep their live motes — and mushroomCrown joined
`CANOPY_STATIC` the same way (breath → flicker). Measured on the first
cave gate: rime_gallery (crevasse, shard-dense) 24.9 → 20.8ms gapP50 with
the 44.5ms tail and 9-hitch cluster gone; fungal_hollow (mushroom-dense)
12.4 → 8.3, town-flat.

SUN SHADOWS: `sunCast(time)` gives a direction that spins through daylight
and a reach that stretches at low sun; kinds opt in via
`DoodadVisualDef.longShadow` (a radius multiplier).

FOG BANKS: `fog_bank` doodads billow on the canopy pass and apply FOGVEILED
(detectability −35%) through the region registry — `groundAt` now falls back
to ANY registered ground kind, so new sensed terrains (webbing, reeds) are
one `registerRegion` row.

FORESIGHT: enemy ground-delivery wind-ups mark their landing with a dashed
ring firming toward impact (`Settings.castTelegraphs`, in the options panel).

## The stone, flora, fungal and flesh kits

THE ROCK GRAMMAR (`boulder` painter): every stone rolls a deterministic FORM
from its position — mono boulder, split pair, or an outcrop with shoulder
stones — builds an angular silhouette, and shades it facet by facet against
`VIS_CFG.lightAngle`. Accents are composable params, each chance-rolled per
stone: strata, cracks, grain, moss + lichen (theme-gated — no key, no paint),
quartz glints, barnacles, wet shine, pebble skirts, and a snow cap that
follows `World.snowCover`. `cairn` (stacked waymark courses) and `scree`
(walkable gravel) round out the family; `rock_spire` is the same painter in
pinnacle mode; the `boulder_field` stamp composes an outcrop set-piece.

FLORA CLARITY: bushes and tree crowns sit at opposite detail frequencies so
clumps never merge. The bush painter carries a DISCRETE LEAF overlay
(midribbed ovals angled outward), woody sprigs, and optional berry clusters
(`berry_bush` is the same painter saying one more word); `leafCrown` carries
broad soft dapple wells instead. `fern` is its own painter — arching
leaflet fronds with a fiddlehead — a third silhouette for the understory.

THE FUNGAL KIT: `hyphae` turns the mycelial mat into a living circuit —
loam wash, branching filaments, bright nutrient pulses traveling the
strands. `mushroomCrown` takes its whole palette from params (cap / glow /
stalk / speck, gill fringes, wart specks) so any biome can grow its own
mushroom. `shelfFungus` steps amber brackets off a woody heart;
`toadstools` huddles speckled caps, and the fairy-ring stamp alternates
them with glow-caps. The `spores` AmbientFx kind drifts breathing luminous
motes with a periodic off-screen cap PUFF.

THE FLESH KIT: the warren is ONE CREATURE — a shared `heartbeat()` (lub-dub,
one clock) drives `membrane` sheets that tighten on the beat and `veins`
whose pulse front visibly rides node-to-tip on every thump. `eyeStalk` is
the signature tell: its iris tracks `world.player` live and blinks on its
own clock. `ribArch` and `teethRow` jut the anatomy out of the floor. All
palette on params — any organic horror biome can borrow the kit.

## Liquids and wind

Every liquid's identity is a painter param on its `DOODAD_VISUALS` entry:
water `sheen` + renderer wake-ripples (motion FX also presses `pock` marks
into snowdrifts), ice `glassSheen` + the actor MIRROR ghost (drawn in
drawActor when `groundKind === 'ice'`), lava `crawl` + `crackle`, bog
`bubbles`, mud `blotch`, swamp `scum`, gore `glisten`, grass clumped swaying
`tufts` (+`flower`). New liquids compose from the same vocabulary.

WIND: a covering front's drift vector is the zone wind (`WeatherDef.wind`
scales strength; gusts roll on beating sines). `World.windAt(pos)` returns
the felt vector — null when an anchored solid stands upwind within
`WIND_CFG.shelterReach` (windbreaks are real cover). The movement artery
scales speed by the move-direction dot (headwind slows, tailwind hastens,
clamped); streamline wisps visualize direction/strength on screen. All
knobs in `WIND_CFG`.

## The `compound` structure generator

The room-grammar composer (`engine/structureGen.ts`): a footprint BSP-split
into rooms, every partition door-punched (always connected), leaf rooms
opened to courtyards, exterior gates/windows/towers, clutter by density —
every knob a genParam; fixed values are deterministic, ranges roll on the
zone seed either way. `walled_manor`, `dungeon_block` and `market_row` ship
as templates; a dungeon or metropolis biome is a layout pass from here.

## Structure floors — real interiors underfoot

Townsfolk don't live in the mud. A plan structure naming a `floorStyle`
(`FLOOR_STYLES` in `data/structures.ts`) gets a real floor baked into the
terrain chunks under its interior cells (`vis/floors.ts`): `boards` with
staggered butt joints and per-plank tone, `cobble` set in grout, `flagstone`
slabs, temple `tile`, `packed` earth. `courtyardFloorStyle` paves the
open-air cells instead — a smith's work apron, a keep's parade ground.
Floor rects come out of the same `mergeCells` pass that derives roof rects
(levelgen), so floors, roofs and courtyards always agree about the building's
shape, doorways included. Every pattern is deterministic from position, and
each floor closes with a soft inner AO rim so rooms feel grounded, not
decaled. The roof hides all of it until the hero steps beneath — then the
reveal shows a furnished, boarded room, which is the whole trick.

## How to…

- **Give a monster family a surface**: `material: 'chitin'` on the def.
- **Give a monster a portrait**: `look: 'reaper'` on the def — or compose a
  new `LOOKS` entry from parts.
- **Build a world boss with plural hitboxes**: `parts: [...]` on the root
  def, one part def per hitbox.
- **Shape a biome's floor**: `ground: { scale, stretchX, strength, speckles }`
  in its theme (desert dunes = scale 2.6, stretchX 2.1).
- **Slide the floor palette by position**: `ground.coast: { reach, shift }`
  (wet dark banks; `kinds` widens the water family) and
  `ground.clearing: { reach, lift }` (sun-wells between crowns — tag
  canopied biomes only).
- **Mesh a ground kind into the terrain**: `blend: { strength, feather,
  color }` on its `DOODAD_VISUALS` entry — soft rings bed the group's merged
  silhouette into the land (bog 0.5 > grass 0.38 > road 0.3). Chained stamps
  add `mode: 'path'` so the discs stroke as one continuous band (roads).
- **Make a kind breakable without a life bar**: `brittle: { on, reach?,
  dwell?, orbChance?, gemChance?, carve?, text? }` on its `DoodadRule`
  (engine/levelgen.ts) — pots pop to a hit or a touch, plugs crumble when
  neared, secret walls carve open under a lingering press.
- **Give a region wall a readable rim**: `visual.edge: { color, width? }` on
  its RegionKind row — baked on every side facing walkable ground (the flesh
  wall's membrane line). Plain themed walls get legibility for free via the
  baker's wall-vs-floor CONTRAST GUARD.
- **Dress a skill-object**: constructs default to their kind's portrait
  (`CONSTRUCT_LOOKS` in data/looks.ts); a skill with its own material names
  `look:` on its ConstructDelivery (bone prison → bone, frost wall → ice).
- **Walk-under anything**: `bodyScale` on the DoodadRule + a trunk-style
  ground painter + a `canopy` crown — trees, palms, and now giant mushrooms.
- **Add a new material**: one row in `MATERIALS`.
- **Make a body's color slowly morph** (night skies, auroras, a future
  rainbow faction): `drift: { palette: 'nightsky' }` on its `LOOKS` entry;
  new sky = one `COLOR_DRIFTS` row (or `registerColorDrift`).
- **Skin a new doodad kind**: one entry in `DOODAD_VISUALS` naming a painter;
  add a painter only for a genuinely new *vocabulary* of look.
- **Floor a building**: `floorStyle: 'boards'` on its `StructureDef`
  (+ `courtyardFloorStyle` to pave the yard). New pattern = one
  `FLOOR_STYLES` row; new *geometry* = one branch in `vis/floors.ts`.
- **Furnish a room**: furniture legend chars in the plan rows — `b` bench,
  `p` pots, `f` firewood, `z` brazier, `L` lantern, `H` hay, `M` stall,
  `G` banner. `registerLegendChar` adds the next one.
- **Make something glow**: add `light: { radius, color, intensity, flicker? }`
  to its `DOODAD_VISUALS` entry.
- **Darken an interior tileset**: `ambientDark: 0.5` in its theme.
- **Add weather particles**: one `WEATHER_FX` row keyed by the WeatherKind.
- **Skin a biome's stone**: the `rock` entry already reads `theme:obstacle` —
  for a bespoke look, point a new kind at the `boulder` painter and pick its
  accents (strata/moss/quartz/…) in params.
- **Grow a biome's own mushroom**: a `mushroomCrown` canopy with your own
  cap/glow/stalk params — no new painter.
- **Give a zone standing ambience**: `ambientFx` rows on the theme
  (`spores`, `motes`, `aurora`, …).
- **Rebalance the whole look**: `vis/visConfig.ts` — nothing else has magic
  numbers.

## Memory, capability and the screen-wash fabric

Three small fabrics keep long sessions smooth on every engine:

- **The cache steward** (`vis/caches.ts`): every render cache REGISTERS
  (module caches at load, renderer-owned instances at construction) with its
  own `onZoneSwap` / `onRunSwap` handlers and census hooks. The renderer
  detects the two boundaries (zone identity flip → `trimVisCaches('zone')`,
  new World → `'run'`) and fans out; policy sits WITH each cache, dials in
  `VIS_CFG.memory` (the bake LRU keeps `spriteFloorOnSwap` newest entries
  across a swap; membranes and billows clear wholesale — zone-flavoured by
  construction). Without the steward every cache grew to its cap and held
  FOREVER: a long sitting saturated hundreds of live canvases, and engines
  that keep a surface per canvas (and GCs that walk what still holds them)
  degraded into the "lag accumulates until refresh" profile. A new cache
  joins the discipline (and the QA census, `visCacheStats()`) by
  registering — no wiring anywhere else.
- **The capability probe** (`vis/canvasCaps.ts`): canvas features that
  differ WILDLY between engines (the non-separable blends above all) are
  micro-timed ONCE per session on a small offscreen surface — measured,
  never UA-sniffed — and consumers ask `canvasCap(id)`. The pall's
  desaturate rides it (`VIS_CFG.statusFx.desatMode: 'auto'`): where
  'saturation' compositing is a software cliff (the Firefox class), the
  baked wash carries the read alone. New probe = one `CAP_PROBES` row;
  thresholds in `VIS_CFG.caps`.
- **Edge overlays** (`vis/overlays.ts`): the full-screen wash family — DoT
  vignettes, the pall wash, the blind iris, the frost rim, the low-life
  seep, the spore bloom — is ONE parameterized shape (clear centre → tinted
  screen edge) baked small and stretched (radial falloffs are
  resolution-free), with the pulse riding `globalAlpha`. What used to mint
  a full-screen `createRadialGradient` PER FRAME per overlay is now one
  blit; moving shapes (a tightening iris, a systole) QUANTIZE the moving
  parameter into the bake key (`VIS_CFG.overlays.quantum`) and the LRU
  absorbs the handful of steps. A new wash is a `drawEdgeOverlay` call with
  stops — no new gradient code.

## Gotchas

- `hash01` must mix with **unsigned** shifts (`>>>`); the first draft
  sign-extended and every noise consumer flattened to nothing.
- Anything painted into a bake must be static — animated region visuals and
  the tentacle adorn stay in live passes on purpose.
- The light layer projects through `cam - shake` (the world transform adds
  shake positively).
- Bakes key on everything that changes pixels: if you add a field that
  alters a body's look, add it to `bodyKey`.
- Balance sim (`src/sim/`) never touches the renderer; render changes need
  no re-baseline.
