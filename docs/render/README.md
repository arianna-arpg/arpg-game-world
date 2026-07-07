# The Visual Fabric — Hollow Wake's rendering system

The renderer keeps the game's thesis: **everything is open, modular data.**
Content defs say one color and (optionally) one material word; the vis layer
derives complete shaded looks, bakes them once, and blits them forever. No
draw code enumerates content ids.

```
src/render/
  renderer.ts        — frame orchestration, passes, HUD (reads registries, owns no looks)
  screenFx.ts        — status ailment → full-screen FX registry
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
src/data/
  doodadVisuals.ts   — DOODAD_VISUALS: every doodad kind → painter + params + light
```

## The five layers

1. **Materials** (`vis/materials.ts`). A `MaterialDef` shapes how one base
   color becomes a 5-tone ramp (outline/shadow/base/light/highlight) plus
   surface treatment: specular, gloss band, translucency, emissive halo, and
   a baked texture stipple (`cracks`, `plates`, `facets`, `grain`, `fur`,
   `drips`, `weave`, `pit`). Monsters opt in with one word:
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

SUN SHADOWS: `sunCast(time)` gives a direction that spins through daylight
and a reach that stretches at low sun; kinds opt in via
`DoodadVisualDef.longShadow` (a radius multiplier).

FOG BANKS: `fog_bank` doodads billow on the canopy pass and apply FOGVEILED
(detectability −35%) through the region registry — `groundAt` now falls back
to ANY registered ground kind, so new sensed terrains (webbing, reeds) are
one `registerRegion` row.

FORESIGHT: enemy ground-delivery wind-ups mark their landing with a dashed
ring firming toward impact (`Settings.castTelegraphs`, in the options panel).

## The `compound` structure generator

The room-grammar composer (`engine/structureGen.ts`): a footprint BSP-split
into rooms, every partition door-punched (always connected), leaf rooms
opened to courtyards, exterior gates/windows/towers, clutter by density —
every knob a genParam; fixed values are deterministic, ranges roll on the
zone seed either way. `walled_manor`, `dungeon_block` and `market_row` ship
as templates; a dungeon or metropolis biome is a layout pass from here.

## How to…

- **Give a monster family a surface**: `material: 'chitin'` on the def.
- **Give a monster a portrait**: `look: 'reaper'` on the def — or compose a
  new `LOOKS` entry from parts.
- **Build a world boss with plural hitboxes**: `parts: [...]` on the root
  def, one part def per hitbox.
- **Shape a biome's floor**: `ground: { scale, stretchX, strength, speckles }`
  in its theme (desert dunes = scale 2.6, stretchX 2.1).
- **Add a new material**: one row in `MATERIALS`.
- **Skin a new doodad kind**: one entry in `DOODAD_VISUALS` naming a painter;
  add a painter only for a genuinely new *vocabulary* of look.
- **Make something glow**: add `light: { radius, color, intensity, flicker? }`
  to its `DOODAD_VISUALS` entry.
- **Darken an interior tileset**: `ambientDark: 0.5` in its theme.
- **Add weather particles**: one `WEATHER_FX` row keyed by the WeatherKind.
- **Rebalance the whole look**: `vis/visConfig.ts` — nothing else has magic
  numbers.

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
