# Melee, cones and lightning

This pass continues on `codex/skill-visual-identity`. It covers all 99 native
melee deliveries and 32 non-beam cones in the branch's live catalogue, plus
Lightning, Chain Lightning, Storm Bone and Skeletal Chain Lightning. It changes
presentation without changing damage, targeting, movement, timing or costs.

## Action silhouettes

`src/data/skillStrikeVisuals.ts` assigns an explicit composition to every skill:
action form, material marks, stroke count, motion and optional secondary material.
`src/render/vis/skillStrikeVoice.ts` paints these through the shared effect-voice
registry. Cross Jab keeps its existing authored crossing-strip painter.

| Action | Visible identity |
| --- | --- |
| Cleave and related cuts | Tapered blade ribbons sweep through the contact arc |
| Heavy Strike and other impacts | A dense impact core, broken radial fractures and recoil |
| Rend and claw attacks | Parallel hooked rakes with material following each stroke |
| Thrusts and lunges | Narrow forward strokes and pointed tips |
| Bites and grasps | Closing jaw curves or inward-hooking fingers |
| Lashes | Bending strands with advancing tips |
| Flame Wave | Several scalloped flame fronts moving outward |
| Breath and shard cones | Diverging streams or pointed fragments |
| Focusing Ray | Jagged converging current inside the actual cone |

All motion is derived from effect lifetime. Materials, stroke counts and action
forms remain intact under a wardrobe tint. A shared faint contact wash and edge
show the footprint immediately; animated follow-through does not imply a later
hit. Each composition is unique, but player testing remains the judge of instant
recognition between close relatives in crowded combat.

## True reach and aftermath

Every strike is clipped through `traceFlashFigure`, including faced sectors,
crescents, square/triangle sigils, bands and circular safe centers. Surgical
Strike keeps its empty center. `arcRad` now travels with delayed flashes and
co-op snapshots so a narrow delayed sector does not regain the default angle.

The world chooses the voice at native melee/cone emission and aftermath minting.
Exploded field bodies and delayed repeats retain the parent's action identity.
Ground-qualified effects keep their existing per-cell paint; edge cages and
segment fields retain their dedicated clipping. Telegraph and collision code
continue to own actual contact geometry.

## Lightning

The intended feel is a bright, snapping core and irregular short forks, with
Chain Lightning visibly turning from one contact toward the next. All art is
drawn by local canvas code; there are no imported game assets.

`src/data/lightningVisuals.ts` supplies four profiles. The skeletal pair adds
cross-ribs; the chain variants have more branches and a rougher spine.
`World.noteLightningTravel` records actual projectile travel, clipped at walls
for non-phasing flights. It never draws forward to a candidate target. Existing
pierce, chain selection, forks, return behavior and projectile head dimensions
remain authoritative. Wardrobe projectile bodies retain priority over the
native head, while the source's measured trail survives recoloring.

The trace lives in a paint-only flash, keyed to the projectile by a weak map.
Limits are 48 simultaneous traces, 24 stored points per trace, 0.28 seconds of
travel history, 0.16 seconds of fade and 80 spine segments per painted trace.
Painting uses deterministic coordinate/clock hashing and never combat RNG.
Lightning afterimages do not mint duplicate flash lights. Zone transit clears
them. Co-op copies point arrays; missing fields in old packets clear safely.

## Verification and study

- `npm run check`, `npm run build`, `npm run sim -- run --suite smoke`.
- Run the single-name probe filter separately for `strikevisuals`, `skillvisuals`,
  `skillflights`, `crossjab`, `devotedstartertrees`, `supportfabric`, `cosmetics`,
  `effectvoice` and `projectilecull`.
- After the strike probe and build, run
  `node_modules/.bin/electron balance/strike-visuals-ui.cjs`.

The strike probe pins all 131 native casts, unique configurations, bounded
palette-independent geometry, same-seed hit/status/RNG parity, delayed safe
sectors, actual lightning chain turns, trail expiry and deep co-op copying.
The hidden production-renderer harness checks 180 pixel masks/comparisons,
including every native strike and modified footprints. It also captures six
live casts and verifies a co-op render and the study controls.

Generated artifacts are ignored under `balance/reports/skill-visuals/`:
`strikes.json`, `strike-pixels.json`, `strike-study.html`, overview and monochrome
captures, and `strike-live-*.png`. The animated study has 135 entries, family and
name filters, a shared-color toggle, hidden names, pause and bright terrain.
Lightning frames come from recorded simulation casts; melee/cone loops are
slowed and normalized for comparison. Live captures retain gameplay scale.

Before bringing this commit to seamless, reconcile the current catalogue,
renderer, world travel hook and snapshot seams and rerun destination checks.
This pass does not merge the content-divergent branches.
