# Skill and support artwork

Inventory Memories, vendor tiles, the build rack, support sockets, Memory
reveals, hotbar slots and source-skill buff icons share the selected website
paintings. The exact `(skill | support, id)` pair selects the image. A skill
and support named Overload therefore retain different artwork; translated
names and item bases never select pictures.

`scripts/ability-artwork-plugin.ts` reads the website's
`site/assets/art/icons/manifest.json` at build time and replaces the headless
stub in `render/abilityArtworkCatalog.ts` with selected asset URL imports.
Vite includes those WebPs in desktop/offline and relative-base web builds.
No remote site, provenance download, second selection list or separate copy
of the artwork is needed. Existing provenance stays with the source images.
Updating the website selection through its importer updates the next game
build too; old revisions left on disk do not silently win selection.

## Ephemeral appearance

`render/abilityArtwork.ts` owns `ABILITY_ICON_VIEW`. Skills use the approved
Balanced Bloom: 20% corner radius, 14% edge feather, 85% bloom strength and
a 2.8%-width blur confined to the feather. The central subject stays sharp;
skills have no eye rim. Supports use the refined Split Identity: a wider
rounded opening (34% radius, 16% feather) with paired wisps. Their inventory
and vendor artwork is 26px inside the existing cells, up from 22px.
Canvas and DOM share generated alpha fields. Canvas filters only when baking
a cached face; DOM copies a shared decoded source into masked canvas surfaces. No animation
or repeated canvas readback is involved.
Inventory and vendor Memory squares have quieter, translucent boundaries;
rarity tint, the 12px Hollow Wake support insignia, levels, locks and upgrade controls
remain visible. Physical equipment keeps its ordinary tiles.
`render/itemIcons.ts` uses the existing size-hinted website favicon (the same
insignia shipped with the game), packaged by Vite for offline/relative-base use.

## Fallback order and loading

1. Selected painting for the exact kind and ID.
2. Existing authored in-game vector drawing.
3. Existing semantic drawing (delivery, tags or effect), then the generic
   arcane emblem. Supports retain their linked support emblem.

The drawing is present immediately while an image loads and stays present
if the image is absent, cannot decode or fails to load. Missing build-time
image files warn and use the drawing. A live return-to-mark action continues
to display its recall symbol. Converted hotbar skills still use the live
converted definition supplied by the renderer.

`render/abilityArtworkCache.ts` owns one queue for DOM, canvas and entry
preparation. Requests for the same URL share one promise; eight loads/decode
operations can run together. Successful sources are downsampled once to
192×192, then the original image is released. The 96-source LRU retains at
most 13.5 MiB of RGBA source pixels (excluding browser/GPU overhead, live DOM
surfaces and the separate bounded finished-face cache). Failed URLs are
remembered; an eight-second timeout prevents stalled requests holding slots.

DOM icons own small canvas surfaces, populated once from that shared source.
One IntersectionObserver requests cold artwork near visible panels; one
child-list MutationObserver hydrates warm icons before paint and releases
removed lazy targets. Neither observes attribute changes or polls every frame.
Pending callbacks hold only weak element references. Warm inventory updates
retain existing icon elements by artwork identity, kind, color and size, so
sorting, lock changes and reopening never reset their ready pixels. Unchanged
explicit refreshes now honor the existing markup comparison; changing the
world, seat or metadata owner still invalidates handlers. Static icon markup
also has a bounded cache. Other panels can use `replaceAbilityPanelHtml` when
their controls follow the same rebuild-and-rewire contract.

The hotbar checks its finished-face cache before requesting the source image.
Evicting a source thumbnail therefore cannot downgrade a valid baked icon to
its fallback. Canvas readouts continue to draw after the face.

`ui/prepareAbilityArtwork.ts` prepares local/couch hotbars, bag gems, socketed
supports and learned skills during the existing entry/Continue loading lease,
alongside world presentation. It prioritizes active skills, caps the batch to
the source-cache capacity, and never loads the whole catalogue. Cancellation
stops new scheduling; a two-second optional-art budget prevents slow artwork
holding up gameplay. Missing/late art continues through the normal fallback.
Classic acronym mode
still bypasses artwork. The existing cooldown, affordability, buff-expiry
grayscale and input layers remain above the face.

Call `supportIconFace(def)` when presenting a support so its ID and namespace
survive into the shared renderer. Unknown future definitions always receive
an emblem without needing a catalogue entry.

## Verification

- `npm run check`
- `node --test scripts/test-site-icons.mjs`
- `npx tsx balance/buff-icons-check.ts`
- `npx tsx balance/probe_storedsupports.ts`
- `npx electron balance/ability-artwork-ui.cjs`

The hidden client harness makes an isolated relative-base build and verifies
the complete selection mapping, native bag/rack/socket rendering, bounded
initial loading, kind collisions, feathered pixels, inherited alpha, recall,
classic preference, buff grayscale and real image failures. It also measures
20 unchanged and 20 changed inventory refreshes, checks ten close/reopen
cycles, verifies one request across DOM/canvas consumers, and exercises source
cache eviction while asserting visible icons and hotbar pixels stay unchanged.
Its build,
profile and saves are removed on exit. A small report and screenshots remain
in ignored `balance/reports/ability-artwork/` for visual review.
