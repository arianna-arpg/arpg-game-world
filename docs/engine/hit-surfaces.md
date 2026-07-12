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
2. `DoodadRule.surface` — the kind's oblong body: `{ hw, hh, orient?, angle? }`
   as **fractions of the channel radius**, spun by the instance's `rot` (or
   `dir`). Benches, logs, racks, sills, reliquary shelves.
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
Deliberate disc holdouts: multi-part silhouettes (rib_arch), walk-on
platforms (gallows), and kinds stamped as overlapping runs (wall/cliff —
rect joints would open pinholes).

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
