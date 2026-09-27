# Skeletal schools and the Ossuary Lich

The four skeletal mage schools formerly shared the same crowned `lich` look,
as did their ascended Ossuary Lich. Each now has distinct equipment and an
exposed skeletal frame. Only the look references in `necromancerMinions.ts`
change; skills, stats, colors, materials, radii and collision shapes remain.

| Body | Native look | Identity |
| --- | --- | --- |
| Skeletal Pyromancer | `mage_cinder_scholar` | Scorched cowl, fire bowl and burning staff |
| Skeletal Cryomancer | `mage_rime_scholar` | Frost collar, long crystal spear and cold breath |
| Skeletal Stormcaller | `mage_storm_scholar` | Conducting shoulder prongs and forked focus with a small live arc |
| Skeletal Venomancer | `mage_venom_scholar` | Beaked mask, paired vials and suspended retort |
| Ossuary Lich | `lich_ossuary_regent` | Broad burial mantle, bone diadem, shoulder skulls, grimoire and skull staff |

`skeletalMageLooks.ts` composes the existing skull, ribs, book and staff parts
with the golem kit's bones, flame masses and frost shapes. Its small `scholar`
helper lays out a common frame while each caller supplies equipment and motion.
`skeletalMageGlyphs.ts` contributes twelve reusable garment, mask and focus
parts through `GLYPH_PARTS`. Geometry, palette roles and animation are ordinary
data. These are visual parts, not independently damageable entity components.
No new painter branch, image dependency or monster-specific rendering code is
needed. World bodies, thumbnails and portraits all use the existing baker.

The new art is attached to the five monster definitions, so all sources share
it. The generic `lich` look and other monsters using it remain unchanged.

## Legacy appearances

**Wardrobe → Skill skins → Legacy Skeletal Mages** is free for every account,
attributed to Hollow Wake and registered by `skeletalMageCosmetics.ts`.
It restores all five original `lich` bodies with their original school colors
and bone material, through the existing `paint.summonBodies` contract.

The skin supports both **Summon Skeleton Mage** and **Summon Skeleton Archer**,
whose Unstrung Sorcery branch raises the four mage schools. An ordinary archer
has no replacement in the skin and keeps its own body. Source attribution,
account defaults, per-skill overrides, save validation and co-op use the same
resolver as [the previous summon refresh](summons.md). Separate Summon skins
may still layer their palette over either body.

## Previewing multiple forms

The Wardrobe offers **Preview form** when a skill has more than one authored
summon body. `cosmeticPreviewSummons` gathers the base `monsterId`, weighted
`pool` members, `amalgam.monsterId`, and summon body/pool declarations from
the shared `treeGraph` fold. This supports both graph and sugar-form trees.
It deduplicates IDs, omits unavailable definitions and preserves authored order.
The first base form remains the default; stale or foreign choices fall back.

The selector changes only the preview and its skin thumbnails. It does not
allocate tree nodes, bias the random pool, change equipment or save a gameplay
choice. All authored tree forms can be browsed regardless of allocation.
Changing skills or categories resets the selected form; changing skins retains
it. The preview remains isolated to summon art even with other outfit slots set.

## Verification

- `npm run check` and `npm run build`.
- `npm run probe -- cosmetics`: all five native/legacy bodies, preserved
  palettes and dimensions, preview pool/tree coverage, incompatible/foreign
  fallback, ordinary archer isolation, save overrides and real random/ascendant/
  archer-tree casts with identical gameplay and RNG under both appearances.
  The same real casts check source identity and peer appearance resolution.
- `npm run probe` and `npm run sim -- run --suite smoke`.
- `npx electron balance/skeletal-mages-ui.cjs` after building: all five form
  previews and thumbnails, native/legacy selection, preview-only state, original/
  inherit semantics, source isolation, disk reload, compact layout and world
  rendering. It uses a hidden window and disposable saves; captures go under
  `balance/reports/skeletal-mages-*.png`.
- The existing `balance/cosmetics-ui.cjs`, `balance/summons-ui.cjs` and game
  smoke checks guard the wider Wardrobe and earlier summon previews.
