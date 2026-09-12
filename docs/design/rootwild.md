# The Rootwild

The Rootwild is a crownless faction of mobile carnivorous plants. It occupies
the wild botanical space beside the garden's Bloomkin, the Sylvan court and
the fungal families: seed husks, hinged leaves, pitchers, sticky tendrils and
woody fruiting bodies. Each silhouette is an organ with a combat purpose.

## Eleven bodies

| Entity | Role and appearance | Encounter response |
| --- | --- | --- |
| Burrling | A small hooked seed husk on rootlets; swarms in groups of two or three. Burr Rake leaves a shallow two-second bleed. | Clear the small pursuers before committing to a stationary caster. |
| Hingejaw | A toothed flytrap rosette that stirs when approached. Its slow body carries a narrow, committed frontal bite. | Step around the hinge during the wind-up. |
| Sourpitcher | A ribbed pitcher with an exposed wet throat and lid. Spills delayed digestive pools at range. | Leave the marked patch before the one-second ground warning ends; pools last three seconds. |
| Sundew Beckoner | A pink rosette surrounded by stalks tipped with sticky dew. Places small control patches. | Avoid the 0.8-second warning; the patch dries after two seconds, and each snare lasts only 0.45 seconds. |
| Coppice Matron | A large split woody seedcase with pale seeds and hanging burrs. Releases two Burrlings per cast, capped at four, and uses Heavy Strike up close. | Reach the source and stop replenishment while keeping an exit through the brood. |
| Thornfan | A rigid fan of pointed leaves throws three spreading thorns. | Cross the gaps, then close on its fragile root. |
| Nectar Bell | Three golden trumpet flowers heal one wounded ally for 18 life plus 4% of maximum, with a seven-second cooldown. | Prioritize the bell before committing damage to its tougher companions. |
| Brambleback | Broad overlapping sepals form a thorny frontal rampart; a 55-point directional shell regrows after five seconds without a hit. | Flank its 110-degree shield or break the shell, then punish its slow body. |
| Windseed | Paired papery samara wings carry a small airborne seed that sheds slow, piercing blades. | Sidestep the blade and catch its circling flight. |
| Hookvine | Long hooked creepers surround a small trap mouth. Vine Lash reels prey toward a Hingejaw Snap. | Dodge the creeper and move around the bite during its wind-up. |
| The Rhizarch | A large flowering seedcase with thorns, grasping roots and a visible heartwood cavity. It raises a bounded brood and heaves warned ground; at half life its cast speed rises 15%. | Keep moving off the swelling soil, clear the brood and exploit the boss's slow movement. Found only as the Seedbed Hollow objective. |

Definitions live in `src/data/rootwildMonsters.ts`; compositions in
`rootwildLooks.ts`. All bodies use material `verdant` and the `plant` tag.
Their limbs and seed ornaments are decorative; each remains one combat body.
The Matron is a supporting elite. The Rhizarch is a den boss, excluded from
field rosters and warlord selection.

Field bodies range from 30 to 180 base life; the Rhizarch has 650. Their
initial tuning gives pursuit to the Burrling, mobility to the Windseed and
readable commitment to larger plants. Combat validation establishes working
attacks and counterplay; it is not a full progression balance sweep.

## Nine arts through the shared engine

`src/data/rootwildSkills.ts` registers **Burr Rake**, **Hingejaw Snap**,
**Pitcher Spill**, **Sundew Glaze**, **Coppice Seedfall**, **Thornfan Volley**,
**Nectar Mend**, **Samara Shear** and **Rhizarch Upheaval** in `SKILLS`.
They use existing melee, projectile, ground, healing and summon deliveries;
no engine changes. Brambleback reuses Lashing Roots; Hookvine uses Vine Lash.
They are enemy arts (`noDrop`), available through the existing mimicry path.

The Burrling's bleed is authored at identity strength so the enemy ailment
policy keeps it. It has low magnitude and a short duration. The pitcher and
sundew use warned opening impacts followed by lingering ticks: `noImpact`
would begin those zones immediately and skip the desired warning. The
pitcher's artillery hold distance is explicitly 240, within its 350 AI
range, so it does not retreat beyond the range of its own cast.

## Where they grow

The ten field entities live under `FACTIONS.rootwild`. Burrlings remain
eligible from level one, preventing an empty early roster from falling back
to unshaped weights. Other bodies fade in to full weight at levels 5–13,
with presence authored on the definitions so every spawn path agrees.

| Habitat | Natural pack additions |
| --- | --- |
| Forest | Burrling and Thornfan (weight 2 each); Hingejaw, Coppice Matron, Brambleback, Windseed and Nectar Bell (1 each). |
| Jungle | Hingejaw, Hookvine, Sourpitcher and Windseed (1 each). |
| Mire | Sourpitcher, Sundew Beckoner, Hookvine and Nectar Bell (1 each). |
| Garden | Windseed and Nectar Bell (1 each), among the existing cultivated flora. |
| Rootways | Burrling (2), Hingejaw and Coppice Matron (1 each), among the underground roots. |

`src/data/rootwildHabitats.ts` supplies two discoveries through the standing
lair and sidezone registries:

- **Feeding patches:** mixed groups of three or four plants in forest, grove
  and jungle biomes, with a hard level-eight floor and 16% placement roll.
- **The Seedbed Hollow:** a root-framed den mouth in forest, grove, marsh and
  jungle biomes, with a hard level-fourteen floor and 20% placement roll.
  The rootways interior carries three or four packs of two or three plants,
  a Nectar Bell, and the Rhizarch boss objective. All ten field plants can
  appear in the den. The pocket cannot grow deeper doors.

Landmarks request reachable placement and use ordinary procedural siting;
these percentages are placement rolls, not guaranteed encounters. Additions
populate newly generated areas; already remembered zones retain their contents.

The faction has
baseline context, territorial temper, low roaming appetite and forest home
affinity. It has no warlord or new hostile faction pairs. Monster and nemesis
names use the existing verdant naming pools.

## Twelve botanical parts

`src/data/rootwildGlyphs.ts` registers `rootStriders`, `spearLeaves`,
`burrHusk`, `trapLobes`, `pitcherCup`, `dewCroziers`, `splitSeedcase`,
`thornSprays`, `nectarBells`, `sepalRampart`, `samaraWings` and `hookCreepers`.
Every part is ordinary Part Forge vector data with placement, scale,
mirroring and palette roles. Existing bark, polyps and spore accents finish
the compositions. No raster assets or custom rendering branches are used.

## Hood correction and Depth Seer

The earlier Bandit wrap was removed. Pit Champion, Warband Skald, Bandit
Bruiser and Bulwark Thane now retain their original equipment compositions
with the existing `hood` part at the standard Bandit placement and scale.
This is the familiar dark opening and curved cowl lip, with no eye slits.

Depth Seer receives a dedicated look in `kinshipLooks.ts`: a large pale
pressure eye above gills, fins and trailing sensory feelers. Its new
`pressureLens` glyph lives in `kinshipGlyphs.ts`. Frostbolt, stats, movement
and faction context remain unchanged. The 31 non-Bandit entities from the
previous pass retain both their definitions and their looks.

## Verification

- `npm run check`: game, launcher and simulation type checks.
- `npm run probe -- anatomy`: 47 assertions passed.
- `npm run probe -- lairs`: 624 assertions passed.
- `npx tsx balance/probe_rootwild.ts`: every carried skill casts under live
  AI; healing, bleeds, snares, both four-body brood caps and the boss phase
  occur. The same probe checks habitat eligibility, level floors,
  deterministic mouth/feeding-patch placement, den minting, live natives
  and completion after defeating the Rhizarch. Registered in the probe gate.
- `npm run sim -- run --suite smoke`: 25 episodes.
- Generation QA: forest 12, jungle 18, mire four, garden six and rootways
  three cases, each with two seeds;
  zero failures or warnings.
- Seeded live AI lanes execute every carried skill and deal damage. Burrling
  bleed and Sundew ensnare are observed; the Matron reaches exactly four
  living summons. The low-level roster, biome entries and crownless policy
  are checked alongside unchanged existing entity data.
- Isolated normal casts verify warned ground starts, expiration and safe
  departure: leaving each marked patch before activation avoids all damage.
- Actual portrait and native-size body review: sixteen looks, two radii and
  three pose times produce 96 nonempty renders inside sprite padding.

The ignored local studies in `balance/reports/rootwild-study/` and
`balance/reports/rootwild-expansion/` contain roster sheets, hood/Seer
comparisons, reusable parts, snapshots and initial combat results.
