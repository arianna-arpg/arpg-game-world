# Enemy handling and committed attacks

This pass differentiates body handling and adds earned attack openings. It
extends the existing `turnSpeed`, `aiTurnSpeed`, `castArc`, action-lock and
foot-plant systems; no monster-id branches or parallel combat pipeline.

## Turn rates

Previously every monster without an explicit `turnSpeed` inherited 10 rad/s:
a half-turn in about 0.31 seconds, regardless of size or pace. The new
`monsterTurnSpeed` resolver in `src/engine/handling.ts` uses authored anatomy:

```
baseRate × (referenceRadius / radius)^radiusPower
         × (clampedMoveSpeed / referenceSpeed)^speedPower
         ÷ heft^heftPower
```

`TURNING_CFG` contains the independent levers, reference dimensions and clamps.
The reference is radius 12 at speed 160 and heft 1, turning at 6 rad/s. The
derived result is bounded to 1.1–12 rad/s; stationary actors retain a finite
pivot. An explicit `MonsterDef.turnSpeed` wins, including zero for instant
turning. This fallback is sampled at spawn from the definition, so level
scaling or a temporary walking slow does not silently change the facing rate.
The normal `aiTurnSpeed` stat can still modify turning independently.

Mental sluggishness remains authored rather than inferred from faction or
appearance. The shamblers' explicit low rates, reaction delays and attack arcs
combine to give them slow bodies and slow decisions; a small crawler can turn
slower than a larger but alert warrior. Player-controlled seats, including
possessed bodies, have an unrestricted innate rate. Explicit turning modifiers
and a skill's own guard/channel steering rules remain meaningful on those seats.

## The body must actually obey the rate

- Freshly minted bodies seed their previous facing, so first acquisition
  cannot bypass the turn limit.
- Ordinary cast completion preserves the body's already-clamped facing.
  `executeSkill` keeps the committed attack aim but cannot grant an extra snap.
- Guards and tracking channels spend their turn budget in their own steering
  step, using the slower of the body rate and the skill's authored rate.
  AI desired facing no longer gives them an additional pre-steering turn.
- Explicit channel auto-spin remains an authored ability rotation. It is not
  ordinary target tracking and retains its configured sweep speed.
- `BehaviorSpec.castArc` remains the opt-in for attacks aimed by the body.
  A monster waits until it faces within the configured half-angle and projects
  its cast along that facing. AI-only charge fallback also honors this gate.
  Unrelated ground-targeted or omnidirectional abilities are not globally
  converted into forward-only attacks.

## Focused balance batch

Rates and recovery durations are ordinary monster/brain data. Half-turn times
below are baseline, unobstructed turns outside skill-specific steering.

| Enemy | Turn rate (rad/s) | Half-turn | Recovery after a cast |
|---|---:|---:|---:|
| Crawling Zombie | 1.8 | 1.75 s | existing cadence |
| Shambling Zombie | 2.6 | 1.21 s | existing cadence |
| Skeleton Warrior | 4.8 | 0.65 s | existing cadence |
| Pit Brute | 2.2 | 1.43 s | 0.45–0.65 s |
| Crypt Warden | 2.4 | 1.31 s | 0.35–0.55 s |
| Troll Mauler | 1.97 (derived) | 1.59 s | 0.60–0.85 s |
| Beastkin Gorer | 3.6 | 0.87 s | existing cadence |
| Gloomling | 8.74 (derived) | 0.36 s | existing cadence |

The first seven use body-aimed attacks. Gloomlings retain their nimble approach
and the earlier motion-based cling escape. Gorers retain the earlier short
carry and victim-wide grab grace. A seething Troll Mauler reduces recovery to
0.25–0.40 seconds through its existing wrath-rule override: anger has a readable
consequence without changing the shared skill or removing the baseline opening.

No raw life, damage, armor or regeneration values changed in this pass.
Additional recovery is focused on heavy attackers. Trial recovery pauses on
early small enemies worsened starter-magician pack outcomes in the seeded
comparison, so those enemies retain their existing cadence. Their new turn
rates and body-aiming arcs still provide flanking opportunities.

## Recovery as a reusable behavior

`BehaviorSpec.recovery: [minimumSeconds, maximumSeconds]` rolls once after a
successful autonomous press. A cast bar carries the result as `aiRecovery` and
pays it when the cast resolves; an instant skill pays immediately. The ordinary
action lock prevents another normal skill while `aiPlantUntil` holds the feet.
Unlike the pre-existing cadence clock, this time cannot expire inside the
wind-up. The body can still turn and external forces can move it.

Interrupted casts do not pay successful-cast recovery. Recovery cannot shorten
an existing action lock or foot plant. Absent behavior adds no recovery and
consumes no extra random rolls. Player-driven presses do not opt into AI
recovery; a possessed body whose pending AI cast finishes is exempt as well.
Rules and phases can override the same behavior field through normal merging.

## Verification and playtest focus

`balance/probe_handling.ts` covers independent morphology axes, explicit-zero
and stat overrides, first acquisition, 30/60/120 Hz pivot bounds, angle wrapping,
actual possession, completed-cast snap prevention, guard/channel steering,
body-aimed rear-target attacks, recovery beginning at resolution, resuming after
recovery, interrupted casts, abandoned concentration and fallback rush alignment.

Run `npm run check`, `npm run sim -- run --suite smoke` and `npm run probe`.
Existing pack, guard, skill-mode, possession, Gorer/cling and minion probes
cover adjacent behavior. These checks establish mechanical contracts; hands-on
play should judge whether circling feels useful without making enemies helpless.
Compare stationary attacks, wide flanking and close circling against each row,
then tune its rate, attack half-angle and recovery independently.
