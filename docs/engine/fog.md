# The Fog Fabric — living, roaming fog banks

`src/engine/fog.ts` (sim) · `src/data/fog.ts` (kinds) · `src/render/vis/fogLayer.ts` (draw)

Volumetric fog is not a doodad. A **fog bank** is a breathing mass of soft
lobes that drifts across the zone, coils, swells, thins at its edges and
eventually dissipates — then gathers again somewhere new. The drawn lobes
ARE the gameplay surface: an actor standing inside a **live** lobe wears the
bank's granted statuses, refreshed while inside and lingering briefly after
stepping out (the statuses' own short durations). Because the hit test
tracks the living shape, anything — player, monster, minion — can travel
WITH a bank to keep its gift, and loses it where the edge dissipates.

## The data surface

**`FogBankDef`** (`FOG_BANKS` registry, `registerFogBank`) — one row per fog
KIND:

| Field | What it says |
| --- | --- |
| `color` / `alpha` | render tint + peak density |
| `radius`, `lobes` | bank reach roll + lobe count roll |
| `drift`, `meander`, `swirl`, `breathe`, `churn` | the whole motion grammar: mass speed, heading sway, lobe orbit, radius pulse, per-lobe density wax/wane |
| `life`, `rampFrac` | seconds per gather→dissipate cycle + fade in/out share (the weather-front intensity triangle, per bank) |
| `overFrac` | share of density drawn ABOVE actors (tall haze vs ground body) |
| `hitAlpha` | min lobe density that still counts as "inside" (edge honesty) |
| `grants` | `FogGrant[]`: status + optional `teams` / `factions` filters |
| `haunt` | `{ kinds, pull, along }`: ground it clings to; `along` banks drift down the local chain of that ground (river-roll) |

**`ZoneFogSpec`** (`ZoneTheme.fog`) — what a zone breathes:
`{ banks: [lo,hi], kinds: [{ id, weight? }] }`. Variants inherit the base
theme unless their partial theme overrides `fog`.

Core kinds shipped in `data/fog.ts`: `mist` (the common veil), `river_mist`
(anchors on `water`, rolls its banks), `grave_mist` (pools over tombstones,
grants `fogveiled` to all + `mistfed` to `undead`), `gloam_shroud` (big,
tall, coiling — a biome signature kind).

## Contracts

- **Seed discipline** — the field rolls on `zoneSeed ^ FOG_CFG.salt` with a
  dedicated Rng; it never advances layout/spawn rng. Adding fog to a tileset
  cannot move a doodad or a baseline metric (verified: smoke baseline
  byte-stable across the retrofit).
- **Transience** — banks are ambient texture, rebuilt each `loadZone`
  deterministically from the zone seed; nothing serializes (worldstate
  doctrine). Boundless zones (the Descent) never build a field.
- **Weather coupling** — a `fog` WEATHER front over the zone breeds up to
  `FOG_CFG.weatherBanks` sky-born `mist` banks over any **open-sky** zone
  (no `ambientDark`) and thickens drawn density (`VIS_CFG.fog
  .weatherAlphaBoost`), scaled by front intensity. Node-scale sky and
  in-zone banks stay one weather system.
- **Statuses, not regions** — grants apply via the ordinary
  `applyStatus(id, 0, 1, 'the fog')` refresh/linger idiom (`fogveiled` keeps
  its −35% detectability parity from the retired `fog_bank` region). No LoS
  / shot / movement blocking, by design — the murk hides you from senses,
  not from physics.
- **Honest edges** — lobes below `hitAlpha` neither draw meaningfully nor
  grant: the hitbox retreats exactly where the fog visibly dissipates.

## Runtime shape

`World.fog: FogField | null`, built at the loadZone ambient-reset block;
ticked by `World.updateFog` beside heat/snow (weather sampled per tick).
`FogField.inFog(x,y)`, `densityAt(x,y)`, `nearestBank(x,y)` are the open
predicates (AI drives, packages). Renderer draws two view-culled passes from
the same live lobe states (`vis/fogLayer.ts`): the body under actors +
telegraphs, the tall share above canopies but below roofs/labels. Ablate
pass name `'fog'`; knobs in `VIS_CFG.fog`.

## Extension seams

- A new fog anywhere = one `registerFogBank` row + a `fog:` line on a theme.
- `FogGrant` can grow damage-over-time fumes (a dps resolver seam is noted
  in `dressOccupants`) — today's grants are pure statuses.
- Packages may spawn banks directly (`field.spawnBank(def)`) for event fog.
- Monster fog-seeking: `FogField.nearestBank` is the steering query — an
  `x_seek_fog` AI action can ride it (registerAIAction), no engine edits.
