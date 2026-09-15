# Command: Assault

Native tree: `src/data/assaultTree.ts`. Runtime: `src/engine/assault.ts`.
Stable node ids preserve existing allocations. No tree node grafts a support.

## Orders and offensive preparation

The base cooldown is **8 seconds**, with the existing six-second assault and
whole-court Recall. Clear Orders grants 8% cooldown recovery per rank; each
rank also grants commanded minions 10% increased movement, attack and cast
speed and 3% increased damage for six base seconds.

| Node | Behavior |
| --- | --- |
| Killing Signal | Next landed hit per minion deals 20% more damage and banks 20% of each rolled damage type as a matching impale. Preparation lasts six base seconds. |
| Unerring Signal | Preparation bypasses evasion, hit dodges and area avoidance; invulnerability, blocking, mitigation and plies remain defenses. |
| Inescapable Signal | A normal melee swing captures an initially reachable enemy when its windup starts. At completion it hits that enemy even outside reach, once. Dead, untargetable, friendly or different-story targets are rejected. Projectiles and traveling melee sweeps retain their geometry. |
| Dooming Signal | All landed minion hits add chaos Doom equal to 40% of life damage. Uses the existing fixed fuse, accumulated payload and lethal-Doom resolution. |
| Rapid Signals | Each landed minion hit has a 20% chance to refund 0.25 cooldown units. |
| Banked Orders | Refunds earned while already ready accumulate. Each full adjusted cooldown adds another prepared hit on the next Assault, capped at five total. Fractional credit carries forward. The hotbar displays hits and bank progress. |
| Rising Tempo | Each spent prepared hit adds 10% movement, attack and cast speed for four seconds, stacking five times and refreshing on application. |

Typed impales are separate statuses for physical, fire, cold, lightning and
chaos. An incoming top-level damaging hit first releases banks matching its
positive rolled damage types, then plants any fresh preparation payload.
Unmatched banks remain. They expire harmlessly after eight seconds. Ordinary
physical `impaled` retains its existing any-hit discharge behavior. Impale
releases do not recursively count as hits or refund Command.

Preparation counters are separate from buff stacks, so three prepared hits
still grant 20% more damage, not three times that bonus. Plies can consume a
prepared contact without taking life damage. A miss does not consume it.
Persistent dots and secondary blade bursts cannot refund or spend preparation.
Pooled throng bites can contribute cooldown refunds and Doom without promotion.

## Defensive and active branches

| Node | Behavior |
| --- | --- |
| Sheltered Advance | One temporary ply per commanded minion for six base seconds. Enemy-shattered plies burst in a 48-radius physical area. Temporary plies break first and never stack through recasting. |
| Defensive Formation | While equipped and ready, a 200-radius aura gathers owned minions into a defensive ring. Nearby minions share 30% of incoming caster life damage evenly. |
| Nourishing Formation | Aura minions gain 4 flat life regeneration multiplied by the owner's minion damage multiplier. |
| Offensive Formation | During cooldown, owned minions gain 10% more damage. The ready aura resumes afterward. |
| Orbiting Advance | On Assault, each current ply becomes an orbiting contact blade while retaining protection. The blade disappears with its ply. Each blade can hit a given enemy once per 0.3 seconds. |
| Convoking Advance | Recall teleports minions sequentially at up to 0.035-second intervals, compressed to return the full court within 0.5 seconds. Each leaves a 65-radius physical aftershock. |
| Returning Bulwark | After a ply breaks, three damaging blade contacts rebuild one temporary ply. Once per minion per Assault; the replacement expires with the original blessing. Other surviving blades are needed to rebuild. |

Blade base damage is 4–6 plus 1.5 per minion level, using the minion's damage
scaling. Orbit contacts use 60%, shatter bursts 65%, Recall aftershocks 130%.
All area/contact checks respect hostility and story elevation. Shared life
damage cannot redirect more health than the receiving minions have. It uses
the common life-wound gate, including lethal callbacks.

Respec, unequip, death and ownership loss remove native preparation, counters,
temporary plies, modifiers, formation orders and queued teleports. Native
plies survive expiry. Co-op snapshots carry the bank, orbit and aura visuals.

## Hivecall companion change

Swarm Sovereign generates **2 Sovereignty per second** while at least one
living base Swarmling exists, independent of body count. Deaths still grant
20. Temporary Royal Guard offspring do not enable passive generation.
Perpetual Reign permits both sources while transformed: living Swarmlings
offset 0.36 seconds of form decay per second; deaths add 3.6 seconds.

## Verification

`npm run check`, `npm run probe -- assault`, `npm run probe -- hivecall`,
`npm run probe -- frontierstartertrees`, and `npm run sim -- run --suite smoke`.
`balance/assault-ui.cjs` exercises tree layout, the bank HUD, protective orbit
rendering and ready formation in a hidden desktop window with disposable saves.
