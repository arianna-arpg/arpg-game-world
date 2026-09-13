# Tactical AI and ranged pursuit

This pass addresses two different problems: defensive movement could repeat
without a catch window, and several intelligent combatants used the same
generic movement despite carrying very different kits.

## Finite defensive movement

The old kite-stamina gate only accounted for `moveAway`/`jukeAway`. Lateral
orbit and slide movement bypassed it, and short pauses between shots could
refund the backpedal meter indefinitely. Non-breathing bodies also lacked the
biological fallback. Stamina remains useful for fleeing wildlife, but it is
not sufficient to pace a ranged combat encounter.

`TempoSpec.reposition` adds an independent combat commitment. Its default is
1.3–2.1 seconds of accumulated defensive movement, then 1.1–1.6 seconds of
holding ground. Casting remains allowed during that opening. It defaults on
enemy ranged kits with `keepDistance`, plus orbit, slideCast, hitAndRun and
crossfire movement. It applies to bone and ethereal bodies as well as living
ones. Ordinary player-side AI does not receive the default; an explicitly
authored behavior can still opt in.

The shared `runKernel` boundary measures actual voluntary displacement.
Lateral and outward steps consume the clock; sufficiently inward steps do
not. The time uses the original update interval, independently of movement
pace. Blocked feet, skill-driven leaps/dashes and ordinary cast roots do not
consume it. State and random rolls are allocated only after a real defensive
step, so standing casters do not disturb their decision stream. Casts and
target switches do not refill a partially spent budget. The opening is a
world-time deadline, not a per-target timer that can be repeatedly reset.

Tier-crossing approaches retain their existing pathing exception. Authored
hold/garrison/protector/commander/retreat/lurk postures are outside the default;
explicit `reposition` data can enroll them. `reposition: false` or
`tempo: null` opts out deliberately. The existing kite budget and movement
duty cycles remain independent. Paused artillery now falls through to firing
when its retreat receives zero movement time, rather than silently consuming
the tick on a move that never happened.

## Distinct combatants

Advanced conduct now unlocks by body level; see `tactic-progression.md` for
the 6/8/10 ladder. The descriptions below describe the earned repertoire.
Movement budgets, reloads and recovery openings apply from the first level.

| Enemy | Conduct and counterplay |
|---|---|
| Skeleton Archer | A predictable firing drill: 0.4–0.7 s initial reaction and 0.25–0.4 s completed-cast recovery. The undead body still has finite defensive movement. |
| Matchlock Marksman | Chooses a fixed lateral firing point that widens its angle from a nearby allied shooter attacking the same target. Commits to at most 0.7–1.0 s of relocation, then 2–3 s of firing hold. Its normal reload remains an opening. |
| Cutthroat | Normally advances and spreads around the target. After 2 s engaged, a player cast with at least 0.35 s remaining can prompt a 0.65–0.9 s flank. It holsters attacks during that maneuver, then resumes fighting; 6–9 s rearm prevents constant cast-reading evasion. |
| Hex Weaver | Opens with Despair, then follows with Spark through the ordinary combo picker. A 0.25–0.45 s recovery gives the curse/attack exchange a punish window. |
| Frost Witch | Retains the close Nova and long Spear priorities. At range, a long opposing cast prompts a short planted counter-volley. Her 0.3–0.5 s recovery keeps that decision a commitment. |
| Thorn Sprite | Retains its prediction and telegraph awareness, but lateral movement runs in shorter 0.7–1.1 s bouts followed by 1.2–1.7 s firing stops. |
| Grove Singer | Reserves Rallying Howl for at least two allies within 240 px. Periodically holds ground to support that group, and has an explicit defensive-movement budget even though its commander posture is otherwise exempt. |

No shared skill damage, monster life, movement-speed stats or spawn quantities
are changed. Tactics read existing visible cast/ally state, not future player
inputs. The Crow/Gnasher changes in `harassment-balance.md` remain in place.

## Crossfire as a reusable movement style

`move.style: 'crossfire'` has three controls: `flankStep` (default 110 px),
`relocateFor` (default 0.65–1.0 s), and `fireFor` (default 1.8–2.8 s).
It considers two lateral world-space points and picks the one widening the
angle from the nearest same-faction, same-story ranged ally engaged with the
same prey. A lone shooter chooses a side. The destination stays fixed while
the prey moves; it cannot turn into another continuously rotating orbit.

The existing navigation and hazard checks move the actor toward the point.
Travel ends at arrival or its deadline, including when movement was blocked.
Changing targets cancels the old destination while preserving the firing
commitment. If the target leaves usable range the shooter approaches; a lost
firing lane uses existing sight-line navigation. Neither case fires through
walls or invents another movement pipeline.

## Verification

`balance/probe_tacticalai.ts` tests faster-circler/slower-pursuer encounters at
30/60/120 Hz, repeated planted openings, explicit opt-outs, closing movement,
target-switch commitment, paused artillery, crossfire geometry, fixed points
and travel timeout, real curse/attack sequencing, reactive flanking, and
ally-dependent rallying. In the isolated 18-second pursuit fixture, the
unrestricted circler allows roughly 1–2 seconds within 75 px; the bounded
version allows about 17.5 seconds. This is a movement comparison with attacks
suppressed, not a live-fight difficulty measurement.

The Cistern regression fixture now protects its player only during unmeasured
cooldown waits. Pending attacks from the preceding live fight could kill it
before the actual Boil and stair assertions; assigning life did not resurrect
it. Vulnerability is restored for all measured damage, and an explicit
alive-fixture assertion guards that boundary.

The objective hand-back fixture now explicitly excludes resident landmarks,
compositions and structures. It previously depended on a repeatedly retuned
seed accidentally generating bare ground; changed AI random draws could
seat a lair that correctly took precedence over the guest. The separate
resident-precedence assertions are retained.

Five-seed level-5 starter comparisons against two Skeleton Archers and a
Thorn Sprite showed improved Warrior/Summoner clear counts, while fragile
Magicians still lost that stress encounter. The Marksman/two-Cutthroat group
remains lethal to those starter pilots and kills sooner with its committed
melee pressure. These measurements support catchability, not a claim that
the entire roster has been normalized in difficulty; mixed bandit encounters
are a specific hands-on balance follow-up.

Run `npm run check`, `npm run sim -- run --suite smoke`, and `npm run probe`.
Hands-on emphasis: flank the marksman during its firing hold, interrupt the
Weaver's curse follow-up, close on the Sprite after its sidestep burst, and
fight mixed ranged/melee groups on obstructed terrain. Opening timing and
skill priority can be tuned independently per definition.
