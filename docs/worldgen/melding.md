# Biome Melding — "you can see the jungle from here"

A **meld** is a neighbor biome's edge dressing: when a zone's exit faces a
*different* biome that declares one, a band of ground along that whole edge
grows the foreign kit — ferns and cuttable brush pressing through the
treeline, standing drifts reaching out of the taiga, sand on the meadow's
hem. The terrain asks "do I want to cross into there?" before the portal
label does, and the label agrees (the meld's `label` breath rides the same
exit label as boundary-gate suffixes).

## The fabric

| Piece | Where | What it does |
|---|---|---|
| `MeldDef` registry | `src/data/melds.ts` | `registerMeld({ id, band?, rows, label? })` — rows are ordinary stamp rows (`kind/count/radius`). `MELD_CFG.band` is the default depth. |
| `BiomeInfo.meld` | `src/world/biomes.ts` | Structural string ref (the enclave-gate idiom): the biome *names* its dressing; the pure-leaf table never imports the registry. |
| `World.meldFor(exit)` | `src/engine/world.ts` | Resolution: resolved exits read the neighbor's **actual** biome; `'?'` frontiers **predict** via the same heat-map sample the mint will use (`biomeFor(projectCoord(...))`) — so the promise the terrain makes is the promise the mint keeps. One-directional (only the foreign kit creeps in); locked / cross-dim edges stay unmixed. |
| `ZoneDef.exitMelds` | `src/data/zones.ts` | TRANSIENT per-load annotation, index-aligned with exits (the `exitBoundaries`/`exitRoads` discipline); stripped at both persistence sites. |
| `buildBiomeMeld` | `src/engine/layoutRecipes.ts` | The builder (registered via `setMeldBuilder`, the boundary-gate idiom): resolves the exit's arena side, compiles an `axisX`/`axisY` WHERE band of the meld's depth, and stamps each row through the ordinary machinery — walk-gating, forbidOn, reservations, spacing and the portal splice all apply as if the tileset had authored the rows. |

## The determinism rule

Meld rows draw from a **dedicated per-exit rng** (`zone seed ^ exit index`),
never the layout stream. A `'?'` frontier that later resolves to a different
biome (an event mint relocating next door) re-dresses the band **without**
shifting the zone's own layout — Zone Memory replays clean.

## Adding a meld

1. `registerMeld({ id: 'bog_meld', label: 'the ground goes soft', rows: [...] })`
   in `src/data/melds.ts`.
2. `meld: 'bog_meld'` on the biome's `BIOMES` row.

Boot validation checks the biome ref resolves and every row kind is a
registered stamp; genqa group 3e sweeps every registered meld over an open
and a carved-grid layout automatically.
