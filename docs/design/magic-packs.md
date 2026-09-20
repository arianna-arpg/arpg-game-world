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
| Footfall | 1+ | One member plants its feet and marks the nearest visible foe's position within 420 units; a 65-unit physical blast follows after 1.65 seconds, then a 7-second recovery | Leave the fixed mark or kill/displace its tethered caster |
| Scattershock | 1+ | One member warns for 1.5 seconds, then releases a low-damage, 110-unit repelling pulse; members take turns, with 7.5 seconds of recovery | Step outside the rim and close again during recovery |
| Bloodfont | 2+ | A donor channels for 2 seconds, paying 18% maximum life to restore up to 14% of a wounded ally's maximum life within 240 units; 8-second recovery | Follow the red stream, interrupt the donor, or damage it below its payment threshold |
| Rallyheart | 2+ | The golden leader takes 30% more damage; original followers within 220 units deal 16% increased damage while linked to it | Kill the vulnerable leader to permanently end the rally, or separate followers |
| Skirmishers | 3+ | Members with no original ally within 170 units gain 22% increased movement speed and visible stride chevrons | Bunch them together to extinguish their speed; an isolated final survivor retains it |
| Iron Wake | 5+ | Every member carries an untargetable physical satellite with a 0.9-second arming tell | Avoid the moving orb, stand inside its orbit, or kill its bearer |
| Cinder Wake | 9+ | Every member carries a fire satellite that lobs a mortar at a fixed ground mark | Leave the marked impact or kill its bearer |
| Wardbound | 1+ | 18% less damage taken while another original ally is within 190 units | Separate allies or kill a supporter |
| Hunting Chorus | 6+ | 18% increased attack/cast speed while two original allies are within 240 units | Break the trio |
| Vendetta | 12+ | Each original casualty grants survivors 12% increased damage and 6% increased movement speed, up to three stacks | Weaken the group before finishing members |
| Breachbearers | 4+ | One exposed member takes 65% more damage; the others take 45% less. Death passes exposure to the next survivor | Follow the broken golden ward; avoid spending burst on closed blue wards |
| Shifting Breach | 9+ | The same exposure rotates every 6 seconds, previewing the next recipient for 1.4 seconds; death hands it on immediately | Position for the next dotted golden halo |
| Arclink | 10+ | Two members plant their feet and mark a fixed path for 1.25 seconds, then an 0.8-second pulse travels along it; 5.5-second recovery | Leave the path or kill/displace an endpoint to cancel it |
| Siphon Court | 13+ | One siphoner gains 16% increased attack/cast speed and 7% movement per visible feeder within 230 units. Feeders have 15% less attack/cast speed and 22% less movement | Kite the fast member away to sever its feeds, or kill it to permanently end the siphon |
| Gravewheel | 16+ | Each casualty leaves two rotating chaos spokes, radius 115, after a 1.5-second warning; all anchors last until the pack ends | Choose where members die, keep moving through the openings, and finish the remaining pack |
| Cinderchain | 7+ | Members move 25% slower. A living member warns for 1.35 seconds and explodes in a 105-unit radius, igniting original allies within 220. Each member fires once per chain; another chain can begin after 7 seconds of recovery | Spread the pack to stop propagation; leave each marked blast or displace its caster |
| Mending Relay | 8+ | A member channels for 1.8 seconds to restore 18% maximum life to a wounded ally within 300 units, with a 7-second recovery | Follow the green link, kill its healer, break sight or separate the pair before completion |
| Encirclement | 15+ | Three members plant their feet and mark a triangle; after 1.7 seconds it erupts once, then recovers for 8 seconds | Escape the triangle or remove/displace any corner. Requires three members and a nondegenerate formation |
| Hollow Choir | 18+ | Members simultaneously warn for 1.6 seconds, then burst between radius 85 and 175, with an 8-second recovery | Stand inside a center that is clear of other members' rings, or beyond all rims |

All eligible recipes stay in the weighted pool. A level-12 encounter can still
roll Wardbound; later unlocks add variety rather than stacking every mechanic.
The opening now offers three recipes at level 1, five at level 2 and six at
level 3; every previous debut stays at its original level. Each addition has
weight 3, alongside Wardbound's weight 4, so it is no longer the only opening roll.
The numbers are initial tuning, not a claim of full campaign balance.
Combat nameplates show identity only; recipe hints are authoring/reference
material. Links, orbs, wards and ground marks carry the mechanic in play.

## Authoring and difficulty

`RARITY_DEFS` in `src/engine/rarity.ts` owns ambient encounter frequency.
Normal/magic/rare/champion weights are **110/12/7/2**, previously 100/22/7/2.
For eligible non-crowned rolls, magic falls from 22/131 (16.8%) to 12/131
(9.2%); normal rises to 84.0%, and rare/champion chances remain unchanged.
This is encounter-roll probability, not a promised percentage of monster bodies:
natural pack sizes, magic size caps, habitat refusal and authored encounters
still matter. These weights affect newly generated encounters; existing saved
packs are preserved. Disabled/ineligible magic pools continue to omit its weight.

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
Proximity rules may also specify `max` (inclusive; `min: 0, max: 0` means
isolated) and `role: 'bearer'` to count only the current original leader.
The same faction, story, ownership and cohort rules apply to both bounds.
`strideTell` draws chevrons from actual active rule power; `bearer.protectedOthers:
false` suppresses closed ward rings for followers that are not protected.

Dynamic recipes compose optional `bearer`, `beam` and `grave` specifications in
the same registry. Rules can select `role: bearer / others / donor` and scale
their ordinary modifiers `perDonor`. A bearer can pass on loss or end permanently,
and optionally rotate on a relative clock. Timings, widths, ranges, colors,
rotation speed, spokes and skill references are all data. There are no recipe-ID
branches in the conductor. `src/data/magicPackSkills.ts` supplies the hidden
skill payloads; hits use ordinary skill resolution, mitigation, death gates and
credit. Grave hits are attributed to a living sustaining member on that story,
never a fabricated corpse actor. They target enemies of that member, including
players and their companions, rather than friendly members of the same pack.

`src/engine/magicPackEvents.ts` adds a shared select/warn/resolve/recover cycle
for `burst`, `mend` and `ritual` specifications. Bursts optionally supply an
`innerRadius` (a hollow center) or `chainRange` (one ignition per original slot
per chain). Every propagated charge receives the full authored warning, and a
disconnected member cannot be ignited through walls, across stories, or from
another pack. Burst/ritual anchors snapshot positions and hold their casters'
feet while warning; forced displacement cancels them. A mending recipient can
move within the link range, while its healer channels. Healing uses `healBy`,
including healing-received modifiers and life caps; it never revives casualties.
The green link and target cross identify both the healer and beneficiary.
All these cycles stop on disengagement and re-arm from an initial delay after
travel/save restoration. Neither pending damage nor movement holds are restored.
Explosion/ritual flashes show a completed hit; they do not deal repeated damage.
Hollow-ring membership uses the target's center for its safe inner boundary;
outer contact includes body radius. Triangles test the target center against
the exact drawn polygon, with sight checks before damage.

Burst `single: true` rotates one caster per cycle. Optional `targetRange` acquires
the nearest visible enemy on the caster's story and snapshots its ground position
when the warning begins. The caster remains the attribution and cancellation
anchor; the mark, warning tether and hit test share that exact fixed center.
No target following, new actor, recipe-ID branch or alternate damage path is
introduced. Remote marks cannot combine with chain propagation. Loss of caster
sight to the mark cancels the charge, and the footprint checks sight to each victim.

Mend `lifeCost` is an optional, nonlethal fraction of donor maximum life, checked
both at selection and completion. It is a resource payment rather than damage,
so it does not trigger retaliation or create a casualty. Interrupted, unaffordable,
fully healed, life-sealed or zero-healing-received targets consume no payment.
Raw healing is capped by the paid amount and then uses ordinary `healBy`, including
healing-received modifiers and caps. Positive healing modifiers can amplify it.
Bloodfont's default payment exceeds its healing, making each successful relay
deplete the group's combined life. This is distinct from Mending Relay's free heal.

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
recipe-colored pips for current power; hover names show shared recipe identity.
Counterplay lives in world cues, not explanatory combat text. The state/supporter identity
travels over co-op snapshots; omitted fields clear reused client shells.

`src/engine/magicPackMechanics.ts` owns stable member slots, shared clocks and
hazard geometry. Beam warnings snapshot their endpoints: they never track the
player. The pulse sweeps its traveled segment and hits each body once. Death,
ownership, story changes, blocked sight or displacement over the authored limit
cancel it. The movement gate holds endpoint feet without preventing knockback.
Grave spokes clip against walls; drawing and damage consume the same endpoints.
Graves continue turning when surviving members are kited away, but disappear
immediately when no original hostile member remains. Silent removal creates no
grave. Pack clearing during a reflected hit reconciles without double-ticking.

The broken golden ring marks exposure; closed blue rings mark protection. A
dotted halo grows around the upcoming timed recipient. Siphon particles flow
from gray feeder rings into the amber recipient. Dashed, translucent danger
geometry warms up before becoming a solid traveling pulse or rotating spoke.
Clients receive the host's exact geometry, roles and preview progress, with no
independent combat clocks or hidden client damage.

Zone memory and JSON world saves preserve recipe, original count, losses, leader
identity, name and health. Restore remaps group IDs onto fresh runtime identities, preventing
collisions with new packs, and rebuilds modifier sources without rerolling an
individual affix. Old saves have no cohort metadata and retain their existing
single magic bodies until refreshed. No compatibility reset is needed.
Dynamic state adds original member slots, bearer/retirement, relative role clocks
and fallen anchor positions. Zone memory deep-copies the runtime. Re-entry
restarts grave warnings and discards in-flight beams in favor of a fresh initial
delay, so a returning player cannot enter an unseen firing effect.

## Verification

`npm run probe -- magicpacks` covers progression, real ambient spawning, rare
leader isolation, proximity, faction/team/story/ownership, death and retirement,
power caps, repeated kills, co-op clearing, travel, JSON save/reload and fresh
group identity after restore. The existing `pack` and `packtempo` probes cover
the infrastructure this change reuses. Also run `npm run check`, the smoke sim,
generation QA and the production build.
The isolated hidden client check is `npx electron balance/magic-packs-ui.cjs`
after a build; it captures each recipe's real links, power pips and hover plate.
`npm run probe -- magicpackmechanics` additionally checks all unlock boundaries,
death and timed handoffs, 30/60/120 Hz beam behavior, actual damage and dodging,
endpoint cancellation, siphon isolation, grave persistence/rotation/cleanup,
wall/story safety, JSON save/load and co-op geometry.
`npm run probe -- magicpackevents` covers recurring chains at 30/60/120 Hz,
per-hop warning time, separation/occlusion, mending interruption and healTaken,
triangle escape and collapse, hollow-ring safety/overlap, retaliation cleanup,
disengagement and save/co-op state. The hidden visual harness includes warning
and resolution captures for all four additions; `MAGIC_PACK_SCENARIOS` can select
a comma-separated subset of its named scenarios.
The opening additions extend the same probes: seeded rarity distribution,
all recipe debut boundaries, isolation crowding and cleanup, rally retirement,
30/60/120 Hz fixed marks and repelling pulses, caster interruption, nonlethal
blood payments, heal caps, co-op geometry and save/travel warning resets.
Visual scenarios include both active and crowded Skirmishers, Rallyheart's
unprotected followers, and warning/resolution pairs for all three new events.
