# Demon host visual vocabulary

The War Below's eight existing hosts provide the visual direction for this
pass. Their doctrines appear in anatomy and ritual equipment, extending the
faction's strong existing demons to its more generic casters and soldiers.
These are compositions in the existing entity kit, with no new rendering path.

## The eight hosts

| Host / lord | Visual language | Refreshed looks |
| --- | --- | --- |
| Pyre Host / Surtash | Heat inside fractured, charred bodies; furnace vents and exposed teeth | Cinder Fiend, Searing Spawn |
| Chain-Levy / Vormaul | Collars, disciplined armor and brutal horned faces | Vormaul's marshal |
| Carrion Court / Morgrath | Ragged flesh, barbs and hooked mouths | Abyssal Flayer |
| Host of Doors / Vethriss | Horns framing an open gateway; oversized grasping hands | Finger Mage, Hellgate Caller, Vethriss and marshal |
| Final Choir / Ozrimoth | Ribbed organ throats, exposed jaws and ceremonial crowns | Unmaker Acolyte, Ozrimoth and marshal |
| Hushed Host / Nyxara | Blind pale faces with sealed mouths; folded wings and veils | Hushmaiden, Veil Stalker, Nyxara and marshal |
| Iron Grind / Bhorog | Siege armor, ram horns and tusks | Siege Hulk, Grind Bannerman |
| Tithe Legion / Molochai | Bone racks suspending chained coins over vault-like bodies | Molochai and marshal |

The Demon Lord, Pyre Titan, Archfiend Legate, Brimstone Cantor, Bloodgorger,
Morgrath and the already distinctive martial lords retain their designs.
The resulting 19 refreshed looks live in `src/data/demonLooks.ts` and join
`LOOKS` through `src/data/looks.ts`.

Common troops can be conscripted by several hosts under the existing war rules.
Their anatomy communicates a species or ritual office; it does not assert
current allegiance. Lord and marshal designs carry the strongest family
resemblance. Existing marshal banners remain. This pass adds neither dynamic
allegiance skins nor new factions.

## Reusable parts

`src/data/demonGlyphs.ts` exports six ordinary Part Forge glyphs, registered in
`src/data/glyphParts.ts` and available through the existing part painter picker.

| Part kind | Shape / purpose |
| --- | --- |
| `riftHorns` | Paired pale crescents framing a gateway |
| `graspingHand` | A palm, four long jointed fingers, thumb and nail tips |
| `sealedVisage` | Smooth blind face with a stapled mouth |
| `infernalJaw` | Hooked tusks and exposed teeth |
| `sermonPipes` | Three ribbed organ pipes ending in dark mouths |
| `titheRack` | Bowed bone frame, chains and five suspended coins |

Use ordinary `PartSpec` placement, rotation, scale and mirroring to compose
these parts. Glyph operations assign palette roles or explicit colors per
surface. Existing wings, tentacles, banners, armor, flames, veils and the caster
pass's `kilnMantle` supply the rest of the vocabulary. Decorative limbs and
equipment do not create hit surfaces, auras or cast telegraphs.

Finger Mage now uses `demon_finger_mage` and Searing Spawn uses
`demon_searing_spawn`; the generic ritual mage and flame elemental looks remain
available. Finger Mage's legacy tentacle adornment is removed so it does not
obscure its composed hands. All nonvisual monster fields remain unchanged.

## Verification

- `npm run check`
- `npm run probe -- anatomy`
- `npm run sim -- run --suite smoke`
- Compared all 19 affected definitions with their pre-pass snapshot: identical
  fields apart from `look` and decorative `adorn`.
- Reviewed portraits, body bakes and native gameplay sizes using the real
  compositor in the local `balance/reports/demon-study/` study. Its default
  view compares eight examples; `?courts` shows all eight lord/marshal/troop
  families, and `?details` covers four additional changes.
- Checked all 19 compositions at two radii and three pose times: 114 nonempty
  renders, all within the body sprite's padding.

The study and its snapshots are local, ignored review artifacts. Changes to
combat balance, spawn tables and host selection are outside this visual pass.
