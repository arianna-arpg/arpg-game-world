# District locales and atlas destinations

A locale composes several district builders on one walk grid. Its river, main
route, flanks, discoveries, and external approaches share that grid. A square
keep can open into an irregular valley and a cavern without splitting gameplay
into separate rooms or changing the whole zone to one silhouette.

## Shipped content

`src/data/locales.ts` registers two versioned programs:

- **River fortress:** an encircled keep with a backwater flank and grotto, or a
  divided stronghold with two courts and a cavern bypass.
- **Sundered arches:** a broken stone arcade joining a valley, sanctuary,
  optional overlook, and deep grotto. The arcade's stone ribs have multiple
  passages; the river and explicit connections cut through them.

The `river_citadel` and `river_arches` rows in `src/data/atlasFeatures.ts` place
these destinations on traced surface rivers. Their atlas glyphs use the
existing visibility mask. They are rare places, not guaranteed starter nodes.
Finder reach, minimum river length, chance, progress band, names, and size are
data. Reducing the required river length admits shorter rivers; it does not
create rivers where the atlas has none.

## Discovery and identity

The chart and mint share the `river-sites` finder in `src/world/atlas.ts`.
Each site is selected from a whole river path using its spring and world seed;
changing a query window does not move the site. The same path supplies the
local river's cardinal orientation. Local bends and widths vary independently;
this is geographic continuity, not a pixel-for-pixel copy of the atlas curve.

Ordinary surface exploration reaching a destination's catchment claims the
named site. `atlasDestinationAt` resolves overlaps by distance, then feature id.
The real frontier path gives it priority over ordinary proximity and field
consolidation. The node stands at the atlas seat and is immovable under graph
settling. Its id includes the world seed and feature identity, so another
approach reconnects to the same node. Reconnection preserves discovery and
does not replay charting hooks. Leaving a site excludes that site as a target,
preventing a self-portal. Other nodes remain subject to normal graph settling.

Directed layouts, explicit ids, special arenas, ports, pockets, floating sites,
explicit zone kinds, no-weave mints, and other dimensions keep their existing
contracts. Broad geography influences such as peaks and lodes continue to use
their existing inheritance path; this change does not turn every atlas mark
into a dedicated destination.

## Authoring a program

`LocaleProgram` in `src/world/locales.ts` supplies an id, version, label, arena
size, and weighted variants. Each variant declares:

1. District ids, builder ids, normalized centers and footprints, bounded
   positional jitter, builder parameters, optional dressing, and cave mouths.
2. Entrance and goal districts.
3. Links with main/flank/discovery attribution, widths, and optional normalized
   bend points. Every district must connect to the entrance.
4. An optional river width/bend band and registered water/crossing regions.

Register another program to reuse the builders. Add a map-feature row whose
`destination.locale` references the program to make it discoverable. The
finder is independent of the program: future non-river finders can use the
same destination contract.

`registerDistrictBuilder` in `src/engine/localeGen.ts` is the extension point
for new geometry algorithms. Built-ins are `open`, `court`, `cavern`, and
`arches`. Builders receive their footprint, common grid, parameters, and a
district-specific random stream. Connections and river crossings are resolved
centrally. Local dressing stays clear of routes, portals, district centers,
and other props. Cave mouths carry real cave seeds and use existing travel.
The goal also supplies the boss seat when an authored objective asks for one.

A locale owns its structural generation. Minting suppresses unrelated biome
layout scatter, landmark/structure/composition rolls, blend, hollows, annexes,
and rooted under-zone rolls that could overwrite its route plan. The biome's
theme, packs, climate, and baked atlas context remain available. Rivers and
crossings are registered regions, so rendering, movement, and path costs
read the same cells rather than separate decoration.

## Persistence and attribution

`compileLocale` resolves weighted variants, jitter, and river bands once.
The complete `ZoneDef.locale` plan is plain saved data. `ZoneDef.destination`
records feature identity, name, world seed, seat, and program. Save sanitization
retains both; co-op sends deep copies and clears them when absent on older
messages. Edits to authored program tables affect future discoveries, while
existing zones retain their compiled plan. Builder implementations and terrain
registry behavior are still live code; incompatible future changes need a
migration or a new builder id.

`GeneratedLayout.localeReport` records district builders/centers, attributed
links, and crossing cells for inspection. External roads may be appended as
the world grows; their connecting corridors can change on regeneration. The
saved district plan stays fixed, but this is not a promise to freeze all
terrain against later graph growth or gameplay terrain changes.

## Verification

- `npm run check`
- `npm run genqa` includes every registered layout and every locale variant in
  both river orientations, with independently compiled choices per seed.
- `npm run probe -- locales` checks diverse geometry, final-grid reachability,
  actual water/crossing cells, cave seeds, save/co-op behavior, atlas finding,
  stable destination ownership, real frontier charting, and actual zone boot.
- `npm run sim -- run --suite smoke` for the content additions.
- Build and `npm run smoke` for the added boot registrations.

This is the first composition layer: three authored route structures with
seeded geometry. More route grammars, regional programs, elevation transitions,
district-specific encounters/rewards, and uniquely authored expeditions can
build on it. It does not claim unlimited topological novelty from jitter.
