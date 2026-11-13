# Selected icon artwork on the website

The landing collection, its tooltips, and the database use the selected icon
library for skills, supports and uniques. The database includes a Uniques tab
with item bases, modifiers and flavor text. Each landing category still draws
18 entries from its full pool.

## Identity and provenance

`site/assets/art/icons/manifest.json` records the selection from
`Hollow Wake Assets/catalog/icon-art.json` dated 2026-11-13. Its source SHA-256 is
`ab5b981ae0263492d5f0b5e4f12e2fc1cfe6e1e7a7a178d3077e3e41f5177e54`.
The import contains 966 skill, 457 support and 59 unique images: 1,482 selected
256-pixel WebPs totaling 23,832,850 bytes. All are under 32 KiB individually.

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

`site/assets/item-icons.js` derives the content-addressed URL from the site root,
kind, ID and hash. It never downloads the provenance manifest or preloads the
entire library. One shared observer requests pictures within 250 pixels of the
viewport and releases removed results after filtering or shuffling. Fixed image
dimensions reserve their space; loading and failed pictures retain their fallback.
Unknown future entries get the existing semantic emblem or category mark.
The homepage does not request any item artwork at startup.

This is website presentation. Game HUD icons and their small-size readability
are a separate consumer pass; this change does not modify game data or balance.

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
The loading harness retains the initial 1.5 MB resource budget and prepares the
collection ahead of scrolling, including its controlled slower-connection run.
