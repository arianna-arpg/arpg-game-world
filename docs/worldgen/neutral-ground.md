# Neutral seamless foundations

Fresh expeditions use the neutral region `firm_sand` for the broad desert biome
and the shore elevation band. Both previously used native loose `sand`, whose
standing effect continually refreshes Mired and reduces movement speed to 60%.
The earlier wetland correction neutralized marsh foundations but missed sand.

Native loose sand and mud retain their status, path price, and step-off linger.
Sunken Caravan and Reed Wake remain localized hazardous sites; small wetland
pockets retain their existing body-wide bypasses. No global status reduction,
player exemption, terrain painting, or changed movement rule is involved.

The new material has normal native path cost and no standing effect. Fresh
saved ecology lists include it for desert and shore scenery, and fresh landform
interior/bypass and desert dressing lists accept it. The old implicit ecology
admission remains ground/sand only. Source identifiers, climate fields, terrain
version, colors and ground-palette selection are unchanged. The regular worker
material census includes the new material automatically.

Continue consumes the terrain and material lists in its saved descriptor.
Existing expeditions that saved broad loose sand keep that terrain; begin a new
expedition on a build containing this change to receive neutral foundations.
The additive material does not require a save reset.

## Verification

`balance/probe_worldmass_neutralground.ts` samples the actual composed fresh
terrain at 6,561 points per seed over a 48,000 by 48,000 unit area, at 600-unit
spacing. These are sampled area proportions, not measured player travel time.
The before and after runs use the same seed, run identity and sample coordinates.

| Seed | Walkable samples | Mired before | Mired after | After percentage |
| --- | ---: | ---: | ---: | ---: |
| 42 | 6,225 | 1,616 | 30 | 0.482% |
| 713 | 6,339 | 1,319 | 24 | 0.379% |
| 2026 | 6,391 | 1,931 | 23 | 0.360% |

The regression checks every fresh broad foundation against Mired, both sandy
surface families in each natural survey, 249 comparisons with the previous
saved material policy for unchanged geography/palettes, normal native movement
speed, unchanged scenery on both biomes, localized loose sand/mud, native linger,
and exact fresh/historical configuration and scenery after cold Continue.

The isolated built-client course `balance/neutral-ground-ui.cjs` uses fresh
seed 42 and naturally generated terrain, with controlled arrivals and no painted
route. Desert and shore each move 63.46 units in 19 frames with no Mired; native
Sunken Caravan sand moves 64.128 units in 34 frames with Mired. Saving and cold
Continue retain the neutral shoreline, player position, config and no Mired.
Screenshots and generated reports live under ignored `balance/reports/`.

Required checks: `npm run check`, `npm run genqa`, simulation smoke, the new
probe, climate, landforms/integrity/dressing/habitats, terrainpatches,
nativeregional and nativeseating, plus the client course against a built snapshot.
