# Composable strike timing

Perfect Draw and Wandering Mark are independent timing mechanics. Both can
ride an ordinary bar cast or an Overcharge refill. A single press (ordinary
cast) or release (Overcharge) checks every active window at that instant.
Each successful discipline multiplies its existing MORE bonus: the default
overlap is 1.7 × 2.2 = 3.74, before other damage modifiers and banked stages.
Missing either window does not suppress the other. The marker is not biased
toward the golden tail; overlapping windows remain a chance opportunity.

## Resolution and authoring

- SupportDef.strikeTiming and SkillDef.timing remain the content contracts.
  instanceStrikeTimings folds admitted host sockets and grants by timing kind.
  The first socket of a kind takes precedence; the innate discipline supplies
  any missing kind. Duplicates do not gain a new bonus-stacking rule.
- CastingState.strikeTimings captures the resolved specs and their skill/support
  sources when the cast starts. Neither reward resolution nor rendering relies
  on the first socket or the primary CastMode to select the active windows.
- engine/strikeTiming.ts owns STRIKE_TIMING_CFG, marker rolls and the shared
  success fold. Defaults retain the golden tail at 72%, marker centers from
  30% to 85%, and marker tolerance of 8% on either side. Content can override
  each discipline's bonus through the existing spec.
- Ordinary casts still permit one second press. An early miss consumes it;
  another press cannot collect a missed discipline later. A successful press
  raises one flawless trigger event, including when both windows succeed.
- Overcharge remains release-only. Each paid stage rerolls the marker once;
  unaffordable stages leave the bar and marker at the brim. Timing rewards
  stop at maximum stages. Spark Discipline is a separate, unchanged multiplier
  and still works at maximum stages. Release does not add a flawless trigger.

## Presentation

render/vis/strikeTimingBar.ts draws both active windows, with the white marker
above the translucent golden tail. Successful outcomes each emit their existing
visual cue. No captions, timing assistance, extra bar dimensions or gameplay
pauses are introduced. Co-op snapshots copy the host-resolved disciplines,
marker and Overcharge display state; render shells do not infer support data.

## Verification

Run npm run check, npm run probe -- striketiming, the combatcues, castingcues,
playercastvisuals, supportfabric, castaim and agent probes, and sim smoke.
After an isolated build, run electron balance/strike-timing-ui.cjs. It exercises
real support definitions in both socket orders on normal and Overcharge casts,
checks the actual renderer's two bar layers and captures the resulting cues.
