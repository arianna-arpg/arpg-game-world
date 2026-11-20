# Vocation layouts within the artwork

All 31 Vocations use editable layouts inside the central portrait. Each free
crest sits on the side facing its actual attribute gate, closer to that gate
than every other Vocation node. Complete node discs fit inside the image ellipse,
with space between discs and unrelated connections. Node IDs, links, powers,
costs and saved allocations are unchanged.

## Configuration

`src/data/vocationLayouts.ts` contains reusable templates and node-to-slot
mappings. `terraces` supports eight-node trees; `grove` adds a position for
Greenwarden. Each mapping follows that tree's actual connections.

Coordinates are normalized against the image ellipse. Positive `y` faces the
spending gate; `x` runs across it. The resolver rotates toward the node identified
by `VocationDef.gateNode` or the home class's start node, then scales against the
portrait dimensions. Cross-class characters still face the Vocation's required
gate. The player's own class does not move it.

Profiles can choose a template, map local node IDs to named slots, mirror the
layout, adjust its approach with `turn` in degrees, or override individual
positions using `points`. Direct positions support arbitrary new node IDs:

```ts
{
  template: 'terraces',
  slots: { blessing: 'nearLeft', covenant: 'farLeft' },
  points: { blessing: { x: -0.50, y: 0.24 } },
}
```

`src/data/passiveTreePresentation.ts` owns the shared 600 × 400 frame and node
radii. Its `PASSIVE_TREE_ART_FRAMES` accepts namespaced per-image dimensions and
offsets, such as `vocation:gravebinder`. Both the image and layout read this map.
Use it for Vocation framing; paint intensity and saturation remain in the art
config. Configuration edits take effect when the data registry loads.

Unconfigured future trees receive bounded legacy coordinates as a fallback.
Every shipped Vocation must have an explicitly reviewed profile; the geometry
probe requires complete coverage. Changed connections must pass the clearance
checks, since a layout for one graph may not suit another. Runtime rendering
uses authored data without a per-frame graph solver or layout randomness.

## Readability

`VOCATION_LAYOUT_CFG` controls node and line clearance, backing, inactive
contrast and edge-end gaps. Connections stop outside the nodes' dark backing
discs and have their own dark under-stroke over the painting. Ordinary choices,
refunds, tooltips, search and pointer handling retain their existing behavior.

The dashed gate tether is decoration, never an allocation link. It leaves clean
gaps around intervening nodes and connections. Clearance uses finite segments,
so unrelated distant branches cannot hide it. Tethers stay out of other realms.
The existing editor continues to work on the resolved positions.

## Verification

Run `npm run check`, the `vocationlayouts`, `passivetreeart` and `passiverefund`
probes, sim smoke, `balance/gravebinder-check.ts` and
`balance/vocation-mutations-check.ts`.

After an isolated relative-base build, run `balance/passive-tree-art-ui.cjs`
with `--relative-base --layout-review`, then `balance/tree-gestures-ui.cjs`,
`balance/gravebinder-ui.cjs` and `balance/vocation-mutations-ui.cjs` against it.
The artwork harness verifies every node disc against its actual SVG image and
checks direct browser hit targets. The optional `--layout-review` flag saves a
native capture of every Vocation for visual review.

The geometry probe checks the roster's discs, internal connections and visible
gate spans for fit, separation and crossings; verifies the gate-facing roots;
and compares powers and links with the original definitions. Custom identity
and segment-clipping cases exercise the reusable authoring and rendering paths.
