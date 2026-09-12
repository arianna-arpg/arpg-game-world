# Faces of the frontier

This pass gives six creature families clearer shared anatomy and clothing.
`src/data/kinshipLooks.ts` now contains 35 compositions used by 36 refreshed
existing entities (including the Depth Seer follow-up) and one new troll. The moved looks retain their existing
IDs; Bulwark Thane gains a dedicated look and the four small Vermin rats use
two new rat compositions. All 35 existing monster definitions retain their
nonvisual fields, including the Gorer's recent carry and handling balance.

## Family language

| Family | Changes |
| --- | --- |
| Bandit | Pit Champion, Warband Skald, Bandit Bruiser and Bulwark Thane use the existing Bandit hood: a dark opening and curved cowl lip. Their original equipment compositions are preserved. The initial tied wrap was removed after visual feedback. |
| Troll | Mauler and Bridgewarden share a heavy nose, tusks, long knuckled arms and mossy body. Mace and spikes distinguish Mauler; hammer and bark plates distinguish Bridgewarden. |
| Formic | All ten mobile types gain a separate head, narrow petiole, distinct gaster, six thorax-rooted legs, mandibles and elbowed antennae. Soldier and Major have heavier heads; Alate has two pairs of veined wings; specialists retain food, loads, sacs and crystals. |
| Gnoll | Trapper gains a spotted ruff, hyena muzzle, tufted ears and tail alongside its bow, pack and bandolier. |
| Beastkin | Ten troop looks share caprine faces, fur and cloven hooves. Existing horn arrangements and equipment retain role differences. Impaler now visibly carries a bow for Bone Arrow. Siegeback Aurochs retains its beast body and attachment geometry; its Howdah Archer rider gains the shared face and horns. |
| Vermin | Four ratfolk looks gain round ears, tapered muzzles, incisors, whiskers and bare pink tails alongside scavenged armor, priestly gear and the Rat King's crown. Gutter Rat, Vermin Tide and Warren Rat share the small rat look; Fester Rat adds diseased sacs. |

Chitin retains its broad, fused shells and existing brood anatomy. Its twelve
baseline definitions and looks were checked unchanged against the pre-pass
snapshot. Formic's narrow waist and separated body masses supply the contrast.
Formic burrows, Vermin nests and roaches retain their established appearances.
Segmented queens retain their trailing bodies; decorative parts do not change
hit targets or composite attachment positions.

## New entity: Troll Cairncaller

`src/data/kinshipMonsters.ts` adds `troll_cairncaller`, a mossy horn bearer
with stone growths. Wake the Scree calls two scree skitters, capped at four;
Heavy Strike answers an enemy that closes in. It uses the existing caster
brain and shared skills, with 190 base life, 18 armor, 45 poise, 82 movement
speed and 4 life regeneration. Its 100 mana and 5 mana regeneration support
the summoning cadence.

It joins the Goblin roster and tundra pack table at weight 1, alone per pack.
Definition presence fades in from zero at level 9 to full weight at level 14.
The addition supplies a supporting troll role beside the two melee bodies.

## Twelve reusable parts

`src/data/kinshipGlyphs.ts` registers ordinary Part Forge glyphs through
`GLYPH_PARTS`; compositions use the existing renderer and placement controls.

| Parts | Purpose |
| --- | --- |
| `pressureLens` | Pale pressure eye and paired mouthparts for the Depth Seer follow-up. Replaces the removed `banditWrap` in this twelve-part set. |
| `trollHead`, `trollArms` | Broad tusked face and long thick forelimbs. |
| `antTrunk`, `antHead`, `antStride` | Separated ant body masses, biting head and three paired thoracic legs. |
| `elbowFeelers`, `antVeilWings` | Angular antennae and translucent paired wings. |
| `caprineFace`, `clovenHooves` | Goat muzzle, ears, slit eyes and split hooves. |
| `ratFace`, `nakedRatTail` | Round ears, incisors, whiskers and a curved hairless tail. |

## Verification

- `npm run check` passed game, launcher and simulation type checks.
- `npm run probe -- anatomy`: 47 assertions passed.
- `npm run sim -- run --suite smoke`: 25 episodes passed.
- `npm run genqa -- --seeds 2 --filter tundra`: 26 generated cases, zero
  failures. One snowdrift spacing warning in river headwaters; no generation
  geometry changed in this pass.
- Seeded live AI combat: six Wake the Scree casts, ten Heavy Strike casts,
  and four peak skitters across near/far lanes. No forced skill casts.
  Also checks both roster entries, presence, all 35 existing entities'
  nonvisual fields and the entire Gorer definition against the snapshot.
- Visual review uses the actual portrait compositor and native-size body
  bakes. All 34 looks at two radii and three pose times produced 204 nonempty
  renders inside sprite padding. Family sheets include before/after views
  and a direct Formic/Chitin comparison.

The hood correction and Depth Seer follow-up are documented in
`docs/design/rootwild.md`; the initial verification counts above describe the
original pass. The follow-up checks the corrected looks and preserves the
other 31 prior definitions and compositions.

The ignored local study lives in `balance/reports/kinship-study/`, with
snapshots, screenshots and combat results. Its family views cover Bandits,
Trolls, Formic, Chitin comparison, Beastkin and Vermin; the overview includes
the Gnoll Trapper. These review artifacts remain local.
