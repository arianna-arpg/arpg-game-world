# Authored maps — a hand-made zone as data, and the Map Forge that draws it

The authored-map fabric (`src/engine/authoredMaps.ts`) lets a zone be
**hand-made**: a char-grid of registered region kinds on the 30px walk
lattice, plus doodads, spawn seats, markers, plan structures and exit
seats at exact coordinates, under a zone sheet. One registered layout
generator (`'authored'`) turns it into ground; one World method
(`mintAuthoredZone`) places it in the world; three lanes call that method
(quests, the bounty board, the dev tools); THE ATLAS (`src/meta/atlas.ts`)
stores editor-made maps; THE MAP FORGE (`src/dev/mapForge.ts`) is the
editor. Shipped rows live in `src/data/authoredMaps.ts`. Probe:
`balance/probe_authoredmaps.ts`. genqa sweeps every registered map.

## The data — `AuthoredMapDef`

| field | meaning |
|---|---|
| `id`, `name` | registry key; the zone's fixed name |
| `tileset` | the DRESS: theme colors, materials, the meld voice — and the packs/scatter the policies below may borrow |
| `cols`, `rows`, `cell` | the grid; `cell` is a multiple of 30 (default 30) |
| `grid: string[]` | `rows` strings of `cols` chars |
| `legend` | char → `{ region?, doodad? }` over `DEFAULT_LEGEND` (`.` ground, `#` wall, `~` water, `' '` the pad) |
| `pad` | the region painted beyond the authored rect and under `' '` (default `wall`) |
| `doodads[]` | `{ kind, x, y, r, rot?, dir?, shallow?, tier?, keep? }` — the gen-time Doodad subset, map pixels |
| `spawns[]` | SPAWN SEATS: `{ id, x, y, count?, spread?, rarity?, ambush?, post?, facing?, tier? }` |
| `markers[]` | `entry` (the party's landing = `spawnAt`), `boss` (bossSeat), `poi`, `camp`, `garrison` (+faction, size), `breakable` (+id), `npc` (+id) |
| `fixtures[]` | `{ structure, x, y }` — plan structures raised into the grid (the town's idiom) |
| `exits[]` | `{ side, at, label? }` — the map's own frontier doors |
| `objective`, `level`, `sky`, `camera` | the zone sheet (`objective` default clear; `level` absent = the mint's word) |
| `packs` | `'none'` (default — the seats ARE the cohort), `'tileset'` (its packs roam), or a `PackSpec` |
| `dress` | `'none'` (default — the map is the terrain) or `'tileset'` (the tileset's scatter + rolls run over the authored ground) |
| `portalClear`, `weave`, `spoils`, `noFactionWar`, `fauna`, `scenery`, `puzzles` | policies (see below) |
| `bounty` | `{ level: [lo, hi], weight?, title?, ask? }` — the board may post this map as an EXPEDITION |

Everything is pure JSON. Regions are `world/regions.ts registerRegion`
ids, doodad kinds are `registerDoodadRule`/`DOODAD_VISUALS` kinds,
monsters are `MONSTERS` ids, structures are `STRUCTURES` ids, factions are
`FACTIONS` ids — `validateAuthoredMap` prints one line per broken
reference (the content validator runs it over shipped rows at boot; the
Atlas and the Forge run it live). Two things people reach for and should
not: **barrels and crates are breakable MONSTERS** (a `breakable` marker,
never a doodad), and **`window`/`rampart`/`glass_floor` are regions while
`track_groove`/`tilled_earth` are ground doodads** (two collision models
that both read as "floor").

## The generator — `'authored'`

Registered with `registerLayout` and pinned through `registerGenPin` (no
data row names it — defs carry it in `layoutType`, minted). It resolves
the map from `layoutParams.authored` **at generation time** against the
live registry, so an edited map shows on the next zone load; a map nobody
registered degrades to the dress tileset's scatter with one warning (the
unregistered-layout law).

1. `ensureGrid`, then the whole arena is painted the pad region.
2. The grid is rasterized in per-row RUNS of one region (`fillRegion` to
   the run's last pixel, so a 60px cell covers both lattice cells);
   legend-cell doodads land at cell centres.
3. Off-lattice doodads push verbatim; fixtures raise through
   `raiseStructure` (after the paint, so no later grid swap can wipe their
   walls); markers fill the GenCtx's channels (`spawnAt`, `bossSeat`,
   `pois`, `camps`, `garrisons`, `breakables`, `npcs`).
4. Spawn seats expand to `GeneratedLayout.landmarkSpawns` rows
   (`SpawnSeat` — the pit-dweller lane grew `rarity`, `post`, `facing`;
   loadZone promotes through the real elite ladder and stamps the duty
   post). Multi-body seats scatter on a HASH of the seat, never the rng.
5. **THE ENTRY LAW.** A no-back-portal arrival hands the generator the
   arena's geometric centre as `entry` while the party lands on the entry
   marker; when the entry IS the centre and a marker stands, the marker
   becomes the entry every later pass keys on (the cistern is not gouged).
6. **THE STEMS.** Every portal the engine seated gets a ground disc
   (`portalClear`, default 70px) and, if cut off, a corridor to the
   nearest authored walkable cell; any exit still unreachable from the
   entry gets a straight carve (fieldLayout's connectivity guarantee). The
   way home faces the anchor — a map never knows which side, so it must
   tolerate a door on any rim (the Forge draws all four candidate seats).
7. A poi is guaranteed (the map centre snapped onto ground); `dress:
   'tileset'` runs `scatterDecoration` last.

**THE DETERMINISM LAW:** the generator draws zero rng; two generations
are byte-identical (genqa double-generates every registered map).

Lite generation keeps the geometry and skips the seats and the dress.

## The mint side

- `authoredZoneSpec(map, over?)` — the ZoneSpec a directed mint spreads
  FIRST: tileset, name, `layoutType: 'authored'`, `layoutParams.authored`,
  `sizeBand` pinned to the exact footprint, `shape: 'rect'`, the
  objective, `packsOverride` (empty for `'none'`), `noFactionWar`,
  `forceFrontiers = exits.length`, `noWeave = !weave`, `blend: null`,
  sky/camera. The caller's `over` wins; `definedSpec(over)` strips
  undefined words so silence defers to the map.
- `sealAuthoredZone(def, map)` — what a ZoneSpec cannot say (the lairs'
  mint-then-mutate idiom): `packDensity 0` + `cohort 'authored'` + empty
  packs for `'none'`; every tileset ROLL stripped unless `dress:
  'tileset'` (layout rows, structures, landmarks, compositions, hollows,
  annexes, blend); fauna/scenery/puzzles/spoils; the frontier rows
  re-seated on the map's own sides.
- `authoredZoneDef(map, opts)` — a PURE synthetic def (what placeZoneAt
  builds, minus the graph): the Forge's live preview, genqa and the probes
  generate from it.
- **`World.mintAuthoredZone(mapId, opts)`** — THE ONE DIRECTED MINT:
  places beside `opts.anchor` (the zone underfoot by default, or the sane
  node nearest `opts.target`), spreads the map's words under the caller's
  (`id`, `level`, `seed`, `linkBack`, `floating`, `forceWaypoint`,
  `wpExclusionRadius`, `spec`), seals, charts (`onNodeCharted`),
  notarizes the road and lifts the anchor's veil. Idempotent on `id`.
  Never `special`: a special mint stamps `eventOwned`, and the zones save
  culls unclaimed event-owned ground — an authored zone stays a plain
  charted place after its quest or bounty resolves.

## The three lanes

**Quests — `QuestZoneSpec.map`.** `acceptQuest` spreads
`authoredZoneSpec(map)` under the quest's own words (its tileset, level,
objective, waypoint policy win; undefined fields defer). `tileset` became
optional (the map's dress is the default); a quest may not name both a map
and a `layoutType` (the validator says so). This is the Odyssey lane's
set-piece door: `zone: { map: 'sunken_reliquary', direction: 'n', level: 12, objective: … }`.

**The bounty board — the `expedition` kind
(`src/data/bountyExpeditions.ts`).** Every other kind CLAIMS standing
ground; this one CHARTERS new ground. The roll picks a sane, road-connected
anchor in the board's reach (the seat vocabulary: range, known/veiled
leans, THE KINSHIP's localization, the juicing lean) and a map from the
expedition roster (`bounty` blocks whose level band holds the player); the
posting's `zoneId` does not exist until the take. `accept()` — the world-act
hook that runs BEFORE the hand seats — calls `mintAuthoredZone` beside the
anchor with the posting's own seed and level; done/annulled/copy read the
minted def. Pay is the charge's essence fold at the ground's level. A pinned
seat (the starter band's anchor) refuses: a charter names no standing ground.

**The dev lanes.** `World.devMintAuthored(mapId, { level?, seed? })` mints
beside the zone underfoot and walks in (the party lands on the entry
marker); `World.devRemintZone()` reloads the zone underfoot from its def
with NO memory (THE ONE-SHOT FORGET — `captureZoneMemory` skips one leave
and drops the standing memo), so an edit shows in one click;
`World.devAuthoredMapHere()` names the map underfoot. The dev panel's
**Maps** tab (`src/dev/tabs/maps.ts`) is the in-game seat for all three.

## THE ATLAS — `src/meta/atlas.ts`

The Workshop's shape, for maps: a localStorage mirror (`arpg_atlas_v1`) +
the named `/__save` slot `atlas` → `saves/save_atlas.json`; `loadAtlasSync`
before `validateContent`, `reconcileAtlasFromDisk` in the boot's async
block; `upsertAtlasMap`/`removeAtlasMap` graft into `AUTHORED_MAPS` and
persist. THE NAMESPACE LAW is the Workshop's (`custom_`): grafts refuse
unprefixed ids, shipped rows never wear the prefix (`findAtlasSquatters`).
`serializeMapTS` emits the promotion literal (grid rows one per line), a
ready `QuestZoneSpec` snippet and the bounty note — the atlas is the
sketchbook; `src/data/authoredMaps.ts` stays the authored roster.

## THE MAP FORGE — `src/dev/mapForge.ts`

Gate: `config.ts DEV.mapForge`, or the `?dev` opt-in (the panel's Maps tab
is its in-game door — the lab-tab ruling: tooling lives inside the dev
panel, never behind a URL param of its own). Start-menu button "🗺 Map
Forge (Dev)" (the render-hook chain behind the two forges). Three panes:

- **Roster** — atlas maps (editable) + shipped maps (read-only; Clone to
  Atlas). ＋ New (cols × rows × dress), ⧉ Clone, 🗑 Delete, ⇩ Import JSON.
- **Canvas** — the map drawn in its dress theme: regions by their
  registered look (`visual.fill`, else the theme's own key, else the
  floor/wall pair, else a hashed hue), doodads through the REAL painter
  library (`PAINTERS`, with the fallback disc on a throw), spawn seats
  (count badges, rarity rings, ambush reach, the duty post's facing tick),
  markers, fixture footprints + plan walls, the map's exit seats and the
  four candidate back-edge seats (placeExit's math, mirrored by
  `portalSeat`), the entry's clear disc. Tools: select/move (wheel resizes
  a doodad, `[ ]` rotate, Del, arrows nudge), paint (brush size, right
  button = ground), rect, line, flood fill, doodad, spawn, marker,
  fixture (snaps to the lattice), exit (click near a side), pan; wheel
  zooms about the cursor; `g` grid, `w` gen layer, `f` fit, Ctrl+Z/Y,
  Ctrl+S.
- **The gen layer** — after every edit (debounced) the forge runs the
  REAL `generateLayout` over `authoredZoneDef` with the map's own portal
  seats and draws the produced walk grid: stems, structure carves, dress
  scatter; cells the generator changed wear a green tint; the generated
  doodad set replaces the authored one. Drawn == generated, before a mint.
- **Inspector** — the selection's own fields first (every SpawnSeat /
  MapDoodad / MapMarker / MapFixture / MapExit field, pickers over the
  live registries), then the zone sheet (id with the `custom_` chip, name,
  dress, size with a centred resize, objective + its kind fields, pinned
  level, sky, camera, pack/dress/spoils/weave/war policies, notes), the
  BOUNTY EXPEDITION block, the LEGEND (chars, regions, cell counts, brush
  shortcut, delete), a CENSUS, and the live LINT.
- **Footer** — Save to Atlas, Save + Validate (the real `validateContent`
  filtered by id), Export TS / JSON, Import JSON, mint level, ▶ Mint &
  Walk, ↻ Re-mint here, ⌖ Capture hero (the hero's feet become a seat /
  doodad / marker while standing in this map's zone), undo/redo.

Headless QA surface: `window.__mapForge` (`open/close/state/save/select/
newMap/redraw/setTool/paintAt/place/preview/exportTS/lint/mint/remint/
capture/fit/size`).

## Laws worth knowing

- **The doors are the engine's.** The back-edge faces the anchor; later
  neighbours may still link back onto an authored zone (the world web).
  `weave: false` only stops the mint's own opportunistic weave; the stems
  make any door safe. A sealed-doors kind is an open card (see
  `docs/design/map-editor.md`).
- **Portal clears splice blocking doodads within 95px of every portal** —
  a banner post hugging the gate vanishes at load; the gen layer shows it.
- **A save that names a missing atlas map** re-mints as the dress
  tileset's scatter with one warning — deletion is always safe.
