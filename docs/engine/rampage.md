# THE RAMPAGE FABRIC — temporary doodad destruction with a guaranteed return

`src/engine/rampage.ts` (policy + faces) · World's `updateRampage` sweep ·
probe `balance/probe_rampage.ts`

A colossal body should not queue politely behind a pine tree — and a minted
pocket arena should not be the price of letting it loose. The rampage fabric
lets any monster PLOW: fellable standing doodads its true surface touches are
crushed flat instead of walling its movement, the zone may be effectively
obliterated while the fight runs — and the land ALWAYS comes back. Temporary
is not a tuning goal here; it is a structural property.

## The opt-in

```ts
// data/monsters.ts
rampage: true                              // all defaults
rampage: { reach: 40, segments: false }    // tuned
```

`MonsterDef.rampage` (`true | RampageSpec`). Spec dials:

| field      | default | meaning |
| ---------- | ------- | ------- |
| `reach`    | `RAMPAGE_CFG.reach` (26) | crush margin beyond true-surface contact |
| `segments` | `true`  | worm bodies crush along every trailing coil — the whole animal is the plow |
| `quiet`    | `false` | suppress the per-fell flash/shake |

Wearers today: the Sunder-Wyrm's head AND its passing glimpse-body (the
crushed furrow across a zone is the pass made legible — follow the wake to
the door it left by), Cragmaw, Ashvein, Dolmourn. Velketh wears none —
enthroned sovereigns are anchored by design.

## Fell-before-move — the plow needs no collision bypass

`World.updateRampage` runs each frame BEFORE the movers step. Every
rampager's footprint (head + trailing worm segments) queries the spatial
index and fells at true-surface contact + reach — `hitSurfaceOf` /
`shapeContains`, so canopy brushes never fell the trunk and an oblong bench
falls exactly where its slab stands. By the time `moveActor` arrives, the
wall is down: the shared confine (`clampPos`) needed zero rampager-aware
edits, and no other mover's physics changed by a byte.

`World.fellDoodad(d, cause?, spec?)` is THE one chokepoint — any future
feller (a player trample stat, a scripted calamity, a siege payload) speaks
through it and inherits the whole regrowth guarantee.

## Down is down — drawn == tested at one seam

`Doodad.felled` is consulted at the TOP of the blocking trio in levelgen.ts
(`blocksMovement` / `blocksProjectiles` / `blocksSightOf` — exactly where
door state already lives) plus `sightShadowFrac`. Movement, shots, AI sight,
LoS rays, spawn placement, the pathing families and the DRAWN veil all flip
together, present and future consumers alike. Side sweeps that key on kinds
rather than the trio carry their own one-line skips: doodad effects (a
crushed geyser sleeps), attunement shrines, windchill hearths, track-fabric
contact bumpers, canopy crowns + the concealment veil, the light clusters
(a crushed lamp goes dark), AI refuge goals, the eldritch adorn pass.

Each flip calls `markDoodadsChanged(d)` — the doodad-families fabric
re-derives exactly the caches that piece belongs to (nav, veil, lights,
bakes), nothing else.

## The drawn face — kind-honest wreckage, zero new painters

The renderer's felled pass (`drawFelledDoodads`) pulls crushed pieces out of
every normal lane (no long shadow, no blend bed, no group shadow — a crushed
body throws no dark) and draws each one as ITSELF squashed flat and faded
(`fellFace`: sy 0.30 / alpha 0.52), swelling back up through the regrow
window. One pure resolver serves host and co-op client alike.

## THE REGROWTH — three roads back, no road to barren

1. **The in-zone sweep.** Fell stamps `wake = now + delaySec + jitter(d)`
   (jitter is a pure hash of the piece's seat — deterministic on every
   peer). THE HOLD: while the piece's CAUSE still stands in-zone (cause key
   = the sovereign's event instance, else its def), the wake is pushed —
   `now + holdSec + jitter(d)`, never pulled — so nothing regrows mid-fight,
   and the release still re-stands the country PIECEWISE however long the
   fight ran. The stand-up swell runs `regrowSec`; the piece stays a GHOST
   (drawn translucent, blocking nothing) until completion, which DEFERS
   while any body overlaps the move surface (THE ENTOMB LAW — the wyrm-wall
   precedent: regrowth never buries anyone) and announces itself with the
   piece's own flash.
2. **Zone memory carries no doodads.** Any re-entry re-mints the layout
   pristine from its seed. Leave mid-obliteration, return: the forest
   stands.
3. **Saves are silent.** `felled` is runtime-only (the `evap` tag law);
   worldstate never sees it.

There is no code path that makes the wreckage permanent. The probe's
REVERSION rig pins it byte-exact: pre-rampage census == post-regrowth
census.

## What may fall — derived, with structural refusals

`fellableDoodad(d)`: a piece is crushable iff it is a STANDING body (its
rule blocks movement, shots, or sight) carrying no live state the fabric
cannot honestly suspend. Structural refusals: doors, hollow seals, pooled
lightwells, landmass shore samples, labeled markers, fall-able pits (a hole
cannot be crushed), spans (crushing the causeway strands), seed-paired kinds
(cave mouths are load-bearing portals), brittle kinds (breakables BREAK,
with their own spoils law). `DoodadRule.fell` overrides per kind: `false` =
authored refusal (`wyrm_coil` — the blockade's drawn face must never
contradict the overlay's edge-block ledger), `true` = opt a non-blocking
kind in (crushable brush).

## Co-op

`StateSnapshot.fell` ships `{x, y, p}` rows — position-keyed (doodad
positions are seed-shared and immutable where indices are splice-prone),
`p` = host-resolved progress (-1 crushed, 0..1 swelling). The wells idiom
throughout: the 20 Hz reconcile IS the guest's felled truth, absence =
standing, a dropped packet self-heals. `World.applyNetFell` stamps `p` onto
the local pieces; `fellProgress` prefers a stamped `p` over any local clock,
so the guest's drawn face and predicted collision both ride the replicated
truth.

## THE SETTLED GROUND (the world-boss venue this fabric exists for)

`WorldBossDef.roam.venue` (overlays/worldboss.ts), default `'ground'`: a
settled serpent's head fight stands IN the rest zone itself — real charted
country in its own dress, no minted pocket jarring against its neighbors,
`pendingMints` owes the engine nothing and `fightAt` seats on the rest node.
The colossus needs no minted room to sweep because the room YIELDS — that is
the rampage fabric's whole argument. `venue: 'arena'` keeps the classic
minted stage as pure data (`arenaName` required, `arenaBand` honored;
validate flags dead knobs on either lane), and an old save's already-minted
arena is always honored over the rest seat. The level law: ground venues
take `levelBonus` at materialize (the apparition's path); minted ground
already carries it in its ZoneDef.

Alongside the venue, `Actor.driven` (stamped from `MonsterDef.driven`)
exempts engine-wheeled bodies from `movementLocked`'s PASSIVE volition lock
— the passive+driven pair used to deadlock, parking the serpent's glimpse
body at the door it entered by while the engine wheeled a refusal every
frame. Death, stun, dash and anchors still hold.

## Deferred seams (documented, not stubbed)

- A player-side trample stat riding the same `fellDoodad` chokepoint.
- A toughness ladder (`rule.fell` as a weight floor against the mass
  fabric's `effectiveWeight`).
- Region/wall crushing — grid cells are a different fabric; this one speaks
  doodads only. A settled fight in massif country is shaped by the big
  terrain, deliberately.
- AI steering still ROUTES around standing blockers until they fall; the
  plow opens the path progressively. A "walks straight through" steering
  posture is one flag away if a future colossus wants it.

## Dials

`RAMPAGE_CFG` (engine/rampage.ts): `reach` 26 · `delaySec` 40 · `holdSec`
20 · `jitterSec` 30 · `regrowSec` 8 · `sweepSec` 0.45 · `face` {sx 1.12,
sy 0.30, alpha 0.52, standAlpha 0.96} · `fxColor` · `shake` 1.8.
