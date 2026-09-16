# Gorer and Gloomling counterplay pass

The goal is to preserve threatening enemy identities while making positioning
and player responses matter. These values are a first playable balance pass;
the harness checks mechanics and regressions, not subjective difficulty.

## Gorer: a short carry with breathing room

`gore_charge` retains its 430-unit approach, committed direction, physical hit,
mass eligibility, struggle/sever escape and credited release momentum. A
successful catch now shortens the remaining charge to **90 units** (about
0.21 seconds at its base 420 speed). Release then includes the existing short
forward skid, so total victim displacement is larger than the carry distance.

The corridor width falls from 85 to 56, cooldown rises from 4 to 5.5 seconds,
and the additional 25% stun roll is removed. Release grants **three seconds
of victim-wide grab immunity**, including after an early escape. Other Gorers
can still hit during that interval; their contact cannot seize the victim.
Existing squad staggering and simultaneous-charge limits remain active.

Reusable controls:

- `DashDelivery.onContact.maxCarryDistance`: shorten the run after a successful
  catch. Unsuccessful catches leave the original dash length intact. Omission
  preserves full-length carry behavior; zero releases at contact.
- `GrabSpec.releaseGrace`: immunity to fresh grabs from every holder after this
  hold ends. Omission uses the shared 1.4-second default. Existing immunity is
  never shortened by release.
- `GrabSpec.breakMult`, dash width/cooldown and `onContact.shove` continue to
  control struggle, dodge room, frequency and release momentum independently.

Dash movement spends only its remaining time on the final frame, preventing
the last step from exceeding an authored distance at lower frame rates.
Completed dashes clear their skill, contact ledger and trail metadata before
arrival effects. A later AI-only movement rush cannot reuse a finished skill's
grab or payload without casting and paying for that skill again.

## Gloomling: darkness clings

The ranged Gravewisp and invisible teleport approach are replaced with a
visible swarm approach and **Clinging Dark**, a 1–2 chaos damage melee nip.
On reaching its victim, the Gloomling uses the existing cling seat and gnaw
systems: **3 base chaos damage per second**, paid every 0.5 seconds. The first
chew waits a full beat; attachment cancels an unfinished autonomous melee cast,
and no further skill casts execute while gnawing. The ordinary damage sheet,
typed mitigation and kill attribution apply; gnaws also report to DoT telemetry.

`ClingSpec.motionShake` adds active escape for any authored clinger:

- `distance: 240`: this much actual travel sheds a fresh grip.
- `turnRadians: Math.PI`: a cumulative half-turn sheds a fresh grip.
- `minTurnSpeed: 2.5`: only facing or movement-direction changes at least this
  fast (radians/second) count as sharp turns. Facing and footwork take the larger
  angle each beat rather than double-counting one body turn.

Travel and qualifying turns combine as fractions of one grip. Walking in a
straight line works; a quick pivot or reversal works faster. Slow aim correction
does not contribute, and wrapping from +PI to -PI is measured as a small turn.
Actual displacement includes dashes and forced movement; blocked input earns
nothing. Motion sampling is host-side and uses the same body poses for keyboard,
controller, AI and possession. Omitted `motionShake` retains timed-only shakes.

A stationary victim sheds the ride naturally after 3–4 seconds. Either shake
uses the existing visible flop: **70-unit scatter and 2.5 seconds before the
same rider can reattach**. Gloomlings stay targetable while attached. Shared
size-based seat limits bound the attached crowd; overflow bodies use their weak
nip. No text announces an attachment (the show-don't-tell law): the rider seated on
the body is the tell, and the flop's scatter shows the escape working.

No new save or network schema is needed: rides and grip samples are transient
host state; actor positions and existing grab markers provide the co-op view.

## Verification

- `npm run check`
- `npm run sim -- run --suite smoke`
- `npm run probe` (includes the focused rigs below)
- `probe_clingbalance`: actual walking, sharp turns, angular wrapping, slow aim,
  movement reversal, 30/60/120 Hz consistency, live swarm AI, damage timing,
  targeting, pack seats, lifecycle, kill credit, telemetry, bounded Gorer travel
  and a second Gorer's failed grab during grace.
- `probe_grab`: existing eligibility, struggle/sever, confinement, release
  credit, handoff, wall-impact and uncapped-carry contracts.

Playtest focus: one versus several Gorers in tight terrain; stationary caster
versus mobile melee against early Gloomling packs; keyboard and controller
turning comfort. Tune the data above before adding more enemy-specific behavior.
