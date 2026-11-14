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
a cached face; DOM adds a masked glow after its lazy image loads. No animation
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

Canvas requests only drawn icons, with eight concurrent loads, a 96-image
LRU and the existing bounded face cache. Failed URLs are remembered to avoid
per-frame retries. DOM images use native lazy loading and a single delegated
load/error handler without retaining removed tiles. Classic acronym mode
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
classic preference, buff grayscale and real image failures. Its build,
profile and saves are removed on exit. A small report and screenshots remain
in ignored `balance/reports/ability-artwork/` for visual review.
