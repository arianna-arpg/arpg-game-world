# Caster visual vocabulary

This pass distinguishes a caster by its faction and casting implement before
color or spell effects enter the picture. The Deep's Tidecaller now carries a
conch on a shell-backed, gilled body with branching coral and trailing tentacles.
Its existing frostbolt/nova kit and combat stats are unchanged.

## Reusable parts

`src/data/casterGlyphs.ts` joins the shipped glyph roster in `glyphParts.ts`.
These are ordinary Part Forge vector operations, available through the existing
`PART_PAINTERS` picker, without a new renderer or external image assets.

| Part kind | Visual role | First uses |
| --- | --- | --- |
| `conchFocus` | Spiral shell tapering to an open, luminous mouth | Tidecaller, Tide Vicar |
| `coralCrown` | Branching reef growth with pale tips | Tidecaller |
| `prayerChimes` | A bowed rack of suspended teeth and one struck coin | Glacier Shaman, Obol Cantor |
| `astrolabe` | Intersecting elliptical frames around an open center | Ephemerist |
| `ritualFan` | Broad ribbed fan, with a scalloped inner band | Scentweaver |
| `kilnMantle` | Four open charcoal vents around the shoulders | Ash Wretch |

Placement, rotation, scale, alpha and mirroring use the existing `PartSpec`
fields. Glyph operations choose palette roles individually: for example the
conch uses bone, accent, dark and glow together. Edit those roles in the Part
Forge when recoloring individual surfaces. The chimes have a small deterministic
sway when placed in `live`; the remaining new glyphs belong in baked `parts`.
Decorative motion does not represent a cast timer, aura or hit surface.

The Tide Vicar retains its drowned vestments and censer, but replaces the staff
with a conch. The Glacier Shaman retains its antler crown and gains a fur ruff
and frost-bone chimes. The Ash Wretch gains open vents and charcoal cracks; the
Smoulderkin remain reserved under their existing world-entry policy.

## New entities

Definitions live in `src/data/casterMonsters.ts`, compositions in
`src/data/casterLooks.ts`. All three use existing skills, AI and faction rules.

| Entity ID | Faction | Role and counterplay | Natural entry |
| --- | --- | --- | --- |
| `river_obol_cantor` | Riverbound | A coin-eyed soul singer with a chime rack. Soul Volley sustains it; Keening Shriek threatens a close frontal approach. Fragile life beneath a small energy shield. | River of Souls packs and faction roster; presence rises from zero at level 4 to full at 7. |
| `bloom_scentweaver` | Bloomkin | A stem between two broad leaf fans. Root Grasp threatens stationary targets; Pollen Puff punishes close approaches. Low life and a fire weakness. | Garden packs and faction roster; presence rises from zero at level 4 to full at 8. |
| `starfall_ephemerist` | Starfall Court | An orbital frame with a crystal heart and drifting fragments. Stasis Lock controls a target while Starfall Shard supplies ranged pressure. Low life under a rechargeable shield. | Existing Starfall event faction roster; presence rises from zero at level 6 to full at 10. |

Faction definition counts before this pass were Riverbound 5, Bloomkin 8 and
Starfall 7; each gains one. These counts include each faction's existing
fixtures, and are not pack sizes. Spawn weights are modest (1); presence lives
on the definitions so faction and biome tables use the same arrival curve.
The Magpie Kin, Smoulderkin and Unrusted were considered but retain their
reserved status; adding natural spawns for them needs their promised systems.

## Verification

- `npm run check`
- `npm run probe -- anatomy` (skill existence, AI hints, mana budgets and part resolution)
- `npm run sim -- run --suite smoke`
- `npm run genqa -- --seeds 2 --filter garden`
- `npm run genqa -- --seeds 2 --filter river_of_souls`

The local study in `balance/reports/caster-study/` compares four old and new
looks and all three additions through the real portrait compositor and body
bakes, with native-size samples. Its raw part compositions check sprite padding
at two radii and three pose times. A seeded local combat check also observes
both skills executing on each new entity through `updateAI` and `World.update`,
at close and ranged distances, without resetting their mana or cooldowns.

These are functional and visual checks, not a full balance pass. In particular,
the Ephemerist's control pressure should be judged in mixed Starfall packs.
