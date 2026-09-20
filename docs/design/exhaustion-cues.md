# Exhaustion cues

GT-001 and GT-002 now have caption-free replacements. The subsequent brief
`winded` status and defensive-break implementation (GT-003–006) is documented
separately in [Body and defense cues](defense-cues.md).

`src/data/exhaustionCues.ts` owns the reusable visual rows:

- `WIND_PUFF` reads the retreat budget through `wind`, then the actual
  `aiWindedUntil` window through `winded`. Effort increases puff size, opacity
  and frequency. During the catch window the body leans forward and gasps
  repeatedly, even though the retreat accumulator has reset. Recovery clears
  these cues. Retreat fatigue still only prevents retreat; it adds no debuff.
- `VENT_GASP` reads `status:winded_gasp`. Fumelung wears paired, faster gasps
  and a deeper slump while that vulnerability exists. Its existing bellows
  remain tied to `reserve:breath`: they collapse as fuel is spent and refill
  when the real reserve recovers. Early status removal ends the gasps without
  inventing a fuel refill. Its vent ground effect and attribution are unchanged.

The shared `tellSpecsOf` mint/co-op-adopt seam appends `WIND_PUFF` after
authored and brain-variant rows. This also covers definitions added at runtime
and nonbreathing bodies given an explicit retreat budget. Absent/infinite
budgets and inactive clocks produce no visible cue. `MonsterDef.retreatTells`
can replace the inherited rows for another anatomy; an empty array explicitly
opts out and requires an alternative readable cue if the body can tire.
Do not also spread `WIND_PUFF` into `tells`: it is already inherited.

The existing `breathPuff` painter accepts numeric `period`, `effortPeriod`,
`duty` and `opacity` parameters. `fill` interpolates the period for effort
gauges. Omitted parameters retain the old cold-breath appearance. Placement,
scale, tint and mirroring remain ordinary part data. Default fatigue parts
have zero alpha at rest; fully invisible part lists skip palette creation and
painting. Definitions without authored/variant rows share the default array.

These are live tell readings, sampled at the existing 0.15-second cadence.
Retreat exhaustion requests an immediate next sweep. Co-op sends the existing
derived scalar array; clients do not reconstruct private AI timers. There is
no new resource, status, damage rule, persisted timer or save-format change.
Both peers must run matching content, as with all indexed tell arrays.

Removed emitters: `retreatMove`'s `winded!` text call and Fumelung's authored
`out of breath!` vent note. Other reserve notes and combat text remain in
their own backlog rows; there is no global text suppression.

Verification:

- `npm run check` and `npm run build`.
- `npm run probe -- exhaustioncues`: real retreat gate at 30/60/120 Hz,
  buildup, accumulator reset, blocked retreat, unchanged defenses, recovery,
  co-op on/off transfer, tireless control, runtime definitions, overrides,
  rested portraits, actual vent casts, custom duration, early cure and refill.
- `npm run probe -- tells`, `spent`, and `tacticalai` (separate invocations).
- `npm run sim -- run --suite smoke`.
- `npm run perf -- --filter=meadow --seconds=8 --allow-dirty`: passed on the
  current shared work tree (meadow gap p99 13.2 ms, max 25 ms, zero >40 ms
  hitches). This is a local WIP measurement, not a full-biome performance claim.
- After a build, `npx electron balance/exhaustion-cues-ui.cjs`: isolated hidden
  client, real renderer, rested/effort/gasp/recovered captures, quiet tireless
  control, collapsed lung checks and absent captions. Output stays under
  ignored `balance/reports/`.

Remaining acceptance: encounter playtesting across small and crowded bodies,
contrasting terrain and zoom levels. Automated lifecycle checks and staged
captures do not establish that every silhouette is equally legible in combat.
