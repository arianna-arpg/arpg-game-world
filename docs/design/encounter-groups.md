# Mixed encounter groups

Encounter recipes make ordinary faction packs into tactical compositions. The
engine draws a roster, seats the entire group, and gives its members the existing
squad behaviors. Combat still uses ordinary skills, defenses, healing, bonds,
movement tethers and monster loot. There is no separate encounter combat engine.

## Where they appear

`src/data/encounterGroups.ts` owns 35 recipes across 13 factions. Levels below
are hard minimums; required species must also pass their own presence rules.
The habitat arrays in that file are the exact, editable terrain allowlists.

| Faction | Recipes (minimum level) | Habitat theme |
| --- | --- | --- |
| Bandit | Toll Collectors (6), Wayward Expedition (8), Powder Line (10), Veteran Expedition (18) | Settlements, farmland, sewers, highlands |
| Goblin | Shaman Skirmish Cell (4), Demolition Crew (8), Gnasher Yard (9), Taskmaster Muster (16) | Uplands, tundra, cinder country and magma caves |
| Gnoll | Spear Net (6), Matron Hunt (9), Pyre Raiders (15) | Woods, plains, dunes and dry coasts |
| Undead | Ossuary Patrol (5), Graveside Watch (6), Lich Retinue (18) | Crypts, ossuaries, catacombs and burial country |
| Sylvan | Rooted Choir (6), Grove Sentinels (8) | Forest, jungle, groves and overgrown ruins |
| Rootwild | Feeding Patch (5), Nectar Patch (9), Drag Garden (12), Seedbed Wardens (16) | Forest, jungle, mire, petal fields and rootways |
| Demon | Ashen Post Detail (8), Tormentor Hunt (12), Infernal Battery (14) | Infernal territories; posted hounds restricted to steppes, grindfields and wasteland |
| Formic | Escorted Foragers (5), Glue Brigade (10) | Colony gardens, undergrowth and formicaries |
| Bloomkin | Flower Guard (8), Perfume Ambush (12) | Petal fields, stalkwoods and tended rows |
| Rimebound | Winter Hunt (9), Rime Battery (15) | Taiga, tundra and snowy crowns |
| Coilborn | Venom Procession (10), Molting Court (14) | Wet coasts, marshes and geothermal flats |
| Sarcophate | Canopic Detail (11), Canopic Hunting Court (16) | Desert courts, salt flats and sepulcher sands |
| Beastkin | Horncall Hunt (10), Earthshaker Raid (15) | Forest, taiga and mountain country |

The tether audit also adds Rootlash Snapper directly to forest/jungle terrain
tables at level 4, and Gravebound Shade to the crypt table at level 6. Both keep
their faction-table routes. Rootwild's tethered trio retain their natural forest
and jungle tables, faction pool and rootway habitats. The authored Ashen Kennels
retain their guaranteed keeper and three posted hounds; ambient Ashen Post
Details now provide a smaller relative of that encounter in open infernal land.

## Selection and difficulty

`World.spawnPacks` first makes its normal species and rarity selection. A normal
pack may be replaced by an eligible recipe from that species' faction. The
default replacement chance is 28%, in `ENCOUNTER_GROUP_CFG`. This consumes an
existing pack slot, rather than adding another pack. Rare and magic selections
keep their own paths; grouping grants no implicit rarity or stat multiplier.

`PackSpec.encounterGroups` is inherited through the existing zone/tileset pack
data. Leave it absent for the default faction pool; use `false` to disable it.
Authored cohorts opt out unless this field explicitly opts in. An explicit pool
replaces the default, and an empty pool means none:

```ts
encounterGroups: {
  chance: 0.4,
  maxMembers: 6,
  table: [
    { id: 'wayward_expedition', weight: 3 },
    { id: 'wayward_veterans', weight: 1, presence: { from: 22 } },
  ],
}
```

The faction and all supplied habitat axes must match. `minLevel` is a hard
floor; recipe/slot/alternative/species presence curves can soften weights or
unlock optional roles on top of it. A wholly gated table remains empty, with no
fallback that leaks advanced crews into early zones. `maxMembers` rejects a
recipe whose maximum possible roster exceeds the cap, preserving required roles.
The global safety cap is eight. Advanced recipes debut progressively through
level 18; veteran outriders unlock at 20, with ronin alternatives at 22.

## Authoring another composition

Each `EncounterGroupDef` provides an ID, name, description, faction, weight,
minimum level, optional presence and habitat gates, member slots, shared tactics
and an optional seating radius. Members name a stable `slot` and descriptive
`role`, either a monster or weighted alternatives, optional count/presence,
formation offsets, and optional tactic/stat overrides. Exactly one required,
single-body slot leads the group. All members belong to its faction.

Formation coordinates use `forward` toward the approach and perpendicular
`side`; repeated bodies spread around that slot using `spacing`. These positions
establish the encounter. Subsequent movement belongs to normal AI. A healer can
retreat, a protector interposes, hunters surround, and tethered plants remain
bound to their roots regardless of squad formation requests.

Tactics merge into a fresh per-actor brain, leaving species definitions intact.
Use existing `BrainTuning`: focus leader, formation, surround, attack tokens,
idle behavior and leader-loss reactions all remain composable. Slot modifiers
use the attributable sheet source `encounterGroup:<recipe>:<slot>`. Reapplying
membership does not stack them. Capture or faction/team changes clear membership,
its stat source and its brain overlay.

The four new rival adventurers in `encounterAdventurers.ts` demonstrate actual
roles: shield/challenge/cleave Vanguard, healing Mender, fire/frost Arcanist and
repeater Scout. Their visuals reuse the established humanoid look library.
The leader's displayed name includes the encounter name. Drilled groups scatter
when their leader dies; hunting packs become frenzied; rooted beds keep their
territory. The recipes choose these existing squad policies as data.

Events and other code can call the same spawner:

```ts
const members = world.spawnEncounterGroup('ashen_posts', world.zone.level, at, {
  tier: 0, facing: Math.PI / 2, persistent: true,
});
```

This still respects habitat, level, species presence and size gates. All bodies
must fit walkable, connected ground on one story within the recipe's radius,
without overlapping each other or solid scenery. Bounded placement retries are
configurable. Failure returns `[]` before any member enters `world.actors`; the
ambient caller then uses its original pack. This API does not create an authored
map marker or an event automatically. Callers control those existing systems.

## Persistence and verification

Persistent members save their recipe, slot, group ID and existing monster state.
Revisits restore only survivors, remap group IDs, and rebuild tactics without
promoting a replacement leader. Old saves without group metadata remain valid.
Co-op snapshots carry group identity and clear stale membership when it ends.

Boot validation checks recipes, role membership, terrain references and pack
configuration. `balance/probe_encountergroups.ts` covers all 35 rosters and
natural faction sources, hard debut and habitat gates, alternatives, deterministic
plans, invalid settings, atomic refusal, real ambient replacement, authored
isolation, live guard/heal/damage, leader loss, save/revisit, co-op cleanup and
keeper/tether continuity. The isolated hidden client harness
`balance/encounter-groups-ui.cjs` renders four representative groups after a build.

These are initial difficulty tunings. The checks establish composition and
mechanical behavior; comparative combat balance across every recipe and player
build remains a playtesting task.
