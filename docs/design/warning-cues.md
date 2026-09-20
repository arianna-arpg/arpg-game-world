# Committed warnings and coordinated maneuvers

GT-011/012 replace the autonomous guard-release caption and encounter-plan
signals with continuous presentation tied to the real mechanics. No new
attack, damage multiplier, targeting rule, movement order or timer is added.

## Shield release

`guardReleaseCue` reads the cast's actual release deadline, fixed facing,
windup, shield payload and readiness. A fixed ground sector shows the reach
and arc from the first warning frame. Loading ribs intensify inside it; the
body leans back and the held shield draws inward. The outer boundary never
grows to reveal previously unmarked danger.

`guardBashGeometry` is shared by this read and the actual damage resolver.
It includes the body's radius, the effective innate or support-granted bash
range/arc and the existing full-circle threshold. There is no invented AoE
scaling. Target-body overlap follows the existing contact rules. Physical
displacement moves the footprint with its caster; target movement cannot
rotate a committed facing.

Breaking, stunning, killing or releasing the caster clears its warning.
Pressure below the armed line removes the footprint and loaded pose even
while the remaining shield stays raised. Inverted bashes use their actual
lost-shield payload. A newly delayed arm clock also removes an impossible
threat. Early/unarmed drops and guards without an authored windup gain no
fake warning. Player possession continues to clear the autonomous commitment.

`WARNING_CUE_CFG.bash` configures line width, fill, rim intensity, loading ribs,
body pullback and shield pull. The old Warden/Sentinel cached warning-posture
rows now inherit this live shared presentation, avoiding duplicate lean and
stale posture when pressure disarms the blow. The reusable `guardRelease`
tell source remains available to other authored consumers.

## Encounter maneuvers

The coordinator retains its six existing plans and native AI assignments:

| Plan | Preparation gesture |
|---|---|
| Protect support | Paired arms close a protective bracket |
| Crossfire | Paired sweeps spread laterally |
| Pincer | Two hooked strokes curl around the sides |
| Covered withdrawal | Backward folding chevrons |
| Root barrage | A fan gathers inward |
| Countercast | Forward strokes align and tighten |

Body preparation builds over the actual warning interval. Commitment softens
the marks while the original interpose, crossfire, orbit, retreat and hold
behaviors perform the maneuver. Recovery lowers and folds the strokes inward
until the actual recovery expires. It does not suppress an already active
cast or promise invulnerability during recovery.

The conductor has a larger gesture and a close shoulder sweep. This remains
true when the leader has no assignment, such as the piper directing flankers.
Unassigned members do not claim to participate. Explicit orders, communication
range, story isolation and unavailable bodies suppress ineffective cues.
Leader interruption switches surviving participants to their real recovery.
There is no detached warning flash lingering after a plan is broken.

These are body preparation gestures, not attack footprints or predetermined
routes. The planner commits a target identity and ordinary behavior; individual
skills still own their attack warnings and exact geometry.

## Authoring and co-op

`ENCOUNTER_CUE_STYLES` in `data/warningCues.ts` owns reusable gesture profiles:
gesture family, body extent, width, lean and repeated-piece count.
`EncounterTactic.cue` selects the shared profile. A roster can override it:

```ts
encounterCombat: {
  plans: ['protect_support', 'crossfire'],
  cues: { protect_support: { style: 'cover', color: '#a8d68b' } },
}
```

Unknown or omitted profiles use the shared `gather` preparation, including
names colliding with object properties. Add a profile for material/anatomy
variation without a species branch in the painter. Legacy `signal`/`signals`
fields are reference-only compatibility data and have no combat emitter;
shipped plan/roster data now selects visual profiles instead of sentences.

`encounterCueOf` reads the existing world-local planner and assignment gates.
Host snapshots send `ActorW.encounterCue` with attributed group/plan/leader,
conductor identity, phase, progress and appearance. `CastW.guardReleaseCue`
sends resolved bash geometry, including support-derived reach. Render-only
clients do not run the planner or reconstruct damage from these fields.
Absent snapshot data clears old cues; there is no save migration. Bash ground
geometry stays at the true feet even when the rendered body leans or lifts,
and cues use the actor's existing visibility/story gates.

Retired emitters: `Bash incoming!`, plan signals including roster-specific
variants, and `Regrouping`. Interrupt/fizzle captions are now covered by
[casting cues](casting-cues.md); broader AI/script announcements remain open.

## Verification and remaining acceptance

- `npm run check`, `npm run build` and the 25-episode simulation smoke suite.
- `warningcues`: 114 assertions, including actual warning/damage timing at
  30/60/120 Hz, pressure, escape, interruption, radial/inverted geometry,
  all six plans, unassigned conductors, overrides/fallback, co-op and cleanup.
- Existing `wardenbalance`, `bashclock`, `encountercombat`, `encountergroups`
  probes. The Warden interruption fixture now enters the warning and depletes
  poise before applying stun, so legitimate CC resistance cannot invalidate
  the fixture's premise. It explicitly checks that the stun landed.
- Local WIP meadow performance check passed: gap p99 12.6 ms, max 33.4 ms,
  zero >40 ms meadow hitches (`perf_20260920051548`); no harness budget breach.
- `npx electron balance/warning-cues-ui.cjs` after building: hidden real-game
  captures of early/late/disarmed bash, all six preparations, native crossfire
  commitment, interruption and recovery cleanup. Isolated saves/profile and
  screenshots stay under ignored `balance/reports/`. The fixture owns frame
  advancement so screenshot latency cannot consume a warning window.

Staged visual checks are not a claim of universal comprehension. Crowded
encounters, small bodies, bright terrain and differing zoom still need broader
playtesting before these rows become Done. The ground/gesture distinction
should be assessed in motion alongside the actual attacks.
