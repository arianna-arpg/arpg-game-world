# THE MAP FORGE — hand-made zones for the Odyssey, the board, and the bench (charter v1, as built)

**Status: v1 BUILT 2026-09-04** at her ask ("a very in-depth map editor …
that fits snugly into the rest of our infrastructure"). Everything marked
**DIAL** is a build-time lever; every number is unblessed. The fabric doc
is `docs/engine/authored-maps.md`; the probe is
`balance/probe_authoredmaps.ts` (115 checks, fast lane); genqa sweeps every
registered map. Live-walked on `arpg-dev-mapforge` (:5294, `?dev`).

> **THE LEAD FINDINGS.**
>
> 1. **The repo had every half of a map editor except the map.** Landmarks
>    and compositions are ROLL-SITED (a diameter band, eighteen darts), a
>    tileset variant carries only count-and-roll stamp rows, the town is
>    props + authored courses over the plains scatter — nothing could say
>    "this exact cell is a wall". The one thing that could was the plan
>    STRUCTURE (a char-grid legend), scoped to a building. The fabric is
>    that grammar at zone scale.
> 2. **The generator seam was already the right seam.** `fieldLayout`
>    rasterizes external data into the walk grid, carves stems to wherever
>    the engine seated the portals, and guarantees connectivity; the
>    authored layout is a one-for-one twin reading a char-grid instead of
>    the heat map. Zero edits to zone load, saves, memory or the co-op wire.
> 3. **A directed mint already had one placement primitive** (`placeZoneAt`)
>    and two authored-destination grammars (quests, sidezones/lairs) — the
>    fabric adds ONE World method (`mintAuthoredZone`) that all three new
>    lanes call, instead of three hand-rolled mints.
> 4. **The `special` flag is a trap for authored ground.** It stamps
>    `eventOwned`, and the zones save culls unclaimed event-owned ground —
>    a bounty's arena would vanish on the save after its turn-in. Authored
>    mints never wear it; their policies are the map's own.
> 5. **Drawn == generated was cheap to make true.** The editor runs the
>    REAL `generateLayout` after every edit and draws the produced grid;
>    the first debut map's own mistake (banner posts inside a portal's
>    95px clear, spliced away at load) showed in the editor before any mint.

---

## 0. Her commission (2026-09-04 — the ask, encoded as direction)

| # | ask | where it landed |
|---|---|---|
| 1 | A way to **create a map** that can be generated or placed into the world. | THE AUTHORED-MAP FABRIC (§1) + THE MAP FORGE (§3) |
| 2 | **Genuinely unique, hand-selected zones** for an Odyssey quest. | `QuestZoneSpec.map` (§2.1) |
| 3 | **A Bounty that spawns the zone itself** as the objective. | the `expedition` bounty kind (§2.2) |
| 4 | **Leverage everything built** — cohesive, snug in the infrastructure. | regions, doodad kinds, monsters, structures, tilesets, objectives, rarities, posts and ambushes are all read from their registries; the editor invents no vocabulary (§1, §3) |

---

## 1. WHAT STANDS — the fabric

`AuthoredMapDef` (`src/engine/authoredMaps.ts`): a char-grid of registered
REGION KINDS on the 30px lattice + off-lattice doodads / spawn seats /
markers / fixtures / exits + a zone sheet. One generator (`'authored'`),
one lint (`validateAuthoredMap`), one spec derivation (`authoredZoneSpec` +
`sealAuthoredZone`), one pure synthetic def (`authoredZoneDef`). Debuts in
`src/data/authoredMaps.ts`:

- **THE PROVING YARD** (1200×840, grand_arena dress): a walled bandit yard
  around a flooded cistern, four chambers, a rare keeper, two posted
  watches, breakable clutter, a north gate; objective clear-all; bounty band
  2–12.
- **THE SUNKEN RELIQUARY** (1320×960, crypt dress): rampart vaults, a
  flooded nave with causeways to two shrine islands, posted archers, the
  gravecaller at the reliquary door; objective boss; one frontier east;
  bounty band 6–20.

### 1.1 The laws
- **THE DETERMINISM LAW** — the generator draws no rng (spawn scatter is a
  hash of the seat). genqa double-generates every map.
- **THE ENTRY LAW** — a no-back-portal arrival's centre entry is re-keyed
  onto the map's entry marker, so the centre is never gouged.
- **THE STEMS** — every engine-seated portal gets a clear disc and a
  corridor to the nearest authored ground; unreachable exits get the belt
  carve. **DIAL** `AUTHORED_CFG.portalClear` 70 / `stemHalfW` 45.
- **THE SEAL** — pack policy `'none'` = `packDensity 0` + `cohort
  'authored'` + empty packs + `fauna []`; dress `'none'` strips every
  tileset roll; frontier rows re-seat on the map's sides.
- **NEVER `special`** (lead finding 4).
- **THE NAMESPACE LAW** (the Workshop's) for atlas ids.

### 1.2 SpawnSeat tempers (the pit-dweller lane grew them)
`rarity` (through `promoteMonster`, the real ladder), `post` + `facing`
(the theater's posted-folk idiom — `aiPost`/`postSpec`/`aiPostFacing`),
`ambush` (the standing lane), `count` + `spread`, `tier`.

---

## 2. THE LANES

### 2.1 Quests — `QuestZoneSpec.map`
`acceptQuest` spreads the map's words first; the quest's explicit fields
win; `tileset` is optional now (the map's dress defaults). A quest naming
both a map and a `layoutType` warns at boot. The exported promotion
literal prints a ready `zone: { map: … }` snippet.

### 2.2 The bounty board — `expedition` (`src/data/bountyExpeditions.ts`)
Rolls a sane anchor in reach + a map whose `bounty.level` band holds the
player; mints at ACCEPT (the summons' world-act hook) beside the anchor;
done = objective; pay = the charge fold at the ground's level. **DIAL**
`EXPEDITION_CFG` weight 0.8 · seat 40–420, known 1.2 / veiled 0.6, prefer
far · band −6/+4. A pinned seat refuses (a charter names no standing
ground).

### 2.3 The dev lanes
`devMintAuthored` (mint beside the hero + walk in), `devRemintZone` (the
one-shot memory forget), `devAuthoredMapHere`; the dev panel's **Maps**
tab; the Forge's footer verbs.

---

## 3. THE MAP FORGE (`src/dev/mapForge.ts`, gate `DEV.mapForge` or `?dev`)

Roster · Canvas · Inspector, the Entity Forge's shape. Real painters for
doodads; regions by their registered look; the gen layer runs the real
generator after every edit (**DIAL** debounce 140ms) and tints changed
cells; ten tools with keys; undo/redo (**DIAL** 80); JSON import/export;
TS promotion; Mint & Walk / Re-mint / Capture hero. Store: THE ATLAS
(`src/meta/atlas.ts`, slot `atlas`).

---

## 4. CARDS FOR HER WORD (nothing here is built; each is a decision)

| # | card | the fork | my lean |
|---|---|---|---|
| 1 | **THE SEALED DOORS** | `weave: false` stops only the mint's own weave; later neighbours may still link back onto an authored zone. A `staticExits` zone kind would seal it — but that kind also refuses it as an anchor and reroutes frontiers (the sea-harbor law), which needs a reading before it is safe. | a `sealed: true` map flag → a registered quiet kind, once the frontier resolution for non-port static kinds is read |
| 2 | **THE MAP'S OWN LEVEL** | today `level` pins an absolute number, else the mint's word. An Odyssey set-piece may want a BAND (`levelBand: [lo, hi]` clamped around the hero) — the bounty block has one, the sheet does not. | add `levelBand` beside `level`; the quest lane's `'character'` reads through it |
| 3 | **EVENT QUIET** | authored ground is ordinary ground to world events (they may seat on it). A per-map `quiet` flag would map to a registered `eventQuiet` kind. | one flag, one kind row — cheap; ask whether set-pieces should be locales |
| 4 | **DOORS IN THE GRID** | plan structures carry doors (`CellSpec.door`); the map legend does not — a door cell at zone scale needs a PlacedStructure to own it. | keep doors on fixtures; add a "door stamp" fixture family later |
| 5 | **TRACKS / TRAPS / VENTS / TIERS** | the GenCtx has channels for all four; the sheet exposes none yet. | author them as rows on the map (`tracks[]`, `trapworks[]`, `vents[]`) once a map wants one |
| 6 | **THE LIVE OVERLAY** | edit in-world on the real renderer (paint cells while walking) instead of the schematic canvas + re-mint loop. | the re-mint loop is one click; build the overlay only if the loop feels slow in her hands |
| 7 | **THE LOOK** | the editor wears the dev palette (`DEV_UI`). The Hollow Wake Ledger scheme (her 08-31 ruling) is for player-facing surfaces; dev chrome stays dev chrome unless she says otherwise. | leave as is |
| 8 | **DIALS** | every number above (portal clear, stem width, spawn spread, expedition weight/seat/band, debut maps' rosters and bands). | hers |

---

## 5. Traps banked this pass
- **BARRELS AND CRATES ARE MONSTERS** — `breakable` markers, never doodads
  (the lint caught the debut's own slip).
- **A HIDDEN BROWSER PANE MEASURES 0×0** — the forge's `size(w, h)` QA
  handle exists for headless proof; `open()` shows before it measures.
- **THE PORTAL-CLEAR SPLICE EATS PROPS WITHIN 95px** of a seat — the gen
  layer is the tell.
- **`QuestZoneSpec.tileset` OPTIONAL BROKE A READER** (`probe_mu`'s
  `TILESETS[q.zone.tileset]`) — guarded with `?? ''`.
