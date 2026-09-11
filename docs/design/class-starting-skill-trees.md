# Class starting skill trees

## First batch: fresh-account classes

Warrior, Magician and Rogue now have complete trees for all three skills on
their starting bars. The scope follows `STARTER_CLASSES` and the class `bar`
data; unlockable classes are the next batches. This establishes equal depth
of choices, not a claim of equal damage or survivability.

Each skill has a four-rank neutral passive and two mutually exclusive
identities. Each identity has two forks, each with two leaves: 15 nodes in
total. Descendants remain mixable. Four total points arrive at skill levels
5, 10, 15 and 20, so a player can keep the original skill, mix the neutral
passive with a branch, or specialize entirely within one identity.

| Class | Skill | First identity | Second identity |
|---|---|---|---|
| Warrior | Cleave | Physical impales, sustain and execution | A traveling crescent with reach, breadth and heavier hits |
| Warrior | Shield Up | A rear shell, minion shelter and guarded utility | Timed parries and an investable release bash |
| Warrior | War Cry | A blessing shared with nearby allies and minions | Preparation consumed by one landed attack hit |
| Magician | Firebolt | Orbiting flames, additional orbs and spreading burns | Faster piercing bolts with penetration and prolonged burning |
| Magician | Frost Nova | Persistent cold ground and stack capacity | Deep Freeze procs and damage against frozen targets |
| Magician | Chain Lightning | More bolts and chains through crowds | Returning bolts with the innate chains removed |
| Rogue | Backstab | Chaos conversion and accumulating poison | Physical impales and positional execution |
| Rogue | Cloak | True invisibility with mobility and close-range ambushes | An offensive veil that breaks when a hit lands against its bearer |
| Rogue | Shadow Step | A temporary blessing for the next landed attack | Brief invisibility with defensive escape investments |

Base definitions retain their existing damage, cost, attributes, delivery and
effects. Players without allocations keep the original behavior. The current
Shadow Step crosses to the far side of the target relative to the approach;
it does not guarantee the target is facing away after arrival.

## Reusable temporary buff mutations

`SkillTreeNode.buffs` is an array of typed `TreeBuffPatch` entries, keyed by
buff ID. `instanceEffects` resolves them without mutating the skill catalog:

- Modifiers append per allocated rank to the buff, not to the permanent
 character sheet. Existing buff modifiers are retained.
- A patch with `duration` can create a new buff; an append-only patch must
 find that buff in the base skill or on every prerequisite route.
- Duration, recipients, radius, hit fragility, consumption and next-hit riders
 are scalar identities. Put scalar replacements on exclusive trunks;
 independent descendants should append modifiers or skill-scoped stats so
 their allocation order has no gameplay meaning.
- `affects: 'allies'` grants once at cast completion to living, non-downed
 actors on the caster's team and story, including the caster and minions,
 excluding constructs. Radius scales through the granting skill's area
 stat and intersects the recipient's body. This is a snapshot blessing,
 not a continuously following aura.
- Effect duration uses the granting skill's existing duration resolver.
 Buff modifiers then apply through the recipient's normal stat sheet.
- `consumeOn` uses the existing event pipeline. A prepared attack survives
 spell hits and ends after the landed attack it empowered. It is a hit
 budget, so a multi-target attack spends it on its first qualifying hit.
- `clearOnHit` protects the hit that breaks the buff. Damage-over-time ticks
 do not count as landed hits. Invisibility follows existing stealth rules:
 an offensive act breaks it; instant melee can hit before that break, while
 a projectile arriving afterward is no longer a hidden strike.
- Each mutated application records its caster and skill instance. Respec
 removes that instance's remaining blessings, including allied recipients,
 and cancels its pending fuses and held stance. Another caster's later refresh survives.
 Ordinary, unmutated buffs retain their existing grant behavior.

Tree hover text displays temporary modifiers separately. Skill previews use
resolved effects for buff duration and ally radius. Mutated host tags admit
corresponding supports (Warband Call gains area; Shadow Step's new blessing
gains buff and duration). All grafts and damage, guard, ailment, flight,
resource-payment shielding and stealth mechanics reuse shared systems.

## Verification and next batches

`balance/probe_startertrees.ts` derives the initial skill census from account
and class data. It covers all 72 terminal routes through actual casting,
passive-only ranks, exclusive roots, mixed forks, registered modifier stats,
save rebuilds, network rebuilds, ally eligibility, recipient timing, buff
consumption, stealth, hit fragility and source-specific respec cleanup.
It is enrolled in the fast probe gate. The ordinary type checks, full fast
probe suite, balance smoke suite and production build accompany this batch;
a hidden real-game UI pass checks the nine rendered trees and allocations.

Continue with the starting bars of unlockable classes in thematic batches.
Keep a complete three-skill bar as the unit of initial parity. Necromancer's
broader progression remains a separate ongoing batch. Tune numerical power
with comparable early-game encounters after the mutator foundations stand.
