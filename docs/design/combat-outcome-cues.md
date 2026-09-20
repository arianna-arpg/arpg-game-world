# Combat outcome cues

GT-007–010 replace parry, avoidance, timing-success and critical-outcome
captions. Combat rules, random rolls, damage attribution, cooldowns and
status durations remain owned by their existing resolvers.

| Outcome | Visual behavior | Owning truth |
|---|---|---|
| Parry opening | Two weapon-edge teeth draw together | Actual guard window, channel time and shield; innate and stat-granted parries |
| Successful parry | Crossed contact strokes and outward deflection sparks | Successful `tryGuardBlock`; captured incoming direction, even if the riposte turns the body |
| Reflected projectile | Paired chevrons travel behind the original projectile | Actual `parryDamage`, real heading, original body/material and lifetime |
| Evaded hit | Hollow body echoes shear sideways from the incoming direction | Resolved `evaded` outcome, including hit-immunity/area avoidance lanes |
| Immune hit | Closed polygon stays intact as the strike glances off | Resolved `immune` outcome |
| Resisted ailment | Small incoming fragments scatter outward and diminish | The existing ailment-resistance roll; this does not claim the underlying hit was resisted |
| Perfect / flawless / spark | Four / eight / three corners converge at the casting edge | Successful press or release window; misses and spent presses create no success cue |
| Critical mend or pour | Rounded inward threads close and rise | The existing critical healing/restore roll at its recipient; quiet ticks stay quiet |
| Critical damaging ailment | Angular barbs drive inward in the ailment's color | The damaging ailment's critical multiplier at application |
| Fissure aftershock | Radial cracks and a follow-on impact front | Actual detonated center and scaled blast radius; no step means no cue |

## Authoring

`src/data/combatCues.ts` owns the open `COMBAT_CUE_STYLES` table. A profile
selects a reusable shape, lifetime, color, piece count, travel and line width.
`COMBAT_CUE_CFG` owns shared contact placement, readiness and return-flight
tuning. Effects can supply their own material color; shape and motion still
carry the distinction. No skill names, monster IDs or caption strings select
paint behavior.

`combatCueFlash(position, profile, radius, facing, color?)` emits the ordinary
flash fabric with frozen `CombatCue` geometry. Unknown profile IDs fall back
to the standard contact cross, including IDs colliding with object-property
names. New profiles using existing shapes need no painter edit; new shapes
extend the shared painter or use the open effect-voice registry.

`timingCueFlash` places the mark along the committed aim at the body's casting
edge. It does not assume every creature holds a human weapon. Body size
controls the placement. The fleeting visual lifetime adds no gameplay window.

The parry-ready read is derived from the same guard spec/stat, shield and
channel time used by combat. It disappears on release, interruption, depletion
or expiry. The exact inclusive window boundary remains visible. Retaliation
itself remains immediate or carried by the returning projectile; there is no
invented post-parry attack window. Return chevrons are decoration, never a
second projectile or a larger collision shape, and apply to orb/cosmetic bodies.

Critical mend/pour means the restoration was amplified; it does not promise
immediate life gain (a pour may be a stream, and healing can overflow into a
ward). Existing numbers and optional reference labels are outside this batch.

## Co-op and cleanup

`FlashW.combatCue` carries the profile and frozen facing. `CastW.parryCue`
carries the host's resolved opening strength because remote casting instances
do not contain every support/stat. `ProjW.reflectedCue` carries only the
rendering fact; remote clients never receive or simulate retaliation damage.
The normal snapshot replacement clears absent cues, casts and flights. No
save migration, extra simulation timer or parallel damage path is introduced.

Removed emitters: `PARRY!`, `evade`, `immune`, ailment `resisted`, `Perfect!`,
`Flawless!`, `Perfect release!`, `Flawless release!`, `On the spark!`,
`crit mend!`, `crit affliction!`, and `aftershock!`. Taming's `resisted!` has
a different meaning and belongs to GT-027. Advance bash warnings remain GT-011.
Legacy effect voices and the `cry` wrapper remain available to unconverted
families; their probe now prevents these migrated captions from returning.

## Verification and remaining acceptance

- `npm run check` and `npm run build`.
- `npm run probe -- combatcues --retries 0`: 72 assertions covering real
  outcomes, unchanged damage/bonuses, off-axis contact, support-granted opening,
  exact expiry, cancellation, reflection, co-op replacement and monochrome
  painter geometry/canvas-state balance.
- Existing `parry`, `defensecues`, `cryvoices`, `effectvoice` probes: 151
  assertions; the parry regression includes repeated reflection at 30/60/120 Hz.
- `npm run sim -- run --suite smoke`: 25 episodes.
- After building, `npx electron balance/combat-cues-ui.cjs` stages real outcomes
  in a hidden game with disposable saves/profile. Captures in ignored
  `balance/reports/combat-*.png` cover avoidance, timing, critical effects,
  opening, contact, reflected flight and cleanup. No migrated caption is drawn.
- Local WIP meadow performance check passed: gap p99/max 16.7 ms, zero >40 ms
  hitches (`perf_20260920035233`). This is one local scenario, not every encounter.

Normal-zoom staged captures have been inspected. Broader encounter playtesting
on bright terrain, varying zoom, small bodies and overlapping effects remains
before these rows are marked Done. The migration inventory has been regenerated.
