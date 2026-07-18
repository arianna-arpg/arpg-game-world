# THE TIER FABRIC — a second walkable layer in the same zone

True verticality without a second zone: the REGION MAP declares the layer.
`RegionKind.tier: 1` = floor on the second tier (composes with `walkable`,
the tier-0 truth): `{walkable:false, tier:1}` is a butte top or a duct under
a building — wall to one layer, ground to the other; `{walkable:true,
tier:1}` is a bridge deck or a duct under a street — ONE CELL, TWO FLOORS.
`tierLink` rows (ramps, culvert wells) are the crossings. `tierVisual` is
the covered layer's own face. Everything derives from the live region map —
no second grid to build, dirty-track or persist (carves self-heal on both
layers by construction; `makeTierView` is a stateless adapter).

## The law (engine/tiers.ts + the seams in world.ts)
- **Movement**: a body confines against ITS tier's floor (the tier swap
  scoped inside `clampPos`, keyed on `opts.mover.tier`). Crossing rules:
  the EXIT rule (standing on a link, stepping toward ground only the other
  tier owns, flips — ramps), and the LADDER TOGGLE (entering a link flips
  outright, latched once per visit — culverts among both-tier ducts, where
  the exit rule can never see single-tier ground). Walking never drops off
  a rim; a SHOVE past one is the RIM FALL — land on tier 0, staggered
  ('over the edge!'): knock them off the butte.
- **Combat**: same-tier ONLY, enforced at the ONE hostility gate (targeting,
  swings, threat, projectiles all agree). Flights carry their caster's tier;
  tier-1 flights cross deck-height air (the blocksShot sweep exempts rows
  that are tier FLOOR — an arrow sails over a butte top; the earth between
  ducts still stops it). World-authored hitAll hazards (sky strikes) stay
  tier-agnostic by design.
- **Population**: tiered zones seed `packSplit` of their packs on tier 1
  (rolled per pack — squads never straddle a rim). Zone memory remembers a
  body's tier; the co-op wire carries it (`tr`); monsters stay on their
  layer (link-crossing AI is a future pass).
- **Render**: `exposure:'open'` draws both layers (buttes — the plateau
  visual + rim carry the height read). `'covered'` hides the other layer's
  bodies and, while the local hero is below, dims the scene and paints the
  duct web live from `tierVisual` (renderer.drawTierVeil — viewport cells,
  no bake).

## The debuts
- **'needles'** (engine/tiers.ts recipe; tileset `needles`, a sibling face
  of the highland biome): butte masses (kind `butte` → region `butte_top`),
  one ramp cut per rim, rope spans strung between neighboring summits
  (`butte_span` — the valley walks under, the deck walks over), open
  exposure, tier packs at 0.45. Thousand Needles / Devil's Tower.
- **The warrens' drains** (`carveSewerTier`, dialed by `sewerTier` on the
  district recipe): culvert wells on the lanes, duct legs under streets
  (`sewer_duct` — no visual: the street keeps its face) and under blocks
  (`sewer_under_wall` — brick above, tunnel below), covered exposure.
  Orphan-proof: a leg lays only where every cell is duct-able, else the
  elbow flips or the pair is skipped. The street grates still mint the
  DEEP sewerworks (the classic descend lane) below both layers.

## The seam this opens (deliberate future work)
Townhouse floors as covered tiers in one zone (today they mint sidezone
floors); tier-aware minimap tint; AI that climbs links; ranged cross-tier
duels at rims (open exposure); doodads seated on decks.

Probe: `balance/probe_tiers.ts` (rows, crossing law, both carves, deck
reachability BFS — zero orphans — determinism). genqa sweeps needles +
tiered warrens automatically.
