# The Coherence Fabric — clearways, causeways, habitat

Zone generation composes many independent placement systems (tileset scatter,
recipes, landmarks, structures, melds, compositions, exit-road annotations).
Each is individually sane; **coherence** is the contract that their
*composition* still reads intentional: nothing stands in a traveled way,
a road across water is a crossing rather than a swim, and water flora grows
in or beside water. Everything here is registry data — one row opts a new
kind into each contract; no consumer names kinds.

## The clearway contract (traveled ways hold their right-of-way)

A ground kind carrying `DoodadRule.clearway` (levelgen) is a **traveled
way** — `road` is the first; a package's flagstone court or bone causeway
joins with one row:

```ts
road: { overlap: 'ground', walkOnly: true,
  clearway: { decks: ['water', 'tide_pool', 'mud', 'bog', 'swamp', 'ice'],
    yieldsTo: ['lava', 'magma_core', 'cinder', 'gore', 'chasm'] } },
```

Two halves, one promise (the portal-clear lesson: mechanism and invariant
must exempt the SAME set):

- **Placement side** — every siting path refuses to stand a body-blocker on
  a live way disc: `findSpot`'s rule gates, cluster pieces, formation
  pieces, and the forest/riverbank canopy sweeps all call `onClearway(ctx,
  p, bodyR)`. The test runs at the **body** radius (`radius × bodyScale`),
  so crowns overhang the path while trunks stay beside it.
- **Outcome side** — `sweepClearways` (generateLayout, before the forbidOn
  sweep) collects the right-of-way from whatever already stood or poured,
  order-independent. Exemptions mirror the portal splice **exactly**:
  `keep`-tagged pieces, doors, plan-structure rects — plus the fabric's own:
  pieces tagged `waive: ['clearway']` (see waivers) and spanning bridges
  (`DoodadRule.spans`).

All five road emitters lay through **one way-layer** (`wayRoller` /
`layTraveledWay`): exit roads (`carveApproachRoad`), forest game trails, the
thicket/gallery trail, the worn-path `road` stamp, and anything a package
lays next. Reserved ways (`reserve: true`) reserve only their **live** discs
— landmark and structure rolls route around the kept stretches and may crowd
the swallowed ones.

### Overgrowth (the land wins some back)

`layoutParams.overgrowth` — a scalar, or `[fringe, heart]` lerped by
`geo.biomeDepth` — is the share of any traveled way the land reclaims.
Rolled in **runs** (`COHERENCE_CFG.wildRun`), never salt-and-pepper: a
swallowed stretch reads as one passage. Per-way override:
`ExitRoadSpec.overgrowth` (the Holdfast's kept road and the procession's
working way pin `0` — kept means kept).

A `wild` way disc:
- claims no right-of-way (scatter may stand, the sweep spares it — genqa
  exempts exactly the same set);
- reserves nothing;
- gives no `road` moveScale boost (`World.groundAt` skips it — a swallowed
  stretch *feels* different underfoot);
- sprouts reclaiming flora (`COHERENCE_CFG.wildFlora`).

Dials today: forest `[0, 0.18]`, gloamwood `[0.04, 0.26]`, jungle
`[0.12, 0.4]` (world/biomes.ts layoutParams). Everything else defaults 0.

## The causeway contract (ways × liquids)

Where a way crosses soft wet ground, `sweepClearways` applies the riverland
crossing discipline, generalized:

- **decks** — listed ground discs under the way are spliced; the path is
  truly clean ground and the water laps a parted bank.
- **ford** — a decked disc fatter than `COHERENCE_CFG.fordBodyR` is a real
  body (a pour's depth heart): the *way* yields there (its discs drop) and
  the body is marked `shallow` — the path dips through a wade, never a swim,
  and the pond never gets a disc-shaped hole. A mere rim-lap keeps both (the
  water leaking at a shoulder is flavor, and the wade there is honest).
- **yieldsTo** — molten/void ground cuts the way outright: gravel stops at
  lava's shore and resumes beyond. Spanning a chasm honestly is the bridge
  fabric's job (`spans`), never a paint job.

Runtime liquids (a flood event, terraform growths) still drown roads —
`groundAt`'s nastier-ground priority is untouched; the discipline governs
**generation-time** composition only. Aquatic arenas never lay the *default*
gravel exit road (`ctx.aquatic` guard in `carveApproachRoad`); an annotation
that authors its `kind` (a sunken flagstone way) still passes.

## The habitat contract (ground affinity)

`DoodadRule.habitat` declares where a kind belongs:

```ts
kelp: { …, habitat: { near: ['water', 'tide_pool', 'brine_sink'] } },
```

- Enforced at every siting path (findSpot, clusters, formations) as an
  acceptance gate: no qualifying ground within `reach` (default
  `COHERENCE_CFG.habitatReach`) → the candidate is refused. Arrangements
  **conform** to the land: a kelp curtain follows its water and drops the
  anchors that meandered dry.
- **Ordering**: the gate sees only ground poured by earlier rows — pour the
  water, then bed the kelp (the same ground-before convention the `shore`
  gen-field documents). genqa's dead-row lint warns on rows that starve.
- **Aquatic arenas** satisfy ambiently: worldgen stamps `ZoneDef.aquatic`
  from `isAquaticBiome` (BiomeInfo.marine === 'deep'), and the `underwater`
  recipe self-classifies (`ctx.aquatic = true`) — the sea is the habitat.
- The **dry vocabulary** (`kelp_wrack`, `bleached_coral` — what the tide
  left) declares no habitat on purpose: it IS the coherent dry read.

## Waivers (authored exceptions, tagged and honored)

`rules.ignore` on any stamp row accepts `'clearway'` and `'habitat'` beside
the classic gates. Pieces born under a waiving row are tagged
(`Doodad.waive`) exactly as `keep` tags portal furniture — the sweep spares
them and genqa honors them. An authored blockade ACROSS a road, a
deliberately inundated reef-garden biome: one row, intent spelled out,
invariants stay absolute.

## QA

- **genqa invariants**: `clearway` (no un-waived blocker body on a live way
  disc; decked ground never coexists; fat bodies forded shallow; yielded
  ground never underlies), `habitat` (near ground, ambient when aquatic,
  waivers honored), plus the dead-row lint (warn).
- **balance/probe_coherence.ts** (`npx tsx balance/probe_coherence.ts`):
  five dense structural rigs — exit road through a planted roof, scatter
  onto an early road (+ waiver tagging), causeway/ford/lava-cut (with a
  byte-identical water control proving crossings occurred), habitat
  dry/wet/waived/aquatic, and overgrowth run-shape — each with dead-rig
  detection so the probe can never pass vacuously.

## Authoring recipes

- **New traveled-way kind**: one `clearway` row on the rule; lay it via
  `layTraveledWay`. Every gate, sweep, and invariant applies unedited.
- **A biome's overgrown paths**: one `overgrowth` entry in its
  `layoutParams`.
- **A working/kept road**: `overgrowth: 0` on its ExitRoadSpec.
- **Flora with a home**: one `habitat` row; pour its ground first.
- **A deliberately dry garden**: `rules: { ignore: ['habitat'] }` on the
  arranging row — and make it read intentional (a formation/composition,
  not bare scatter).
