# Passive tree artwork

The Star embeds the owning character's original painting in its central hub.
An earned Vocation replaces the class painting; a character without a matching
Vocation image keeps its class art. The 600 × 400 tree-unit painting anchors to `STAR_CENTER`, shared
with Vocation layouts, and pans and zooms with the graph. Its feathered ellipse
stays inside the surrounding passive nodes. Its edge blends into the panel;
a restrained class-colored halo marks the starting point. Nothing animates or
changes allocation, eligibility, currencies, saves, tooltips or input routing.

`src/ui/passiveTreeArtConfig.ts` owns the presentation: source priority, identity
order, enablement, eligible realms, editor visibility, search dimming, anchor,
dimensions, offsets, opacity, saturation, feathering, halo and starting-ring
strength. `artworks` accepts namespaced per-image overrides without renderer
branches (it replaces the former `classes` override map). The default is the main
Star only, with artwork hidden in the editor. Other constellations retain their
own presentation. The `class-start` anchor remains available as an authoring
opt-in. The halo and ring still mark the actual class starting node independently
of the portrait's anchor. Characters without any available image keep a usable
graph and halo. [Vocation layouts](vocation-layouts.md) share the image frame,
fit inside the painting, and face their required attribute gates. Shared
dimensions and offsets live in `src/data/passiveTreePresentation.ts`.

## Selection and extension

`src/ui/passiveTreeArtSelection.ts` resolves a presentation context through an
ordered list of catalogue sources. The panel supplies only its owner's class
and **earned** Vocation IDs, plus the class identity for image variants. Account
unlocks and merely offered quest chains do not select or reveal Vocation art.
The existing live-panel cadence repaints an open tree when its identities change,
respecting held presses and retaining the unchanged SVG afterward. Saved or
network-restored Vocations use the same path when the panel opens or refreshes.
There is no extra saved art selection to become stale.

The default source order is Vocation, then class. If the gameplay cap permits
several Vocations, the latest earned one with available artwork wins. Each
source can instead use `order: 'first'`. A missing catalogue entry or unbundled
image falls through to the next candidate. A class-specific variant, such as
Summoner's Gravebinder, falls back to its base Vocation image when unavailable.
An earned cross-class Vocation still displays; website offer filters do not
restrict the character's earned identity.

Style merges in this order: defaults → source style → namespaced image style.
For example, `artworks: { 'vocation:gravebinder': { opacity: 0.55 } }` tunes one
calling. `class:spellblade` and `vocation:spellblade` remain separate identities.
Changing source priority, framing or intensity needs only configuration.

To introduce another source, register its entries in `ARTWORK_CATALOGUES`, add
its original asset paths to the URL imports, supply eligible IDs under that
catalogue key in the panel context, and add a source rule. The selector and SVG
renderer need no new identity-specific branches. The pure selector accepts
catalogues and URL resolution explicitly, allowing alternative authored sources
and meaningful headless checks without a browser or asset loader.

`src/ui/passiveTreeArt.ts` renders one decorative SVG group before the existing
edges and nodes. The group is hidden from accessibility readers and cannot
receive pointer events. Search dims it while the existing search code keeps
matching nodes and their routes readable. The current inventory-page owner
supplies all artwork identities, including when couch players switch the shared panel.
The image does not affect graph bounds. The opening camera uses the configured
default anchor at the existing readable zoom, keeping the whole central portrait
and nearby starting nodes in view. Per-image offsets do not move the camera.

## Asset authority and packaging

`site/assets/class-art.js` and `site/assets/vocation-scenes.js` remain the
authoritative image catalogues. `src/ui/artworkCatalogues.ts` adapts their entries
and class-specific variants to a common contract, resolving local paths through
Vite's asset imports, including Berserker outside the `classes` folder. The
build emits content-hashed WebP files for both desktop and relative-base web
deployments; it needs no remote service or sibling website at runtime. Importing
URL strings does not request every painting: only the selected image loads.
The original files are reused without copying or modifying the source images.

Add future paintings to `site/assets/art/classes/` or `site/assets/art/vocations/`
and their catalogue. Use
the tree config for framing, separately from the website's crop positions.
An unmapped or unbundled image falls back as described above; a failed runtime image request leaves the
underlying graph and input intact. Attribution and original generation prompts
remain in `site/assets/art/classes/README.md`, `docs/design/class-art-prompts.json`
and `docs/design/class-art-revisions.json`. Vocation provenance and exact
generation prompts remain in `site/assets/art/vocations/README.md` and its
`prompts.json`, `lineage-prompts.json` and `roster-prompts.json`.

## Verification

Run `npm run check`, `npm run probe -- passivetreeart`, `npm run probe -- tiers`,
`npm run probe -- storey` (headless panel imports), and
`node --test scripts/test-site-class-art.mjs scripts/test-site-vocations.mjs`, then:

```powershell
node node_modules/vite/bin/vite.js build --base=./ --outDir balance/reports/passive-tree-art-dist
node node_modules/electron/cli.js balance/passive-tree-art-ui.cjs balance/reports/passive-tree-art-dist --relative-base
node node_modules/electron/cli.js balance/tree-gestures-ui.cjs balance/reports/passive-tree-art-dist
```

The artwork harness uses a hidden native window with disposable saves and
profile, cleaned by `scripts/temp-dir.cjs`. It verifies every class image
decodes and fits the opening view, every Vocation painting appears after a real
grant, Summoner's variant is distinct, cross-class callings render, an open tree
repaints on the normal live-panel refresh, and the central portrait clears surrounding
passive nodes with a reading margin. Only the selected painting is initially
requested; panning preserves allocation, zoom and search work with Vocation art,
couch ownership is respected, and missing art,
other realms and the editor remain usable. Cropped desktop, narrow-screen and
overview screenshots plus a compact report live in
`balance/reports/passive-tree-art/`. The existing gesture harness additionally
covers real node clicks, choices, refunds, proximity and editor dragging. Remove
isolated build output and temporary browser profiles after verification.
The UI roster also runs the artwork course against the ordinary root-base build;
`--relative-base` explicitly enables the additional web-subfolder check.
