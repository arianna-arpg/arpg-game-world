# Necromancer skill trees — nested mutators

## Comparison checkpoint

The first pass remains on branch `codex/necromancer-shambling-tree`, commit
`de48c303` (Add Shambling Horde skill paths and passive replenishment).
The nested-tree checkpoint is `3a71461c` on `codex/necromancer-nested-mutators`.
The elemental lessons and golem refinements live on `codex/necromancer-elemental-lessons`.
Compare those branches to recover either the original design or its implementation.

The first pass had three exclusive Shambling Horde identities and ranked side
investments. This pass keeps its passive horde and heavy/rush ideas, but makes
heavy and rush combinable descendants of the casting trunk.

## Tree anatomy

Every tree contains 15 investment nodes, separate from the skill's visual root:

- One generic passive, available before or after either trunk.
- Two mutually exclusive trunk mutators.
- Two middle nodes beneath each trunk.
- Two endpoints beneath each middle node.

Only the two trunks exclude one another. Every descendant requires its parent;
siblings have no exclusion. Shared authoring helpers assign the graph and layout,
while the existing graph engine controls legality, spending, display and save repair.
Every node costs one point. Each generic passive has four ranks; branch nodes have one.

The existing four-point budget remains: one point at skill levels 5, 10, 15 and 20.
All four points may go into the generic passive, preserving the base form while stacking its bonuses. Passive ranks also mix freely with branches.
A complete route costs three points. The fourth buys its sibling leaf, the other
middle route, or the generic passive. Both middle routes plus a leaf also fit.
Cross-middle element selections require five points and therefore cannot both be
reached under this budget; two sibling elemental selections can coexist today.
Changing the investment budget is a separate balance decision, not hidden here.

## Play patterns

| Skill | First trunk | Second trunk | Generic passive |
|---|---|---|---|
| Shambling Horde | Wandering Dead: toggleable free, bar-seated replenishment; permanent waiting corpses. Specialize cadence, detection, batches, capacity or durability. | Commanded Dead: cast packs; combine brief fast rushes with fewer heavy bodies, or develop expiry explosions and larger batches. | Stitched Flesh: life |
| Bone Golem | Osseous Might: fighting golems; grow a cohort, a giant commander aura bearer, a sweeping bruiser, or a hybrid. | Keeper's Bulwark: defensive guard, rapid reconstruction, mending, taunts and the close-bound Bone Stand. | Fitted Joints: life and movement |
| Skeleton Archer | Rattling Bows: physical cohorts, piercing arrows, and Rain of Bones with combined cooldown/area/damage/bleed investment or baseline multishot. | Unstrung Sorcery: replace bows with random elemental bolt casters. The trunk preserves base population; Volatile Souls adds one body and one slot. Invest in volatile criticals or narrow the pool to selected elements. | Remembered Training: damage |
| Skeleton Mage (new) | Lich Ascendant: fuse the batch into one larger Fireball caster; learn heavy area spells, grow its frame, or command allies. | Grave Academy: a faster cohort of elemental specialists, with cold/chaos and fire/lightning curricula. Each learned spell belongs only to its matching element. | Grave Studies: damage and haste |
| Skeleton Warrior | Grave Phalanx: taunting shield sentinels, inherited Thorns, armor banners, relief auras and bounded death heirs. | Ossuary Duelists: twin-cut pursuers, bleeding strikes, culling, lunges and paired summons. | Tempered Bones: life and damage |
| Raise Dead | Grave Levy: temporary random skeleton/zombie ranks, larger drafts, stench, poison and true-death expiry payoffs. | Flesh Assembly: one claw-and-slam abomination; consume other skills' minions for temporary strength, build a refuge or invest in its death. | Gravecraft: life and damage |
| Raging Spirit | Frenzied Embers: brief fire-biting swarms, pursuit, a burning halo, ailments and expiry explosions. | Vigil Flames: targetable stationary sentries placed at the cursor; improve duration, durability, population or piercing, multiple bolts and Ignite. | Kindled Will: damage |
| Wraith | Hexwoven Shades: ranged chaos casters, learned Despair, curse investment, a resistance veil and slower decay. | Soul Reavers: paired scythe fighters, lunges, area, culling, leech and death healing. Both trunks retain exponential decay. | Unspent Echo: life and damage |
| Poison Nova | Plague Lineage: poison spreads through deaths; invest in magnitude, stack caps, poison healing, critical afflictions or ruptures. | Returning Venom: the ring flies back to its casting point; invest in count, speed, penetration, piercing or physical return shards. | Venomous Studies: poison magnitude |
| Despair | Worn Grief: toggle a following curse haze with a mana reservation; develop coverage, potent curses or timed ruptures. | Profane Ground: place one renewing curse patch; specialize its residence, potency or violent sentences. | Patient Words: duration and radius |
| Reap | Grave Procession: carry a longer-lived crescent as you move; specialize width, shove, hit recovery or execution. | Echoes of Reaping: rolls free phantom sweeps after casts; specialize bleeding chains or frequent, heavy and critical strokes. | Practiced Reaping: damage |
| Whirling Reap | Bloodwheel: close six-stroke bleeding and life leech, with stacked wounds, ruptures or recovery. | Unbound Wheel: throw six traveling crescent waves; develop reach, width, knockback or heavy executions. | Balanced Grip: damage and accuracy |
| Corpse Explosion | Funeral Pyre: lingering fields, corpse batches, spreading burns and ruptures. | Living Offerings: sacrifice minions when corpses run short; develop faster rites, crawling remains, larger offerings or hit recovery. | Mortuary Practice: damage |
| Spirit Pyre | Running Wildfire: mobile, short-lived swarms with fast linear ramp, larger batches, spreading burns and expiry explosions. | Banked Pyre: gradually rooted channel, larger skulls, stronger quadratic ramp, mana-paid absorb, halos and heavier expiry explosions. | Pyre Tending: minion damage |
| Sanguine Burst | Hemorrhagic Rite: spreading bleeds, greater magnitude, stacked wounds, rupture and recovery. | Crimson Carapace: life-paid absorb; develop capacity, duration, a repelling pulse or more expensive empowered payments. | Blood Discipline: damage |

Archer-derived mages cast one elemental bolt each. The separate Mage skill earns
its own identity through elemental lessons and innate cryomancer Ice Spears; the Lich starts with an explosive Fireball.
The new skill belongs to the Necromancer discovery pool and enters drops at level 5.
Values are an initial tuning pass, not a claim of final balance.

Bone Stand now turns the golem into a shell attached to the caster. It covers
300 degrees around the caster's facing, leaving a 60-degree rear opening. The
pool absorbs raw hit damage up to 60% of the golem's maximum life times the
caster's guard strength and minion size; excess damage on the breaking blow continues normally.
The shell replaces the free body and its usual kit with Marrow Sweep plus any
taught crew arts. Strikes use the ordinary minion pipeline and supports, with a
minimum 2-second interval and each art's own cooldown. Breaking the shell stops
both protection and strikes. After 4 quiet seconds it regenerates 20% of its
capacity per second and reforms at 40%. Damage over time follows its ordinary
path rather than consuming this hit-absorption pool.

The attached body cannot be targeted separately, does not collide with its keeper,
and follows the keeper's position and floor. Its segmented arc shows both coverage
and depletion; broken segments become dashed. The same visual state crosses the
co-op snapshot. Existing anatomical/aura shells retain their own independent pools.
Unseating, dismissal, owner death or tree reset cannot leave its protection behind.
Golem contract slots retain their normal mana reservations and respawn delay.
Command auras from separate bodies stack through the ordinary aura system; cohort
investment therefore offers a deliberate reservation-for-coverage/power trade.

## Elemental lessons and golem refinements

- Archer rain endpoints are now Drumming Rain (all four former rain bonuses,
  with a real 30% bleed-on-hit modifier) and Forked Quivers (+1 attack projectile).
  Forked Quivers retains the old Cruel Rain node ID for saved allocations.
- Drilled Bones is the golem middle node, allowing its cooldown recovery to
  combine with Great Bones → Marrow Bruiser within four points. Bone Cohort
  grants one extra body/slot with 20% less life. Assembled Legion is the other
  leaf: true death, including sacrifice, leaves two lesser golems.
- Lesser golems retain the original keeper, source instance, supports and owner
  investment. Their body is half size, with 35% life and 45% damage. Their base
  duration is 8 seconds, scaled by effect duration. A separate six-heir cap never
  evicts an adult or blocks its respawn. Heirs do not reserve mana, divide or
  schedule persistent respawns. Dismissal, respec and unseating retire them too.
- Close Guard grants 20% size and 8 Thorns plus 50% of the keeper's Thorns.
  An ordinary golem retaliates when struck; an attached shell retaliates only
  when it actually absorbs damage. Rear-gap hits still receive any Thorns the
  keeper owns, but do not trigger the golem's splinters. Retaliation kills name
  the retaliating body as their source.
- Close Guard maps minion size into the body's area-radius stat at birth. It
  scales Warding Sweep and Marrow Sweep's reach, including their AI cast range.
  Bone Stand also multiplies its absorption capacity by size. Angular coverage
  remains 300 degrees; size enlarges the frame and reach, not the rear opening.
- Warding Reach carries the 75% movement bonus and teaches a 160-base-radius
  sweep: 2-second taunt, modest outward shove, and half-strength 3-second bleed,
  every 6 seconds. An attached shell taunts toward its protected keeper.
- The Lich begins with modest, repeatable explosive Fireballs, then chooses
  Cinder Rain, Winter Ring, Grave Thunder, Ossuary Command and/or empowered
  Plague Ring. Its host elemental tags follow the chosen repertoire.
- Grave Academy adds 20% haste; it does not teach universal area spells. The
  cold/chaos middle grants 40% more damage and 40% faster recovery. Its leaves
  upgrade only cryomancers' innate two-shard Ice Spear into a five-shard spear
  that always chills, or teach only venomancers Essence Drain (6-second base
  cooldown). The fire/lightning middle grants 35% increased damage and 50%
  faster recovery. Its leaves teach only pyromancers Ignite or only stormcallers
  Chain Lightning (both 5-second base cooldowns). The middle uses damage rather
  than area radius because these spells do not all have an area delivery.

Existing saved golem paths are repaired against the new prerequisites; removed
invalid picks return their points. The tree budget and four-rank neutral passives
are unchanged. Shambling Horde is unchanged.

## Undead courts batch

These four additional trees live in `src/data/necromancerCourts.ts`; the shared
15-node builder lives in `src/data/skillTreeBuilder.ts`. Registered skills and
minion forms are ordinary data entries. Existing allocations and the first four
trees are unchanged. The comparison branch is `codex/necromancer-undead-courts`.

Last Watch heirs use the same nonrecursive offspring contract as lesser golems,
with a separate four-heir cap. Levy expiry only becomes a true death when a node
explicitly enables it; replacement and respec remain silent. Feasting Mass eats
minions from other skill instances, attributes the sacrifice to its eater, and
gains bounded, expiring damage stacks. Nearby auras from separate bodies stack.
Vigil Flames preserve the shared Raging Spirit pool and expire normally; their
cursor placement and no-recall body make location a deliberate choice.

The remaining Necromancer queue is Infernal Bombardment, Archon Lance,
Venom Bolt and Grave Tide. Continue in coherent batches before moving to
other classes; retain two distinct trunk identities, mixable descendants and a
four-rank neutral passive. Balance values still need playtesting.

## Blood and pyre batch

Trees live in `src/data/necromancerSacraments.ts`, using the shared binary builder.
They preserve all unpicked deliveries and allow four neutral ranks.

Wandering Dead now authors `replenish.toggle: true`. It starts enabled, preserving
existing builds. A deliberate press pauses only future births; existing bodies
continue following, fighting and exploding normally. A second press starts a
fresh interval. Held buttons, AI use and triggered/free execution cannot thrash
its state or bypass the birth rate. The instance's `replenishmentPaused` preference
survives character saves, multiplayer metadata and reseating. Respec clears it.
The toggle works while casting or disabled; ordinary birth eligibility still
checks stun, skill requirements and forbidden tags. Non-toggle replenishment
retains its previous passive-only behavior. HUD highlighting and previews read
the same resolved toggle state.

`engine/costward.ts` introduces resource-paid absorb through ordinary stats:
`costWard_mana` and `costWard_life` set absorb per point actually paid;
`costWardDuration` defaults to 3 seconds, scaled by effect duration;
`costWardCap` defaults to 30% of maximum life. Skill-local tree modifiers,
supports, global modifiers and tag restrictions use the normal stat resolver.
All World payment sites share `paySkillCost`: first presses, channel pulses,
later waves, charged stages and paid triggers. Mana substituted by energy
shield, borrowed resources, constructs' synthetic pools and unpaid echoes
produce no corresponding award. Both lanes sum before the cap. Converted costs
award through the resource they actually charge. The strongest existing absorb
pool wins and the longer clock remains; repeated payments do not accumulate
unbounded shields. Paying earns the ward immediately, including interrupted
casts; it then expires through the existing absorb clock. Already earned wards
are temporary payment rewards, not persistent tree fields.

Funeral Pyre reuses the lingering-field mechanism: 80 base radius, 40% skill
damage every 0.5 seconds. Its field does not repeat the corpse-life fuel bonus.
Living Offerings uses the shared corpse batch/sacrifice path; Crawling Remains
reuses Hiveborn's bounded, 12-second crawler cohort and global minion scaling.
Spirit Pyre keeps ordinary paid channel pulses and the existing shared spirit
pool: holding at capacity replaces older skulls through normal summon behavior.
Its stride and newborn damage curves are resolved by `instanceChannel`; taught
halos and crew ailment modifiers use the existing summon pipeline.

## Plague and scythe batch

The four player rites live in `src/data/necromancerRites.ts`, using the same
binary builder and four-point budget. Tree-granted supports reuse the ordinary
graft lane: no socket is spent, real socket copies deduplicate, granted tags
participate in support admission, and save/load rebuilds the granted powers.
A player's real sockets retain their normal precedence when two supports select
a competing identity. Unbound Wheel gains the actual duration support tag.

Poison Nova retains its fixed 11-second poison clock. Ruptures bank damage
against the actual authored clock, including fixed duration overrides. Poison
and bleed spreading retain the original caster, clock, healing and brood data.
A death can both rupture and spread the affliction; consuming the armed status
must not erase its spreading clause. Rupture kills retain their applier.

Despair's fields reapply its curse; the damage scale describes its latent roll,
not a new direct-hit effect. With a rupture node, the first application starts
a fixed fuse. Further applications feed the detonation without restarting that
fuse; death can detonate it early. The following haze reserves 25% maximum mana,
while the ground patch is exclusive and recasting relocates it. Any tree pick
or reset retires that instance's existing fields and refunds their reservations,
so captured radius, timers and old modes cannot survive a new allocation.

Carried Reap stays with its caster, whereas the unbound wheel projects six
outward waves. Crescents retain their single-hit-per-enemy rule; extra duration
extends their presence or travel rather than turning them into repeated hits.
Reap's phantom uses the existing follow-up skill and inheritance contract.
Return shards are the existing short-range physical Shrapnel skill, not a second
Poison Nova. These are initial tuning values for in-game iteration.

## Shared implementation contract

`SummonDelivery` now exposes reusable summon shaping data:

- `monsterId` or weighted `pool` chooses the body. A trunk replacement clears the
  other identity field in the resolved view, leaving the catalog immutable.
- Pool rows may carry host tags. `selectPool` restricts the possible bodies.
  Multiple selections union; selection order never chooses a winner.
- `crewSkills` and `crewAuras` union across nodes. Native and taught skills are
  installed before support forwarding. Auras use ordinary aura activation and
  are refreshed when the summon's socket configuration changes.
- `crewRules` selects monster IDs and adds or replaces their native skills.
  One resolver serves births and the support census; base replacements may be
  upgraded by tree replacements. Author only one tree replacement per native
  skill on any simultaneously reachable path. Replacements never chain.
- `crewInherit` grants body-local modifiers from an owner stat using a ratio and
  optional offset, evaluated once at birth with the summon context. It is a
  single-hop grant, not a recursive stat link.
- `crewOnDeath` joins the existing brain death-action execution. The summon
  action's `inheritSummon` option mints bounded temporary heirs through the
  normal owned spawn path, with configurable size/life/damage scales.
- `crewMods` adds body-local stat modifiers; tags can scope them to particular
  spell elements or deliveries such as Rain of Bones' `storm` tag.
- `escort.distance` changes a body's movement goal to its owner's flank while
  retaining ordinary skill selection, cast gates, collision and recall.
- `shell` attaches a summoned body as a directional guard with configurable life/size scaling, coverage, regeneration, reform threshold and strike kit. It reads the shared shell absorption and regrowth systems.
- `devour` configures the existing consumption clock, target radius, healing,
  temporary stack modifiers and stack cap. Sacrifices retain the eating body as
  their source. Aura damage deaths likewise retain their actual bearer.
- `placeAt` configures cursor/caster placement, cast range and scatter. A
  stationary, `noRecall` monster form supplies sentry behavior independently.
- `replenish.interval` remains a free, bar-seated birth clock using normal spawn,
  cap, ownership, lifecycle and explosion attribution. Full pools never churn.

Descendants use additive stats and unioned kits/pools. Exclusive trunks may set
scalar identity fields. Do not put competing scalar replacements on mixable siblings.
`over.tags` changes host tags; `instanceBaseTags` and `skillContextTags(instance)`
carry that identity into stat queries, status prohibitions, support fit and previews.
Pool tags reflect the entire currently possible pool; crew attacks and spells use
their own actual tags. The passive horde loses its obsolete duration tag. An
archer-summoning spell does not pretend to be a projectile attack: its crew is.

Resonance still opens crew support boarding. The live socket gate, spawn forwarder,
preview and simulation census resolve the selected crew. A projectile-only support
can therefore ride an archer's arrows or mage bolts; attack-only support cannot
silently modify a transformed spell. Taught auras and spells expose their own tags.

Any summon tree pick or reset silently retires the old instance's bodies and pending
births, preventing retained powers or old permanent bodies. Passive clocks restart;
active summons require casting again; active golem contracts rebuild after their
ordinary respawn delay. Reservations remain tied to contract slots.

Existing saved allocations use the established graph repair: unknown nodes,
missing-parent picks, excess ranks and illegal rival picks are removed, making
those points available again. An old Grave Rush root does not silently choose the
new Commanded Dead trunk. The preserved branch retains the old save interpretation.

## Verification

- `npm run check`: game, launcher and simulation type checks.
- `npm run probe -- necromancertrees`: passive horde lifecycle, ownership,
  attribution, caps, respec, shared pools and save behavior.
- `npm run probe -- nestednecromancer`: binary anatomy, mixed routes, pool order,
  real mage births, Rain of Bones AI, commander aura, cohort reservations,
  Bone Stand coverage/retaliation/size, death-heir caps and cleanup, baseline
  multishot, per-element lessons and actual AI casts, plus save repair.
- `npm run probe -- necromancercourts`: all 32 new leaf paths, live crew/support
  census agreement, save round trips, sentinel guards and heirs, duelists, levy
  caps and expiry, attributed devouring and aura deaths, placed sentry AI,
  curses, melee reavers and finite decay.
- `npm run probe -- necromancerrites`: all 32 new leaf paths, neutral ranks,
  save repair, real returning projectiles, poison spread/healing/rupture clocks,
  curse reservation and relocation, reset cleanup, follow-up casts and six
  traveling waves.
- `npm run probe -- necromancersacraments`: all 24 leaf routes, neutral ranks,
  saved and replicated edge-only horde toggles, paid ward caps/expiry/absorption,
  channel payments, conversion, borrowing, ES substitution, fields and sacrifices.
- `npm run probe`: the full fast regression gate.
- `npm run sim -- run --suite smoke`: baseline combat scenarios.
- Production build plus Electron tree interaction and screenshot inspection.
