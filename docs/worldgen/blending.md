# Terrain Blending — two tilesets sharing one zone

A **blend** is the whole-zone generalization of the edge **meld**
(`melding.md`): a zone minted from tileset A carries a partner tileset B and
a **weight field** `w(x,y)` in 0..1 — 0 reads fully as A, 1 fully as B, and
the run between them is a true rasterized transition. Ground palettes and
walls mix per mottle cell, both doodad kits interleave along the field,
and both pack rosters share the spawn table. Nothing about any pair is
special-cased: tilesets *declare* partners as data, and the fabric compiles
whatever the data says.

## The fabric

| Piece | Where | What it does |
|---|---|---|
| `BlendSpec` / `BlendFieldSpec` | `src/data/zones.ts` | The data vocabulary: partner tileset id + a field shape (`kind`, `params`) with composable post-ops — `warp` (organic boundary wobble), `band` (harden/soften the run), `invert`. |
| `TilesetDef.blend` (+ variant override) | `src/data/tilesets.ts` | `BlendRoll = BlendSpec & { chance? }` — zones minted from this tileset roll the blend on a **dedicated sub-stream** off the def seed (blendless mints stay draw-for-draw identical). A variant may override (its own roll) or suppress (`blend: null`). |
| `ZoneSpec.blend` / `CaveMintOpts.blend` | `src/engine/worldgen.ts` | Mint-level override: a directed mint (an event dissolving a zone toward a neighbor) authors its own spec; `null` suppresses. |
| `applyBlend` | `src/engine/worldgen.ts` | The one mint fold, shared by `generateZone` and `mintCave`: resolves the roll, stamps `ZoneDef.blend` (durable — revisits/saves/co-op replay it), composes the layout rows, merges the pack tables. |
| `compileBlendField` | `src/engine/blend.ts` | Spec → the ONE sampler every consumer shares. Registered shapes: `axisX`/`axisY` (transition ramps with `from`/`to` fractions), `radial` (core→rim), `pockets` (jittered-Voronoi tessellation: `span`, `coverage`, `feather`), `noise` (organic patchwork: `scale`, `coverage`, `soft`). New shape = one `registerBlendField` call. |
| `composeBlendLayout` | `src/engine/blend.ts` | `[...A-rows tagged 'base', ...B.common+B.layout tagged 'with']` — every layout generator scatters the union; rows may pre-declare `blend: 'any'` to opt out of gating. |
| The findSpot dither gate | `src/engine/levelgen.ts` | A `'base'` entry keeps `1-w` of its sitings, a `'with'` entry keeps `w` — a **pure position hash** (never the layout rng), so a gated entry can't shift any other entry's stream. |
| The `'blend'` WHERE field | `src/engine/levelgen.ts` | `where: { field: 'blend', min: 0.7 }` sites an authored set-piece deep in the partner's country. Unblended zones read 0. |
| `mergeBlendPacks` | `src/engine/blend.ts` | Partner roster folded at the declared share (`BlendSpec.packs`, default = the field's nominal mean) — `weightedPick`/presence downstream unchanged. |
| The ground bake | `src/render/vis/ground.ts` | Per mottle cell: the partner's floor coats by `w`, both themes' mottle (own palette, grain scale, bias) mix by `w`; speckles **pick** a side's vocabulary (dither); wall fill/lit/dark mix per wall cell, each contrast-guarded against its own floor. |

## The determinism rules

- The blend **roll** rides `def.seed ^ BLEND_ROLL_SALT` — never the mint's
  main stream. The **field** is pure math off `(arena, def.seed)`. The
  **gate** is a pure position hash. Nothing here draws from the layout rng,
  so unblended zones are byte-identical to before the fabric existed, and
  blended zones replay identically across revisits, saves, and co-op.
- `ZoneDef.blend` is **durable** (persists like `theme`/`layout`): the
  composed rows and merged packs live on the def; only the sampler re-compiles.

## Adding a blend

1. On the tileset: `blend: { with: 'ossuary', field: { kind: 'axisY', params: { from: 0.2 } }, chance: 1 }`.
2. Nothing else — boot validation checks the partner + field refs, and genqa
   group 3f picks the tileset up automatically (every registered field shape
   is also swept over a derived pair, plains + dungeon families).

## Consumers to come

Biome-transition zones (mint a blend from the Voronoi runner-up at region
borders), zone dissolution (an event re-minting a zone with a growing
`coverage`), and the open-world conversion all ride this same spec — they
only author data. Per-doodad `theme:` token resolution against the
position-mixed theme is a noted future seam (today a doodad resolves against
the zone's base theme; partner-kit pieces carry their own colors).
