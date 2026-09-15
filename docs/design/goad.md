# Goad: barbed stones or a field of effigies

The 15-node tree lives in `src/data/goadTree.ts`. Existing saved node ids remain
stable. Trunks are exclusive, while both forks and sibling leaves within a
trunk can be combined. Unallocated Goad retains its single stone, five-second
cooldown, guaranteed taunt attempt and doubled threat.

## Barbed Challenge

| Former name | New name | Behavior |
| --- | --- | --- |
| Barbed Challenge | Barbed Challenge | 100% bleed application chance, full native hit damage, taunt and threat. Normal ailment resistance still applies. |
| Ready Challenge | Reopening Challenge | A completed cast has a 35% chance to immediately reset Goad and prepare its next cast. Prepared hits consume ordinary bleeds, burst 50% of their remaining damage, and inflict Hemorrhage before applying fresh bleed. |
| Measured Challenge | Measured Reopening | Every 10 seconds, the next completed cast is guaranteed to reset and prepare a follow-up. The first cast is ready; intervening casts retain the 35% roll. |
| Swift Challenge | Driven Barb | Lodge 35% of physical hit damage as impale. An already bleeding victim increases the newly lodged bank by 50%. The next ordinary hit discharges it through native impale rules. |
| Deep Barb | Splintering Barb | Main impacts release two forward-fanning splinters, each at 45% damage. They inherit bleed, impale, taunt and prepared wounds. Splinters cannot splinter again. |
| Patient Barb | Orbiting Ballast | Main and splinter impacts leave a rock orbiting that victim for three seconds, striking other nearby enemies at 30% of the originating projectile's damage. Radius 52, per-victim rehit interval 0.65 seconds, maximum 12 rocks. |
| Feeding Barb | Feeding Barb | Recover 6% of damage from Goad's actual bleed ticks, including wounds delivered by splinters and orbiting rocks. |

Orbiting rocks follow their struck victim rather than their owner. If that
victim dies, the remaining orbit stays at its last position. Rocks cannot
create more rocks or splinters. Prepared follow-ups are captured per cast, so
an older airborne stone cannot acquire a preparation earned by a later cast.
Reopening uses native Hemorrhage, including its ordinary reapplication rules.

## Goading Effigy

| Former name | New name | Behavior |
| --- | --- | --- |
| Pack Challenge | Goading Effigy | Ground-targeted stone toss, up to 420 units. On landing, create a destructible effigy with 100 base life for six seconds. No direct throw damage; eight-second base cooldown. Taunt within 180 units every second; thorns equal 150% of Goad's average damage. Normally one construct. |
| Certain Challenge | Lodged Contagion | Allied primary hits against a victim inside the aura lodge impale in other enemies within 110 units of that victim. Each propagation adds 20% of the triggering hit's damage to the recipient's bank. |
| Living Challenge | Field of Wounds | Enemies inside each aura suffer physical bleed damage per second equal to 25% of Goad's average damage. Each field is a distinct exposure; overlapping effigies stack. |
| Lasting Challenge | Standing Provocation | 40% increased effect duration and a base cap of five effigies. Duration and cooldown investment enable overlapping constructs. |
| Seeking Challenge | Resonant Provocation | Each successful taunt has a 45% chance to mark an aftershock at the victim's location: 0.55-second delay, radius 65, 55% Goad damage. Moving away avoids it. |
| Large Stones | Rolling Upheaval | 30% of initial aftershocks become greater shocks: radius 110, 100% damage. Each then releases three standard echoes at 0.25-second intervals. Echoes cannot grow or reproduce. |
| Passing Challenge | Burrowing Pursuer | Each effigy hosts a protected underground pursuer. It idles in a figure-eight, moves its center toward nearby prey, circles that prey, and remains inside the effigy's radius. |

The pursuer moves its center at 180 units/second, pelts its selected prey at
40% Goad damage every 0.8 seconds, and leaves radius-24 ground patches every
0.2 seconds. Each patch lasts 1.2 seconds and deals 12% Goad damage per tick
at 0.3-second intervals. The pursuer retires when its effigy dies. A maximum
of 32 initial aftershocks may be pending per effigy; echo generation is finite.

Field wounds count for bleeding conditions but have no lasting wound bank.
They disappear on leaving the radius or losing the effigy. They neither merge
with ordinary bleeds nor become portable wounds through status transfer.
Reopening does not consume field exposure. Normal resistance and mitigation
still apply. Impale propagation deals no hit itself, and aftershocks and
burrow damage are secondary payloads, preventing recursive propagation.

Both the taunt pulse and field use the same invested area radius. Effigies
use normal construct life, duration, capacity, targeting and retaliation.
The neutral **Practiced Goad** grants 15% increased damage per rank, reaching
direct stones and the damage from which effigy thorns and wounds derive.

## Ownership and verification

`engine/challengeSpec.ts` resolves node mechanics; `engine/challenges.ts`
owns cast preparation, inherited stones, delayed landings, fields, shock
queues and pursuers. Payloads retain their exact host instance. Respec,
unseating, owner removal/death and zone travel retire that host's pending
work. Another owner's constructs and ordinary enemy bleeds remain intact.
Only normal skill investment persists; preparations and devices are transient.

`balance/probe_goad.ts` checks real hits, cooldown reset timing, child payloads,
retaliation, field exit and transfer rules, accumulated impale, invested area,
duration and capacity, aftershock echoes, burrow motion and damage, save
rebuild, and cleanup during flight. It also checks Tamer's starting hound and
fallback family art. `probe_bondstartertrees` retains its 72-route contract;
the fast probe roster, type checks, simulation smoke and desktop boot smoke
provide the surrounding regression coverage.
