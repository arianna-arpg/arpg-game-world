# THE AOE SHAPE REGISTRY — area figures as data, drawn == tested

`src/engine/skills.ts` (`AOE_SHAPE`, `AOE_BAND_DEPTH`, `bandSwingGeo`) ·
`src/engine/world.ts` (`inAoe` — THE test) · `src/render/vis/aoeTrace.ts`
(`traceAoePath` / `traceFlashFigure` — THE tracer) · probe:
`balance/probe_crossjab.ts` (rigs B + D)

Every area query in the engine — novas, ground zones, storms, auras, linger
fields, melee swings, cone sigils, leap landings, aftermath sequels, edge
bands, the fill-in hole — resolves its geometry through **one** predicate,
`inAoe(center, radius, shape, facing, target, targetRadius, arcRad?)`, and
every painter that shows an area — the zone telegraph, the flash body, the
cast foresight, any registered effect voice — builds its path through
**one** tracer, `traceAoePath(ctx, x, y, radius, shape, facing, arcRad?)`.
A shape is a row in `AOE_SHAPE`; adding one means one branch in each of
the two functions, and every consumer learns it at once. Nothing else in
the engine may hand-roll an area test.

| shape | value | figure | `radius` means | faced |
|---|---|---|---|---|
| `circle` | 0 | the disc | its radius | no |
| `square` | 1 | an axis-aligned box | its half-side | no |
| `triangle` | 2 | equilateral, apex along facing | circumradius ÷ 1.25 | yes |
| `crescent` | 3 | an annular sector (inner rim 0.55 R) | outer radius | yes (+ `arcRad`, default 110°) |
| `sector` | 4 | the crescent without its hollow heart | radius | yes (+ `arcRad`) |
| `band` | 5 | **THE CROSSING STRIP** — a rectangle turned to the facing | its half-WIDTH across the facing | yes |

Proportions that are not knobs (the triangle's 1.25, the crescent's 0.55,
the band's `AOE_BAND_DEPTH` = 0.4 half-thickness per half-width) are fixed
so `radius` stays the one meaningful number a zone, flash or sequel carries;
`inAoe` and `traceAoePath` read the same constants.

## How a figure reaches a delivery

- **The stat** `aoeShape` (base 0, `override` mods) — the Square / Triangle
  Sigil gems re-geometry any area that runs a shape query. The read-site
  registry (`data/graftReadSites.ts`) names where the stat is read.
- **The delivery's innate figure is the query's BASE** — `GroundDelivery.shape`
  and now `MeleeDelivery.shape` are `keyof typeof AOE_SHAPE` and are handed
  to `sheet.get('aoeShape', tags, extra, AOE_SHAPE[d.shape ?? 'circle'])`, so
  an authored figure stands until a sigil override wins. A data-loaded row
  naming an unregistered shape is refused at boot (`data/validate.ts`).

## THE BAND on a melee swing (the Cross Jab, 2026-09-11)

A `band` swing keeps the swing's two authored knobs meaningful:

- `range` is still the far edge: `reach = (caster.radius + range) × meleeReach`.
- `arcDeg` is still the width: the strip is exactly as wide as the arc's
  chord at reach — `halfWidth = reach · sin(arc/2)` (arcs past 180° saturate
  at the full reach) — so `swingArc` / `aoeRadius` levers widen it as they
  widen any swing.
- `bandSwingGeo(reach, arcRad)` returns `{ halfWidth, halfDepth, standoff }`
  with `standoff + halfDepth === reach`: the strip's centre sits `standoff`
  ahead of the caster, its far edge at reach, its near edge
  `reach − 2·halfDepth` out. A body pressed against the caster is still
  touched through its own radius; a body behind never is.

ONE figure (`bandC` + `bandGeo` in world.ts's melee case) feeds the victim
test, the flash (`shape: band`, at the strip's own seat), the ally mend, the
mallet's `strikeSurfaces` (which carves the lite pool too), the field
centroid and the aftermath minter (a Seismic March off a cross walks bands),
and the renderer's cast foresight (`renderer.ts` — the pit champion's third
beat is drawn as a strip through the same `bandSwingGeo`). A sweeping swing
(`meleeSweep`) still takes precedence, as it does over every sigil.

`MeleeDelivery.fx` names a registered effect voice for the swing's flash;
`'crossjab'` (vis/effectVoice.ts) paints the flash's OWN figure through
`traceFlashFigure` — a sigil-re-geometried cross still speaks the truth —
under THE KNUCKLE STREAK, a fist-line crossing the strip end to end over the
flash's life (dials in `VIS_CFG.effectVoice.crossjab`). `balance/
probe_effectvoice.ts` sweeps every authored delivery `fx` for resolution.

## Gates

`npx tsx balance/probe_crossjab.ts` (rig B: the band law + `bandSwingGeo` +
the tracer's corners on the tested rim; rig D: side bodies the jab's wedge
passes over are struck by the cross's strip, nothing past reach or behind)
· `probe_effectvoice` (voice resolution + painter smoke) · `npm run probe`.
