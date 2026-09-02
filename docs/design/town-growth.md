# THE TOWN THAT GROWS — Lastlight from hamlet to township (charter v2)

**Status: v2 BUILT — T1 (the tiered charter) + THE SMITH'S YARD + THE INN
SQUARE + THE BROOK + THE WARD landed together (2026-09-01), at her call to
"begin to adjust Lastlight itself".** v1 (2026-08-24) chartered the ladder
and landed T0 (the Font's real site + THE ARRIVAL LATCH); walk 1 RATIFIED
the shape (card 1 count-based, card 6 dressing WANTED) and PARKED T1 behind
the bounty board's movements. Those movements are all landed (M0–M4, the
first writ, the kinship), and her 2026-09-01 commission un-parked the town
with four new asks folded in below. Anything marked **DIAL** is a build-time
lever; every number is unblessed. The probe is
`balance/probe_towngrowth.ts` (82 checks, on the fast lane).

> **THE LEAD FINDINGS (v2).**
>
> 1. **The old town was random where it needed to be authored.** Its water
>    was the generic `river` stamp — a rolled disc chain whose centre
>    derives from the ARENA SIZE, so growing the town would have moved the
>    river through any station. The fountain was a random single. The
>    waypoint was the last centre formula. All three are authored now: the
>    brook is a `course` row per tier, the fountain is the plaza's, the
>    waypoint is a site.
> 2. **THE CENTRE CARVE is a law the plaza must obey.** A fresh run's
>    geometric entry is the arena's exact centre, and `generateLayout` cuts
>    every blocking prop within its portal clearance (95) of that point —
>    the plaza's fountain vanished on every fresh run until the square was
>    seated a fountain's reach south-east of the crossing. Probe-pinned; the
>    party wakes at the bedside regardless (the S cell).
> 3. **The hamlet cannot hold the whole town.** At 1400×1000, the north
>    road runs where the smith's yard would stand and the south belongs to
>    the training line and the road. The hamlet hosts at most ONE station
>    (structural: the village opens by the second), so its seats are each
>    sane alone; the CRAFTING FLOW forms from the village up — and the
>    probe pins that reading.
> 4. **A road law joined the apron law.** The straight way from every
>    portal to the waypoint — whatever side the road rolls onto this run —
>    runs through no structure and over no training body, every tier. The
>    apron law alone let a cottage sit on the south road.
> 5. **Boroughs already had the town-side hook.** `data/boroughs.ts`
>    invited "town-build gates" as a population consumer; THE WARD is that
>    consumer, riding the gatework's own avenue vocabulary and a new
>    ACCOUNT ledger (`souls_sheltered`) stamped the moment refugees arrive.

---

## 0. Her commission (2026-09-01 — the asks, encoded as direction)

| # | ask | where it landed |
|---|---|---|
| 1 | **Cluster the crafting utilities around Brandt** as one flow a player refining gear would actually walk, not scattered stations. | THE SMITH'S YARD (§1.3) |
| 2 | **Lastlight as a town growing toward a city**, not a hamlet toward a villa: ground to explore, citizens taking up residence as Boroughs are cleared, new areas/functions as ACCOUNT progress grows. | THE SIZE LADDER to a township (§1.1) + THE WARD (§1.5) |
| 3 | **The Bounty Board by Mireille's inn door**, its unlock raising a real LOCALE (an alcove), not one doodad. | THE INN SQUARE + `bounty_alcove` (§1.4) |
| 4 | **Beautify; eliminate or shrink the river**, consolidate it, bridge it — movement never hindered on a town errand. | THE BROOK (§1.6) |
| 5 | The overall THEME/LOOK (a Divinity's Reach lean, scope-caveated) — **her collaboration session**. | card 1, §4 — not built |

---

## 1. WHAT STANDS (v2)

### 1.1 THE SIZE LADDER — `TOWN_TIERS` (data/townBuild.ts)
Count-based (RULED, card 1): the town stands at the highest rung whose
`stations` the account meets, counting every `TOWN_ADDITIONS` feature it
owns (derived — never a second list). Order-free, every purchase pushes the
town toward its next stage, reads ONCE at World construction (the
tier-flicker law: a threshold crossed mid-run re-lays home next run).

| rung | id | stations | size | scatter × |
|---|---|---|---|---|
| 0 | hamlet | 0 | 1400×1000 | 1.0 |
| 1 | village | 2 | 1700×1200 | 1.4 |
| 2 | town | 5 | 2100×1500 | 1.8 |
| 3 | township | 8 | 2600×1800 | 2.3 |

All **DIALs**. The hamlet IS the ZONES row (size, fixtures, scatter rows —
probe-pinned byte-equal), so anything reading `ZONES.lastlight` directly
sees the truth. `expandedTown` clone-replaces the per-run def: the rung's
size, the town's own fixtures at their rung seats, every owned addition's
fixtures at THEIR sites, the base scatter scaled, plus the rung's brook and
the traveled ways as authored `course` rows.

### 1.2 THE ONE-TRUTH SITE LAW — `TOWN_SITES` + `townSiteAt`
Every seat is a row: `{ id, quarter, tiers: (Pt|null)[], structure?,
dwell?, press? }`. ONE resolver (`townSiteAt(tier, id)`; on the World,
`townSeat(id, dx, dy)` = THE ONE READ) feeds the fixture raised there, the
`near*` dwell check, the NPC/dummy spawn and the renderer's prompt — drawn
== dwelt by construction, and no seat derives from the arena size ever
again. A site authored short of the ladder holds its last seat above; null
= the ground does not exist at that stage (the mill at the hamlet, the ward
before the town). Additions reference SITES (`{ structure, site }`), not
coordinates. The bare consts (`SALVAGE_SITE`, `BOUNTY_BOARD_SITE`,
`FONT_SITE`…) are RETIRED — the probes park at `w.townSeat('salvage')`.

**THE LAWS the probe pins over every tier × every side:**
- **THE APRON LAW** — no station's disc contains an arrival apron (any
  side), reaches a portal, or the waypoint's attune ring; from the village
  up no two DWELL stations overlap (a PRESS — the Font — may: its hint
  shows, nothing fires).
- **THE ROAD LAW** (new) — the straight way portal → waypoint runs through
  no raised structure (pad 20) and over no training body (a body's width),
  every side, every tier; the plaza is the destination (walked around).
- **THE QUARTER LAW** — a site keeps its compass quarter across the
  ladder (the bench is always west, the inn always north-east…), sliding
  outward, never crossing town.
- **THE FOOTPRINTS** — no two raised structures overlap with every station
  owned; the training line's bodies stand on open ground.
- **THE DIALS** — the site rows' `dwell` mirrors the engine's own dial
  (`SALVAGE_CFG.stationRadius`, `BOUNTY_BOARD_CFG.dwell.radius`), and the
  live rig proves every `near*` verb answers AT its seat and refuses a
  step past its dial.

### 1.3 THE SMITH'S YARD — the crafting flow
The forge's open east + south faces open onto a yard where the stations a
player refining gear walks between stand in ORDER, west → east: **break at
the bench (salvage) → buy/sell/craft at Brandt's counter → commune at the
stones (oracle, reroll) → merge at the Font.** THE FORGE WAY (a paved
`course` from beside the waypoint through Font → stones → bench) IS the
flow, walked. Probe: the order holds and every crafting station stands
within `YARD_REACH` (560, DIAL) of the forge at every rung from the
village up. (The hamlet holds ≤1 station; its bench stands south of the
forge and its stones keep a corner past the inn — the north road runs
where the yard would be.) The future Steady-Hand trace station and the
twin-anvils craft are Brandt's own counter — already in the yard.

### 1.4 THE INN SQUARE — `bounty_alcove`
The board's unlock now raises a LOCALE: a roofed reading nook beside
Mireille's south door — the board pinned to the back wall under a timber
roof (the new `N` legend char — any plan may post a board), a bench either
side, lanterns flanking the open cobbled front, a crate. `'rooms'`
confinement derives it UNSEALED (open front) so the room veil never wraps a
player reading the slate; the board reads from the front by sight, and its
side walls honestly refuse a flank read (the roof/wall law). THE INN WAY
paves plaza → alcove front → inn door. Probe: the board stands within
`DOOR_STRIDE` (260, DIAL) of the door at every rung, outside the inn's
roof (her counter serves only under it), footprints disjoint.

### 1.5 THE WARD — residents (data/boroughs.ts `TOWN_RESIDENTS`)
Citizens take up residence as Boroughs are cleared. Every soul a held
Borough sends home stamps the ACCOUNT (`LEDGER_SOULS_SHELTERED`, at the
refugee writer beside `BoroughField.addRefugees` — the quest-turn-in
durability precedent) while the run's population still lifts Brandt's
shelf. Each resident row = a family: a cottage SITE in the ward (ground
that stands from the town rung: two cottages + the green at 'town', five
at 'township'), an open GATE in the gatework's vocabulary (any-of; the
lifetime sheltered count is the debut avenue — a quest, a level, another
unlock are one row each), the body at the door (`townsfolk_resident_*`,
npcRole 'resident' = nameplate + speech bubble) and its line. World seats
every family whose gate holds AND whose cottage this rung raises (a family
with no house yet waits; the map pin already counts them). Nothing saves;
the town re-lays from the account. Debut roster: Hesper Vell (3 souls),
Tobin Ashcroft (6), Old Mauve (10), the Pell Twins (14), Sabine Rook (18)
— names/lines/thresholds **DIALs**.

### 1.6 THE BROOK — the authored course (engine/levelgen `course` stamp)
The random `river` row is gone. Each rung authors a brook: a polyline in
the south-west corner (between the tracker's camp and the training line),
laid as fused water discs along exactly its points with ONE plank span
across it (the ravine's own span idiom), and — from the village up — a
mill on its far bank (`mill_bank`: the settled belt's live-sailed
windmill, bales). No town errand crosses it; the bridge is the crossing to
the bank. Probe: the water keeps clear of every station disc, every
structure and every arrival apron at every rung; the span is laid; the
live township lays water + bridge with no water inside any dwell disc.
The `course` stamp is generic (StampSpec `path` / `lay` / `spans`): a
paved lane is the same row with `lay: 'paved_way'` — the town's three
TRAVELED WAYS are `course` rows resolved from SITES, so they follow the
seats across the ladder with no per-tier coordinates.

### 1.7 THE PLAZA (the plaza fold, card 4 as recommended)
The waypoint's centre formula is DEAD: `plaza_square` (fountain, benches,
lanterns) + the `waypoint` site are authored per rung, a fountain's reach
south-east of the crossing (finding 2). Nothing else claims the centre.

---

## 2. STANDING BY CONSTRUCTION
THE ARRIVAL LATCH (T0, beneath every station dwell) · `expandedTown`'s
clone-replace (the static row is never mutated) · the seeded layout
(`seed: 1187`) · every station's own dwell verb and dial · the co-op
keeper's-account law · the S cell (a fresh run still wakes at the bedside
at every rung — probe H0).

## 3. THE PITFALL LEDGER (v2 additions)
6. **THE CENTRE CARVE** (finding 2) — no blocking authored prop within 95 +
   its radius of the exact centre; the plaza's seat is pinned.
7. **THE WAYS SWEEP** — a paved way routes solids out from under itself
   (the clearway sweep). Ways leave the square from beside the waypoint or
   east of the fountain; a way through the fountain square deletes its
   benches.
8. **THE TRAINING LINE IS 690 WIDE** — in a 1400-wide rung it must cross
   the south road's column; the hamlet straddles the road with the line's
   own rack→gauntlet gap, a body's width clear (probe C2).
9. **A station's disc is its BODY's disc** — the caravanner, the
   quartermaster and the officer stand off their seats; the apron law
   measures the stand (read off the structure's npcs row; the officer's is
   the World's offset, verified live).
10. **The tracker's old stand overlapped his own camp's rock** and was
    shoved off its seat at spawn; he stands south of the fire now.

## 4. DECISION CARDS (her word wanted — none of these are built)
1. **THE LOOK / THEME.** Her collaboration session. The ground truth for
   it: the ladder tops out at a TOWNSHIP (2600×1800, ~3.3× the hamlet's
   area) — Divinity's Reach scale would be a different fabric (the settled
   belt's `district` recipe: massing + boulevards, or planned blocks) laid
   at the top rung instead of authored seats. Recommended: keep AUTHORED
   seats through 'township' (muscle memory, the one-truth law) and, if a
   city rung is wanted, add a FIFTH rung whose OUTER ring is a district
   recipe around the authored core — the player builds TOWARD it.
2. **RESIDENTS: account-lifetime vs run-scoped.** Built: the ACCOUNT's
   sheltered count (a family that settles stays across runs — permanence).
   Alternative: the run's population (families come and go with each
   run's Boroughs). Recommended as built.
3. **THE BROOK: kept vs gone.** Built: a corner brook + one span + a mill
   from the village up. Deleting one `brook` row per rung dries the town.
4. **THE LADDER'S TOP.** Four rungs to a township; the sizes and the
   station counts (0/2/5/8) are DIALs.
5. **THE ALCOVE'S ROOF.** Built roofed (a reading nook); an open-air
   pergola is the same plan with the `.` cells made `_`.
6. **WHAT ELSE THE WARD HOLDS.** The residents speak one line each. Open
   seams: a resident SERVICE (a ward vendor at 10 souls, a ward writ), the
   green as an event seat, per-rung dressing rows (card 6 of v1 — the
   scatter scaling is the floor, the ways + mill + green the first rows).

## 5. BUILD MOVEMENTS
- **T0 — THE FIXES.** LANDED @ `fb732ca` (v1).
- **T1 — THE TIERED CHARTER + her v2 asks.** LANDED 2026-09-01: the
  ladder, the site tables, the resolver at every read, the plaza fold,
  the apron/road/quarter/footprint laws probe-pinned, the smith's yard,
  the inn-square alcove, the brook + the `course` stamp, the ward.
- **T2 — THE LOOK.** Her session (card 1) → per-rung dressing rows, the
  theme, a possible district rung.
