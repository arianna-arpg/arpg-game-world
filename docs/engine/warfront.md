# THE WARFRONT — the Underworld's active front (Bhorog's siege-works)

One thesis: where the wasteland is the WOUND the war leaves, the Warfront is
the war HAPPENING — live trebuchet batteries raining shellfire zone-wide
until silenced, ground pocked with craters old and fresh, grind-columns
marching the ways, and the worst-hammered ground torn into riftscar pockets.

File map: kit `src/data/warfront.ts` · painters
`src/render/vis/paintersWarfront.ts` · faces `src/data/tilesets.ts`
(grindfields / siegefront / ordnance_yard) · kin `src/data/monsters.ts` (THE
WARFRONT'S SIEGE-WORKS block) · den door `src/data/sidezones.ts` · the
barrage `docs/engine/bombardment.md` · probe `balance/probe_warfront.ts`.

## Where the country grows

Hell-only (the caul pattern): `BIOMES.warfront` carries no climate row and
no `BIOME_FIELD` weight — it seats in the underworld dimension's palette
(`world/dimensions.ts`, weight 3) under the demon patron, with the crater
landmark family (crater 0.45 / sinkhole 0.12) pocking the country at
worldgen scale.

- **grindfields** `{to:.62}` — the shelled approaches: pock-strata (noise
  where-bands — the craters CLUSTER where barrages walked), wrecked engines,
  stake belts, a thin rain. Variants: Shelled Downs (crater country proper),
  Stake Lines (gabion trenches + gore-stakes).
- **siegefront** `{from:.42}` — the active line: batteries dense, kegs and
  shot stocked, standards pacing the ways, battle-smoke (dread_pall).
  Variants: the Gun Line, Muster Grounds (war_camp / muster_fence reuse).
- **ordnance_yard** — the den (frontier:false, perfProbe, sheltered; the
  `powder_magazine` trigger door in both frontier faces): dungeon-rolled
  works where the guns are BUILT. Boss `ordnance_master` — break the
  `shot_rack` on his back and his cannonade starves. `ordnance_yard_entered`
  is the gateway seam; the Siegecraft pool row (`meta/unlocks.ts`) reads it.

## The signature objective

Both frontier faces weight `spawners` HIGHEST with
`spawnerId: 'hell_trebuchet'` — "destroy the engines" IS the biome: the
guns place at POIs (often inside their own authored `gun_pit` clusters),
each runs its own bombard clock, and the zone quiets exactly as fast as you
silence it. Small pack-row presence keeps a stray gun guarding works in
non-spawner zones.

## The furniture (all data; painters in paintersWarfront.ts)

`shell_crater` (GROUND pock — generation strata AND live impact dress share
the one kind/painter), `gabion` (waist-high burnable rampart), `siege_shot`
(ember-seamed ammunition, the shotHopper part painter's ground twin),
`siege_wreck` (hard cover, sight-shadow), `war_standard` (Bhorog's Ξ mark;
demon_banner stays invasion weather-dress), `powder_magazine` (the den
door). Formations `trench_line`/`standard_row`; clusters
`gun_pit`/`munition_dump`/`riftscar` (all POI); compositions
`siege_works`/`riftscar_pocket` + wasteland's `powder_cache`/`war_camp`/
`fallen_colossus` reused.

## The kin (faction 'demon' — Bhorog's roster fields them war-wide)

`hell_trebuchet` + `trebuchet_arm` (the break-lesson), `grind_bannerman`
(column lead — banner/helm/plates look), `ordnance_master` + `shot_rack`
(the den boss pair), `hellbore_engine` (the player's own gun). New part
painters: `trebuchetRig`, `trebuchetArm`, `shotHopper`. The `war_column`
zone event (biome-gated via the new `EventContext.biome` lever — hell has
no faction OWNER to read) marches a bannerman-led column down the PATROL
grammar's waypoints.

## Verification

`balance/probe_warfront.ts` (57 checks): the hell-only seat, the staging
tallies, every furniture contract (rule + visual + painter), the den chain +
pool row, Bhorog's roster, the event's biome gate, the skill/gem shapes —
and the fabric laws LIVE (opening, cadence, target, sky posture, comet
fields, impact dress + cap, THE SILENCE LAW, the assist law, the
siegebreaker exact-ratio fold). `npm run genqa` sweeps the three faces'
generation invariants; the den auto-joins `npm run perf`.

## Deliberate deferrals

Per-dimension weather ("ashfall below") stays unbuilt — WeatherField is a
surface-global; the biome's atmosphere rides ambientFx/fog/ground instead.
The lob comet draws only for storm strikes (ground/projectile lobs can opt
in later). Trebuchet batteries as WORLD-map siege events (the hellWar
strike grammar) are a future round — the war overlay already fields the
kin; only the map-scale set-piece is unspent.
