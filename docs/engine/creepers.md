# Carried creepers

**Barrow Creeper** is an autonomous, untargetable carried follower. The
**Barrowbound** prefix on rings and amulets (item level 14+) grants one.
Separate equipment sources stack to three creepers across all families.
It occupies no actor, health pool, collision body, skill-bar or summon slot.

It wanders near the bearer using irregular random waypoints, locks onto a
nearby visible enemy, follows that enemy, and breaks the ground in small
physical eruptions. A broken pursuit or leash enters a distinct return
state; it reaches home before looking for another victim. The moving ridge,
fading soil wake, committed cracks and eruption carry the signal. No new
combat captions or magic-pack recipes are added.

This borrows the underground follower fantasy from Goad's Burrowing Pursuer,
but Goad retains its own construct-hosted figure-eight and damaging patches.
The carried follower has an independent registry and state machine, uses the
bearer as its moving home, and leaves only a visual trail. Neither conductor
contains family-specific behavior branches.

## Initial tuning

| Property | Barrow Creeper |
| --- | --- |
| Acquire / leash / return-complete distance | 210 / 270 / 45 from bearer |
| Idle wandering radius | 100 |
| Travel / returning speed | 145 / 235 units per second |
| Waypoint duration | Random 0.65–1.4 seconds, or arrival |
| Initial emergence | 0.8 seconds |
| Eruption warning / recovery / impact flash | 0.3 / 0.9 / 0.22 seconds |
| Eruption radius / base damage | 27 / 4–6 physical |
| Stuck recall delay | 2.5 seconds |
| Soil wake | One mark per 9 traveled units, fades in 0.8 seconds |

Damage uses the bearer's standard skill-level ladder and hit resolver,
including typed scaling, defenses, on-hit effects, reflected damage and kill
credit. `physical`, `aoe`, `creeper` and `creeper:barrow` scopes scale its
payload. `aoeRadius` sets the exact committed warning and impact footprint.
Satellite and minion bonuses do not independently scale a player's carried
creeper. A minion bearing a grant uses its own derived sheet.

## Authoring and ownership

`src/engine/creeperSpec.ts` defines `CreeperDef`, registration, stat metadata,
validation and shared budgets. `src/data/creepers.ts` registers the shipped
family and ordinary hidden ground skill. New families specify their payload,
tags, acquisition and leash distances, motion, timing, body size and paint.
Skill effects remain ordinary payload data, separate from locomotion.

Grant with `mod('creeperCount_barrow', 'flat', 1)` in any normal modifier
source: equipment, passives, buffs, monster sheets or authored encounters.
Fractional sources add before flooring. `creeperSpeed` multiplies travel
and return speed (base 1, bounded 0–3). Family counts are capped, and the
shared `CREEPER_CFG.maxPerActor` limit is distributed in registry order.
There is no new passive-tree node in this debut.

`src/engine/creepers.ts` owns transient followers, target locks, warning clocks
and soil trails. Every follower has a private deterministic PRNG seeded by
bearer, family and slot; wandering cannot perturb the combat or loot RNG.
No global-time figure-eight or orbital travel is used. Targets stay selected
until death, ineligibility, loss of sight or departure beyond the leash.

The world supplies the existing story-specific navigation field and swept
terrain clamp. Travel cannot step through masonry or onto another story.
Ordinary bearer movement pulls home and the leash along with it. If terrain
strands a follower for the authored recall duration, it resurfaces at its
bearer, discards its old wake/commitment and earns emergence again. Large
bearer teleports similarly reseat followers without a damaging travel chord.

An eruption freezes the follower at its warning point. After the full
windup it hits current eligible occupants once, checking story, hostility
and line of sight. Moving out dodges it; moving in can be hit. Warnings store
their radius, so area changes cannot silently widen an already drawn mark.
Recovery is separate from travel. Target loss or breaking the leash cancels
an outstanding warning; returning followers cannot erupt.

Dead, downed, removed, passive, concealed, burrowed or untargetable bearers
retire followers. Grant/count, definition, story, allegiance and large
position changes rebuild them with fresh emergence. Damage callbacks
revalidate the bearer, so reflection cannot leave additional ghost hits.
Clocks and movement respect bearer timeflow, cap long frames, and remain
unchanged under zero-time refreshes. Per-follower soil trails are bounded.

Equipment and other grant sources save normally; autonomous positions,
targets, clocks and trails are intentionally transient. Co-op snapshots
deep-copy exact host geometry, including trails and warning progress.
Replicas render it without running another damage clock. Missing snapshot
fields clear old geometry; zone travel clears runtime state.

## Verification

- `npm run check`
- `npm run probe -- creepers`
- `npm run probe -- goad`
- `npm run probe -- satellites`, `auroras`, and `guardians`
- `npm run sim -- run --suite smoke`
- `npm run build`, then `npx electron balance/creepers-ui.cjs`

The probe uses the real world, equipment and save paths. It exercises
deterministic irregular roaming, prey commitment, return hysteresis,
30/60/120 Hz warning/dodge behavior, current-occupant damage, scaling,
actual grid-wall detours, stuck recovery, timeflow, lifecycle cleanup,
monster/allied attribution, reflection and co-op deep copies. The isolated
hidden client verifies and captures roaming, pursuit, windup, impact,
return and a three-creeper brood while rejecting explanatory captions.
The values above are initial tuning, not a campaign balance conclusion.
