# Encounter combat coordinator

The coordinator is an opt-in utility planner above the existing creature AI.
It observes a group, selects a shared maneuver, warns the player, commits for a
bounded interval and then regroups. Normal skills, mana, ammunition, cooldowns,
turning, navigation, morale, defenses and damage still resolve the fight.

## Repertoire and counterplay

| Plan | Opportunity | Execution | Player opening |
| --- | --- | --- | --- |
| Protect support | A known enemy approaches the support line; greater injury raises priority | One guard interposes for a named support, the support makes distance, shooters widen their angles | Separate the guard, challenge it away, or disable the conductor |
| Crossfire | At least two ranged roles and a target 180–560 px from the leader | Shooters move toward committed lateral firing points through the existing crossfire kernel | Close during relocation; punish their subsequent firing hold |
| Pincer | Two flankers and a nearby target | Two bodies orbit while a guard presses the front | Bait the sides, use area control, or leave their useful range |
| Covered withdrawal | A guard has lost at least 55% life | One guard retreats for two seconds while shooters hold and cover | Chase past the screen or pressure the stationary shooters; withdrawal ends |
| Root barrage | A controller and ranged role have a target nearby; clustered observed foes increase priority | Both hold ground and focus their normal kits on one quarry | Dodge the native pull or area warning; exploit the planted bodies |
| Countercast | A controller sees a cast with at least 1.6 s remaining | Controller and shooters commit to a planted response against that quarry | Feint, interrupt your own cast, or finish and reposition during their warning |

Plans have no damage multiplier and do not force a skill or bypass its cost.
Countercast is a positional response, not an automatic interrupt. Root barrage
combines the members' actual skills; it does not create roots for a creature
that lacks them. Encounter-specific cue profiles dress fungi, vermin, plants and handlers
using the same plan. GT-012 replaces plan/recovery captions with live body
preparation and conductor gestures; see [warning cues](warning-cues.md).

Warnings last 1–1.4 seconds. Commitments last 1.8–2.6 seconds, then participating
members hold ground and use a slower decision cadence for 1.6–2 seconds.
Ordinary in-flight casts finish normally. Existing morale, tethers, taunts and
explicit commands remain authoritative. Plans have an additional 7–10 second
cooldown and the coordinator samples opportunities every 0.35 seconds by default.

## Observations and decisions

`engine/encounterCombat.ts` gathers only local, ready members of the same group
and story around a living leader. Known targets come from those members' current
AI target or attacker IDs and must still be hostile, visible, targetable and in
line of sight within the communication radius. The planner does not inspect
player builds, equipment, key presses, future attacks or unseen actors.

`EncounterConsideration` reads distance, role injury, pressure near a role,
observed target clustering, remaining visible cast time or role count. `when`
gates admit a plan; `base + sum(fact × weight)` ranks admitted plans. Stable
registry order breaks ties. There is no planner randomness or per-frame reroll.
The chosen target identity is fixed for that commitment. A plan can continue
after its triggering opportunity changes, so baiting it is useful.

A dead, captured, stunned, frozen, burrowed or otherwise unavailable conductor
breaks coordination. Losing required roles, target visibility or the target's
story also ends the maneuver. Disruption enters recovery and retains the plan's
cooldown. Individual assignments refuse beyond communication range, across
stories or while an explicit command is controlling the member. Taunts outrank
tactical focus. The planner never cancels an already launched skill.

## Extending it

`data/encounterTactics.ts` owns six reusable plans and shared timing/range defaults.
Each plan declares required role counts, eligibility and scoring considerations,
role assignments, warning, duration, recovery, cooldown and optional recovery
tuning. An assignment selects roles, caps participants, supplies ordinary
`BrainTuning`, and optionally names a shared target and a ward role.

`EncounterGroupDef.encounterCombat` explicitly opts a roster in:

```ts
encounterCombat: {
  plans: ['protect_support', 'crossfire', 'covered_withdrawal'],
  roles: { vanguard: 'guard', mender: 'support', scout: 'ranged', arcanist: 'ranged' },
  minLevel: 10,
  thinkEvery: 0.45,
  radius: 600,
  cues: { protect_support: { style: 'cover', color: '#a8d68b' } },
}
```

Role mappings make plans reusable across different slot names. Omitted roles
use the slot's original `role`. Omitted coordinator data leaves ordinary squad
behavior intact. Body level and each plan's minimum level independently gate
availability. New movement mechanisms should register with the shared AI
vocabulary, so players, companions and other enemies can use them too.

`Actor.encounterOrder` attributes the current assignment to its group, recipe,
plan, leader, phase and expiry. It is a transient overlay at AI resolution,
never a mutation to the species brain. Co-op carries the compact identity/phase
cue plus resolved gesture/progress, while the host owns planning. Saving or leaving a zone preserves the group
and its survivors but drops transient plans; returning starts with fresh warning
requirements. World-local state is discarded on zone changes and group removal.

## New encounters

This pass adds twelve groups, bringing the registry to 47 across 19 factions.
All use the same habitat and hard debut rules as existing groups.

| Group | Faction | Level | Composition |
| --- | --- | --- | --- |
| Ashen Hunting School | Demon | 12 | Houndmaster, two posted hounds, two roaming hounds, fire caster |
| Rootwild Snare Nursery | Rootwild | 13 | Dragbloom, coilmaw, nectar bell, thornfan, two burrlings |
| Spore-Tender Escort | Fungal | 9 | Tender, brute, two spitters |
| Myconid Sporecourt | Fungal | 14 | Capcaller, two spore drifters, two warriors |
| Scripture Guard | Hollowborn | 12 | Scripture harness, vanguard, two singing helms |
| Unworn Procession | Hollowborn | 16 | Saint, shield anima, two empty suits |
| Cinder Liturgy | Emberkin | 10 | Chorister, slag brute, two ashlings |
| Ember Drovers | Emberkin | 12 | Shepherd, slag brute, two cinder hounds |
| Piper's Ambush | Vermin | 10 | Piper, fester rat, two skulkers |
| Warren Coven | Vermin | 14 | Broodpriest, two pipers, two fester rats |
| Ruin Blowgun Screen | Junglekin | 12 | Spore caller, saurian bulwark, two blowguns |
| Rift Observatory | Abyssal | 18 | Horologist, ascetic, two foldwrights |

Eight existing groups also opt in: both Wayward expeditions, Powder Line,
Nectar Patch, Drag Garden, Seedbed Wardens, Ashen Post Detail and Spear Net.

## Verification

`balance/probe_encountercombat.ts` exercises all six utility choices and their
phase timing, interruption, conductor death/capture, lost support, walls,
invisibility, story separation, real AI interposition and damage, taunt priority,
observed-only targeting, level gates, unchanged resources, squad isolation,
co-op clearing, revisit reset and tether limits. `probe_encountergroups.ts`
audits all 47 rosters and their habitats. `encounter-combat-ui.cjs` captures the
warning and committed fight and kills the conductor in the real hidden client.

These are authored utility tactics, not a learned planner or a search over
arbitrary skill combinations. Broader build-by-build balance remains iterative;
the initial pass deliberately exposes commitments and disruption opportunities.
