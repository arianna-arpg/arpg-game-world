# Ephemeral spans — condition-held ground (`engine/spans.ts`)

The third temporality of living ground. **Collapse** is one-way (ground dies),
**flux** is periodic (ground breathes on its own clock), **spans** are
**conditional** — ground that answers the sky. A span is a run of walkable
cells the layout painted with a registered region kind whose *existence*
tracks a `RadianceCond` (`world/radiance.ts`): a bridge of sunlight stands
while the world is bright; a star-span is the inverse; a prism-span exists
only while rain or storm covers the zone.

## The radiance scalar (`world/radiance.ts`)

```
radiance = clamp01(max(dayCycle(time).light × WeatherDef.radiance.mul,
                       WeatherDef.radiance.floor))     // open sky
radiance = RADIANCE_CFG.sheltered (flat twilight)      // skyOf 'sheltered'
```

Pure per `(world time, live front kind, sky exposure)` — deterministic, and
host/client/resume all agree because all three inputs ride the snapshot. Every
weather kind carries a `radiance` dial (`{ mul?, floor? }` on `WeatherDef`):
rain greys the noon (0.72), storm halves it (0.5), a blood moon crushes the
night blacker (×0.4), **starfall floors midnight at 0.32** — the one night the
star-spans' *neighbours* may also stand. Consumers ask ONE gate:

```ts
world.radiance(): number
world.radianceCondHeld(cond): boolean
```

`RadianceCond` = `{ radiance?: {from?, to?}, weather?: kinds[], phases?: DayPhase[] }`,
all fields AND together; omitted fields abstain. Prefer the radiance band when
the feel is light-driven, phases when the fiction is clock-driven.

**Sky exposure**: `DimensionDef.sky` declares what a dimension's zones derive
in `skyOf()` — the underworld shelters (`'sheltered'`, the default), **the
Aetherial is `'open'`** (the realm above the weather is not sheltered from
it). Cave pockets derive sheltered off `caveDepth` regardless; an explicit
`ZoneDef.sky` overrides everything.

## The span fabric

`ZoneTheme.spans: SpanRowSpec[]` — one row per family:

```ts
{ region: 'span_sun', when: { radiance: { from: 0.55 } }, fade?, fadeRegion?, voidRegion? }
```

Three states, all worn as region kinds (pure render data — no fabric-specific
drawing anywhere):

| state  | kind                | walkable | read |
|--------|---------------------|----------|------|
| HELD   | `row.region`        | yes      | the bridge's own look |
| FADING | `<region>_fading`   | yes      | the leaving-warning shimmer (default `SPAN_CFG.fade` 3.2s) |
| GONE   | `cloud_void`        | no       | the sky's own hole |

Transitions repaint through `fillRegion` only (the collapse/flux discipline) —
pathing, chunk rebakes, LoS and the sight veil all follow from the grid's own
invalidation. Cond re-held at any state re-forms the span **instantly**
(bridges are generous coming back). Built at `loadZone` to the honest state
(arriving at night shows no sunbridge — no fade theater for ground you never
saw). Falls: the fabric runs the collapse fall test **scoped to its own
cells** (teeter grace `SPAN_CFG.fallGrace`), and routes through the ONE
`routeSkyFalls` path collapse/flux share — `ZoneDef.below` / the dimension's
`over` tie decide where you land.

### The stock families (`world/regions.ts`)

- `span_sun` / `_fading` — gold, stands at `radiance ≥ 0.55` (noon, rainy noon;
  **dies under a true storm** and at night).
- `span_star` / `_fading` — pale starlight, stands at `radiance ≤ 0.35` (night,
  starfall night). The twilight gap (0.35–0.55) is deliberate: at dusk/dawn
  only the glass and the veiled ways hold.
- `span_prism` / `_fading` — `when: { weather: ['rain','storm'] }`; wears
  `animate: 'prism'` (the hue-cycling grammar in `drawAnimatedRegions` — any
  future kind joins by declaring it).
- `span_veiled` — **the leap of faith. Not a fabric row at all**: always
  walkable, painted at alpha 0.06 (the threshold of sight), betrayed only by
  a `star_cairn` at each mouth and by whatever casually walks across the gap.

### The layout contract (genqa-facing)

Spans are **shortcuts and prizes, never the only road**: every exit keeps a
permanent-`ground` route (recipes reserve arteries exactly as collapse
reserves its goal); prize isles hang off the lattice reachable ONLY by span.
`balance/probe_radiance.ts` pins the whole arc — the scalar's math, all four
families' state machines and walkability flips, the telegraph, the
permanent-ground flood-fill, and the comet lanes below. Boot validation
(`validate.ts`) checks every span row's kinds resolve (base + fading twin +
void) and its condition is sane.

## Radiance-gated front lanes (`FrontSpawnRow.when`)

Creep-front lanes take the same condition: a pending wave whose sky says no
**waits at the door** (timer spent, re-asked every tick) and fields the moment
the condition holds; live sections finish their crossing — dawn doesn't delete
a comet mid-flight, it just sends no more. The evaluator reaches the pure leaf
through the terrain window (`CreepTerrain.condHeld`, structural `FrontCond`).

First rider: **`cometfall`** (`data/creeps.ts`) — a fast (235 u/s), narrow
section streaking one bearing, indifferent to the land (affinity default 1,
no clearway row — sky-fire ignores roads and voids alike), no consume/convert;
its teeth are the `starfire` sear + the along-bearing drag shove. The
Vesperlands fly 1–3 lanes of it, night-gated per face.

## The debut country — the Vesperlands (`aether_vesper`)

Firmament-glass isles that hold forever, permanent causeways for every exit,
span-lace between (kind mix and link counts are `layoutParams`:
`spanKinds` / `spanLinks` / `prizeIsles` — the prism face retunes the mix via
**variant-level `layoutParams`**, a general `TilesetVariant` seam this pass
added), comet lanes at night, and the VESPERKIN — day/night kin on the
nocturne fabric (moths blaze at noon, hounds arrive with the dark, the
existing `void_angler` waits under the gaps as a guest). The same meadow is
two different countries by sun and by star, within one visit.
