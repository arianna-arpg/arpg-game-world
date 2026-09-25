# Player affliction screen effects

Revised September 20, 2026. Each ailment retains its own material effect,
including when several are active at the same time. The prior combined
low-life-tinted wash and strongest-three motif selection have been removed.

- **Bleed:** filled blood trails and pendant drops sliding down both sides.
  A mild bleed is highly transparent; a serious bleed thickens, lengthens and
  strengthens the same material.
- **Burn:** kindling and ember trails rise along the edges, with small flame
  tongues licking the lower rim. Burn does not recolor a whole-screen wash.
- **Poison:** an independent green vignette encroaches as poison severity grows,
  leaving the center transparent. It paints below the localized materials so
  blood and kindling keep their own colors.
- **Doom:** violet hooks tighten at the corners according to the armed payload.
- **Impale:** small metal spikes point inward from all four screen edges while
  the status is present, with matching lodged steel on the affected body. This
  presence cue does not forecast a future hit; see `impale-cues.md`.
- **Other effects:** configurable profiles or separate colored fallback marks.
  No strongest-effect selection hides another active family.

## Severity and coexistence

Every family reads its own incoming pressure against current life. A large
burn never makes a mild bleed drip harder or a mild poison vignette reach
farther. Multiple statuses within the same family (burn and scorch, for
example) share that family's effect and combine their pressure. Separate
fallback colors remain separate layers.

Each active family has a quiet presence floor, even when defenses prevent
near-term life damage. Severity scales its opacity and geometry above that
floor. Full life does not suppress the effect. The independent low-life
warning keeps its own red palette, heartbeat and control; it neither selects,
recolors nor replaces an ailment layer.

`AFFLICTION_CUE_CFG.opacityBudget` limits total authored layer strength. Quiet
presence is reserved first, then the extra intensity shares the remaining
room. All families remain represented; there is no top-N cutoff. This is an
intensity budget, not a claim that overlapping strokes have exactly that
pixel alpha. Material effects are clipped to narrow side bands, Doom occupies
corners, and poison has a transparent center. The HUD draws afterward.

Particle/strand counts are fixed per profile rather than increasing with
stacks. Blood and sparks fade around their animation loops; no screen shake
or flashing is added. The poison gradient reuses the existing bake cache.
Options → Visuals → **Ailment Screen Effects** offers Gentle, Still and Off.
Still freezes these material motions; Off removes the layers. Specialized
control effects (frost, stun, faintness, etc.) and survival/low-life controls
retain their own behavior.

## Pressure estimate

`afflictionPressureOf` reads a two-second window capped by remaining duration,
integrating stacked DPS, ramp/taper curves and pending reapply bursts. Typed
damage-taken modifiers, ES DoT resistance/bypass and current ward, absorption,
energy shield and mana shield are accounted for. Temporary pools are shared
across ailments. Eight forecast slices approximate shield depletion. Doom
reads the actual armed rupture bank versus current life, growing toward its
fuse, rather than pretending that payload is a ticking DoT.

This estimates incoming pressure, not time to death. It does not predict
future healing, attacks, changing immunity, buffer decay, random survival
procs or side-effectful life interceptors. Staggered damage remains owed
pressure. The estimator does not mutate combat pools or roll RNG. The visual
escalation band is configurable (default 4–65% of current life); it is applied
independently to each family's pressure.

## Extension contract

- `src/data/afflictionCues.ts`: open family profiles, gestures, opacity ranges,
  reach ranges, counts, periods, draw order and the common clutter budget.
  Unknown profiles get a neutral fallback.
- `StatusDef.screenCue`: `{ motif, color, intensity }` selects/customizes the
  layer. `false` opts out when another visual already suffices. Damaging and
  cull statuses inherit fallbacks; no monster/skill-name renderer branches.
- `src/render/vis/afflictionEdge.ts`: independent layer composition and painters.
  Composition retains source status ids, individual severity and color.
- `ActorW.afflictionPressure`: host-derived per-player pressure; `StatusW.dot`
  preserves custom untyped DoT presence without inventing client damage.
  Cure clears both, and dead/downed heroes receive no ailment layers.

The shared screen follows `world.player`, including a remote client's own
seat, without merging other players' ailments. Couch guests keep their own
existing HUD/body indicators. Supplemental cues remain optional when a bar or
other behavior already conveys the mechanic; distinct timing outcomes still
need their own readable result.

## Verification

`npm run probe -- afflictioncues` covers real typed damage, shared defenses,
expiry, Doom, individual severity, simultaneous families, no top-N cutoff,
quiet-presence budgeting, fallback/opt-out, settings and owning-seat co-op.
Run `npm run check` and the simulation smoke suite for data changes.

After a build, `npx electron balance/affliction-cues-ui.cjs` uses the actual
renderer in a hidden window with disposable saves. It checks mild/strong
blood, burn and poison at full life; still/animated pixels; all four effects
at once; each effect's contribution when individually removed; transparent
center; low-life palette independence; cure/death/downing; and options.
Captures/logs live under ignored `balance/reports/affliction-*`.

No combat captions are removed by this screen-layer pass. Doom's body warning
and caption-free detonation are covered separately in [Doom cues](doom-cues.md).
Long-session comfort and dense
encounter playtesting remain before declaring the pass Done.
