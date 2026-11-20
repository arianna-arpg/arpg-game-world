# Passive tree layout and connections

Positions are explicit editable data in `data/passives.ts`. The circular tree,
attribute highways, nine starts, central painting and Vocation layouts remain.
The reading pass redistributes crowded inner branches, compacts 223 payoff
clusters into consistent diamonds, and minimizes crossings around those groups.
All 64 first branch choices stay close to their starts and visible in the
configurable 1,240-unit opening view. Every ID, link, choice and power is unchanged; saved allocations retain their meaning.

The standard graph is nonplanar. The approved presentation preserves every build
path and uses backed overpasses for remaining crossings. Straight crossings fell
from 1,484 to 942. The actual routed drawing has 868 crossing segments, down from
1,545 (44%). Routes neither pass through unrelated nodes nor share near-parallel
tracks. Only nodes are allocation junctions.

## Authoring boundaries

- Move nodes with the native editor, or apply a reviewed `{id:{x,y}}` map using
  `npx tsx scripts/layout-passive-tree.ts positions.json`. That tool changes only
  x/y source text and refuses unknown IDs, duplicate matches or invalid coordinates.
  No runtime simulation overrides subsequent editor changes.
- `data/passiveTreeLayoutConfig.ts` owns clearance, endpoint gaps, route widths,
  colors, bridge gaps, parallel separation, crossing cost and hover easing.
  Shared node radii come from `passiveTreePresentation.ts`.
- After editing positions or geometry settings, run
  `npx tsx scripts/route-passive-tree.ts`, then the layout probe and native visual
  review. This authors `data/passiveTreeRouteData.ts`: drawing geometry only,
  with no authority over allocation connections. Review it alongside positions.
- The authoring router lays short local connections first. Longer connections use
  bounded A* with a cost for crossing existing routes. Visibility simplification
  preserves that cost, so shortcuts cannot silently undo a useful detour.
  Edge identity and ordering are deterministic. Full coordinate precision is
  retained in authored data; the SVG face/backing share one drawing path.
- Authored routes are used only when **all** node IDs, positions, radii, edge IDs
  and geometry settings match. Edits or modded content fall back to live
  node-avoiding routing until regenerated. Appearance-only changes do not require
  regeneration. Geometry is cached, so normal opening, search and hover never
  run the expensive authoring search.
- Backing strokes create overpass gaps. Hover gently increases only adjacent
  route brightness by 22% over 180 ms; unrelated routes retain their opacity,
  and learned/unlearned colors and widths stay steady. Reduced-motion mode
  disables the transition. Tooltip ownership drives mouse, proximity and pad
  feedback through the same hook.
- Vocation connections keep their artwork layouts. The dashed gate tether is
  decorative, never an allocation edge. Editor mode retains native handles and
  source serialization.

## Verification

`probe_passivetreelayout` checks all node spacing, bounds and reachability;
authored-data freshness and invalidation; all route endpoints and node clearance;
absence of shared parallel tracks; a crossing budget; deterministic obstacle
routing; symmetric overlap detection; and an avoidable-crossing fixture.
Expansion probes inspect the actual routed geometry using
`balance/passive-route-clearance.ts`, with the current shared node radii.

Run all type checks, the passive/Vocation probes and sim smoke, then build and
run the hidden node-art, tree-art, tree-gestures, passive-routes and Vocation UI
courses. `passive-node-art-ui.cjs <build> --review` also captures an overview and
three close-ups, and verifies subtle hover, reduced motion, native allocation,
search, and all 31 Vocation grants. During this pass, a baseline comparison
verified all 2,489 node payloads were identical after excluding only x/y.
