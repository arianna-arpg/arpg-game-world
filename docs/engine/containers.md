# The Container Fabric — side inventories as data (and the Reliquary)

**Current Reliquary rules:** [Account Reliquary](../design/account-reliquary.md)
supersedes the historical run-owned bag/corpse behavior below. Equipped pieces
and reserve persist across lives, swaps occur at the Oracle, and percentage
scaling uses an explicit safe numeric policy. The generic grid and registry
contracts below remain applicable.

`src/engine/containers.ts` (the fabric) · `src/data/containers.ts` (the
Reliquary and every board after it) · `src/engine/inventory.ts` (`BoardDims.open`
— THE MASK on the one cell law) · `src/engine/items.ts` (`'relic'`,
`CONTAINER_CATEGORIES`, `minRarity` / `affixCap` / `affixPool`) ·
`src/data/itembases.ts` (the relic families) · `src/data/itemaffixes.ts` (THE
RELIC REGISTER) · `src/engine/world.ts` (`containerPlace` / `containerTake` /
`containerMove` / `reconcileContainers`, THE CONTAINER FOLD in `recalcSeat`,
the discovery stamp in `dropGearAt`) · `src/ui/containerPane.ts` (the face) ·
`src/meta/unlocks.ts` (the derived Vault rows) · `src/data/menu.ts` (the page)
· probe `balance/probe_reliquary.ts`.

## What it is

A **container** is a second tetris board beside the one bag. A registered
`ContainerDef` says what it **accepts** (item categories / base tags), whether
what sits in it is **active** (its compiled mods fold into the seat's sheet
through one attributable source, `container:<id>`, exactly the way a doll
slot's gear folds through `gear:<slot>`), and the **shape** of its board as a
**ladder** of account features: every rung is a char-grid frame of the cells it
opens, and the live board is the union of the frames the account owns. The
bag stays the implicit container; a pouch, a quiver, a spellbook, a second bag
is one `ContainerDef` and one feature flag per rung — the Vault rows, the menu
page, the inventory tab, the sheet fold, the save, the corpse and the co-op wire
all derive from the definition.

The **Reliquary** is the first container: a case for **relics** — the new
`'relic'` item category (charms 1×1, talismans 2×1, idols 1×2, effigies 2×2).
A relic is inert in the pack and speaks only from a seat in the case. It is the
Last Epoch idol grid, the D2 charm inventory and the PoE jewel socket folded into
one mechanism the engine already had: a grid, an item, a stat source.

## The laws

- **Existence.** Rung 0's feature *is* the container. Unowned, the container
  has no board (`containerBoard(def) === null`), no inventory tab, no menu
  page and no fold — the menu bar's existence law, not a greyed tile.
- **The mask.** A footprint lands only on **open** cells. `BoardDims.open` is
  an optional per-cell read every placement helper honours (`canPlaceAt`,
  `swapBlockerFits`, `placeAt`, `autoPlace` through `footprintOpen`); absent, a
  board is the plain bounds test and the bag is byte-identical to before. A
  hollow-centred case is data, not a special grid.
- **Active means seated.** Only a piece on an open cell of a board the account
  owns *today* folds (`containerMisfits` is the fold's read as well as the
  adoption law's) — a retuned frame can never leave a ghost line folding.
- **Slotless carry.** `registerContainer` adds the accepted categories to
  `items.ts CONTAINER_CATEGORIES`; the drop roller's droppable census
  (`isCarriableCategory`) carries them without a doll slot, and the bag sort's
  kind ladder seats them after the doll's kinds. The schema leaf owns the set,
  so `itemgen` never imports the fabric and nothing cycles.
- **Discovery.** `ContainerDef.foundLedger` is stamped on the account by the
  first **genuine world mint** of an accepted piece (`World.dropGearAt` — never
  a discard, a reclaim or an owed pay). A purchasable first rung can gate on
  this key. The Reliquary instead has a quest-earned `rewardOnly` first rung;
  `dropLedger: 'reliquary_lesson'` seals ambient relic mints until first seating.
- **The one read.** `containerBoard(def)` resolves through an installed source:
  the World folds its account's rungs; a co-op client reads the host's shipped
  boards (`SnapshotW.containerBoards`, absent id = no board). Engine, panel and
  landing preview all test one set of cells.
- **Drawn == tested.** `containerLanding` is the one verdict: the panel's
  preview paints it and `containerPlace` / `containerMove` act on it. The
  bag→board landing over exactly one blocker **swaps** — the blocker takes the
  cell the mover vacated in the bag — the bag's own tetris shuffle across
  boards.
- **Nothing lost.** `reconcileContainers(seat)` runs at adoption (save, wire):
  a board the registry no longer knows, a rung the account lacks, a footprint
  over a closed cell, two pieces overlapping — each misfit leaves for the bag
  (first fit) or the floor at the hero's feet as owed property.

## The ladder (data/containers.ts)

Frames are authored on a 5×5 canvas; `#` opens a cell; the union of every
rung's frame is the full case the face always draws (sealed cells dim, with the
rung that opens them on hover — `containerRungAt`).

| Rung | Feature | Opens | Board | Vault gate |
| --- | --- | --- | --- | --- |
| 0 The Reliquary | `reliquary` | one charm cell at (1,1) | 1 | Oracle rescue; no purchase |
| 1 The First Ring | `reliquary_ring` | the hollow ring | 8, centre sealed | Case owned; 60 essence |
| 2 Wider Shelves | `reliquary_shelves` | the outer walls | 20 | Ring owned + reach level 12 (teased) |
| 3 The Heart | `reliquary_heart` | the centre | 21 | Shelves + level 25 (teased) |
| 4 The Full Case | `reliquary_case` | the corners | 25 | Heart + level 40 (teased) |

The ring seats charms, talismans along a wall and idols up a wall; no effigy
seats until the heart opens — the tetris is the design. Costs and level roads
are dials on the rung rows; the level roads register their milestones through
the catalog's own derivation.

## Introduction: the rescued Oracle

The tutorial faction’s revenge commander holds the Oracle captive. Clearing that
miniboss objective opens the case and ambient relic drops account-wide, then sends
the player to the Oracle’s new home at Lastlight’s standing stones for a charm.
See [Oracle rescue](../design/oracle-rescue.md) for authority and save migration.

`src/quests/reliquary.ts` retains `relic_east_l8` as an optional follow-up offered
by the rescued Oracle, with level-8 ground. It visits one of three named burial
sites: the Unremembered Chapel, the Bonekeeper’s Vigil, or the Silent Keeping.
The run seed and quest id select the site and its keeper-fight/clear objective
on an isolated RNG stream. Placement uses the level-8 band and a seeded bearing,
connects a charted road, and provides a waypoint home. The generated zone and
active quest persist through the existing world save.

Field completion only readies the return leg. At the Oracle the journal
offers three fixed magic 1×1 charms: life, mana, or energy shield. `QuestReward.choices`
holds the entire payout until a valid selection fits in the pack; a full bag,
invalid selection, remote claim, guest claim, or repeat claim pays nothing.
The optional shrine claim grants the chosen item, 500 XP and the chain stamp,
then saves. The case is already owned from rescue. There is no first-drop reservation.

The inventory and case open on the lesson. Its persistent instructions explain
that carried relics are inert, highlight the open cell, and offer ordinary drag
placement or an explicit **Seat** button. Only successful placement stamps the
account's `reliquary_lesson` key. Ambient relics, including cache and boss payouts
through `dropGearAt`, already opened with rescue. Unseating removes stats without relocking
drops. Owned discards and owed property bypass the mint gate. The inventory's
LESSON attention remains until seating, including after a reload. The quest
can be completed on later characters for another starter charm; account cells
and completed lesson are retained.

Reusable seams: `QuestDef.rescue/zoneVariants`, `QuestZoneSpec.name`,
`QuestReward.choices/choicePrompt/features`, `ContainerRung.rewardOnly`, and
`ContainerDef.dropLedger`. The journal owns choice presentation; `questReward`
is a validated host action that rechecks readiness and giver proximity.

## Relics (the pieces)

- `ItemBaseDef.minRarity: 'magic'` — a relic never drops common (the roller
  promotes; the `withFamily` common→magic shape, authored per base).
- `ItemBaseDef.affixCap` — the family's own ceiling under the rarity's caps
  (`affixCapsFor` — one read for the organic roll, the forced family and the
  forge): charm 1/1, talisman and idol 2/2, effigy 3/3. Footprint prices power.
- `ItemBaseDef.affixPool: 'explicit'` — the base admits only families that
  **name** one of its tags; the untagged catch-all families (attributes,
  resists) that roll on every open base never reach it. THE RELIC REGISTER
  (`RELIC_PREFIXES` / `RELIC_SUFFIXES`, tag `relic`) is therefore the whole
  relic gamut: life/mana/ES, global armour/evasion, damage and the damage
  lanes (the same `DAMAGE_LANES` words gear speaks), minion damage/life, area,
  projectile speed, duration; attack/cast/move speed, crit chance/multi, life
  and mana regen, the four resists and all-res, cooldown recovery, leech, luck,
  accuracy — at a third to a half of the wardrobe's tops, because a case seats
  many.
- Drops: the four families carry world-pool weights (about 1% of gear at a
  find's share) and the `relic_cache` table pays one deliberately (seeded into
  `jewelry_cache`). Any cache, chest or boss table names `relic_cache`.
- Everywhere else a relic is plain gear: rarity ladder, salvage (from the bag
  only — a seated piece is out of the hammer's reach like worn gear), the
  keeper's lock, the corpse (`DeathLootPolicy.containers`, on by default —
  seated = worn), the ground painter (`groundItems.ts relic`), the bag glyph
  (`itemIcons.ts relic`), the dev Items tab (categories derive from the bases).

## The drawer (ui/containerPane.ts)

Every owned container wears a **ribbon** on the inventory's rail beside
SKILLS and PASSIVES (glyph, name, `seated/seats`). Its press pops a **drawer**
beside the bag: a minted `container-panel` root (the skill-tree pane idiom,
one per container on first open) that **docks** through the Skills drawer's
own seat law (`syncBuildPanels` + `buildPanelSeat`, width
`BUILD_PANEL_CFG.containerWidth`) and **enrolls in THE FOLIO** as a
`container:<id>` leaf of the inventory-side book — an explicit ask that
arrives in front and closes through its own close — so a drawer up beside
Skills or a tree tabs into one book instead of painting over it; the master
law, the front swap, the true close and the Esc sweep all arrive from the
folio (docs/ui/folio.md). The drawer follows the bag as Skills does: hidden
with it, memory kept.

The drawer draws the board's full shape (live seats as drop cells, sealed
seats dim with the rung's name), a **return strip**, and the hints. The bag
stays on screen, so gestures ride the standing drag fabric across the two
panels: bag tile → open seat seats (`containerPlace`), seated tile → a bag
cell or the return strip unseats (`containerTake` — the bag's landing law
routes a `c:<id>` origin), seated tile → another seat re-places
(`containerMove`), and the right-click tap (the bag's use verb) seats /
unseats first-fit; the keeper's lock hold works on a seated tile. The item
tooltip says where a relic stands and whether it speaks. The menu's
`container:<id>` page opens the bag if it is shut, then the drawer; fronts a
shelved drawer; closes an open one (`openFromMenu`).

## Adding a container

1. One `ContainerDef` in `data/containers.ts` (accepts, active, ladder frames,
   an icon row in `ui/icons.ts` if the glyph is new) and one `FEATURE` flag per
   rung in `meta/account.ts`. Add it to `CONTAINER_DEFS`.
2. Nothing else: the Vault rows, the menu page, the tab, the fold, the save,
   the wire, the corpse, the drop census and the probe's ladder checks all
   derive. A container that accepts an existing category (a quiver taking
   `'quiver'`, a pouch taking `'gem'`) needs no new bases at all.

## Vocabulary note

`relic` is also a construct kind in the skill data (Warden Relic, Holy Relic
— planted or shoulder-borne constructs). The two live in different namespaces
(construct kinds vs item categories); the player-facing collision is noted
here so a later naming pass can choose.

## THE SEAT LAW — power that reads the board (engine/seatlaw.ts)

A container is a tetris board, so **where** a piece sits can be part of what
it does. `engine/seatlaw.ts` registers three amplifier stats — ordinary
registered stats any piece's lines may carry (a unique line today, an affix or
a vestige word tomorrow) — that THE CONTAINER FOLD consumes as **one factor
per seated piece**:

| mode | stat | reads |
| --- | --- | --- |
| outward | `seatPower_outward` | every piece TOUCHING this one has its lines scaled by the value |
| solitude | `seatPower_solitude` | this piece's own lines scale by the value per open seat touching it that stands EMPTY |
| communion | `seatPower_communion` | this piece's own lines scale by the value per piece touching it |

`factor = 1 + Σ outward worn by the touching pieces + solitude × empty seats +
communion × touching pieces`, floored at zero (a cursed piece may weaken its
neighbours, never invert them). The laws:

- **Touching** is orthogonal adjacency of footprint cells over OPEN cells of
  the live board (`seatNeighbourhood` in containers.ts). A sealed or
  out-of-bounds cell is not a seat: it is neither empty nor occupied, so the
  ring's hollow centre counts for nothing until THE HEART opens it.
- **The single hop.** Amplifier lines are read raw and then consumed: never
  scaled, never emitted to the sheet. A crown beside a crown amplifies the
  other's damage, not its crown; chains are impossible by construction (the
  conversion fabric's golden rule, worn by the board). Only FLAT amplifier
  lines count.
- **Everything else scales.** Every other line of the piece — flat, increased,
  more, links, gauge lines, attribute lines — multiplies its value by the
  factor before it joins the fold (`amplifySeatMods`). Author relic lines so
  that bigger is better; the register already is.
- **The sheet never sees the amplifiers.** They seat on the sheet's `misc` tab
  as the `seatPower_` family only so the registry stays honest; a sheet total
  of "outward power" would mean nothing.

**THE CASE GAUGE.** `registerContainer` publishes one derived gauge per
container, `seated:<id>` — the count of pieces seated on its live board — so
any line anywhere may read "per relic seated in your Reliquary" through the
ordinary gauge axis (`Modifier.gauge`). The World serves it through
`GaugeWorld.carryOf` (the seat's meta); a body with no seat reads zero.

**A relic that grants.** The container fold feeds the granted-skill scan and
the host search, so a seated piece carrying `skillgrant_<id>` grants exactly
as a worn piece does — the instance on the bar, its stones resident on the
relic (`ItemInstance.grantState`), gone when it leaves the case.

## The relic legends (data/uniques/relics.ts — probe `balance/probe_relicuniques.ts`)

Six chase pieces, one per lever, all of them BUILDS under THE DEFINING LAW
(docs/engine/legends.md); every number is a dial.

| legend | base | signature |
| --- | --- | --- |
| The Hermit's Bead | charm 1×1 | SOLITUDE: 25–35% stronger lines per empty seat touching it — give it the corner and the room |
| Sunderstone | charm 1×1 | a rolled ELEMENT (fire/cold/lightning/chaos, one identity forever): its penetration and tagged damage, paid in your own resistance to it |
| The Lodestone | talisman 2×1 | COMMUNION: 6–9% stronger lines per relic touching it — crowd it |
| The Unquarried Idol | idol 1×2 | GRANTS Summon Stone Golem (level deepens with tier); the golem's stones live on the idol |
| The Tally Idol | idol 1×2 | THE CASE GAUGE: 1.5–2.5% increased damage per relic seated in the Reliquary, itself among them |
| The Reliquary Crown | effigy 2×2 | OUTWARD: relics touching it have 15–22% stronger lines — seats only once the heart opens, and touches eight from there |

Drops: the legends share the world unique pool by weight (about 8% of it,
`minIlvl` walking the case's own ladder) and the `relic_cache` table pours one
at a small share (`rarity: 'unique'` rows degrade to rare below every legend's
floor). The lodestone, the hermit and the crown are the seat law's three
textures; the idols are the standing levers seated; the sunderstone is the
living uniques' choice group on a charm.
