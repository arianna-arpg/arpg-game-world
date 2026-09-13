# Sentinel, Warlord and Wallwright starting trees

This batch completes the nine starting skills of Sentinel, Warlord and
Wallwright. Each has the shared 15-node binary anatomy: two exclusive
identities, two independent forks per identity, two leaves per fork, and a
four-rank neutral investment. Points arrive at levels 5, 10, 15 and 20.
Sibling forks and leaves can be combined; their allocation order has no
gameplay meaning. Unallocated skills keep their original behavior.

Authoring lives in `src/data/bastionStarterTrees.ts`. The catalog attaches the
trees to existing definitions; there are no new class skills, supports,
starting-bar replacements or mastery rewards in this batch.

## The complete bars

| Class / skill | First identity | Second identity | Neutral, per rank |
|---|---|---|---|
| Sentinel — Spiked Bulwark | Living Hedge: stronger thorns and wound reflection while guarding, for less guard capacity; deepen retaliation, ally mending or readiness. | Answering Spikes: graft Answering Wall for a real release bash; invest in payoff, capacity or an easier arming line. | 15% increased guard strength. |
| Sentinel — Bristleback | Sheltering Quills: allies take less damage in a smaller aura; armor, regeneration, ailment resistance and retaliation branches. | Hunting Quills: allies add thorns to their hits but take more damage; attack accuracy, leech, speed or an enemy movement slow. | 10% increased aura radius. |
| Sentinel — Reprisal | Quilled Answer: add the caster's thorns to the slower answering strike; bleeding and restitution branches. | Sweeping Rebuke: a 240-degree answer with less damage; reach, crowd recovery, stun and poise investment. | 15% increased physical damage. |
| Warlord — Battle Standard | Sheltering Colors: add damage reduction to the native rally; banner durability, healing, armor and coverage. | Conquering Colors: attack and cast speed beneath a shorter-lived banner; offensive rally bonuses, more fronts or an enemy slow. | 12% increased cooldown recovery. |
| Warlord — Single Out | Warband Verdict: retain the single-target mark and prepare nearby allies' next landed attack; accuracy, leech, coverage and readiness. | Personal Challenge: retain the mark and grant a private defensive/thorns stance; armor, thorns-to-hit and regeneration. | 12% increased cooldown recovery. |
| Warlord — Challenging Shout | Rallying Challenge: retain the taunt and bless nearby allies with movement and ailment resistance; armor and regeneration deepen the rally. | Defiant Challenge: retain the taunt and brace the caster with guard strength and thorns; reflection, armor and ailment resistance. | 12% increased cooldown recovery. |
| Wallwright — Stone Rampart | Holding Masonry: tougher segments draw attention for a higher mana price; lifetime, segment cap and construction economy. | Answering Masonry: graft Answering Wall so destruction or expiry releases a bash; deepen rubble impact or rebuild faster. | 15% increased segment life. |
| Wallwright — Toppling Stroke | Demolition Stroke: guaranteed sunder and greater poise damage for a slower swing; armor penetration, duration and stun. | Clearing Stroke: a 240-degree sweep with less damage; reach, crowd recovery and knockback. | 15% increased physical damage. |
| Wallwright — Shield Charge | Answering Charge: graft Answering Wall for an arrival bash in addition to the corridor attack; guard capacity, payoff and readiness. | Sheltering Charge: a defensive blessing at charge start; extend shelter, recover life, grow thorns or improve the passage. | 15% increased physical damage. |

Reprisal always retains its three-second recent-wound gate, including refusal
before payment. Challenging Shout remains usable behind a raised guard.
Stone Rampart still raises three barrier segments, and Shield Charge retains
its corridor, movement and native stun/shove. No tree invents friendly-wall
demolition or grants a new target-selection rule.

Answering Wall uses its existing mechanism-specific payout: remaining shield
for a held guard release, the existing guard-scaled arrival formula for a
dash, and segment maximum life for a destroyed/expired barrier. The existing
socketed-twin rule prevents two copies of the same graft. Mending Hedge uses
the native guard-mending fabric: other allies within 160 units, scaled by
healing power; it does not heal the bearer.

## Shared aura mutation

`SkillTreeNode.over.aura` is a `TreeAuraPatch`, restricted to additive
`allyMods` and `enemyMods`. It requires a native aura delivery or an existing
aura-bearing construct. It cannot create an aura on unrelated skills, change
upkeep, replace a delivery, or add pulses or deactivation attacks.

`instanceTreeOver` composes the arrays across independently selected nodes;
`instanceDelivery` appends them to a copied native aura spec. All aura-bearing
nodes in this batch are single-rank. Ranked neutral nodes use ordinary
skill-local modifiers. Native definitions and their arrays are never mutated.
The resolved delivery feeds ordinary toggle activation and construct minting;
the active aura captures its composed recipient spec. Save and network skill
rebuilds reconstruct the same delivery from the picks. Node hover text
distinguishes allied and enemy field modifiers from caster-local modifiers.

Bristleback preserves its existing toggle/reservation rules. Battle Standard
preserves the native planted pylon, lifetime scaling, and its level-12 extra
banner threshold. Another Front adds one to that resolved cap. Overlapping
banners remain independent aura sources and their modifiers stack under the
existing stat rules; this batch does not turn them into one strongest-only
rally. These values are initial mutator tuning, not a completed balance pass.

Continuous auras retain their existing recipient contract, including allies
and minions on the same story, with native behavior for downed actors and
constructs. Enemy modifiers use the existing enemy query. Leaving the area
strips the field's source. This differs from a `TreeBuffPatch` snapshot
blessing: snapshot allied buffs exclude dead, downed, other-story and
construct bodies, and keep their duration after the recipient walks away.

Warband Verdict's preparation is a landed-hit budget: a qualifying attack
benefits and then consumes it; spell hits do not. It is not reserved for the
marked victim or for an entire multi-target attack. Every recipient owns
their own preparation. Native taunt and exposure still affect the selected
target. Other Warlord blessings use the existing cast-completion buff seam;
Sheltering Charge grants its blessing at dash start.

## Allocation and cleanup

Tree changes already retire held casts, pending repeats, fields, projectiles,
source buffs and owned constructs. This batch also removes captured active
aura sources and reservations immediately. Previously a quietly retired
banner could leave bonuses on recipients because dead bearers are skipped by
the normal aura update loop.

`clearTreeFields` deactivates only the matching caster/instance aura;
construct cleanup strips each retiring body's aura sources before marking
the body dead. Another caster's applications and unrelated device instances
survive. `quietTreeRelease` suppresses a deactivation attack during this
retirement; native resource debts still settle. Ordinary toggle-off,
destruction and natural expiry retain their normal release behavior. New
investment also retires a running unallocated aura before the changed tree
can be activated again. No old allocation can keep free reservation or
recipient bonuses running after a reset.

## Verification

`balance/probe_bastionstartertrees.ts` exercises all 72 terminal routes with
actual casts, checks neutral transparency, milestone budgets, exclusive
roots, mixed forks/leaves, save/network reconstruction and finite registered
modifiers. Behavioral cases cover aura activation/exit/overlap, actual
thorns-to-hit damage, reservation release, source-specific immediate cleanup,
enemy slows, banner caps, command blessing eligibility and consumption,
recent-wound refusal, held-guard casting, retaliation, ally mending,
destruction/expiry versus quiet retirement, charge arrival, expanded arcs,
guaranteed sunder and graft deduplication. The probe is enrolled in the fast
roster. Type checks, the full fast suite, balance smoke and a production build
accompany a hidden real-game pass over all nine rendered trees.

Future skill/support proposals remain separate in
[the candidate backlog](skill-support-candidates.md). The next work remains
complete starting bars, then mastery swap coverage, then alternate-skill trees.
