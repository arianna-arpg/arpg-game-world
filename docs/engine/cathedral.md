# The Cathedral of the Highest — the Aetherial's crown

> "This is the truest seat of God as envisioned and imagined from the height
> of Faith." A colossal generated basilica floating on one great cloud, the
> innermost zone of the High Bastion country — and the seat itself stands
> EMPTY, guarded by the Host and kept by its clergy.

## The pieces (all data, all registries)

| Piece | Where | What |
|---|---|---|
| `cathedral` structure generator | `src/engine/structureGen.ts` | The great-church composer: narthex → columned nave → transepts → choir → elliptical apse, rolled whole. Side chapels bud per flank; a cloister garth may attach; the CHAPTER HOUSE is a **nested `compound` generation** — a structure generator running inside a structure generator, plans pasted wall-flush and joined by one scanned door punch. No two Sees mint alike; every proportion is a genParam. |
| `grand_cathedral` | `src/data/structures.ts` | The def that routes the generator: local legend (pews, stalls, altar, organ, votive banks, reliquaries, effigies, the font, the EMPTY THRONE, glass ambulatory), `confineVision: 'rooms'`, marble floors, the `basilica` roof style, a seraphic garrison. **The GREAT WEST DOORS are a lesson door**: first dwell-open stamps `cathedral_door_opened` on the account — the gateway ledger — and graduated accounts find them standing open forever. |
| `cathedral` layout recipe | `src/engine/layoutRecipes.ts` | The zone: one lobed cloud foundation ringed by a **frail fringe** (`cloud_frail`, contact-melt only — the transient law kept at permanence's door), the See raised north of the heart, the **processional** paved along the exact causeway chains the foundation was carved with (statue-flanked, arch-crowned, belled), **prayer isles** bridged by `span_gleam` / `span_sun` / `span_star` (the sky decides which devotions are open), and the **crystal promenade** — a `glass_floor` arc over the void. |
| `aether_cathedral` tileset | `src/data/tilesets.ts` | `biome: aether_bastion`, `depthAffinity { from: 0.86 }` — the country's deepest stage (bastion rims → gloria mids → seraphal city → the See). Contact-only collapse, sun/star span rows, `singing_refrain` puzzles, the clergy's pack table. |
| Regions | `src/world/regions.ts` | `cathedral_wall` (the pale-fill masonry law's third verse: alabaster under an auric rim; a TRUE wall) and `glass_floor` (**walkable window** — the understory shows through the pane you stand on; no fall policy: transparency is not frailty). |
| The kit | `src/data/massifs.ts` (rules+stamps) + `src/data/doodadVisuals.ts` (visuals) + `src/render/vis/paintersAether.ts` (3 new painters) | 14 kinds: processional_way, votive_bank, cathedral_pew, choir_stall, high_altar, empty_throne, pipe_organ, font_of_light, reliquary_shrine, saint_effigy, gonfalon, glory_arch, bell_spire, basilica_stair. Reuse-first: only `votiveBank` / `emptyThrone` / `pipeOrgan` are new painters. Candle kinds ride the radiance lerp (`light.radiance`). |
| The clergy | `src/data/monsters.ts` + `src/data/looks.ts` | Five seraphic offices, one office-tell each: `chorister_of_the_veil` (hymnal; choir_of_light), `censer_warden` (thurible; consecration — the Host's third deliberate walker), `reliquary_ark` (carried casket; orb-burst death), `gloria_cantor` (sunburst; **the Aureole kata sung back at you** — gloria + colonnade, the queued Host-kin reuse), and `voice_of_the_throne` (warhorn; the boss that speaks FOR the vacant seat, calling cherub choirs down mid-psalm). |
| The ascension lane | `src/data/sidezones.ts` + `src/data/hollows.ts` + `basilica_floor` tileset | THE CITY THAT CLIMBS: `gallery_hollow` cracks a `basilica_stair` out of a seraphal mass (`aether_seraphal.hollows`), and the stair mints gallery floors UP — **three** rungs (gallery → high gallery → belfry; one more than any townhouse) before `noDeeper` closes the ladder. Bright marble interiors on the rooms recipe; floors lay the next rung themselves. |
| The gateway | `src/meta/unlocks.ts` | Both Aureole vault rows (`gem_skills_aureole`, `sup_aureole`) adopted `reqLedger: 'cathedral_door_opened'` — the kata is learned by walking into the See, like every country discipline. |

## The laws it keeps

- **Transience at permanence's door**: only the fringe melts, only underfoot
  (`melts: ['cloud_frail']`, contact-only). What the Host built does not fall.
- **The empty seat**: the sanctuary holds the high altar and the throne, and
  the throne holds nobody. The Voice speaks *for* it; killing the Voice
  answers nothing about the seat. Deliberate.
- **Glass is honest**: `glass_floor` is plain walkable ground wearing a
  window visual — drawn == walked. The frail fringe keeps the falling
  lesson; the pane keeps its promise.
- **The processional follows its causeways**: the paved way is laid along
  the same point-chains the foundation carved, so pavement can never float
  over sky (genqa's floating-doodad net caught the wandering version).

## Verification

`npx tsx balance/probe_cathedral.ts` — 37 checks: the registry weave, the
generator's laws (3-cell west doors, sanctuary furnishing, rolled-feature
coverage across 12 seeds, legend closure over every emitted char, size caps,
determinism + variation), depth staging (no See in the rims; the deepest
hearts split between city and crown), and three live headless mints (lesson
door, throne + organ, paved-and-belled processional, wall census, glass +
fringe across seeds). `npm run genqa -- --filter aether_cathedral` and
`--filter basilica_floor` both sweep clean; both tilesets carry
`perfProbe: true` so the perf harness gates them automatically.

## Deliberate deferrals

- A triforium story (tier fabric inside the nave) — the vessel reads open;
  revisit if the See wants a second floor.
- The belfry towers as enterable sidezones off the cathedral itself (the
  gallery lane covers the city; the See's towers stay skyline for now).
- A Vigil event layer (heaven's answer to the Underworld War) — queued.
