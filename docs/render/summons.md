# Summon anatomy and legacy appearances

The summon refresh gives six creatures distinct anatomy within the existing
Canvas2D part system. Their monster definitions still own gameplay; looks own
only the visible body.

| Summon | Native look | Readable identity |
| --- | --- | --- |
| Amalgamation | `amalgam_stitched` | Uneven grafted limbs, stitched flesh, exposed ribs, multiple skulls and a second maw |
| Arcane Familiar | `familiar_pactbeast` | Pointed spirit-beast mask, curled tail and drifting pact runes |
| Cherub | `cherub_feathered` | Broad feathered wings, small face and halo |
| Spirit Mender | `mender_cradle` | Paired curved arms sheltering a luminous seed |
| Raging Spirit | `raging_deathmask` | Exposed skull, teeth and a trailing flame mane |
| Flame Sprite | `sprite_kindled` | Tapered fire body, flame wings and drifting embers |

The ordinary Spirit Wisp keeps its simple `spirit` body. Skeletons and reapers
keep their established identities. `amalgam_horror` is shared by the player's
The Amalgam and the Bonewright's creation, so both receive the new native body.
Enemy bodies do not inherit a player's Wardrobe choices.

## Composition

`src/data/summonLooks.ts` composes reusable parts, including existing skulls,
ribs, robes, halos, teeth and the golem kit's bound bones and fire masses.
`src/data/summonGlyphs.ts` adds grafted anatomy, familiar features, feathers,
cradling arms, spirit seeds and flame silhouettes as ordinary vector-op data.
The registries remain `LOOKS` and `GLYPH_PARTS`; no renderer branch recognizes
these monster IDs. These are reusable visual parts, not damageable sub-entities.

Body coordinates use +X forward and one unit per actor radius. Placement,
scale, rotation, reflection, palette roles and live motion are configurable.
Body parts bake once through the shared sprite cache; a small live-part list
adds motion using visual time. The same composition renders in the world,
Wardrobe and monster portraits. No new textures or external assets are required.

The changes preserve radii, collision shapes, materials, stats, AI and skills.
Amalgamation's existing consumed-minion size bonus scales the whole composition;
it does not add anatomy according to which minions were consumed. Any future
adaptive anatomy should be a separate data contract rather than an art-side
interpretation of gameplay state. Cosmetic selection consumes no simulation RNG.

## Preserved appearances

`src/data/summonCosmetics.ts` registers two freely included skill skins in the
Legacy Wardrobe collection, attributed to Hollow Wake:

- **Legacy Amalgamation** restores the original `gravemaw` body for The Amalgam.
- **Legacy Spirit Companions** restores the original `spirit` bodies for the
  Familiar, Cherub, Mender and Raging Spirit, plus the original `flame_elemental`
  Flame Sprite. It also covers Raging Spirits summoned through Spirit Pyre.

The original looks, color and material values remain intact. These use the
same `paint.summonBodies` contract as [Legacy Golems](golems.md): body ID maps
to look/color/material, while the cosmetic's skill list controls compatibility.
Separate Summon skins can still layer a palette over either body.

In **Wardrobe → Skill skins**, select a skill and its legacy skin, or use
**Original appearance** to choose its current native body. **Use account
default** restores inheritance. One skin can be the account default; per-skill
choices allow the Amalgamation and spirit legacy collections to coexist.
Choices save with the account and follow the summon owner's co-op appearance.

`cosmeticPreviewSummon` reads either ordinary summon delivery or the existing
`amalgam.monsterId` declaration. Thus the channel-release Amalgamation receives
the same live preview and body thumbnails as ordinary summons. Source selection
already resolves `summonInst`, the co-op cosmetic marker and `sourceSkillId`;
the channel's real source marker needs no engine special case.

## Verification

- `npm run check` and `npm run build`.
- `npm run probe -- cosmetics`: native/legacy part references, all compatible
  skills, entitlement, palette/body resolution, save overrides, real Amalgam
  consumption and growth, unchanged gameplay/RNG and co-op attribution.
- `npm run probe` and `npm run sim -- run --suite smoke`.
- `npx electron balance/summons-ui.cjs` after building: six native/legacy
  previews, Amalgam and Spirit Pyre selection, equip/inherit, disk reload,
  compact layout and actual world rendering. The hidden window uses disposable
  saves and writes comparison, Wardrobe and world PNGs to `balance/reports/`.
- `npx electron balance/cosmetics-ui.cjs` and `npm run smoke` cover the existing
  Wardrobe flows and boot alongside this focused check.
