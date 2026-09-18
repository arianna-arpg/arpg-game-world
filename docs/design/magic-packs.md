# Magic monster packs

Magic rarity now rolls an entire ambient encounter. Every member shares one
named mechanic, wears the blue magic tier ring and receives the tier's life,
damage, size and XP multipliers. Personal random affixes are replaced by the
pack recipe. Rares, champions and crowned enemies retain their individual
affixes and leader/ordinary-retinue structure. This pass does not add new rare
skills or replace any creature's native kit, brain, bonds or tactics.

## First recipes

| Recipe | Enemy level | Shared mechanic | Counterplay |
| --- | --- | --- | --- |
| Wardbound | 1+ | 18% less damage taken while another original ally is within 190 units | Separate allies or kill a supporter |
| Hunting Chorus | 6+ | 18% increased attack/cast speed while two original allies are within 240 units | Break the trio |
| Vendetta | 12+ | Each original casualty grants survivors 12% increased damage and 6% increased movement speed, up to three stacks | Weaken the group before finishing members |

All eligible recipes stay in the weighted pool. A level-12 encounter can still
roll Wardbound; later unlocks add variety rather than stacking every mechanic.
The numbers are initial tuning, not a claim of full campaign balance.

## Authoring and difficulty

`src/data/magicPacks.ts` owns the open `MAGIC_PACKS` registry, selection weights,
minimum levels, ordinary modifier payloads, counterplay text, colors and tells.
`MAGIC_PACK_CFG.sizeByLevel` chooses 2–3 members at level 1, 3–4 at 6, 4–5 at 12,
and 4–6 at 20. The member cap is six. Natural `MonsterDef.packSize` upper bounds
still apply; solitary definitions, bosses and passive creatures do not roll
ambient magic encounters. Large natural flocks use the smaller magic encounter
budget. A partially refused habitat spawn with fewer than two bodies remains
normal, so it cannot manufacture a lone magic leader.

`ZoneDef.magicPacks` accepts `false` to remove magic from ambient rarity rolls,
or `{ sizeMul, mechanics }` to tune difficulty and curate the recipe pool.
Size multipliers stay inside the 2–6 cap and natural species ceiling; an empty
or level-ineligible mechanic list disables magic rather than bypassing gates.
Unlocks read enemy/zone level, not player level. There is no new global
difficulty selector in this pass.

Selection also filters by feasible membership: a natural pair cannot roll
Hunting Chorus, which needs three bodies. If a curated pool has no recipe
usable at the rolled size, the cohort stays normal. A refused spawn that drops
below the recipe's minimum likewise stays normal rather than gaining an inert
mechanic.

Compose `nearby` and `fallen` gates in a recipe's `rules`; their effects use the
normal `Modifier` schema. A casualty rule scales each payload value linearly by
the capped loss count. Multiple rules coexist in separately named sheet sources
`magicPack:<recipe>:<rule>`, preserving stat attribution. Add a registry row to
make a new combination without editing the spawn loop or damage pipeline.
`magicPackErrors()` participates in ordinary boot content validation.

`World.promoteMagicPack(members, recipeId)` is the explicit content seam for
events or authored encounters. It requires 2–6 distinct, living, unowned,
unpromoted enemies of the same faction at the recipe's minimum level. The
ambient spawner is its initial caller. Scripted single-body magic promotions
keep their existing explicit behavior; invasion hosts now roll only normal or
rare-and-higher leaders, since they are an authored leader/retinue encounter.

## Runtime, readability and persistence

Membership belongs to the original cohort, independently of def id. Nearby
packs never support one another. Support also requires matching faction and
story, live enemy membership and no owner. Taming, changing sides, promoting
out of magic, death or separation removes active sources. Summons inherit no
membership. Vendetta counts actual deaths through `World.kill`, after death
prevention gates; silent retirement and travel grant no stacks. It does not
infer casualties from absent bodies. Group scans are bucketed by identity and
bounded by encounter size; modifier sources change only when rule state changes.

The combat fold records the supporter that the renderer links. Existing bond
links retain priority within the existing total line budget. Magic rings carry
recipe-colored pips for current power; hover names show the shared recipe and
an active/broken state with counterplay text. The same state/supporter identity
travels over co-op snapshots; omitted fields clear reused client shells.

Zone memory and JSON world saves preserve recipe, original count, losses, leader
identity, name and health. Restore remaps group IDs onto fresh runtime identities, preventing
collisions with new packs, and rebuilds modifier sources without rerolling an
individual affix. Old saves have no cohort metadata and retain their existing
single magic bodies until refreshed. No compatibility reset is needed.

## Verification

`npm run probe -- magicpacks` covers progression, real ambient spawning, rare
leader isolation, proximity, faction/team/story/ownership, death and retirement,
power caps, repeated kills, co-op clearing, travel, JSON save/reload and fresh
group identity after restore. The existing `pack` and `packtempo` probes cover
the infrastructure this change reuses. Also run `npm run check`, the smoke sim,
generation QA and the production build.
The isolated hidden client check is `npx electron balance/magic-packs-ui.cjs`
after a build; it captures each recipe's real links, power pips and hover plate.
