# Teeth of the pack

Five creatures previously shared the three-part `hound` look (disc, snout,
tail). They now share canine anatomy while differing in build and coat.

| Creature | Native look | Identity |
| --- | --- | --- |
| Plains Wolf | `wolf_coursing` | Lean waist, reaching paws, pointed ears, narrow ruff and brush tail |
| Fen Hound | `hound_reedcoat` | Low stance, hanging ears and layered matted coat |
| Hound That Was Never Wild | `hound_drover` | Broad working body, pale ruff, folded ears and buckled leather collar |
| Gravemaw Hound | `hound_gravemaw` | Heavy forequarters, wide toothed jaw, cropped ears and exposed ribs |
| Pain Hound | `hound_painthorn` | Long reaching limbs, sharp ears, dark thorn hackles and ember seams |

Only the five native `look` references change in `monsters.ts`. Existing
radii, scale variance, palettes, material settings, adornments, AI, pack
bonds, hunger tells, carrion feeding, damage, retaliation and lifespan stay
on the same definitions. The starting Tamer receives the same ordinary
bonded hound. Existing wild pack signals remain live over the baked body.

## Reusable anatomy

`canineGlyphs.ts` adds twelve ordinary glyphs to `GLYPH_PARTS`:
`coursingTrunk`, `runningHaunch`, `reachingPaw`, `brushTail`, `canineMuzzle`,
`prickedEar`, `foldedEar`, `shaggyRuff`, `reedLocks`, `droverCollar`,
`scavengerJaw` and `emberHackles`. Limbs and ears are single-sided parts;
the looks mirror them through the existing transform grammar. Bodies,
coats, tails, jaws and tack can be mixed independently, scaled, rotated and
recolored with palette roles. Gravemaw also reuses the existing rib part.

All parts bake into the standard body sprite, with the existing whole-body
movement, breathing and turning. No canine renderer branch, imported image,
runtime dependency or new damageable limb hierarchy is introduced.

## Legacy Hounds and attribution

**Wardrobe → Skill skins → Legacy Hounds** is free starter content, credited
to Hollow Wake. It restores the old Pain Hound under `pain_hounds` and the
old Plains Wolf, Gravemaw Hound and Hound That Was Never Wild under
`tame_beast`. Unmapped beasts retain their own appearance. Fen Hounds retain
the original composition for authoring, but have no native taming tag and
are not offered as a taming cosmetic preview. Wild actors are unaffected
by an account's wardrobe selection. The shared `hound` look is unchanged.

The shared `cosmeticSummonSkill` resolver now decodes a bonded companion's
`__companion:<skill>` cap marker for appearance lookup, while leaving the
gameplay marker intact. Existing summoned instances and explicit peer
appearance sources retain precedence. The normalized source travels through
the existing snapshot field; no new wire or save field is needed.

Wardrobe preview discovery now reads any skill's `retaliate.monsterId`.
For tame effects, it browses compatible cosmetic body mappings whose monster
tags satisfy the effect. Thus an authored skin can expose another capturable
body without a skill-name switch or a second monster list. This is a visual
catalogue, not a taming eligibility gate or a way to select gameplay pets.
The three tameable breeds can be browsed independently; preview selection
never changes an owned companion or an account's saved equipment.

## Verification

- `npm run check`, `npm run build`, `npm run probe`, balance smoke and game smoke.
- `probe_cosmetics.ts` covers all five part assemblies, exact legacy
  appearance, native overrides, incompatible skills, unmapped beasts, wild
  isolation, retaliation/tame previews and nonmutation of definitions.
- A real Pain Hounds cast and direct incoming strike spend one shard and
  create the body; native/legacy runs compare damage, mana, charges, position,
  radius, life, skills, expiry and RNG, with source-aware peer resolution.
- Starting and saved/restored companion checks cover downing, revival,
  unchanged stats/skills, normalized cosmetic sources, independent peer
  choices and explicit native selection.
- After building, `npx electron balance/canines-ui.cjs` checks native and
  legacy previews, all three tameable forms, equip/native/inherit, skill
  isolation, disk reload and compact layout. It uses hidden windows and
  disposable saves under ignored `balance/reports/`.
- The UI harness also renders all five actual actors at enlarged and real
  radii, then in world frames. Portrait overrides are restored; radius
  checks respect the wild definitions' existing scale variance. The Pain
  Hound portrait fixture uses cosmetic-only attribution to stay visible
  without a slotted retaliation skill; the real spawning path is verified
  in the headless lifecycle test.
- The standard gate exercises pack, companion recovery/inheritance,
  taming, Goad and beast-family behavior. The existing cosmetics UI harness
  covers the rest of the shared Wardrobe.
