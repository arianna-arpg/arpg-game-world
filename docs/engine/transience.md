# THE TRANSIENCE DOCTRINE — events borrow the world, they never own it

The base worldstate — the biome field's geology, every zone's authored def,
every layout a seed regenerates — is **sacred**. A world event (an invasion, an
incursion, a bloom, a winter) is a **tenant**: it may recolor the air, dress the
ground, tilt the spawns and raise its own works **while it lives**, and every
one of those lanes reverts **by construction** when it ends — repelled, expired,
collapsed, or simply absent from a resumed save. A permanent mark on the world
is a deliberate, **player-authored** act (see *Scars* below), never a side
effect of an event the player didn't resolve.

The user-facing read this doctrine buys (the Helltide model): a Demon Invasion
turns the sky crimson, rains meteors, plants the legion's fins and banners in
every covered zone — and the moment the Balor falls, the storm crossfades out,
the dress evaporates, and the land is **exactly** what it was before the strike.
No zone changes biome. No newly-explored frontier bakes the event into the map.

## The four presentation lanes (all reverting)

### 1. Event-pinned weather — `engine/eventWeather.ts`
An event that holds ground reads as **its own kind of weather**. One
`registerEventFront({ id, sample(world, zone) })` source per event, resolved
fresh at `World.skyFront()` — THE gate every in-zone weather consumer already
reads — so the whole presentation stack follows for free: renderer wash +
particles + the **veil** (below), the radiance dial, wind, strikes, snow, fog,
and the weather dress. Fold policy: **strongest intensity wins** (sky fronts
included) — one sky at a time reads clean. Sheltered ground (caves, interiors,
roofed dimensions) refuses pinned fronts exactly as it refuses rain; sanctuary
zones are each source's own courtesy (match your event's other gates).

The kinds are ordinary `WEATHER_DEFS` rows flagged **`eventOnly: true`** — never
sky-born (validateWeather enforces both directions: eventOnly rows must omit
`skyWeight`, everything else must carry one). Shipped rows:
- **`demonstorm`** — the Demon Invasion's sky. Pinned per stage via
  `InvasionStage.weather { kind, intensity }` (0.45 → 1.0 up the fester
  ladder). Spawn-neutral by design: the overlay's own `stormFactionMul`
  already tilts covered zones — the weather row is presentation.
- **`eldritch_pall`** — the Incursion's air, via
  `IncursionArchetype.weather { kind, max }` at `max × influence(zone)`: the
  veil literally deepens toward the epicenter and recedes as the reach is
  cleansed back.

The drawn face lives in `render/vis/weatherFx.ts` (`WEATHER_FX` rows). New
capability there: **`veil`** — a screen-space radial gradient in the front's
color (clear core, gathering edges, slow breathing) — the "gradient overlay
shader" read. Any kind may wear one; it crossfades with the ordinary displayed-
weather ramp.

### 2. Weather dress — `engine/weatherDress.ts` + `WeatherDef.dress`
**Temporary ground set-dressing laid by the sky.** Any weather kind may declare
dress rows (`{ doodad, count, radius, minGap, solid }` + plant/fade thresholds
+ evap rate); `World.updateWeatherDress` reconciles on a ~1s beat: plants while
the displayed kind holds (≥ `plantAbove`), **evaporates** every piece
(`Doodad.evap`, the generic drying fabric) the beat the front stops covering
the zone. Nothing persists: dress doodads are tagged (`Doodad.weatherDress`),
runtime-only, never in layouts or zone memory — a revisit after the front moved
on finds the land as authored. Placement is seeded per (zone, kind) — the same
front over the same zone lays the same dress — and refuses sanctuary ground,
boundless arenas, portal aprons (`clearOfDoors`), the player's feet, unwalkable
seats, and (for `solid` rows) any seat whose surrounding ring isn't walkable.
Dials in `WEATHER_DRESS_CFG`. Debut kit: `demonstorm`'s occupation dress
(hell_fin / demon_banner / ember_fissure — existing kinds; a new look is one
doodadVisuals entry).

### 3. Biome-field warps — `world/biomeField.ts` (THE WARP LAW)
Warps are **presentation + attribution only**: the world-map heat wash recolors
and the zone-info box names the turner — but `sampleBiome`/`sampleDepth` (THE
MINT SAMPLERS worldgen reads) return the **base field**. No temporary event can
bake its biome into newly-charted ground — this closes the old leak where
exploring during an invasion minted permanent rift-biome zones ("eventually
nothing but Rift biomes").

Every warp is **keyed, owned, reconciled**:
- `setWarp(id, mod)` — replace-by-id, idempotent, revives a mid-fade release.
- `unwarp(id)` — instant (owners that reconcile beat-by-beat: mycelia,
  deepwinter, long-night conversions).
- `release(id)` — the event ended: strength decays at
  `BIOME_FIELD_CFG.warpFadePerSec` until gone, dither-speckling away — the
  land **heals**, it never snaps. (This is also the "volcano cools off" lever:
  a future eruption event = a keyed warp + release, zero new engine.)
- The engine's **warp sweep** (world.ts, 1s beat) re-asserts live events'
  warps (incursion epicenters — which also re-raises them after a resume; the
  field itself is transient-by-derivation) and releases dead ones (incursion /
  crusade / swarm-roost / any stale `demon_`). Every ending heals by
  construction.
- There is **no unkeyed permanent `warp()`** anymore.

Current writers: incursion epicenters (`incursion_<epId>`, released on
collapse), crusade anchored claims (`crusade_<id>`), swarm roosts
(`swarm_roost_<id>`, standing ecology by snapshot — and cullable), the
mycelia/deepwinter/long-night conversion discs. The Demon Invasion **no longer
warps at all**: its epicenter prefers real demon country (relocation), and with
none near it mints as an explicit intrusion — `spec.tileset` + its authored
biome — standing on unturned land.

### 4. Minted event ground — the TRANSIENCE RULE (pre-existing, now load-bearing)
Event-minted zones are `eventOwned` and survive saves only while **claimed**
(`ownedZones` in the owner overlay's snapshot). A live invasion's rift and a
live incursion's epicenters ride the save; the moment the event resolves, the
claim drops and the next save/load re-rolls that ground away. In-session the
zone lingers as the fight's aftermath until then — acceptable, bounded, and
probe-pinned.

## Scars — the player-consent doctrine
A **permanent** change to the world must be traceable to a deliberate player
act, and should be rare enough to feel like history. There is deliberately no
convenience API for permanence — authoring one means writing to a zone's def
(the visible, greppable act), and the doc you're reading is where such acts are
registered:
- **The Glacial Heart** (deepwinter): the crystallized heart grafts a
  `glacial_heart` landmark that outlives the thaw — the standing memory of the
  Winter King's defeat at the player's hand. Player-authored; stands.

Anything else that wants permanence answers this doc first: *what did the
player DO to earn the mark?*

## Probe
`npx tsx balance/probe_transience.ts` — the warp law (keyed / release / decay /
revive / mint-blind sampling), weather-row legality (eventOnly × skyWeight ×
dress kinds), the skyFront fold (pin vs sky vs shelter), the demon stage-sky
ladder + overlay claim lifecycle, the dress arc (plant → idempotent → dissolve
→ deterministic replant → sanctuary refusal), the incursion's whole arc through
the REAL engine drain (mint → keyed warp → pall off live influence → collapse →
release → heal → the transience rule dropping unclaimed ground), and the
sweep's stale-warp release. All engine-inert outside events: sim smoke baseline
byte-stable, genqa untouched.
