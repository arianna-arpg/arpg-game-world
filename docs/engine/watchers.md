# THE WATCH FABRIC — attention as a visible, climbable ladder

`src/engine/watch.ts` · sweep in `World.updateWatch` · gate in `ai.ts
acquireTarget` · drawn read in `render/vis/watchLayer.ts` · probe
`balance/probe_watchers.ts`

## The thesis

Perception was always fully modelled — detection reach, the frontal sight
cone, rear hearing, LoS gating, stealth shrouds, alert callouts, chase
memory — and fully **invisible**. An enemy either hadn't noticed you or was
already killing you, and nothing on screen said which, so approach was a
coin flip. A WATCHER is a body whose attention is a **ladder with visible
rungs**:

```
unaware → stirring → searching → locked
```

`MonsterDef.watch` (a `WatchSpec`) opts a body in. While it stands
UNPROVOKED, a fresh target acquisition no longer locks instantly — the
would-be lock **feeds a suspicion meter** (0..1, `Actor.watchS` +
`watchFedAt`, always read through `watchValueOf` — decay is earned in the
read, the lazy-decay law), and only a full meter locks. Everything the
rungs DO rides machinery that already existed:

| rung | threshold (`WATCH_CFG.rungs`) | behavior |
| --- | --- | --- |
| unaware | `< stir` (0.25) | idle / post / the scanning `sweep` gaze |
| stirring | `≥ stir` | the head TURNS toward the stimulus (`updateWatch`) |
| searching | `≥ search` (0.6) | plants the standing investigate walk (`alertUntil`/`alertFrom` — the same walk kin callouts use) |
| locked | `1` | the ordinary lock — shout, opener, aggro, nothing downstream changes |

Thresholds are deliberately GLOBAL config, never per-def: the ladder is a
language the player learns once. Def dials tune **speeds** (`riseSec`,
`decaySec`, `graceSec`, `searchSec`), never the vocabulary.

## The laws

- **DRAWN == TESTED, by construction.** The scan STAMPS the exact scalars
  it tests onto the actor (`Actor.senseDetect/senseArcHalf/senseRearMul/
  senseAlerted`); the drawn fan, the co-op wire and the probes read the
  stamps — never a re-derivation that could drift. The radial fold is the
  scan's own `senseReach` (one function; the historical inline constants
  now live in `SENSE_CFG`), and every fan ray clips with the SAME
  `castRay 'sight'` + elevation law the perception gate rides
  (`World.sightClipD`). The cone you see is the cone that judges you.
- **LEGIBLE OR NOTHING.** If a body can detect you, the means must show.
  `validateWatch` refuses a watcher with `cone: false` and no
  watch-sourced tell row; the probe census names shirkers.
- **LADDERS DECAY.** Back off mid-climb and the meter drains after a grace
  — watchable, learnable, reversible below the lock. A LOCKED watcher
  whose fight ends (lock gone, investigation lapsed, no fresh wound)
  STANDS DOWN: aggro clears, the meter re-banks at the search rung and
  drains like any suspicion, and the gate re-arms. The whole descent is
  drawn.
- **PAIN NEEDS NO LADDER.** A recent wound (`aiHitAt` within
  `provokedSec`) bypasses the gate entirely; taunts, relentless bonds and
  held locks never re-gate; and the hit chokepoint (`resolveHit`) jumps a
  wounded watcher's ladder to the search rung TOWARD the blow's author
  with the struck alarm armed — its now-alerted all-around senses find the
  attacker on the next scan and the bypass locks at once. A watcher can be
  sniped from beyond its senses; it can never be left standing dumb under
  fire.
- **A LOCK IS A LOCK.** For a watch body, ANY fresh lock — climbed,
  wound-bypassed, taunted — sets `aggroed`, which PINS the meter at 1: the
  worn tell reads locked and the fan stands down. A tell must never say
  "searching" about a body already fighting you.
- **SIDE CHANNELS CAP.** Noise and scent raise suspicion only to the
  SEARCH rung — they say WHERE, never WHO. Only the watcher's own senses
  on your actual body close the lock.

## The three postures

**THE SENTINEL** — `watch.sweep: { arcDeg, sec }`: while unaware the
facing oscillates around the post bearing (`aiPostFacing`, else the spawn
facing) and the drawn cone sweeps with it — perception as a SPATIAL
puzzle. Compose with `post: true` (the duty station) and
`PerceptionSpec.alertShout` (the lock's callout, which also JUMPS kin
watchers' ladders to the search cap). Debut: `barrow_watchman` — narrow
70° gaze at 1.35× detection, wick-green carried lamp (`MonsterDef.light`),
420px shout.

**THE DROWSING** — `watch.sleep`: below the stir rung the eyes are SHUT —
the sight cone collapses to 0 (`watchArcDeg`) and every approach is rear
hearing, drawn as the bare ring. An intruder moving slower than
`WATCH_CFG.sleep.stillSpeed` feeds at `stillMul` (creep the rim, don't
dash it). Give it `post: true` and its heap is its station: chase over, it
walks back and settles dark again. Debut: `gorged_ghoul` — eyes that
exist only as a tell part (`alpha: [0,1]` rides the meter), a body that
runs DARK asleep via an inverted-band tint.

**THE TRACKER** — `watch.scent: { range, maxAge }`: it hunts where you
WERE. Players print a trail while a scent watcher stands in the zone
(`WATCH_CFG.trail`, ring-buffered on `Actor.trail`); the nose takes the
OLDEST print fresher than its cursor within range and marches the line in
lay order through the investigate walk, feeding the ladder at
`scent.feedPerSec` (capped at search). **Water is the counterplay**:
statuses in `trail.breakStatuses` (`wading`, `swimming` — the region
stand-statuses) suspend printing, so a stream crossing GAPS the line wider
than the nose and the tracker loses you exactly where the water was
(suspicion drains below stir → the quarry is forgotten). Any party landing
(`landPartyAt` — zone arrival, teleport, corpse-run) clears trails: you
didn't walk there. Debut: `barrow_hound` — 0.55× sight (the eyes only END
the hunt), nose-down posture worn as the watch lean.

## Noise — the open stimulus

`World.noiseAt(pos, radius, source?)` feeds every hostile watcher's ladder
toward a point (linear falloff, capped at search, re-aims a standing
walk). Two chokepoints ring it today: a resolved blow at the victim's feet
and a spent projectile flight wherever it ends — wall, floor, range's edge
— both gated on the `noiseOnHit` stat (the value IS the radius). The
**Ringing Report** support grafts it per-skill (`requiresMechanisms:
['strikes']`): throw a bolt PAST a sentinel and it walks to the noise, not
to you. Any modifier source may grant the stat; any system may call
`noiseAt` directly (doodads, skills, events).

## Tells + the wire

The `watch` tell source (registered by the fabric itself) reads the live
ladder — bind it to any channel (`glow`, the ghoul's eye-part alpha, the
hound's lean, an inverted-band tint). Co-op ships `ActorW.wp` =
`[detect, arcHalf, rearMul, alerted, value]` — DERIVED scalars in the tell
wire's idiom, stamped from the scan; the client rebuilds the same fan from
the same numbers and folds its own hero's detectability/stealth locally.
Suspicion sources never cross the wire. Watch state is transient by
design: zone re-entry meets a fresh watch.

## Dials

Everything is data: `WATCH_CFG` (rungs, rise/decay/grace, the proximity
taper `nearFrac`/`edgeFrac`, `alertRiseMul`, `provokedSec`, sleep, scent,
noise, trail, the sweep cadence, `turnRadSec`) · per-def `WatchSpec` ·
`SENSE_CFG` (the perception fold's constants) · `VIS_CFG.watch` (rays,
cull, rung colors, trail dress). The drawn read honors `cone: false` only
when a watch tell row stands in for it (the legibility law).

## Traps learned (probe-pinned)

- The sim runs no brains: every live rig drives `updateAI` per actor
  before `world.update` (the host loop verbatim), and PARKS the arena hero
  (position + `detectability` 0) — an alerted watchman's all-around reach
  covers most of the arena.
- A collapsed sleeper arc uses STRICT `<` in every in-cone compare (scan,
  gate, fan): with `<=`, the exact facing ray of an arc-0 sleeper reads
  full-reach — a measure-zero spike, but a lie.
- Ordinary locks never set `aggroed` (only relentless/taunt/swarm did) —
  the watch fabric sets it on ANY fresh lock so the tell can't lie
  mid-fight, and clears it itself at stand-down.
