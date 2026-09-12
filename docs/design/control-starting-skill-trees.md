# Trapper, Skald and Chronomancer starting trees

`src/data/controlStarterTrees.ts` completes these three opening bars using the
shared 15-node anatomy. Each skill has a four-rank neutral passive and two
exclusive trunks, each with two mids and four leaves. Sibling choices commute;
only opposing trunks exclude. Points arrive at levels 5, 10, 15 and 20.
Unallocated skills keep their original behavior and neutral ranks retain their
delivery, effects and timing identities.

| Skill | First route | Second route |
| --- | --- | --- |
| Caltrops | Spikes hinder enemy movement while they occupy the field | The field follows the caster, cutting pursuers |
| Aftershock Snare | A wider trip radius triggers the original blast | The trap releases Fan of Blades toward its victim |
| Ballista Sentry | Three parallel arrows cover a broader lane | Fewer, stronger sentries leave impales for follow-up hits |
| War Chant | Allies fight faster and can gain physical offense | Allies gain damage reduction and regeneration |
| Dissonance | The song slows enemies and makes them vulnerable | Its pulses poison, with deeper stacking and sustain routes |
| Coda | A wider, forceful ending clears the crowd | Spend exactly two Verse and preserve the remaining bank |
| Stasis Lock | More reliable, longer control from one needle | Multiple piercing needles control a crowd |
| Torpor Field | One durable dome slows hostile shots to 10% speed | Several smaller domes protect separated positions |
| Time Dilation | A smaller, inexpensive rewind returns often | A stronger rewind costs more and returns more slowly |

## Reusable mechanics

Tree `over.construct` resolves selected fields through `instanceDelivery`,
including payload skill, placement/trigger range, lifetime, cap, life and dome
geometry. It cannot change construct kind or invulnerability. Payloads retain
their own skill identities and receive parent tree investment through the
existing construct inheritance path and sockets through ordinary forwarding.

Tree `over.ground.domain` adds ally, enemy or owned-minion modifiers to the
native domain. Separate investments append instead of overwriting one another.
War Chant preserves its half-second exposure requirement and native offensive
blessing; leaving the ring strips its benefits. Dead or downed actors,
constructs, untargetable actors and actors on other stories do not receive
domain effects. Existing domains also gain the downed-actor exclusion.

Tree `over.reduceCooldowns` is a complete seconds/fraction contract on skills
that already rewind cooldowns. The ordinary effect loop still excludes the
rewinding skill itself and never creates a missing cooldown. Temporary blessings
use the existing tracked tree-buff lifecycle.

Tree changes retire the affected instance's constructs and captured work
without firing death rewards, explosions or healing bursts. The cleanup also
finds spent traps through their remaining projectiles, zones and pending work,
even after the actor sweep has removed their body. Other instances and owners
remain untouched.

## Overwound Mechanism support

The new support trades 25% less device lifetime for 35% more autonomous action
speed, with further firing-rate investment per level. Its `periodicConstruct`
gate admits native aimed totems and sentries with a payload. Single-use traps,
mines, passive domes, echoes and unrelated skills refuse it. Eligible skills
carried by summon crews use the usual crew-support path.

The existing `constructCastRate` stat now reaches aimed constructs' attack,
cast and cooldown clocks, matching its existing role on interval-driven
constructs. It does not accelerate projectile flight or multiply damage per hit.
The support joins the earned Trapper bundle. Account loading reconciles
owned bundles with their current gem lists before reward rolls, so existing Trappers receive access
without earning the class again or seeing a duplicate class-unlock notice.

## Playstyle candidates alongside the roadmap

The focused catalog audit found one authored `reduceCooldowns` skill,
Time Dilation, and its engine effect targets the caster. That makes **ally-targeted
cooldown assistance** a concrete candidate for the later mastery-skill pass.
A proposed *Borrowed Second* could restore a bounded amount of an ally's running
cooldown; a corresponding *Shared Seconds* support could distribute a fixed
budget between nearby allies. Keep a shared budget, exclude the triggering
skill, and define minion, downed, cross-story and multiplayer ownership rules
before implementation. This is a proposal, not shipped content.

**Device relocation and salvage** is another candidate for further audit.
Current Trapper skills establish static ground; the new support creates a
reason to rebuild frequently. A proposed *Field Recovery* could retire an owned
device and refund a bounded portion of its remaining deployment cost; a
corresponding *Packed Workshop* support could trade device capacity for easier
redeployment. Check existing recall, impale-extraction, construct-motion and
detonation mechanics first. Refunds must use actual payment and must not also
trigger expiry/death rewards. This remains a candidate, not a claim that every
adjacent mechanic is absent.

Continue complete starting bars first, audit alternate mastery openings next,
then give those alternate skills equivalent trees. Add new playstyle skills
where that audit finds a concrete gap; do not add duplicates merely to fill a
slot. The shared roadmap is `docs/design/class-starting-skill-trees.md`.

## Verification

`balance/probe_controlstartertrees.ts` exercises all 72 terminal routes through
real casts, point budgets, neutral transparency, commuting allocations,
save/network reconstruction, field entry/exit, ownership, resource spending,
rewind arithmetic, dome projectile speeds, real autonomous firing and cleanup.
The new support also runs through the support matrix. Type checks, the full fast
probe gate, balance smoke and the production build accompany the focused probe;
the hidden Electron harness checks all nine tree layouts and allocations.
