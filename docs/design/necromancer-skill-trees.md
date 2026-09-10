# Necromancer skill trees

First implementation batch: Shambling Horde (`shambler_horde`), September 2026.
The requested “Shambling Corpse” is the existing Shambling Horde skill; its
catalog/save ID and mastery-kit position stay intact.

## Design commitments

Death, bodies, afflictions and sacrifice should offer different ways to play.
An identity choice changes how a skill is used; later investments develop that
identity or offer utility. Every path must spend the existing four-point budget
without requiring a single prescribed terminal allocation. Mechanics belong to
shared delivery, modifier, targeting and ownership systems. Skill IDs never
select engine behavior. Numbers below are initial tuning, pending playtesting.

## Implemented: Shambling Horde

Authored in `src/data/necromancerTrees.ts`; opens at skill level 5 and earns
points through the existing level 5/10/15/20 milestones. The three identities
exclude one another. Stitched Flesh is a shared, two-rank life investment.

| Identity | Play pattern | Trade | Further investment |
|---|---|---|---|
| Wandering Dead | One free corpse every 3 seconds while seated; cap 4; no lifespan limit; follows its keeper, pursues visible foes and bursts on contact | Replaces manual casting; 35% less minion life | Restless Graves: 25% shorter replenishment interval. Gathering Dead: +2 capacity per rank, two ranks. |
| Grave Rush | Two corpses per active cast; cap 8; 4-second lifespan; +85% movement speed | 20% less minion life; 35% more mana cost | Faster casting/cooldown recovery, or an extra corpse per cast and two extra slots for an additional mana cost. |
| Corpse Engine | One heavy corpse per active cast; cap 2; 14-second lifespan; 80% more life | 20% slower movement; 40% more mana cost | Ranked life investment, or movement speed to help the heavy corpse arrive. |

Wandering Dead plus both Gathering Dead ranks and Restless Graves yields eight
bodies at a 2.25-second replenishment interval before other investment. Choosing
Stitched Flesh instead trades capacity or recovery for individual blast strength.
Births keep the skill instance, owner and ordinary minion stat/support rules.
As with existing summons, body stats are baked when raised; later stat picks
apply to subsequent births. Identity changes and Font resets dismiss the old
bodies silently and cancel outstanding births, preventing permanent bodies from
being carried into a temporary-body identity.

## Shared authoring contract

`SummonDelivery.replenish: { interval }` opts a summon into free automatic
births while its instance is on a living actor's bar. It is a birth process,
not a cast: no mana/life payment, cast time, cooldown, cast event or trigger
execution. Ordinary summon count, minion cap, minion life/damage/movement and
`minionRespawnTime` modifiers remain meaningful. Cast-speed/cost/cooldown
investment does not accelerate the passive clock; effect duration does not
change a permanent lifespan. Crew forwarding still follows the Resonance rules
and the crew's actual skills.

The clock is transient and scoped to actor plus instance, with duplicate bar
references deduplicated. The first birth waits one interval. A full pool clears
progress, never replaces a body, and a vacancy starts a new interval. A long
frame produces at most one batch. Downed/dead actors, forbidden spell tags and
unmet attribute requirements cannot replenish; actor/world time scaling applies.
Unseating forgets the clock and the existing minion anchor sweep dismisses
player-owned bodies. Save loading preserves choices, not offline births.

Replenishment does not combine with persistent reservation contracts,
exponential decay, cast waves or corpse sourcing. Validation flags these
combinations and runtime declines them. A future mechanic needing one of those
combinations should extend the shared contract deliberately.

Tree overrides now admit `over.summon.{count,maxActive,duration,replenish}`.
`duration: 0` removes the birth's expiry clock. The resolved `instanceDelivery`
view serves casts, births, reservation caps and previews; unpicked instances
return their original delivery by reference. Pool/monster identity, placement
and contract fields remain outside this override surface.

Exploding actors now carry their actual source and story through the shared
hit pipeline, including minion damage and conversion. Their hit observations
and kill credit reach the summoner through the existing owner chain. This
also affects existing explosive minions, not just Shambling Horde. Ownerless
environmental blasts retain their existing path. This is the main balance
surface to watch during subsequent playtesting.

## Next batches (design directions, not implemented)

The initial class kit and mastery alternatives come first. Then cover the
remaining class unlock pool from `src/meta/unlocks.ts`, including skills shared
with other classes; ownership should not restrict who benefits from a tree.

| Batch | Skills | Distinct directions to develop |
|---|---|---|
| Corpse economy | Raise Dead, Corpse Explosion | Durable attendants, disposable fodder, specialized corpse selection; immediate corpse chains, lingering blight, physical fragmentation. Prevent summoned-body/corpse feedback from becoming an unlimited free loop. |
| Affliction | Poison Nova, Despair | Broad poison coverage, concentrated exposure, persistent pressure; weakening enemies, marking victims for the court, extracting value when afflicted foes die. |
| Anchors and culmination | Bone Golem, Grave Tide | A defensive anchor, aggressive bone breaker, court sacrifice; spending accumulated deaths for a surge, sustained pressure, or a controlled release. |
| Spectral summons | Raging Spirit, Spirit Pyre, Wraith, Infernal Bombardment | Aggressive short lives, delayed potency, positional deployment and alternate ways to sustain pressure. Keep each summon's identity distinct. |
| Bone and harvest | Skeleton Warrior, Skeleton Archer, Reap, Whirling Reap | Formation versus aggression, volleys versus priority targets; harvest utility versus direct execution. |
| Remaining class spells | Venom Bolt, Archon Lance, Sanguine Burst | Infection versus focused delivery; piercing versus concentrated pressure; blood expenditure versus recovery and corpse interaction. |

Each batch should include real behavioral A/B checks, tree/save/wire coverage,
support interaction checks and readable node descriptions. New engine grammar
must include a resolved-read audit and a reusable authoring example.

## Verification

`balance/probe_necromancertrees.ts` is enrolled in the ordinary probe gate. It
covers spending and exclusions, ranked choices, resolved views, save rebuild,
birth cadence, saturation, expiry, cleanup/reset, independent owners, support
scaling, AI pursuit and explosive hit/kill attribution. The standing
`probe_skillmodes.ts` census also validates this graph and its layout.

Run `npm run check`, `npm run probe`, and `npm run sim -- run --suite smoke`.
