# THE SEGMENT FABRIC — multi-segment bodies as data

`src/engine/segments.ts` · spec on `MonsterDef.worm` (`WormSpec`, src/data/monsters.ts) ·
debut consumer: Vhorun, the Sunder-Wyrm (the primeval world snake)

A worm/snake body has always been ONE actor (the head) trailing a chain of
render-only positions (`WormBody`). The segment fabric is the **opt-in
upgrade that makes those segments REAL**: each one a hittable body whose hit
circle IS its drawn circle — the hit-surface doctrine
(docs/engine/hit-surfaces.md) carried onto creatures.

```ts
worm: {
  length: 26, spacing: 44, taper: 0.975,        // the classic trail (render-only alone)
  hittable: true,                               // ← the fabric: segments are real bodies
  looks: {                                      // kit-parts per segment class (LOOKS ids)
    body: 'wyrm_plate',                         //   the ordinary armored segment
    tail: 'wyrm_tail_spade',                    //   the LAST segment
    every: { n: 5, look: 'wyrm_sail' },         //   every-nth accent (never the tail)
  },
  wounds: {                                     // per-segment wound states
    frac: 0.05,                                 //   pool = frac × root max life
    mods: [mod('damageTaken', 'increased', 0.015)], // laid on the ROOT per torn segment
    text: 'SCALE TORN',
    burst: { radius: 95, damageFrac: 0.035, type: 'chaos', color: '#9fe07a' },
  },
}
```

Absent spec = the legacy render-only trail, **byte-identical** (every helper
degrades to the classic single-circle test: `reachTo(a,p) ≡ dist − radius`).

## The radius law (drawn = tested)

`segR(a, i) = a.radius × taper^(i+1)` — and `× SEG_CFG.woundRadiusMult` once
torn. The renderer draws THIS circle and every hit test tests THIS circle;
both sides import the one function, so drawn and tested can never disagree.
The dev **Hitboxes** overlay strokes every segment circle (torn segments show
their shrunken truth); render-only tails show nothing — they carry no surface.

## The life model

- **Shared pool by construction**: the segment chain never leaves its actor.
  A blow landed on any segment feeds the ONE life bar; the segment is WHERE
  the blow landed, never a damage multiplier — an AoE overlapping five coils
  is **one hit on one creature** (`bodyWhere`/`inAoeBody` return one contact).
  One creature = one kill, one nameplate, one boss bar, one loot/xp credit,
  one objective count — all for free.
- **Wound states layer on top** (`wounds`): each segment carries a pool of
  `frac × maxLife`, drained by skill damage that landed ON it (the shared
  pool is fed regardless). At zero the segment **TEARS** — permanent for this
  life, drawn+tested smaller, `mods` stacked on the root per tear (ONE sheet
  source, `segWounds`), an optional retaliation `burst` at the wound. Rewards
  spreading damage along the body without double-counting anything.
- Pieces that must independently DIE are the **PARTS fabric**'s job
  (`MonsterDef.parts` — anchored actors with break effects). The two compose:
  Vhorun fields maw/coil break-parts at the head AND a hittable spine.
  Neither fabric is boss-gated: THE ANATOMY GAMUT (data/monsters.ts) fields
  ordinary spawn-table composites — the pavise crab's boards, the thurible
  bearer's censer, the siegeback's riders, the mortar whelk's shell-gun, the
  vat sow's sacs, the twinmaw's heads, the effigy porter's idol — each part
  a full MonsterDef whose death IS the counterplay (break = silence, expose,
  or enrage), priced by the `limbreaver` stat (the slayer lane's fourth
  axis, damage.ts mitigateTyped). The marrow whip and the coil matriarch
  run HITTABLE chains at trash tier — the retrofit is three data fields.
  Probe: `balance/probe_anatomy.ts`.

## Hit plumbing (how a segment hit flows)

1. **Collection** (the geometry funnels) finds the contact body:
   `projTouchesBody` (projectiles), `inAoeBody` (novas/shapes),
   `bodyWhere` (zones/pulses/bursts/fissures/tethers), `nearestBody`
   (melee reach, cones, splash, dash corridors, AI range, aim assist,
   cursor targeting). Head is always tested first — plain monsters take
   the exact classic test.
2. `noteBodyHit(actor, seg)` latches the contact immediately before
   `resolveHit`.
3. The ONE damage funnel (`applyHit`, damage.ts) **consumes** the latch:
   only landed damage stamps the per-segment flash (`WormBody.flash[i]`,
   the `hitFlash` idiom) and feeds the wound pool (`feedWound`). Evaded or
   fully blocked swings mark nothing; fuse-banked hits clear the latch and
   land later on the whole creature (a burn gnaws the beast, not a coil).
4. `World.updateWorms` drains the tear queue deterministically: root mods,
   tear text, the burst, the flashes.

## The drive seam (walking-colossus coordination)

Segment POSITIONS come from a **drive**. `'trail'` — serpentine
trail-the-head (`updateWorms`) — is the stock drive and the default. An
articulated limb-chain / gait drive slots in as a new `WormSpec.drive` kind
writing the same `segments[]`; everything else (hit tests, wounds, feedback,
wire, renderer) is drive-agnostic and inherits it for free. **Rigid anchored
limbs should ride the PARTS fabric instead** — the Iron Bell's bearing
columns do exactly that; pick per creature, they compose.

## Rendering (one animal, never a chain of blobs)

`drawWormTail`: per-segment looks bake once per look id (at the head's
radius, scaled per segment — the bake cache never bloats) and each plated
segment ROTATES to its own trail direction. Hittable chains draw SOLID
(they are real bodies); legacy trails keep the ghost fade. Torn segments
draw smaller (the radius law) and dimmer (`SEG_CFG.woundAlpha`). The struck
segment flashes white exactly like a struck body.

## Co-op wire

`ActorW.worm` gains `ht` (hittable), `wd` (torn bitmask — **30-segment cap**,
validated), `sf` (per-segment flash countdowns), all omitted when absent.
Kit-part looks are NOT shipped — the client re-resolves them from
`MONSTERS[defId].worm.looks`. Segment positions already rode the wire and
lerp per snapshot.

## Validation (boot-time, data/validate.ts)

Looks resolve against LOOKS; `every.n ≥ 2`; `wounds` requires `hittable`;
`frac ∈ (0,1]`; wound chains ≤ 30 segments (the bitmask); wound mods name
real stats; burst dials positive; spacing/taper/length physical.

## Deliberate limits (documented, not accidental)

- Segments don't collide with terrain or shoulder the crowd (`separateActors`
  stays head-only) — the trail is the drawn body; its hit surface rides the
  drawn position either way.
- Perception stays head-based: AI SEES the creature by its head (LoS memo);
  range/approach/aim use the nearest body once engaged.
- Environmental washes riding `actorsNear` (heat vents, attunements) stay
  head-based — the spatial index pads by head radius (a colossus envelope
  would degrade the broad phase for everyone).
- Dwell-semantics zone effects (fume exposure, madden) count the CREATURE
  (head) in, not each coil.
- Zone-memory restores respawn from defs — segment TEARS reset on re-entry
  (the world-boss overlay preserves `bossLifeFrac`, the fight's real state).
