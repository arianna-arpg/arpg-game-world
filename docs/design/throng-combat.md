# Small-army combat and Hivecaller

The starting Hivecall swarm had 12 base life per body, no plies, and the same
target priority as the keeper. In seeded real-engine encounters, a frost caster
killed all five swarmlings before they could kill it. Cinderkin already fared
better because their four plies bought time to engage.

## Measured comparison

Run `npx tsx balance/probe_throngcombat.ts`. The rig runs the actual AI and World
at 60 Hz, with real movement, collisions, casts, mitigation and death credit.
It compares five configurations over three seeds (17, 31, 73), two enemy kinds
and two armies: 60 episodes total. The neutral configuration explicitly opts
out of the new profile and reproduces the measured original behavior.

Five level-one swarmlings versus one level-one Hollowchill frost caster, with
an initial approach of about 255 units and a 12-second limit:

| Configuration | Wins / 3 | Bodies lost / 15 | Mean first damage |
|---|---:|---:|---:|
| Original | 0 | 15 | 2.13 s |
| Threat and target priority ×0.1 only | 3 | 6 | 2.27 s |
| 75% area-hit avoidance only | 3 | 6 | 2.10 s |
| Commanded movement ×1.3 only | 1 | 12 | 2.14 s |
| Combined | 3 | 4 | 1.70 s |

Against a zombie, both original and combined swarmlings won all three fights
without losses; first damage improved from 2.02 to 1.74 seconds. Ten Cinderkin
already won all six original fights without losses; the combined profile
improved first damage against the frost caster from 1.98 to 1.56 seconds.

These are controlled encounters, not endgame balance claims. The keeper has
extra life so it remains an eligible target throughout; it does not attack.
The rig starts with a full roster and does not exercise the Hivecall toggle's
replenishment. Damage totals include overkill, so wins, losses and latency are
more useful comparisons than the truncated encounter's apparent DPS.

## Shared data and attribution

`SkillDef.minionCombat` configures ordinary summons and gathered throngs.
`SMALL_ARMY_COMBAT` in `src/engine/minionCombat.ts` is Hivecall's explicit profile
and the default for throng anchors, including synthetic worn anchors:

```ts
minionCombat: { threat: 0.1, areaAvoidance: 0.75, commandSpeed: 1.3 }
```

An explicit `{}` opts out completely; omitted fields in an explicit profile
are neutral. `WornThrongDef.minionCombat` forwards the same options. Ordinary
summons default to neutral values.

- `threat` multiplies both damage-generated `threatGen` and the new
  `targetPriority`. Spatial preferences apply the latter; highest-threat AI
  uses its already-scaled ledger plus a priority-weighted distance tiebreaker.
  The priority stays positive. Visibility, taunts, commands and the existing
  target-rescan cadence still apply. A lone minion remains attackable.
- `areaAvoidance` avoids a bounded fraction of complete area hits, before
  plies, damage and hit effects. It is capped at 85%. Hits that connect still
  deal their full damage and tear normal armor. Direct hits, damage over time,
  scripted hazards outside the hit pipeline, and deliberate sacrifice remain
  dangerous. This is avoidance, not a damage multiplier or blanket immunity.
- `commandSpeed` multiplies movement under an explicit active order only,
  capped at ×1.5. Rooted casts, terrain collision, status restrictions and
  attack/cast speed remain intact. Autonomous hunting gets no command boost.

The owner stats `minionThreat` and `minionAreaAvoidance` provide ordinary
modifier/support/tree levers, queried with the anchor's tags and instance
mods. They are per-body survival fractions, like the existing minionPlies
count, and are not batch-divided. The attributable `minionCombat` sheet source
is rebuilt at the shared owner bake. Damage, life, roster caps, classic summon
scaling, throng batch scaling and kill attribution are unchanged.

Full actors recognize area hits by the `aoe` damage tag. Pool rows use the
existing area-surface carve boundary; untagged melee is explicitly excluded,
and ordinary projectile sweeps retain their direct-hit behavior. Custom new
deliveries must pass the correct area context to these existing boundaries.

Why avoidance instead of just smaller damage: the regression compares 200
area hits against four-ply bodies. A 75% damage reduction still tears a ply
on every hit above the floor. The seeded 75% avoidance profile avoids 153 of
200 hits, with the others landing normally. Twenty of 24 pooled gnats survive
one test blast, but repeated blasts still destroy every one.

## Commands and recall

Shift-press Command: Assault to use its Command: Recall meta. For six seconds,
the court stops casting, detaches from ridden enemies, and follows a loose
ring around the moving issuer. A fresh assault replaces recall. No cooldown
or resource cost is refunded when a minion abandons a cast.

Command-hosted meta payloads inherit the command's whole-court scope;
summon-hosted meta payloads keep their own anchor scope. Untamed throngs mark
their self-hunting orders `autonomous`, so their periodic hunt cannot overwrite
the keeper's active recall or pinned assault.

Ordinary commands promote matching pooled gnats before issuing orders, so they
receive the same commands and tree blessings as full actors. Live blessings
prevent demotion until they expire or are consumed. The matching starting
trees are documented in `frontier-starting-skill-trees.md`.

## Durability versus pooling

The compact pool stores a kind's base ply count; it cannot represent the full
life pool or owner-derived armor budget. Previously, claims ignored purchased
plies and demotion discarded them. Instead of adding a second armor formula,
durability investment now crosses the existing promotion boundary:

- A gnat claimed/restored with `minionPlies`, `minionLifePlyTrade` or
  `minionLifePlyEcho` investment is minted as a full actor.
- Existing pooled gnats promote on the normal owner rebake (up to about one
  second after changing investment), then use the same owner fold as every
  other minion.
- Invested bodies, injured bodies and bodies with spent plies cannot demote.
  Healthy neutral bodies still can. Removing a grant does not refund spent
  armor or heal life.

This intentionally costs full-actor processing for the affected roster,
bounded by its ordinary cap (the companion tree can reach 40 gnats before
external investment). There is no new separate population cap. Large external
cap investments still need practical frame-time evaluation. No packed-array,
network or save schema changes are required.

## Verification scope

The focused probe covers encounter ablations, protection bounds, direct-hit
and DoT counterplay, taunt and lone-target behavior, neutral classic summons,
ordinary and meta commands, moving-keeper recall, untamed precedence, pooled
area hits, purchased armor before combat, live investment, and lossless
durability across attempted demotion. It is enrolled in the fast probe roster.

Required checks: `npm run check`, `npm run probe`, and
`npm run sim -- run --suite smoke`. No skill-tree data is changed here.

The integration fixture passed all 198 fast probes, the 32 focused assertions,
all three type-check targets, the production build and all 25 smoke-simulation
episodes. The existing warrior smoke scenario still reports its provisional
high time-to-kill band. The four slow probes and a dedicated desktop frame-time
sweep were not run; large invested swarms remain a performance validation item.
