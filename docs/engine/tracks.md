# The Track Fabric — moving hazards on authored ways

`src/engine/tracks.ts` (pure leaf) + `World.updateTracks` (engine half) +
`src/render/vis/trackLayer.ts` (drawn half) + `src/data/tracks.ts` (the kit).
Probe: `npx tsx balance/probe_tracks.ts`.

A **track** is a polyline lane a hazard **rider** travels forever — the
Ascendancy-trial buzzsaw, the revolving blade arm, the shuttling sled. The
fabric stands deliberately **beside the will-lane** (patrol routes, the
procession cart, duty posts): those are bodies with minds that abandon their
way when the world interrupts them. A rider is **clockwork** — never blocked,
never distracted, never slain — and its position is a **pure function of the
zone clock**:

```ts
pose = trackPose(track, world.time, rider.phase)   // same clock in, same pose out
```

No integration, no velocity state, no drift. Host, every co-op seat, and a
resumed save read the same blade at the same millimetre (the projectile form
painters' age-clock discipline, promoted to a fabric). Determinism is a
construction property, probe-pinned, not a test hope.

## Authoring

```ts
interface TrackSpec {
  path: Vec2[];                 // zone space; ≥2 pts (≥3 closed)
  closed?: boolean;             // ring
  mode?: 'loop' | 'pingpong';   // loop REQUIRES closed; open lanes shuttle
  speed: number;                // px/s, (0, 600]
  pauses?: { at: number; sec: number }[];  // dwell plateaus at waypoints
  riders: { kind: string; phase?: number }[];  // phase 0..1 of the period
  groove?: boolean;             // gen lanes lay a carved way; ensured lanes stroke live
  ownerTag?: string;            // kills/shoves credit the live actor wearing this tag
}
```

Three authoring surfaces, one runtime:

1. **Generation** — a landmark builder or recipe pushes `(ctx.tracks ??= [])`
   and lays the groove itself (`layTraveledWay(ctx, pts, { kind:
   'track_groove' })`), so the lane bakes into the ground chunks. Surfaced on
   `GeneratedLayout.tracks` → placed by `loadZone`. The **glacial heart**
   (`landmarkBuilders.ts`) is the debut author.
2. **ZoneTheme.tracks** — fixed rows for authored layouts (interiors, arenas).
3. **`World.tracksEnsure(specs)`** — the runtime seam (the creepEnsure idiom)
   for packages and boss beats. `World.addTrack` lint-refuses garbage and
   enforces `TRACK_CFG.maxRidersPerZone`.

## Riders and payloads

`registerTrackRider(def)` (rows in `data/tracks.ts`):

```ts
interface TrackRiderDef {
  id: string; kind: string;     // kind names its DOODAD_VISUALS painter row
  surface: { kind:'circle'; r } | { kind:'rect'; hw; hh };  // the HONEST hit shape
  orient?: 'lane' | 'radial';   // rect long axis with travel, or across it (a sweep arm)
  spin?: number;                // rad/s — folded into a rect's surface rot
  payload: TrackPayload; warnAhead?: number; color?: string;
}
```

The **payload** is the one moving-hazard grammar — every field an existing
engine lever: `hit` (typed, zone-level-scaled, through `mitigateTyped` — the
burst lane's discipline, never "true damage", prints its own number + capped
read), `status` (`applyStatus`), `impulse` (`pushActor` — weight-scaled,
impulse-additive, **pit-aware**: an owned shove past an abyss lip kills
through the pitfall fabric's forced lane *with credit*), `icdSec` per body,
`factions`/`notFactions` (the fog-grant grammar — the Rimebound skate their
own blades), `sparesAirborne` / `sparesDormant` (default true — fliers pass
over, planted sentries are scenery).

The same payload attaches to **static doodads** via `DoodadRule.contact` — a
bumper is a rider that never left home (`rime_bumper`: pure fling + slip).
`World.collectContactHazards()` re-scans after runtime plants.

## Readability — three guarantees

1. **The lane is carved**: gen lanes lay a `track_groove` way (clearway-
   protected: scatter can never squat on a blade's path); ensured lanes
   stroke live. Learnable before the blade arrives.
2. **The approach telegraphs**: the track layer strokes a warn band AHEAD of
   each armed rider along its actual future (pause turns and pingpong
   reversals included — the resolver is pure, so the future is exact), and
   `imminentThreatTo` surfaces the same approach to every dodge-mind. The
   player's eyes and the AI's read are one truth.
3. **Drawn == tested**: a rider's painter draws exactly its posed `HitShape`
   (the hitbox truth overlay outlines riders magenta); rect riders'
   painter beam params are validation-pinned to their surface. The steering
   veto is deliberately BLIND to riders (`fallHazardAt` — they are dodgeable
   hazards, not fall boundaries).

## Co-op

Lane **specs ride `ZoneMsg`** (one-shot, geometry is the whole wire); rider
**poses derive from the synced `world.time`** on both sides — zero
steady-state bytes, desync impossible by construction. `applySnapshot` now
interpolates the clock between snapshots exactly like actor positions, so
client-side riders (and every painter animation) glide at render rate.

## The debut: the Glacial Heart

Deepwinter's crystallized heart now grafts `glacial_heart` (instead of the
plain `frozen_lake`): a wobbled ice disc **hanging over the deep** — a chasm
moat (the pitfall fabric owns the falls: tundra's `pitfall:{kind:'descend'}`
drops a body one stratum into the under-ice dark, `rime_gallery`'s frozen
mere) crossed by two causeways, ice teeth baring the rim, a shear-disc ring
grinding a carved groove, a rime-flail rotor sweeping the dais, and rime
bumpers studding the floor. Every lane wears `ownerTag: 'winter_king'` — the
King's blades credit the King. He spawns AT the rotor (the smallest owned
lane marks the dais), wears the boss bar (`boss: true`, three ladder pips),
and his arena kit (`winters_sweep` / `call_of_the_deep` / `glare_ice`)
composes with the floor: shoves the ice keeps carrying, pulls that park you
in a blade's path, slick that makes both worse. His poise-folded weight is
his only shove insurance **on purpose** — break the poise and a knockback
build may hurl the King into his own deep; the fabric credits the shover and
the winter honestly breaks.

## Config

`TRACK_CFG` (`engine/tracks.ts`): `salt`, `icdSec` 0.9, `applyEvery` 0.1
(sweep cadence — the tunneling lint warns when a lane outruns its blade's
thickness per sweep), `warnAhead` 130, `threatHorizon`/`threatStep`,
`maxRidersPerZone` 24.
