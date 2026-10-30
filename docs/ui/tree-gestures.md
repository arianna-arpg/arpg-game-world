# Tree click and pan intent

Passive and skill trees accept a drag starting anywhere on the graph, including
locked, available, already allocated and choice nodes. A press remains a click
until it travels `PANZOOM_DEFAULTS.dragThresholdPx` screen pixels from its origin
(currently 4). Small hand jitter does not move the tree. Crossing the threshold
makes the entire gesture a pan, even if the pointer returns to its starting point.
There is no hold timer or extra confirmation step.

`src/ui/panzoom.ts` owns this behavior for all SVG pan/zoom surfaces. It captures
the pressed element so a quiet direct click keeps its exact node. Drag-ending
clicks are stopped in the capture phase before any child allocation, choice or
refund handler can run. Passive and skill tree actions still use their existing
availability rules and ordinary world intents. Background clicks retain the
existing tooltip-aligned proximity reach in `UI.reachNode`.

The handler tracks the initiating pointer and button. Cancellation, lost capture,
button-chord release and wheel zoom during a press cannot activate a node.
Release coordinates are checked too, so a fast drag cannot become a click just
because its final movement event was omitted. A fresh press clears the previous
gesture's suppression. Mouse and the controller's existing synthetic pointer
events share the same rules; touch pointers use the same ownership checks.

Tune movement tolerance, pan buttons and zoom factors through `PanZoomConfig`;
hosts can override the defaults when attaching the shared handler. Keep node
availability and point currencies out of this gesture layer. Reserve `host.ignore`
for elements with their own interaction, such as the passive editor's node
position drags and the map's waypoint controls. Ordinary clickable tree nodes
participate in pan recognition. `onDragState` includes the pending click-sized
press, keeping hosts such as the map from rebuilding beneath a held pointer.

## Verification

Run `npm run check`, then build and run the hidden interaction harness:

```powershell
node node_modules/vite/bin/vite.js build --outDir balance/reports/tree-gestures-dist
node node_modules/electron/cli.js balance/tree-gestures-ui.cjs balance/reports/tree-gestures-dist
```

The harness uses separate saves and a separate browser profile. Real Chromium
mouse input checks direct and nearby clicks, click jitter, drags on each node
state, choices, refunds and skill trees at two window sizes. A shared-handler
fixture checks configurable tolerance, capture outside the SVG, button rules,
pointer ownership and recovery after interrupted or synthetic gestures.
