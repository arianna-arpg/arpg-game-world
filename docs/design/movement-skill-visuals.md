# Movement skill identities

The main-based `codex/skill-visual-identity` branch now gives all 45 native
movement deliveries authored departure, travel and arrival presentation:
21 dashes, 14 leaps, nine blinks and Caged Comet. This is an isolated visual
commit; bringing it to seamless still requires destination integration checks.

## Shape and motion

`src/data/skillMovementVisuals.ts` owns explicit profiles: movement family,
gesture, material, count and motion. `src/render/vis/skillMovementVoice.ts`
registers departure, arrival, impact, wait and bank voices. All shape and motion
survive wardrobe recoloring; a dark under-stroke supports bright terrain.

| Skill or family | Identity |
| --- | --- |
| Dash | Directional chevrons that collapse at takeoff and open at the stop |
| Charge / Shield Charge | Braced wedges versus layered shield plates |
| Dash Strike / Iai Strike | Split blade wakes versus one narrow drawn cut |
| Surge | Snapping zigzags and short spark strokes |
| Goring Charge / Closing Fang | Hooked horn or claw curves with different counts and materials |
| Decoy / Cape Feint | Divided wisps versus curling blade-edged ribbons |
| Trailblaze / Immolation Rush | Scattered flame plumes versus a coiling, braced comet |
| Cloudstep / Zephyr Step | Split vapor plumes versus long wind ribbons |
| Crushing Leap / Skyfall | Fractured impact spokes versus a denser spark-studded landing |
| Panther Pounce / bird dives | Raking talons versus paired feather-like fans |
| Phoenix Dive | A six-part wing gesture with flame material |
| Geyser-Step / steam hops | Differently counted and moving plume gestures; existing jets remain |
| Teleport / Warp | Nested space folds versus coiling, delayed chime folds |
| Shadow Step / Corpse Shift | Narrow blade slits versus curling soul seams |
| Shatterstep | Outward broken shards |
| Riftstep / Flickerstep / Riftstorm | Split fractures, scattered blade folds and orbiting blades |
| Caged Comet | Orbiting sparks and reoriented bank cues |

The renderer samples simulation clocks and coordinates, never combat randomness.
Unique configurations and distinct pixels guard accidental duplication, but
instant recognition between close relatives still needs player judgment.

## Actual movement owns timing

Dashes and caroms record positions after movement is clamped. Trails are short
histories, clipped to each traveled segment and the actor-width lane, never to
the requested destination. Large recovery jumps are not joined into a false
dash line. New casts and changed stories start fresh histories. Stationary or
interrupted movement stops refreshing them. Carom cues occur at actual banks.

Leaps record their existing airborne interpolation. Takeoff stays small;
landing replaces the generic shockwave with its source's impact voice, clipped
to the actual area (including square and triangle sigils). Repeated slams and
delayed aftermath carry the same voice. Existing landing warnings, untargetable
timing, body swell and vent columns remain authoritative.

Blinks draw only paired endpoints. Departure contracts where the actor actually
was; arrival opens at the final clamped position. Warp's wait mark stays at its
pending destination and does not announce an early departure. Death, respec or
completion retires the pending mark with the pending movement. Generic teleports
without a profiled source retain their existing effects.

Movement support blasts carry the source's impact identity while keeping their
tested radius, damage and timing. Deposited fields inherit source material.
Pure movement moments and trails do not consume combat light slots. Cosmetic
colors resolve from the same actor/owner attribution as other skill visuals.

## Storage, visibility and co-op

`src/engine/skillMovementVisual.ts` contains paint-only history with copied
coordinates. It has no actor, skill instance, destination or damage references.
The world retains at most 40 live trails, 16 points per trail and 0.22 seconds
of travel, followed by a 0.2-second fade. Extra small endpoint/bank cues stop
minting at 80 movement cues; actual damaging impacts keep the existing flash
path. Each segment paints at most three gestures of at most six strokes.

Travel cues use the existing story/covered-floor visibility gate for every point.
Endpoints use the same gate at their own location. The sight veil remains above
these effects. Zone transit resets the weak actor-to-trail map and flashes.
Co-op deep-copies the optional trail arrays through `FlashW`; old packets clear
them instead of reconstructing movement simulation on the client.

## Verification and review surface

- `npm run check`, `npm run build`, `npm run sim -- run --suite smoke`.
- Single-name probes: `movementvisuals`, `fourthwall`, `scaldkit`,
  `movementtether`, `devotedstartertrees`, `cosmetics`, `skillflights`,
  `strikevisuals`, `effectvoice`, `supportfabric`.
- After the movement probe and build:
  `node_modules/.bin/electron balance/movement-visuals-ui.cjs`.

The movement probe compares all native casts with their paint profiles removed,
preserving source IDs so Decoy's existing collision/costume laws stay identical.
Both runs serialize equally. It pins body paths, hits/statuses, invulnerability,
mana and RNG; blocked movement; modified landing shapes; delayed markers;
wardrobe tint; actual carom banks; co-op copying; interruption and zone cleanup.

The hidden UI harness renders all 45 identities in the production painter.
It checks separate departure and arrival silhouettes, all leap impact shapes
and safe centers, and measured travel corridors. Seven actual game casts and
a co-op playback are captured alongside the interactive controls.

Ignored outputs under `balance/reports/skill-visuals/` include `movement.json`,
`movement-pixels.json`, `movement-study.html`, overview/monochrome images and
`movement-live-*.png`. The study provides recorded casts, enlarged departure
and arrival views, family/search filters, shared tint, hidden names, pause,
slow motion and bright terrain. Journey scale fits each card; recorded movement
timing remains native unless slow motion is selected. Endpoint views are slowed.
