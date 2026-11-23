# Passive tree layout and connections

Positions and connections are explicit editable data in `data/passives.ts`. The
circular tree, concentric attribute highways (`R = 2020` inner ring, `R = 2470`
outer ring, nine straight radial spokes at `40°` steps), nine symmetric class
starts around `(3000, 3000)`, central class painting and Vocation layouts all
share one geometric hub. `STAR_CENTER` averages only main-star starts
(`kind === 'start' && !n.realm`) so secondary realms cannot pull the central
portrait or Vocation layouts off-center. All 64 first branch choices keep their
opening bouquets inside the configurable 1,240-unit opening view, and every node
ID, stat modifier, choice and power is preserved.

The structural planarization pass embeds the base wedges in non-crossing radial
order and re-anchors the two-port `weave_*` and `spec_*` bridge clusters into
open planar pockets inside their thematic wedges. Both straight-line crossings
and authored routed crossing segments are reduced to **0** across all 2,188
main-star nodes and 3,269 routes (down from 942 straight / 868 routed crossings,
and 1,545 prior to the earlier routing pass), with 83 routed curves (63 smooth
circular ring arcs and 20 short node-avoiding detours). Routes neither pass
through unrelated nodes nor share near-parallel tracks. Only nodes are
allocation junctions.

Unlearned routes share one slate color across clusters, attribute highways and
Vocations. Highways have a slightly heavier stroke. Once both ends are learned,
the main tree draws the connection in gold and Vocations use their own accent.

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

## Star Astrolabe

Unlock the Star Astrolabe in the Vault and stand beside the Sacrificial Font.
Each arrow turns its ring by one 40° step. The inner Star and Vocation trees
stay fixed. Routes within a band move with their nodes. At a boundary the
inner track meets a different socket when the turn finishes. The world checks
the resulting paths before accepting a turn and names a stranded allocation
when it refuses. Node identities, point costs and choices survive rotation.

The panel animates accepted steps on persistent SVG groups. While the Font is
available, idle frames prepare each band's node art and routes. During a turn,
bitmap surfaces take the place of those vectors. The original nodes return to
their same positions in the document when motion finishes, preserving input and
search state. Another press can reverse a turn in progress. A close-up of the moving band keeps its framing.
A turn outside the current view eases the camera out to show it. Reduced motion
shows the destination immediately. Set the durations and easing in
`PASSIVE_TREE_VIEW_CFG.astrolabe`. The editor uses authored coordinates.

Co-op clients use the host's Font eligibility and confirmed alignment. Retired
heroes carry their alignment into the mercenary's level-scaled tree. Run
`npm run probe -- passiverings` for the 81 alignments and lifecycle checks,
then run `electron balance/passive-astrolabe-ui.cjs` against a built game to
exercise both rings, targeting and input during a turn. The live overview check
samples the outer ring during each third of its arc on the software renderer.
