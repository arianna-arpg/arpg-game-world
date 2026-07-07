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

## How to…

- **Give a monster family a surface**: `material: 'chitin'` on the def.
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
