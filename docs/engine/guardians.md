# Rime Wake and Graveglass

Two equipment-granted carried effects extend the shared actor system. Neither
adds a targetable minion, skill-bar slot, combat caption or magic-pack recipe.

## Cold precision

**Rimebound** rings and amulets (item level 16+) grant one **Rime Wake**
satellite. Extra grants stack through the existing eight-satellite total cap.
It favors the farthest visible hostile within 480 units of the orb, commits
that target's position, and draws a fine dotted aim line for 0.28 seconds.
The shot keeps that commitment: movement can evade it. Recovery is 1.5
seconds after the aim window, with a 0.9-second initial arming time.

The ordinary cold projectile has speed 920, radius 3, line form, range 540,
one pierce (two bodies), and base cold damage 5–7. Cold, projectile and
satellite/family damage modifiers apply through the normal hit pipeline.
Projectile speed and size use their usual modifiers. Its orbit offset is 50,
turn speed 0.8 and mote radius 7. These are initial tuning values.

`SatelliteEmission.target` chooses nearest (default) or farthest;
`windup` optionally commits a point before emission. Both are reusable for
projectile and lob families. Losing a target, clear path or bearer eligibility
cancels the aim. Reseating a ring cancels old aims. Once launched, native
projectiles retain their ordinary flight, attribution and reflection rules.
Snapshot aim coordinates and progress come from the host.

## Replenishing interception

**Glasskept** rings and amulets (item level 20+) grant one **Graveglass** pane.
A small stationary spectral diamond above the bearer reforms over five
seconds. A full pane intercepts one hostile projectile entering its reach,
breaks at the actual interception point, then starts rebuilding. Extra grants
add independently replenishing panes, capped at three per actor across all
guardian families. Equipping a new count starts all of that family's panes
empty; it cannot refill charges by swapping equipment.

The initial reach is 32 beyond the bearer's body, plus projectile radius;
the break flash lasts 0.3 seconds. Mote size, placement, color, recharge,
reach and break duration are data in `src/data/guardians.ts`. The shared
registry and limits live in `src/engine/guardianSpec.ts`, while
`src/engine/guardians.ts` owns charge and swept interception.

| Modifier | Behavior |
| --- | --- |
| `guardianCount_<family>` | Grants that guardian and stacks its quantity |
| `guardianRecharge` | Multiplies charge gain; base 1, bounded 0–4 |
| `guardian` / `guardian:<family>` tags | Scope guardian stat investment |

Any ordinary modifier source can grant a guardian: equipment, passive,
temporary buff, monster sheet or authored encounter. This debut uses jewelry
only. Players, monsters and allied bearers use the same resolver. No
damage or minion scaling applies to an interception charge.

Interception selects the first charged ward along the incoming swept path,
independent of actor array order. It requires hostility, matching story,
clear line of sight and an active bearer. Friendly, outbound and inside-born
shots do not spend charges. Melee, beams and ground damage remain outside
this projectile-only defense. A ward catches any hostile shot entering its
small envelope, including a near miss or a shot toward a nearby ally.

The world consumes a caught flight before body damage, trails, emitters or
projectile auras. It uses the existing dissolved ending to suppress impact
explosions, end zones and descendant projectiles. Returned parry projectiles
can also be caught. Existing ordinary guard/parry remains separate.

Charges respect bearer timeflow and bounded frame advance. Death, downing,
inactivity, removal, grant/count change, story/allegiance change, teleport
and zone travel clear or reset readiness. Catch flashes are transient and
also retire with the owner. Saves retain grants through existing item and
modifier paths, never ready charges. Co-op snapshots clone reserve/catch
geometry; absent guardian fields clear stale replica visuals.

Graveglass takes inspiration from the equipment-granted projectile shields
in Shadow Dungeon's [official content notes](https://steamcommunity.com/app/4423580).
Its finite rechargeable panes are authored for Hollow Wake's combat and
visual language; no external art or code was copied.

## Verification

- `npm run check`
- `npm run probe -- guardians`
- `npm run probe -- satellites` and `npm run probe -- auroras`
- `npm run probe -- parry`
- `npm run sim -- run --suite smoke`
- `npm run build`, then `npx electron balance/guardians-ui.cjs`

The guardian probe exercises actual equipment and character saves, cold
damage attribution/scaling and two-body pierce at 30/60/120 Hz, committed-aim
dodging/cancellation, swept interception, one-charge spending, payload
suppression, hostility/story/wall gates, ally/monster symmetry, recharge,
timeflow, lifecycle cleanup and snapshot replacement. The hidden isolated
client captures cold aim/flight and guardian ready/catch/rebuild states and
checks the canvas for explanatory combat captions.
