# Three build-around uniques

Authored in `src/data/uniques/emergent.ts`, appended to the existing unique
and legend-proc catalogs. No new runtime subsystem, save shape, or item-ID
branch in the engine. Each effect can also be granted by a passive, support,
affix, or enemy modifier through the ordinary `proc_<id>` stat.

| Item | Build idea | Investment and trade |
|---|---|---|
| **Rimewake**, hybrid evasion/ES boots, item level 10+ | Movement skills have a 65–85% chance to release your granted Frost Nova around you, at most once every 2 seconds. | Socket the nova to customize its area or payload; chilled-target damage rewards fighting near the release. Movement speed helps positioning, but fire resistance falls by 10–15 percentage points. |
| **The Mourning Bell**, bone amulet, item level 12+ | Grants Summon Skeleton Warrior. Each of your minions' deaths has a 65–85% chance to grant 8% of your maximum life as ward, at most once every 1.5 seconds. | Its rolled proc power multiplies that ward; maximum life and ordinary ward-gain investment also matter. Minion damage is reduced by 10–15% increased damage. |
| **Faultline Grips**, armor gloves, item level 10+ | Grants knockback. Arresting your knockback has a 65–85% chance to remove 25% of remaining movement-skill cooldowns, at most once every 2 seconds. | Shove authority and impact damage reward using terrain and heavy bodies to stop a shove. Attack speed is reduced by 6–10% increased speed. |

These are initial tuning values, not a claim of endgame balance. Proc chance
and downsides have `tierScale: 0`, so deeper drops neither saturate the chance
cap nor grow an unlimited penalty. Granted levels and beneficial stat rolls
use the existing tier ladder. All three enter ordinary unique drops through
their existing base family, minimum item level, and weight.

## Interactions and limits

- Rimewake releases at the wearer's position when the movement skill's real
  execution raises its cast event. For a dash, this can be the departure
  point; the item does not promise an arrival nova. Walking alone does not
  trigger it. Ordinary spell casts and payload echoes do not qualify.
- Rimewake's proc plays the held Frost Nova instance, including sockets and
  tree choices. A learned copy takes precedence under the existing skill
  lookup rules. Granted sockets remain on the item across saves and removal.
- The Mourning Bell listens to the shared minion-death event. Other keepers'
  losses do not count. Expiry follows the engine's existing expiry-is-death
  rules; dismissing or replacing a minion is not promised to count as death.
  Ward decays normally. Several simultaneous deaths share one owner cooldown.
- Faultline uses the same collision event as Crushing Impact: a wall or a
  sufficiently heavy body may arrest a shove; free knockback pays nothing.
  The refund reaches equipped movement skills through the existing tag
  filter. A pitfall that kills its victim before the collision roll does not
  promise a refund. Cooldown power is structural, not scaled by proc power.
- Faultline and Rimewake can be worn together: earn movement availability
  through impacts, then use movement to create a cold control window. Both
  internal cooldowns remain independent limits.
- Chance still follows the shared proc/luck rules. Tooltip cooldowns and
  payload constants are interpolated from their actual proc definitions.

## Verification and integration

`balance/probe_emergentuniques.ts` is enrolled in the normal probe gate. It
checks all three at several item levels, item save fidelity, granted skill
ownership/socket persistence, real movement and summon executions, real
knockback collisions, unrelated-event silence, removal, and internal limits.
The existing legend census checks registered stats and defining signatures.

The content module is deliberately separate from `src/data/uniques.ts` so
concurrent edits to older unique mechanics have a small integration surface:
one import and two catalog appends. Branch base: `codex/system-audit` at
`d316506`, also the local `main` tip when this work began. Re-run checks after
combining with any later Claude mechanics changes or generation branch work.

Checkpoint verification (2026-09-09): `npm run check` passed; all 45 focused
assertions passed with retries disabled; the default probe gate passed
177/177, with `probe_authoredmaps.ts` D21 passing on its automatic second
attempt. All 25 smoke episodes completed, with the same reported metrics as
the starting revision, including its provisional magician TTK flag. Slow and
excluded probe lanes and hands-on endgame balance were not assessed.
