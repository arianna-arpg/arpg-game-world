# Combat threats and outcomes (GT-022 / GT-035)

Implemented, awaiting encounter acceptance. [Doom](doom-cues.md) covers the
armed curse; this completes the other GT-022 events and the GT-035 ward surface.
All signals are derived from existing mechanics and shared across actors.

| Mechanic | Worn / advance read | Resolved event / UI |
|---|---|---|
| Volatile retaliation | Colored vent lobes swell while eligible. Actual ICD progress refills their size and light; readiness indicates a possible retaliation, not a guaranteed roll. | A vent burst at the struck body accompanies its real attributed payload. Killing blows, failed rolls and ICD refusals emit none. |
| Culling | No invented countdown: eligibility depends on the current attacker, skill and post-hit life. | Opposing severing strokes at the executed body, on direct hits, attributed bursts and parry damage. Original kill credit is unchanged. |
| Hit ceiling | Open brackets identify the finite per-hit limit. They do not enclose the body as an immunity shield. | Excess force splays against a rigid stop. Direct hits, parry damage, area bursts, collisions and track/environment hits share it. DoT still bypasses the hit ceiling. |
| Last Gasp | An open golden spark on the body and inside the life orb indicates rescue readiness. The spark dims when spent and refills over the actual cooldown. | A lethal wound that really triggers rescue releases golden splinters. No invulnerability window is implied or added; a second lethal wound during cooldown still lands. |
| Tagged wards | Armor encloses the protected body; lines and moving beads lead from the actual living tagged sources into it. Source rings identify the bodies to defeat. | Matching armor covers the boss bar while preserving actual life. Source death removes its link; the last source loss shatters the armor and opens targeting. The boss name remains identity only. |

## Authoring

`data/combatReadability.ts` owns the readiness geometry, material colors and
ward/volatile profile registries. `data/combatCues.ts` owns event lifetime,
shape, density, width and travel. `MonsterDef.volatile.cue` selects a profile
or `false` to opt out; omitted and unknown names inherit the safe vents profile.
The retaliation still uses the payload skill's own color and combat pipeline.
The shared `ward` action accepts `cue`; omitted/unknown profiles use lattice.
No monster, boss, class or skill identifier is branched on by the renderers.

`engine/combatReadability.ts` resolves presentation from the actual stats,
volatile clock and Last Gasp cooldown. `lastGaspSpan` records the original
cooldown when rescue fires, so changing future cooldown investment cannot
falsify the ongoing recovery. It carries no damage authority. `wardGuardians`
is the exact membership predicate used by both the mechanical watcher and
the links: alive actors with the configured tag, regardless of team/distance.
Downed guardians keep contributing because the existing watcher counts them.
Rendering respects story and concealment; it does not draw a guessed source
for unrelated untargetability. Offscreen sources retain a directional link.

The shared actor renderer draws worn cues before body animation can distort
them. The ordinary replicated combat flash carries transient events. Snapshot
readiness is derived by the host; ward source IDs resolve through the client
actor pool after the roster exists. Joining mid-state works, source movement
updates the links, and subsequent snapshots clear removed state.

Removed: `CULLED!`, all five `capped` emitters, `volatile!`, `LAST GASP!`,
the boss-name `WARDED` suffix, the dynamic ward-break announcement and its
twelve authored notes. Legacy `ward.announce` data is accepted but ignored.
Damage numbers, identity names and optional reference information remain.

## Verification and acceptance

- `probe_combatreadability.ts`: real hit/area cap and culling, original credit,
  full DoT damage, actual retaliation and ICD, rescue and second lethal wound,
  fixed cooldown progress, ward action/watcher membership, join/cleanup,
  pooled source references, monochrome geometry and caption regression guards.
- `probe_ironbell.ts` observes the shorter cap cue while the fight runs,
  preserving the original cap, DoT and boss-part assertions.
- `balance/combat-readability-ui.cjs`: hidden real renderer, disposable saves;
  dark/bright terrain and two viewport sizes, live source loss/breakup,
  real capped hits/retaliation/execution/rescue, life-orb recovery and downing.
  Captures/logs are ignored under `balance/reports/threat-*` and
  `balance/reports/combat-readability-ui.log`.
- Combined release checks include type checks, production build, standard
  regression probes, simulation smoke and `balance/cleave-ui.cjs`.

Encounter recognition, clutter with many simultaneous wards, and long-session
comfort still need in-game acceptance before marking these backlog rows Done.

Verification snapshot (2026-09-24): 298/299 standard probes passed in the
combined run. The remaining Iron Bell check sampled after the new, shorter
impact had expired; it now observes cues during the fight and passes all 29
assertions on rerun. Targeted combat-readability, combat-cue and status-voice
reruns pass. Game/launcher/simulation type checks, production build, all 25
smoke episodes, and the combat/Cleave hidden renderer checks pass. The eight
slow and three excluded probes were outside this run.
