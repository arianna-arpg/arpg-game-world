# Cast disruption and held readiness

GT-019 replaces `interrupted`, `fizzled` and `BRIMMING` with cues at the
caster's preparation edge. The concentration bar's `refocus!` caption and
the failed-gather `the gather broke early` / `the gather is too thin`
refusals are also retired. No cast clock, cost, damage, cooldown, bank
consumption or concentration policy changes.

## Visual contract

- **Interrupted:** short arcs fracture outward from the actual casting aim.
  This is emitted once when the existing stun interruption cancels the cast.
- **Fizzled:** small motes contract and fall when concentration fails or an
  underfilled/unfinished channel release produces no payload. Successful
  partial concentration releases retain their actual attack and do not fizzle.
- **Held readiness:** separated strokes close into a steady diamond with a
  central pip at full charge. Progress follows the real charge clock, persistent
  brim fill or duration-scaled maximum channel hold. Ordinary repeating channels
  do not claim a nonexistent completion point.
- **Brim crossing:** a brief corner lock accompanies the actual transition to
  full. Remaining full does not repeat the burst. Automatic release still has
  the transition cue; manual holds retain the stable body silhouette.
- **Concentration:** loss of focus splits the bar frame into separated brackets;
  reacquisition closes it. The existing fill/drain still shows the quantity.
  Shape changes carry this state as well as color.

The small body silhouette supplements existing charge/completion bars; it is
not an attack footprint. It follows aim and the visible body, disappears when
the cast ends or the caster becomes unavailable, and does not pulse at full.
Event fragments use the skill's color and freeze their world position at the
transition. Existing visibility rules govern body cues and event rendering.

## Reuse and configuration

`src/data/castingCues.ts` owns the universal `standard` profile: radius,
front padding, width, corner count and interruption/fizzle/readiness profile
names. `CASTING_CUE_CFG` tunes intensity and focus-frame appearance.
`src/data/combatCues.ts` owns event lifetimes, piece counts and travel;
`fracture` and `collapse` are reusable effect families, alongside the existing
`snap` family used for the brim lock.

`SkillDef.castingCue` selects a reusable profile; missing or unknown names
fall back to `standard`, including names colliding with object properties.
`castingCue: false` opts out of supplemental body/event cues while keeping
the functional cast bars and concentration frame. This applies uniformly to
players, enemies and companions; there are no named-skill/species branches.
Support-converted Gathered Casting uses its resolved channel specification.

`castingCompletion` is the common read for the body, completion bar and host
snapshot. Render-only co-op shells receive the resolved value and optional
body cue, plus `focusBroken`; they do not reconstruct banks or support mods
from incomplete skill stubs. Opt-outs survive replication. Event flashes use
the existing replicated combat-cue payload. Missing casts clear all hold cues.

## Verification and acceptance

- `npm run check` and `npm run build`.
- `npm run probe -- castingcues`: 47 assertions through actual use/update/release
  paths, 30/60/120 Hz interruptions, focus recovery, successful/failed releases,
  bank preservation/spending, auto-release, duration scaling, support-derived
  gathers, opt-outs, fallback profiles and co-op cleanup.
- Related probes: `combatcues` (75), `handling` (37), `costlevers` (19),
  `skillmodes` (106); 25-episode simulation smoke suite.
- `npx electron balance/casting-cues-ui.cjs` after building: actual renderer
  captures preparation, interrupted fragments, partial/full charge, lost and
  recovered focus, falling fizzle, brim crossing/hold, abandoned gathers,
  opt-out and cleanup. Hidden window and disposable saves; reports are ignored.
- Regenerate `node scripts/audit-gameplay-text.mjs` after emitter changes.

Implemented; encounter playtesting remains before marking GT-019 Done.
Normal-scale isolated captures have been reviewed. Busy fights, terrain contrast
and unaided recognition of inward fizzle versus outward interruption still
need player acceptance. GT-038 remains open for unrelated refusal families.
