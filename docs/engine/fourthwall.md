# THE FOURTH WALL — the camera's frame as a gameplay surface

`src/engine/fourthwall.ts` · probe `balance/probe_fourthwall.ts`

The screen's edge has always been real to the player — it is where sight
ends — but never to the engine. This fabric makes it ONE honest surface that
flights and bodies can play against, with no bespoke paths: a lever, a gem,
a skill, and a status law, all data.

## The four laws

**THE PUBLISH.** The renderer hands back the frame it ACTUALLY DREW every
rendered frame — `World.publishViewFrame(camX, camY, vw, vh)`, world units,
called right where the couch fabric publishes its confine rect (the
`couchConfine` idiom, generalized to solo). Drawn == tested by construction
wherever a drawing exists. Degenerate viewports publish nothing; staleness
(`FOURTH_WALL_CFG.publishGraceSec` against `viewFrameAt`) degrades reads to
the fallback instead of yanking dead walls around.

**THE READ.** `World.viewRectFor(body)` is the ONE resolver for "which frame
governs this body":

1. the bearer's stamped frame LOCK (below), then a lock up the owner chain
   (a minion shares its keeper's cage);
2. the live published frame, for player-team bodies only;
3. THE FALLBACK — `FOURTH_WALL_CFG.fallback` half-dims (≈ the default drawn
   frame: a 1600×900 canvas at base zoom 1.3 shows ~1231×692) centered on
   the body's root owner.

Headless play (the balance harness, the probes) is deterministic by
construction — the sim's "screen" is a pure function of the body it governs.
And an enemy NEVER tests against the player's drawn frame: its fallback
rides with its own root. Fairness is structural, not special-cased.

**THE LOCK.** `StatusDef.frameLock` — any status may declare it (the
flight/panic/conceals idiom). While worn, the bearer's governing frame
FREEZES where the status found it: stamped once at the rising edge onto
`Actor.frameLockRect` (a copy — the live rect mutates), re-derived each tick
beside the other status states, cleared at the falling edge. The camera pins
to the stamped rect's center — BELOW the cinematic eye (a running scene owns
the camera outright), ABOVE the couch fit and the ordinary follow; the couch
zoom still breathes, the walls stand. Zone landings clear stamped rects (a
surviving lock re-stamps fresh walls on arrival ground). The lock's tell is
the `'framecage'` screen-fx kind (render/screenFx.ts — a thin glassy rim
breathing at the screen's very edge, worn by the `caroming` status): the one
overlay whose referent literally IS the screen edge, so the anchored-sky
exemption is by subject, not just by law.

**THE MATH.** `frameReflect(x, y, dir, r, rect, pad?)` — the one reflection
every consumer shares: component flip + clamp, corners flip both axes in a
single honest call, degenerate rects pin to the center line and terminate.
Flights and bodies bank through the SAME function, so "the wall" can never
disagree with itself between fabrics.

## Consumer 1 — THE FRAME REBOUND (projectiles)

`TrajectorySpec.frameBounce` seeds the lane; the `projFrameBounce` stat
deepens it — the kindred law, `projBounce`'s exact shape (`spawnProjectile`
folds `sheet.get('projFrameBounce', tags, extra, t?.frameBounce ?? 0)` into
`Projectile.frameBounces`; gems create the lane from nothing on frameless
flights; patrol shuttles are exempt like their terrain-bounce kin). In the
projectile step, a FREE flight (not orbiting, spiraling, returning, arc-to
destined, patrolling, or landing a catch-spot) that presses the governing
frame's edge reflects off it, steps clear by `proj.edgePad`, and — the
re-throw idiom — RE-ARMS its range (`traveled = 0`) and clears its hit
ledger: the shot stays a live threat while its rebounds last, and each bank
flashes at the unseen wall (the tell). The budget spends down; a spent
flight dies at range as ever.

**Mirrored Bounds** (data/supports.ts, `requiresTags: ['projectile']`,
Ricochet's sibling) grants `projFrameBounce` flat 2, +1/level. Being an
ordinary stat, affixes, uniques, passives and slot grafts can all grant the
lane the day someone writes the row.

## Consumer 2 — THE CAROM MOTOR (bodies)

`CaromDelivery` (`{ type: 'carom', speed, duration, rehit?, contactScale?,
status? }`) — the third carried-body motor beside dash and leap,
`Actor.caromRun`. The cast stamps the motor, wears the ride status (default
`caroming` — its def's `frameLock: true` is what seals the camera; a
lockless status row named on the delivery makes a free-frame carom, pure
data), and pays `moveBlast(…, 'depart')` so the movement-blast gem family
composes unchanged.

Per tick the ball flies at `speed` through `steppedClamp` — the ONE mover
every walker shares — and banks: a blocked axis flips (the projectile
grid-bounce's axis law at body scale, judged by achieved-vs-asked step under
`carom.blockedFrac`), and the governing frame reflects through
`frameReflect`. Contact pays the skill's WHOLE payload through `resolveHit`
per victim on the `rehit` clock (segment-aware; `noteBodyHit`; supports,
statuses, knockback, credit — the one pipeline), and `strikeSurfaces` rings
bells and pots along the roll once per ride.

**The one clock.** The worn status IS the ride: expiry, dispel and the
cleanse family all end the motor through `World.endCarom` (stop-blast +
linger field paid), and `endCarom` strips the status right back — one truth,
both directions. Hard CC, a grab, a saddle, a downing, death and zone
landings end it early; a WILLED dash/blink/leap quits the ride first (the
saddle law). While it runs the ride is a `movementLocked` volition lock (the
stick feeds nothing; reflex flasks pierce as ever) and casts stay free — the
moving turret is the point. The comet is carried like dash/leap everywhere
the world asks (pits, skyfall, collapse drops, ground hazards, stuck-rescue,
pads): it sails what it crosses.

**Caged Comet** (data/skills.ts — attack/melee/movement/physical, 18s
first-pass cooldown as the deliberate throttle, 3s ride at speed 620,
physical 14–22 + knockback per touch) is the debut. Monsters cast the same
skill through the same door — the probe pins a zombie caged in its own
frame. Vault rows `gem_skills_fourthwall` → `sup_fourthwall` (teased, the
Scald tuition idiom) put both halves in the drop pools.

## Dials

Everything lives in `FOURTH_WALL_CFG`: the fallback half-dims, the publish
grace, the projectile edge pad + bounce flash, and the carom's rehit /
contact pad / blocked-axis thresholds. Skill-side numbers ride the defs.
All first-pass values await her word.

## Known edges (deliberate, first pass)

- Net co-op clients don't yet ship their own drawn frames to the host: a
  remote hero's flights and rides use the fallback centered on that hero (a
  principled proxy for their screen). The couch's shared frame is
  first-class. A `vf` wire field is the obvious extension seam.
- The published frame is the DRAWN one; a mid-lock resize re-frames the
  camera around the stamped center while the tested walls stand — the
  stamped rect stays the truth.
- Under a frame lock the published live frame pins to the lock center
  anyway (the camera follows the lock), so lock-vs-live reads agree for
  everyone on the locked screen.
