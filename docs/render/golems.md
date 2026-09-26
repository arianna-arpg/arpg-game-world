# Golem materials and the legacy wardrobe

The five summonable golems share an assembled, heavy-handed silhouette. Their
material changes the anatomy as well as the palette:

- Stone: chipped, beveled blocks, broad stone fists, carved face and moss.
- Fire: tapered flame masses, a burning face, licking hands and drifting embers.
- Ice: faceted prisms, a crystalline face, jagged shoulder fans and cold breath.
- Blood: asymmetric clots, connecting sinews, wet highlights, veins and droplets.
- Bone: the familiar exposed ribs and skull, reinforced with bundled bone limbs.

`src/data/golemLooks.ts` composes the bodies through the existing part grammar.
`src/data/golemGlyphs.ts` adds reusable vector parts to `GLYPH_PARTS`; placement,
scale, material roles, surface details and live motion are all authored data.
The shared assembly helper only arranges parts and can be recomposed or bypassed
by another look. No renderer branch recognizes a golem ID. Geometry stays within
the existing sprite padding, and animations use the visual clock without RNG.
Monster radii, shapes, stats, skills, movement and summon contracts are unchanged.
The separate Bone Colossus, Vault Golem and Bauble Golem retain their own art.

## Original designs remain available

**Wardrobe → Skill skins → Legacy Golems** is included with every account.
Use it as the all-skills default to dress the five compatible golem skills, or
choose a specific summoning skill. An explicit **Original appearance** uses
the new native body for that skill; **Use account default** restores inheritance.
The Wardrobe shows the selected summon itself and previews before equipping.

The old `golem`, `golem_ice` and `bone_colossus` looks remain untouched, including
their live parts. The cosmetic captures the original color and material for
each golem. Optional Summon skins such as Verdant Kin still layer over that body;
clear that separate slot to see the exact original palette.

## Extending summon body skins

A `skillSkin` may supply `paint.summonBodies`, a map from monster definition ID
to `{ look, color?, material? }`. Its normal `skills` list controls compatibility,
equipment validation, filtering and per-skill/account-default resolution.
Unlisted bodies keep their own appearance, including other bodies produced by
the same skill. Unknown look IDs fall back to native art. Body replacements
explicitly copy only those three presentation properties.

`cosmeticSummonSkill` reads the summoning instance before the cap marker, so
item-granted followers and inherited offspring retain the real skill. The
renderer resolves equipment through the existing owner-chain resolver. Co-op
carries the resolved skill in `cosmeticSourceSkill`, separate from gameplay's
`sourceSkillId`; an absent field clears the prior visual source. Enemies,
mercenaries and foreign possessed bodies do not borrow the local outfit.
Existing account loadout/save validation needs no migration or new currency.

## Verification

- `npm run check` and `npm run build`.
- `npm run probe -- cosmetics`: free ownership, body references, native/default
  overrides, save round trips, real casts, item cap-marker separation, nested
  inheritance, co-op isolation and absent-field clearing.
- `npm run probe` and `npm run sim -- run --suite smoke`.
- `npx electron balance/golems-ui.cjs` after building: all five new/legacy
  previews, equip/inherit, disk reload, compact layout and world rendering.
  Its hidden window uses disposable saves and writes `golems-comparison.png`,
  Wardrobe and world captures under `balance/reports/`.
- `npx electron balance/cosmetics-ui.cjs` and `npm run smoke` cover the existing
  Wardrobe categories and normal boot alongside the focused check.
