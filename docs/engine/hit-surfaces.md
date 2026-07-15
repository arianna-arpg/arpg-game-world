# Hit surfaces — collision as data

Two fabrics keep "what you see" and "what collides" the same object:
**doodad hit surfaces** (`src/engine/shapes.ts`) and **projectile forms**
(`src/engine/projForms.ts`). Neither consumer switches on a kind or a skill
id — geometry is data on the registry row, resolved through one function.

## Doodad surfaces (`engine/shapes.ts`)

`HitShape` is a discriminated union — `{ kind: 'circle', r }` or
`{ kind: 'rect', hw, hh, rot? }` — anchored at the doodad's `pos`.
Resolution is **one function**, `levelgen.hitSurfaceOf(d, channel)`:

1. `Doodad.hitbox` — a per-instance authored surface, already in world
   orientation. Structure doors author their slab here (`doorSurfaceOf`:
   breadth flush with the breach cells, depth `DOOR_SURFACE_CFG.slabHalfDepth`).
2. `DoodadRule.rockForm` — the SEED-ROLLED stone grammar
   (`engine/rockForms.ts`): rock, sea_rock, rock_spire and colossus_fist
   derive their surface per instance from the same mono / split-pair /
   shoulder-outcrop roll the boulder painter draws. One rolled lobe is the
   exact-parity circle; several resolve as a `multi` union of lobe circles
   (memoized per doodad — clampPos and castRay ask in their hottest loops).
   The painter PREFERS the rule's cluster/spire values over its visual
   params, so look and collision cannot drift.
3. `DoodadRule.surface` — the kind's oblong body: `{ hw, hh, orient?, angle? }`
   as **fractions of the channel radius**, spun by the instance's `rot` (the
   default), its facing (`orient: 'dir'`), or **pinned to the world axes**
   (`orient: 'fixed'` — for painters that draw unspun, like the palisade
   square and the hellforge, or only LEAN by `sin(rot)·ε`, like fin blades;
   spinning those by raw rot would break the pixels-are-the-contract
   identity). Benches, logs, racks, sills, reliquary shelves, headstones,
   monoliths, statue plinths, hay bales, drying racks.
3. Otherwise the classic disc.

Channels mirror the trunk/crown split: `'move'`/`'shot'` resolve at
`bodyRadiusOf`, `'sight'` at the full visual radius.

Consumers (never bypass these): `World.clampPos` (push-out with face
normals), `World.pointInSolid`, `los.castRay` (both channels, exact
ray/shape entry-t, start-inside = t0), `World.buildConvexNav` /
`stampNavSurface` (pathfield stamps the padded shape), and the projectile
terrain sweep.

**Broad-phase invariant** (genqa-enforced): the spatial index inserts by
`max(radius, boundR)`; `normalizeDoodadBound` — run at the index-rebuild
chokepoint (`ensureDoodadIdx`) — stamps `boundR` whenever a surface pokes
past the visual radius. Author surfaces, never `boundR`. Co-op ships
`hitbox` on the doodad wire; the client re-derives `boundR` itself.

Authoring a new oblong kind: draw the painter, then set `surface` to the
painter's drawn proportions **oriented by the same `rot` the painter
reads** — that identity is what keeps every placement mode (scatter,
formation `rot:'chain'`, structure cells) honest with zero further wiring.
Model the GROUND FOOTPRINT (the base band where the body meets the floor);
up-screen sprite height is fake-2D height, not depth — a fin's horn and a
banner's cloth rise over the fight, they don't widen it. When the kind
wears a `bodyScale`, remember the fractions ride the BODY radius
(fishing_rack: `{hw: 2.1} × 0.5 = 1.05r`). Brittle pop probes ('hit' /
'touch' / 'near') deliberately stay generous discs — surfaces change what
BLOCKS, never what pays.
Deliberate disc holdouts: multi-part silhouettes (rib_arch), offset arcs no
centered rect can hug (tooth_row — snugged with `bodyScale` instead),
walk-on platforms (gallows), kinds stamped as overlapping runs (wall/
cliff/wyrm_coil — rect joints would open pinholes), FUNCTIONAL PLUGS whose
full disc is the door (crumbling_wall/secret_wall — they must seal their
gap until popped, so their VISUAL pins `cluster: 0` to draw the one sealing
mass rather than the collision shrinking to a rolled look), and every kind
whose painter truly draws a circle (mounds, wells, columns, pot clusters,
vents, domes, shard clusters) — for those the disc already IS the pixels.

## Projectile forms (`engine/projForms.ts`)

`PROJ_FORM_GEO` is the single geometry table for a flight's LOOK **and**
its HIT: the renderer's shape cases draw from it, and `projFormTouches`
samples the same curve for the body test (`World.projTouches` → enemy
hits, bell constructs, brittle pops). Wide forms — `bar`, `arc`, `wave`,
`line` — hit exactly along their art; compact forms (circle, square,
triangle, octagon) stay honest discs. Animated forms clock on `p.age`
(sim time, deterministic, shipped as `ProjW.a`), never wall-clock.

Terrain contact uses `projFormNose` — the form's leading-edge extent on a
**center-line** test (the flanks of a wide front wash past a pillar the
nose misses; documented trade).

Per-skill escape hatch: `ProjectileDelivery.hitForm: 'circle'` restores
the classic disc for a skill whose art is deliberately looser than its
body. Adding a form = one `PROJ_FORM_GEO` entry + a draw case keyed on the
same factors.

## Seeing it

Dev panel → Location → **Hitboxes** (`World.devToggleHitboxes`): red =
move surfaces, orange = shot surfaces that differ, white = actor bodies,
cyan = flight forms — all drawn from the live resolvers, so if an outline
hugs its pixels the fabric is telling the truth.
