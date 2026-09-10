# Landmark regions and overland caverns

Large atlas landmarks can own several connected, independently generated zones.
The first content is a four-zone fortress (approach, bailey, keep, broken ward),
a four-zone lost city (verge, precinct, sanctuary, buried quarter), and a
three-zone highland cavern system. Alternate links create loops through each
region. The highland feature uses the atlas elevation gate to favor high ground.

## Authoring

- `src/world/landmarkComplexes.ts` defines the open registry and validates the
  connected stage graph. Register content in `src/data/landmarkComplexes.ts`.
- A stage names a locale program, a map offset from the entrance, a display
  label, and optional theme, sky exposure, and level increase. The atlas feature
  selects the entrance locale and complex ID through its `destination` data.
- Links are reciprocal. Optional normalized `fromAt` / `toAt` landings put
  transitions inside a gatehouse, hall, or courtyard. Omitted landings use the
  existing directional edge exits. Locale portal routing connects either kind.
- `src/data/complexLocales.ts` composes wilderness, courts, caverns, terraces,
  and attributed authored terrain fragments. The approach mixes wild ground
  with rubble and a gatehouse; the bailey and keep progressively emphasize
  masonry. Inner themes and sheltered skies reinforce the transition.
- Stage sizes come from locale programs and their rolled size bands. Current
  stronghold/cavern programs roll 95–115% of 3300 × 2850; reused exploration
  programs retain their own sizes and variants.

The graph is limited to 2–8 stages, with at most two internal entrance links
and four links per interior. Offsets must be distinct and within 400 map units;
the entire footprint rotates together deterministically. These bounds live in
the registry validator. Inner stages have the registered `landmark_section`
kind: they keep their level and exits rather than growing random outside roads.
The entrance retains one frontier so the region does not stop world exploration.

## Discovery and persistence

`materializeComplex` builds the complete graph before publishing its members.
The entrance is claimed by the existing atlas-destination identity; approaching
the same feature again reuses it. Stage seeds, rolled locale plans, membership,
themes, sizes, map positions, and links are ordinary saved zone data. Registry
edits affect new discoveries; already materialized regions do not reroll.

Interiors start veiled and use the existing knowledge/adjacency rules. The map
shows the atlas landmark before entry when that terrain is known, then reveals
the discovered stage graph. Zone information names the region and current
section. Multiplayer snapshots carry membership alongside the generated zone.

## Overlapping cavern stories

A locale variant may select any registered `underTier` lane. The highland
gallery variants select `overland_caverns`, generating connected lower passages
and chambers with real tier crossings beneath the surface districts. Surface
paths remain on tier 0; covered chambers occupy tier 1, including beneath rock.
These are two overlapping floors inside an overworld zone, distinct from the
existing separate underground-zone graph. Existing story traversal, population,
visibility, and combat rules apply.

Under-tier lanes can opt into `chamberRadius` and `preserveSurface`. The latter
preserves every cell of the surface floor/wall while boring beneath it. Existing
lanes keep their established generation when these options are absent. Chamber
radius, corridor width, crossings, population share, and lower-floor dressing
are lane data; more cavern styles can register another lane or locale variant.

## Verification

`balance/probe_complexes.ts` checks atlas discovery, duplicate approaches,
reciprocal links, fixed footprints, sealed interiors, real player transitions
and returns, save plans, network membership, surface preservation, reachable
overlapping chambers, tier crossings, both size extremes, and replay stability.
`npm run genqa` sweeps the locale variants and validates complex/locale/lane
references alongside the existing generation matrix.
