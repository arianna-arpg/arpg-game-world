# Haunted armor, sand ritualists and lantern insects

This pass adds three specialists to smaller active factions and refreshes nine
of their existing members. The shared direction is that a body's construction
should explain where its magic comes from. All additions use the current
entity kit, Part Forge glyph operations, skill catalog and AI.

## Three families

| Faction | Visual vocabulary | Refreshed members |
| --- | --- | --- |
| Hollowborn | Separate armor plates around a vacant center; loose helms and gauntlets; books reciting without a reader | Hollow Vanguard, The Unworn, Helm Choir |
| Sirocco Court | Gilt ritual fans, suspended glass instruments, sand vessels and a tapering wind-body | Sun Priest, Glasschanter, Dust Djinn |
| Glimmerkin | Ribbed light organs, filament antennae, insect legs, powdery or ribbed wings | Lampwright, Dew Porter, Shard Gardener |

The Hollowborn's composite Panoply Saint retains its breakable crown and hands.
The Lampwright retains its existing chorus beat pips, nocturne modifiers and
carried light. None of the nine refreshed entities changes its monster fields;
only its look composition changes. The Unworn remains a martial commander.

## New roster members

Definitions are in `src/data/courtMonsters.ts`. Their presence curves live on
the monster definitions and apply equally to faction and biome entries. Each
joins its faction table and one home tileset at weight 1.

| Entity | Faction / natural home | Kit and role | Presence |
| --- | --- | --- | --- |
| Scripture Harness (`hollow_scripture_harness`) | Hollowborn / Metropolis | An empty suit carrying an open folio. Versicle supplies ranged damage; Aegis Ward shields nearby kin. A modest shield and armor over a fragile body. | Zero at level 5, full at 9 |
| Hourglass Diviner (`sirocco_hourglass_diviner`) | Sirocco Court / Sandsea | A large sandglass carried in desert vestments. Stasis Lock disrupts distant approaches; Whirl of Grit repels a close frontal approach. Cold vulnerability and limited life reward closing from the flank. | Zero at level 7, full at 11 |
| Lantern Weaver (`glimmer_lantern_weaver`) | Glimmerkin / Glimmervale | A flying lantern insect with broad ribbed wings. Silk Snare places a delayed ground trap; Glimmer Pulse supplies ranged pressure. Its weak body rewards reaching it through the telegraphs. | Zero at level 5, full at 9 |

Definition counts increase from 10 to 11 Hollowborn, 10 to 11 Sirocco and 9 to
10 Glimmerkin. These include fixtures and secondary bodies, not pack counts.
The Glimmerkin retain their existing faction-wide day/night spawn policy. The
Weaver's carried light dims with daylight through the existing light system.
The reserved Compact, Magpie, Smoulder and Unrusted entry policies are untouched.

## Seven reusable kit parts

`src/data/courtGlyphs.ts` registers through `src/data/glyphParts.ts` as ordinary
part painters. `src/data/courtLooks.ts` supplies the twelve compositions,
collected by `src/data/looks.ts`; the old nine definitions are moved out of that
file so there are no competing overrides.

| Kind | Construction and use |
| --- | --- |
| `vacantCuirass` | Separated breastplate sides around a genuinely open center. Do not fill it with a solid torso when the vacancy is the intended read. |
| `reliquaryFolio` | Two leaves, metal binding, dark text and a ribbon. Keep hands behind or beside it to preserve the book shape. |
| `sandglass` | Glass bulbs, granular fill and a narrow stream inside a rigid frame. Decorative sand does not report an ability timer. |
| `gritVortex` | Four broken elliptical ribbons narrowing toward a trailing curl. The Dust Djinn's body, distinct from the Diviner's rigid vessel. |
| `glassLyre` | A curved frame holding four crystalline strings. Gives the Glasschanter an instrument for Shatterchord. |
| `lanternAbdomen` | A light organ inside a dark casing crossed by three ribs. A luminous surface, with world lighting still authored separately on the monster. |
| `filamentAntennae` | Paired branching filaments with luminous tips. Scales down for carriers and out for the winged adults. |

All support the standard placement, rotation, scale and mirror fields. Surface
roles belong to individual glyph operations. Existing parts supply the armor,
helmets, fans, wings, crystals, legs and sparse animated accents. Decorative
equipment is not an additional hit target or gameplay aura.

## Verification

- `npm run check` and `npm run probe -- anatomy`.
- `npm run sim -- run --suite smoke`: 25 episodes.
- Generation QA, two seeds each for `metropolis`, `sandsea` and `glimmervale`:
  21 cases, zero failures (two Metropolis timing warnings).
- Local seeded combat lanes at near and far distances: all six new assigned
  skills execute through `updateAI` and `World.update`; no forced casts.
- Checked each new definition's faction table, home table and level curve.
- Compared the nine existing monster definitions against the pre-pass
  snapshot: unchanged.
- Rendered twelve compositions at two radii and three pose times: 72 nonempty
  renders, all within sprite padding. Visually reviewed portraits, native-size
  body bakes and animated accents.

The ignored local study is `balance/reports/court-study/index.html` (new bodies,
three comparisons and kit parts), with `?all` for all nine before/after pairs.
Its snapshot, combat script/results and screenshots remain local review aids.
