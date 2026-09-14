# Resonator starting skill trees

`src/data/resonatorStarterTrees.ts` completes the Resonator's opening bar:
Tuning Strike, Shatterchord and Purity of Elements. Each uses the shared
15-node binary builder: two mutually exclusive identities, two independent
forks per identity, two additive leaves per fork and a neutral four-rank node.
Raw skill levels 5/10/15/20 grant the four milestone points. Both forks or both
leaves can be combined; allocation order does not change the result.

## Native mechanics and the identity contract

Tuning Strike's three native status effects roll **independently**, at 34%, 33%
and 33%. They are not a single exclusive element selection. An ordinary hit
can leave zero, one, two or three tones. The attuned statuses are beneficial:
each elemental tone grants its bearer 15% increased damage of that element,
12% physical conversion to it and 10% resistance to it. Their base duration is
six seconds, scaled by the existing duration machinery. This batch preserves
that bargain, including the enemy's benefits and the existing resistance checks.

Native Shatterchord deals its three-element nova without a special attunement
bonus or status consumption. Its original flavor text overstates the native
synergy. This batch does not change the unallocated skill; Sympathetic Ruin
explicitly supplies the payoff through the existing victim-scoped stat system.
Despite the skill's name, neither branch consumes tones. Crystal tone changes,
puzzle listeners and the separate `shatterStatus` mechanic remain their own
existing contracts.

Purity retains its native allied fire/cold/lightning/chaos resistances,
ailment resistance, 35-mana reservation and toggle behavior. All new recipient
modifiers append through `TreeAuraPatch`; there is no replacement aura or new
resolver.

## Identities

| Skill | First identity | Second identity | Neutral investment |
| --- | --- | --- | --- |
| Tuning Strike | **Full Peal:** +67% status chance makes all three native tone attempts certain before resistance; 20% slower attacks. Invest in duration, armor penetration, leech, reach, speed or cost. | **Choir Sweep:** a 240-degree arc with 20% less damage. Invest in reach, life on hit, poise damage, speed, duration or accuracy. | +15% increased physical damage per rank. |
| Shatterchord | **Sympathetic Ruin:** 30% more damage per live elemental tone, multiplying to 2.197× at three tones; 20% less radius. Invest in penetration, leech, poise damage, recovery, reach or cost. | **Damping Chord:** guaranteed stun attempts before resistance, with 20% less damage. Invest in radius, stun duration, life on hit, recovery, cast speed or cost. | +15% increased damage per rank. |
| Purity of Elements | **Sheltering Harmony:** allies take 12% less damage; 20% less radius. Invest in ailment resistance, regeneration, armor, reach, movement or resistances. | **Resounding Harmony:** allies gain 25% increased damage of each element but take 10% more damage. Invest in attack/cast speed, penetration, leech, reach, movement or slowing enemies. | +10% increased aura radius per rank. |

Full Peal's global skill-local status chance also improves any status effects
added by supports. Duration strengthens the tones' lifetime, not their native
beneficial modifier magnitudes. Sympathetic Ruin tests each victim's actual
live status list, so ordinary enemies and attuned environmental bodies share
the same payoff. A missing tone contributes no multiplier. Elemental
penetration counters attunement's resistance gift through ordinary damage math.

## Lifecycle and persistence

All investment is stored as ordinary `treeNodes`. No account/class mastery,
rekindling, alternate starting selection, save schema or network schema changes
are needed. Save and co-op rebuilds rederive modifiers and aura patches.

Allocation and Font reset retire the owner's active Purity aura and immediately
release its reservation and ally/enemy modifier sources. Another bearer's aura
continues. Ordinary toggle-off and leaving the field use the same source
cleanup. Tuning Strike's already-applied target statuses expire normally after
respec; they are historical hits, not live owner auras. Reset does not invent a
second hit, consume those statuses, or mutate crystal puzzle state.

## Verification

`balance/probe_resonatorstartertrees.ts` is enrolled in the fast probe roster.
It exercises all 24 terminal routes with actual casts, milestone boundaries,
exclusive identity gates, mixed fork/leaf allocation order, neutral investment,
unchanged unallocated views, save/network rebuilding, independent native tone
rolls, guaranteed three-tone attempts, actual tone duration, flank coverage,
0/1/2/3-tone damage ratios, penetration, stun duration, radius tradeoffs, native
aura composition and reservation, recipient boundaries and source cleanup.

Run `npm run check`, `npm run probe -- resonatorstartertrees --jobs 1`, the
existing starting-tree/victim-scope/aura probes and `npm run sim -- run --suite
smoke`. Integrated build, full probes and desktop UI verification belong to the
parent batch.
