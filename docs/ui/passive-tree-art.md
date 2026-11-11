# Passive tree class artwork

The Star embeds the owning character's original class painting in its empty
central hub. The 600 × 400 tree-unit painting anchors to `STAR_CENTER`, shared
with Vocation layouts, and pans and zooms with the graph. Its feathered ellipse
stays inside the surrounding passive nodes. Its edge blends into the panel;
a restrained class-colored halo marks the starting point. Nothing animates or
changes allocation, eligibility, currencies, saves, tooltips or input routing.

`src/ui/passiveTreeArtConfig.ts` owns the presentation: enablement, eligible
realms, editor visibility, search dimming, anchor, dimensions, offsets, image opacity,
saturation, feathering, halo and starting-ring strength. `classes` accepts
per-class overrides without adding renderer branches. The default is the main
Star only, with artwork hidden in the editor. Other constellations retain their
own presentation. The `class-start` anchor remains available as an authoring
opt-in. The halo and ring still mark the actual class starting node independently
of the portrait's anchor. Future classes without an image keep a usable graph
and halo. Future Vocation artwork can share this hub and its local coordinates;
this pass does not move any Vocation nodes or add Vocation paintings.

`src/ui/passiveTreeArt.ts` renders one decorative SVG group before the existing
edges and nodes. The group is hidden from accessibility readers and cannot
receive pointer events. Search dims it while the existing search code keeps
matching nodes and their routes readable. The current inventory-page owner
supplies class identity, including when couch players switch the shared panel.
The image does not affect graph bounds. The opening camera uses the configured
default anchor at the existing readable zoom, keeping the whole central portrait
and nearby starting nodes in view. Per-class image offsets do not move the camera.

## Asset authority and packaging

`site/assets/class-art.js` remains the single class-to-painting catalogue.
`src/ui/classArtwork.ts` resolves its local paths through Vite's asset imports,
including the existing Berserker painting outside the `classes` folder. The
build emits content-hashed WebP files for both desktop and relative-base web
deployments; it needs no remote service or sibling website at runtime. Importing
URL strings does not request every painting: only the displayed class loads.
The original files are reused without copying or modifying the source images.

Add future class paintings to `site/assets/art/classes/` and the catalogue. Use
the tree config for framing, separately from the website's crop positions.
An unmapped or unbundled image is omitted; a failed image request leaves the
underlying graph and input intact. Attribution and original generation prompts
remain in `site/assets/art/classes/README.md`, `docs/design/class-art-prompts.json`
and `docs/design/class-art-revisions.json`.

## Verification

Run `npm run check`, `npm run probe -- tiers`, `npm run probe -- storey` (headless panel imports),
and `node --test scripts/test-site-class-art.mjs`, then:

```powershell
node node_modules/vite/bin/vite.js build --base=./ --outDir balance/reports/passive-tree-art-dist
node node_modules/electron/cli.js balance/passive-tree-art-ui.cjs balance/reports/passive-tree-art-dist --relative-base
node node_modules/electron/cli.js balance/tree-gestures-ui.cjs balance/reports/passive-tree-art-dist
```

The artwork harness uses a hidden native window with disposable saves and
profile, cleaned by `scripts/temp-dir.cjs`. It verifies every class image
decodes and fits the opening view, the central portrait clears surrounding
passive nodes with a reading margin, only the selected image is initially
requested, panning preserves
allocation, zoom and search work, couch ownership is respected, and missing art,
other realms and the editor remain usable. Cropped desktop, narrow-screen and
overview screenshots plus a compact report live in
`balance/reports/passive-tree-art/`. The existing gesture harness additionally
covers real node clicks, choices, refunds, proximity and editor dragging. Remove
isolated build output and temporary browser profiles after verification.
The UI roster also runs the artwork course against the ordinary root-base build;
`--relative-base` explicitly enables the additional web-subfolder check.
