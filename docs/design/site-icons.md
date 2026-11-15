# Selected icon artwork on the website

The landing collection, its tooltips, and the database use the selected icon
library for skills, supports and uniques. The database includes a Uniques tab
with item bases, modifiers and flavor text. Each landing category still draws
18 entries from its full pool.

## Identity and provenance

`site/assets/art/icons/manifest.json` records the selection from
`Hollow Wake Assets/catalog/icon-art.json` dated 2026-11-14. Its source SHA-256 is
`fb2bc104e6b6b97a594006f8e9e757fb6bc37f122865777a6d72a043d097b1a8`.
The import contains 1,035 skill, 457 support and 59 unique images: 1,551 selected
256-pixel WebPs totaling 25,100,376 bytes. All are under 32 KiB individually.
This includes the 69 audited additions, five revised paintings, and Barbed
Arrow's corrected name under the unchanged `skeletal_rattling_arrow` ID.

The exact `(kind, id)` pair owns the artwork. Names and item bases are never
used to guess a match: skill/support collisions such as Overload, and
skill/unique Lodestone, remain separate. Emberbrand uses its Ruby Ring artwork.
The manifest retains selection status, original and distribution hashes,
portable library paths, generator information, canonical-source references and
the selected review or owner approval. Originals, prompts and superseded studies
remain in the asset library. Library integration flags are not copied or changed.

## Export and loading

`scripts/site-icon-data.mjs` joins the manifest to the normal web-data export.
Each matching entry receives only the 12-character image content hash in its
`icon` field. `scripts/site-collection-data.mjs` carries that field into the
compact landing export; both surfaces therefore use the same selection.
The existing compact export budget remains unchanged.

The exporter loads the same commander registrations as game startup before
reading the skill and monster registries. All six commander arts remain
non-learnable entries with their exact selected pictures. The corresponding
18 monster bodies/parts carry their small startup-only look definitions in
`portraitLook`; the website portrait wrapper registers them before painting.
This keeps their native anatomy without bundling game registries or startup
code into the lightweight portrait renderer.

`site/assets/item-icons.js` derives the content-addressed URL from the site root,
kind, ID and hash. It never downloads the provenance manifest or preloads the
entire library. One shared observer requests pictures within 250 pixels of the
viewport and releases removed results after filtering or shuffling. Fixed image
dimensions reserve their space; loading and failed pictures retain their fallback.
Unknown future entries get the existing semantic emblem or category mark.
The homepage does not request any item artwork at startup.

The game artwork plugin also reads this selected manifest at build time;
see [ability artwork](../ui/ability-artwork.md). This pass updates shared
selections and website coverage without modifying gameplay definitions.

## Updating selections

Run `node scripts/import-site-icons.mjs <asset-library-root>` after the library
has a selected revision. The importer validates identity, status, image format
and full hashes before copying the distribution WebPs. Content hashes produce
new filenames when an image changes. It refuses to overwrite differing bytes
and does not automatically delete older revisions. Review any unused artwork
before removing it. Commit the selected assets and manifest together, then run
`npm run export-web-data` so all website consumers receive the new hashes.

## Verification

- `npm run check`
- `node --test scripts/test-site-icons.mjs scripts/test-site-collection-data.mjs`
- `npx electron scripts/check-site-icons.cjs` after exporting website data
- Existing `check-site-gothic.cjs` and `check-site-performance.cjs` browser checks

The icon harness covers exact identities, all three 18-entry pools, keyboard
tooltips, shuffling, missing/failed images, nested database URLs, deep-linked
details, unique search, bounded image loading and widths from 320 to 1440 pixels.
It also checks the gap-fill examples, all five revised paintings, the corrected
Barbed Arrow label and startup commander portrait composition. The collection
export test guards all six runtime skill registrations and their selected hashes.
The loading harness retains the initial 1.5 MB resource budget and prepares the
collection ahead of scrolling, including its controlled slower-connection run.
