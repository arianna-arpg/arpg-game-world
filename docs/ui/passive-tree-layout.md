# Passive tree layout and connections

Node positions are explicit editable data in `data/passives.ts`. This pass
preserves every ID, link, choice and power. All nine attribute starts and the
central painting/Vocation layouts stay fixed. Existing allocations and saves
therefore retain their meaning.

The standard graph is nonplanar. The approved presentation preserves build paths
and uses clear overpasses where crossings remain. Repositioning reduces straight
line crossings from 2,471 to 1,484; obstacle routing brings the final drawing to
1,545 crossings. Every crossing is backed, and hovering a node highlights its
actual direct routes. Only nodes are allocation junctions.

## Authoring boundaries

- Move nodes with the native editor, or apply a reviewed `{id:{x,y}}` map using
  `npx tsx scripts/layout-passive-tree.ts positions.json`. That tool changes only
  x/y source text; it refuses unknown IDs, duplicate source matches and invalid
  coordinates. There is no runtime force simulation or layout override that can
  erase subsequent editor changes.
- `data/passiveTreeLayoutConfig.ts` owns node clearance, endpoint gap, route
  width/color, bridge clearance and near-parallel separation. Shared node radii
  come from `passiveTreePresentation.ts`.
- `ui/passiveTreeRoutes.ts` first uses direct visibility. Blocked connections
  use bounded local A* and line-of-sight simplification to skirt unrelated node
  discs. Near-parallel routes cannot share a long track. Canonical edge identities
  make routing deterministic even if source links are reversed or duplicated.
  Geometry is cached until positions, sizes or connections change.
- Each route carries its two true endpoint IDs. An opaque backing beneath its
  face produces overpass gaps at crossings. Search treats the two layers as one;
  hover dims other faces while preserving backing gaps. Tooltip anchor changes
  drive highlighting for mouse, proximity and controller input alike.
- Vocation routes keep their authored artwork layouts. The dashed gate tether
  remains decorative and is never added to the allocation graph. Editor mode
  retains its native straight-line editing handles and serialization.

## Verification

`probe_passivetreelayout` checks every node's actual radius/padding, bounds and
reachability, every standard route endpoint, every route's clearance from other
nodes, absence of shared parallel tracks, deterministic routing and synthetic
obstruction detours. `probe_vocationlayouts` protects all artwork layouts.
The native node-art and tree-gestures courses cover real interaction. Run all
three type checks and sim smoke for source data changes. During this pass, a
baseline comparison verified all 2,489 nodes were identical after removing only
x/y coordinates from the comparison.
