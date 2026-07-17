# THE FLOCKING FABRIC — murmurations, dive cycles, and flight as a state

The murmuration is four small, orthogonal levers — none bespoke to the
chitin — plus pure data. Anything that groups, weaves, flies, or stoops
composes from the same pieces.

## 1. Flock steering as a behavior lever — `BehaviorSpec.flock` (brain.ts)

`FlockSpec` is the classic boid triad plus the trajectory axes, worn per
body and machine-shiftable like every behavior knob (an aloft phase wears
heavy coupling; a grounded feeding window sheds it):

```ts
behavior: { flock: {
  radius?: 130,        // neighbor sense reach (px)
  cohesion?: 1,        // pull toward the local center (0..~2)
  separation?: 1,      // push off pressing flockmates
  alignment?: 1,       // match flockmates' headings — the vortex maker
  kin?: 'def',         // 'def' | 'squad' | 'faction' — who counts
  weave?: 0,           // trajectory axes on the body (weavePower semantics)
  erratic?: 0,         //   (erraticPower semantics, mean-reverting)
  amplitude?: 30,      // weave size in px
} }
```

- **Applied at `steerMove`** (ai.ts) — THE one gate every self-directed step
  flows through — so it composes with every kernel and every idle conduct:
  an orbiting flock wheels as one murmuration, a fleeing one drives as a
  herd (the planned Drove event's whole steering problem, already solved).
  Knockback and forced displacement never consult it; the wayfaring veto
  still runs AFTER the blend (the flock bends the mind, the rim refuses the
  feet).
- **Flockmates must THEMSELVES wear a flock spec** and match the kin rule —
  a drone is never dragged into its cousins' wheeling; two flock packs that
  drift together merge into one murmuration (`kin: 'faction'`).
- **O(local), not O(n²)**: one `World.actorsNear` grid query per carrier
  tick, contributions capped at `FLOCK_CFG.maxNeighbors` (7 — the
  starling's number). Non-carriers pay one undefined-check.
- Dials and gains live in `FLOCK_CFG` (brain.ts); per-spec values multiply
  the config gains. `validateContent` warns on unphysical dials.

## 2. Trajectory-worn flight — `engine/flight.ts`

ONE source for the axes' geometry, imported by BOTH riders:

- `World.advanceProjectile` rides the **position forms** (`weaveOffset`,
  `spinOffset`, `erraticTurn` on its guide) — byte-identical to the math it
  always ran.
- The flock steer rides `weaveVel` (the exact analytic derivative of
  `weaveOffset` — a steered body is a direction, not a teleport) and
  accumulates `erraticTurn` on a mean-reverting offset (`aiFlockErr`), so a
  long-lived body wanders instead of drifting away forever.

Change a formula there and bolt and locust bank the same way. This is what
makes the flock the projectile-aim verb's showcase: homing, fork, chain,
ricochet and the firing styles finally have prey that moves like their own
shots do.

## 3. Flight as a state — `StatusDef.flight` + the `aloft` status (status.ts)

`Actor.flying` (noclip displacement, ground/fall insurance, the renderer's
lift-and-bob) re-derives each status tick as `flyingBase || any worn
flight-status` — so takeoffs and landings are ordinary status traffic
through the one skill pipeline:

- `wing_up` (self delivery) grants `aloft`; the stoop skills carry the new
  **`shed` effect** (`{ type: 'shed', status: 'aloft' }` — Actor.endStatus,
  the deliberate dispel lane, delivery-agnostic) so the wings fold the
  moment the dive commits; `alight` is the bare wing-fold for bodies that
  land without diving.
- `damageVs_aloft` auto-mints with the status (the generated
  `damageVs_<id>` family) — fowling as buildcraft; `fowlers_eye` is the
  first support in the lane.
- **The altitude split** (separateActors): mixed-altitude pairs skip hard
  body-separation — a flier streams over grounded bodies and can never be
  body-blocked nor body-block you. Hits and targeting are UNTOUCHED: a
  swing still swats what passes overhead (melee struggles with the speed,
  never with phantom immunity). Same-altitude pairs part normally.

## 4. Honest dives — `LeapDelivery.telegraph`

A leap with `telegraph: true` paints its landing ring at the dest for the
whole flight (the un-exploded-disc grammar, firming as it falls) AND
surfaces in `imminentThreatTo` — so the player's eyes and every dodge-mind
read the stoop the same way. The dive is a full pipeline cast: visible bar
(`useTime`), painted ring (`airTime`), landing shockwave, grounded window.

## 5. The dive-cycle brain — pure data on the script FSM

`wingCycle(...)` (data/monsters.ts) authors aloft ⇄ stoop ⇄ grounded on the
existing script machine: aloft orbits OUTSIDE every kit tooth's reach (the
sky casts nothing — no cast-suppression hack needed), the stoop is one
scripted dive gated on press-range (an unengaged flock never stoops — it
just murmurates), and the grounded window opens with an idempotent `alight`
so even a fizzled dive lands the melee turn honestly. Timing is per caste;
the beat-clock fabric can adopt these cadences later.

## 6. Natural group size — `MonsterDef.packSize`

A def that declares how it groups sizes its own zone packs (murmurations
[8,12], hermits [1,1]) — group character as the BODY's fact, not
re-authored per tileset row. One size roll on the stream either way, so
undeclared defs spawn byte-identically. `validateContent` warns past 16
(entry-burst discipline).

## The murmuration itself (the first wearer)

- `chitin_skimmer` (flock coin, `packSize [8,12]`, scatter-on-leader-death),
  `chitin_saltant` (heavy stoop, knockback crater, the longest window),
  `chitin_stridulant` (the singer: never stoops, only alights — its
  `stridulate` nova carries `furor` to the flock; kill it and the frenzy
  dies). Hivesands packs + a `roost fields` variant + `murmuration_roost`
  formation (`roost_mast` doodad — bannerPost painter flying a molted
  wing-membrane); one skimmer row joins the Swarming's `flightRoster`, and
  the wingling wears the flock lever so the event's stream swirls as one.
- Perf: flocks are body-count pressure — packSize warns past 16, the
  steering is grid-local, and hivesands stays under the perf harness's
  standing sweep (the matrix derives from the tileset registry).

Probe: `balance/probe_murmuration.ts`. Related: `docs/engine/los-pathing.md`
(the veto the blend feeds into), `docs/balance/README.md` (baseline gates).
