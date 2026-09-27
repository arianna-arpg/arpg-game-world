# Silken kin

Five members of the spider family now use jointed anatomy and silk structures.

| Creature | Native look | Identity |
| --- | --- | --- |
| Spiderling | `spider_skitterling` | Small pear abdomen, compact thorax, fine reaching legs and paired fangs |
| Broodmother | `spider_broodcarrier` | Braced legs, heavy abdomen, pale silk-wrapped brood and large mouthparts |
| Orb Weaver | `spider_orbweaver` | Long front legs, round abdomen, pale dorsal chevrons and exposed spinnerets |
| Widow Matron | `spider_redwidow` | Broad dark abdomen, red hourglass, long side legs and hooked fangs |
| Spider Nest | `spider_silkcradle` | Clustered eggs in an irregular woven cradle with radial silk anchors |

Only these five native `look` references change in `monsters.ts`. Their radii,
scale variance, materials, palettes, skills, AI, taming tags, web effects,
brood spawning, costs and rewards retain their existing definitions. The nest
is still an ordinary stationary actor. Its drawn web is decorative anatomy;
the existing web skill continues to determine actual snares.

## Reusable parts

`arachnidGlyphs.ts` registers twelve ordinary parts through `GLYPH_PARTS`:
`arachnidLeg`, `bracedSpiderLeg`, `spiderThorax`, `pearAbdomen`, `orbAbdomen`,
`dorsalChevron`, `spiderFangs`, `spinneretFan`, `silkBrood`, `widowMark`,
`silkCradle` and `silkAnchors`.

Each mobile look places four independently sized/rotated pairs of legs.
The thorax, abdomen, mouthparts, spinnerets, marks and brood are separate
placements. They can be borrowed by future creatures or combined with other
families. Parts use the existing transform, palette and opacity grammar;
the hourglass uses its placement color, so it remains freely recolorable.

The shared glyph interpreter now honors placement color/role for operations
without their own role. Explicit operation roles and colors retain their
authored accents. Previously it ignored placement overrides. This applies to
all glyph parts, including earlier kits, with no per-creature special case.

These are vector part compositions baked into the standard body sprite.
Existing body motion, facing, breathing and actor overlays remain in use.
There is no spider-specific renderer, external asset, runtime dependency or
new damageable limb hierarchy.

## Retained appearances

**Wardrobe > Skill skins > Legacy Spiders** is free starter content credited
to Hollow Wake. It restores all five old compositions for Tame Beast bonds,
and the old Spiderling for Lay Brood Egg hatchlings. The former `spider_small`,
`spider_big`, `orb_weaver`, `widow_matron` and `spider_nest` looks remain intact.
The brood-egg construct itself retains its existing `brood_egg` appearance.
Wild actors keep their native looks regardless of the viewer's cosmetics.

The shared cosmetic source resolver now honors an instance's existing
`hostSkillId` before its payload definition. Pod hatching already stamps this
field; its offspring therefore read Lay Brood Egg's choice rather than the
hidden hatch payload's ID. Gameplay source/cap markers remain intact. Peers
receive the resolved source through the existing cosmetic snapshot field.
No new wire or save field is introduced.

Wardrobe preview discovery follows authored construct hatch payloads, with a
visited set to stop cycles and graceful handling of missing definitions.
Tame Beast's catalogue combines eligible mapped bodies from multiple skins.
Selecting a skin retains a compatible preview form or starts on that skin's
first eligible form. Each card similarly shows a relevant mapped body.
Players can still explicitly browse an unmapped form and see its native look.
Preview choices do not select gameplay pets or save equipment automatically.

## Verification

- `npm run check`, `npm run build`, normal probe gate, balance smoke and game smoke.
- `probe_cosmetics.ts` covers all part/look references, exact legacy mappings,
  free ownership, per-skill native/default choices, incompatible skills,
  skin-specific preview fallback and cyclic hatch references.
- A recorded-paint check verifies placement color precedence, dark/metal role
  selection and preservation of explicit bone and literal-color accents.
  The workshop probe checks the shared registration and authoring path.
- Actual Lay Brood Egg casts run through maturity or destruction. Native and
  legacy runs compare mana, cooldown, spawned bodies, stats, positions, skills,
  lifespan and RNG; source-aware host and peer renders resolve identically.
  The wait follows actual incubation duration, including attribute scaling.
- All five bonds are claimed, saved and restored. Host and peer resolution
  distinguish owned legacy bodies from wild native spiders.
- After building, `npx electron balance/arachnids-ui.cjs` checks actual Wardrobe
  controls, spider/hound family switching, all five forms, stable card portraits,
  equip/native/inherit, skill isolation, disk reload and compact layout.
- The hidden UI harness renders five actual actors at enlarged and real radii,
  plus native/legacy world frames. Temporary portrait overrides are restored;
  the scene includes a hatchling fixture, a real claimed Broodmother and wild
  spiders. The real hatch lifecycle is exercised by the headless test.
- `balance/canines-ui.cjs` and `balance/cosmetics-ui.cjs` cover shared preview
  and Wardrobe regressions. GUI checks use hidden windows and disposable saves
  under ignored `balance/reports/`.
