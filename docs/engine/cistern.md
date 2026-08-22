# THE CISTERN — the scald lake's under-story, and THE CISTERN CRONE

Scald Basin M3 coda (charter `docs/design/scald-basin.md` §0 seventh walk —
"could be very cool to see and give the scald its own distinct sort of side
zone" — §6 THE LAKE, §8 the Cistern Crone line, §8b THE NO-TAG LAW, §13 M3).
Kit `src/data/cistern.ts` (single-file doctrine: regions, props, the lane,
the court landmark, the lair row); the crone in `src/data/monsters.ts` /
`looks.ts`, her kit in `src/data/skills.ts`; the drawn boil in
`src/render/vis/boilLayer.ts`. Probe `balance/probe_cistern.ts`. Every
number is a DIAL (unblessed — she blesses via playthroughs).

## The shape that shipped (her "side zone" word steered the read)

THE RECOMMENDED path: an under-tier GROTTO beneath the lake — the moonlit
mere's grotto form (`docs/engine/tiers.md`, `data/merelake.ts`,
`engine/tiers.ts carveUnderGrotto`) reused on the basin seat, with ONE new
seat law. The structural fallback (an in-zone lair ON the shoal) was not
needed and was not taken (probe A22 pins it: no tileset seats the court as an
in-zone landmark).

- **THE GREAT SHOAL** (`engine/lake.ts`, `LAKE_CFG.shoal`): whenever a lane is
  dialed under the lake (`layoutParams.underTier`), the lake mints ONE broad
  isle FIRST (the other isles space around it) at the bearing whose shelf
  band is WIDEST — sampled across the disc's own angular span so the
  wobbling rim and deep never clip it — away from the arrival
  (`entryClear`). Its radius is the band's fit, capped at `r[1]`; under
  `r[0]` no shoal stands and the dial honestly does nothing (a lake whose
  shelf is too narrow hides no cistern). One roll, lane-gated: lane-less
  lakes draw nothing here and stay byte-identical. The shoal is RESERVED
  whole (no scatter, no landmark roll on it) and stays a perch POI (the well
  the tail cuts sits on the chamber's arrival-side rim, never at the centre
  a load-time fixture would take). It is HELD OUT to the under-tier tail as
  **`GenCtx.underSeats`** (THE OFFERED SEATS — `engine/levelgen.ts`).
- **THE OFFERED SEAT** (`UnderGrottoSpec.seat: 'offered'`, `engine/tiers.ts`):
  the grotto carve takes the offered discs in order instead of hunting —
  the chamber is CLAMPED to fit wholly under the offered disc (rolled R,
  then `min(R, r − wobble − a cell)`; under the lane's own smallest chamber
  or the grotto form's five-cell floor it refuses), `seatStands` (the
  arrival clearance + the rim law) and `classifyAt` (the all-boreable law —
  the lane's `forbid` names every basin water, so the chamber bores under
  CRUST only) judge it exactly as a hunted seat; none standing = no story,
  byte-flat. The hunt branch is draw-identical (the mere mints as before).
  Result: THE LAKE KEEPS ITS WATER — no shelf or deep cell is ever repainted
  (probe B6); the whole chamber lies under the shoal (B4); the one well +
  stair stands ON the shoal (B5), reached by WADING the stinging shelf — the
  lake prices the door.
- **THE BRINK** (`UnderGrottoSpec.courtSeat: 'brink'`): the lane's lair
  court seats on a shore cell TOUCHING the pool (farthest from the stair),
  so a mouth naming the pool as its liquid seat stands at the lip. Default
  `'waterline'` = the mere's seat, byte-identical.
- **THE LANE** (`registerUnderTier('cistern')`): regions `cistern_shore` /
  `cistern_water` / `cistern_well` (tier 1; the well the one `tierLink` and
  the ONLY row with a surface visual — the door must read from above), the
  `cistern_stair` prop, `packSplit: 0` (AUTHORED population), a kit of
  `cistern_bloom` / rock / bone_pile, the grotto radius band [150, 190]
  (a pool with a rim — the mere's [230, 320] is a hall), `waterFrac` 0.5,
  resident fauna rows (brood matrons [1,2], kettle minnows [4,7], vent
  lampreys [1,2] — the shelf's own kin gone below), and
  `ledgerOnDescend: 'cistern_entered'`. Dialed on the `sulphur_pools` heart
  face: `underTier: 'cistern', underTierChance: 0.3` (DIAL — raised above the
  mere's 0.14 "occasionally": the lake is the country's heart and the
  cistern its side zone).

## THE SEAL (the mere's layer-honesty law, verbatim — and why it is the only one)

The cistern rows carry NO gameplay field (no standStatus, pathCost,
severity, douse, survival, standDamage, boundaryPolicy) and no surface visual
but the well's. VERIFIED THIS PASS: World's GRID region-sense path
(`applyRegionEffects` off `walk.regionAt` under a body) is tier-BLIND — a
gameplay field on a story row WOULD reach a surface walker standing on the
lid. The mere's deferred audit is answered "tier-blind"; leak-proof by
construction stays the law (probe A6 pins every field; a future field demands
the layer-honest audit of that path first). The crone's verbs are sealed by
`hostileTo`'s TIER LAW (layers share a screen, never a fight): THE BOIL is an
ordinary skill zone — never a `sky` storm (whose hitAll branch has no tier
filter), never a region swap — so the surface walker over the pool is
untouched while the crone fights one story down (probe D4/D5/D6, THE VICE).

## THE CRONE (`cistern_crone`)

A scalded naiad-crone: faction `coven` (diplomacy-silent — unlisted pairs are
neutral, so her `beast` court never turns on her; the hex tongue already in
both name mills), lair alpha tier (`bossBar`, NOT a boss — the
mere_sovereign / wellspring naiad model), `loot: 'lair_hoard'` (the lean
repeatable), `post: true` (she returns to her pool). **ROOTED** on
`cistern_water` (the wellspring naiad's grammar on the basin seat: in her
pool +35% damage / −25% taken / regen / cast speed; hauled out +20% taken —
the wilt DRAWN by three `rooted` tells: the steam-lit glow at home, the tint
and the lean when torn out). **THE GRID ROOT** (`engine/world.ts`, the rooted
sweep): a body standing on a PAINTED region roots on it as on a poured disc
(`groundKind ?? gridRegion`) — the cistern's water is a grid region, so
without this she would never read rooted. **THE NO-TAG LAW**: a finite kite
budget (`tempo.kite` 2.2s) — rooted, she commits or the fight comes to her.

Her kit (all `noDrop`, every number a DIAL):
- **THE BOIL** (`cistern_boil`) — her verb, THE BROIL LAW as a boss verb: a
  single GROUNDED storm strike centred on her (`castRange 0`, `areaRadius 0`,
  `hitRadius 170`, `telegraph 2.2`) whose landing bites ONLY bodies standing
  on `cistern_water` (**`StormDelivery.onGround`** — THE GROUNDED STRIKE,
  `engine/skills.ts` → `Zone.onGround` → the gate in `World.updateZones` off
  the victim's own grid cell, the region-sense's read) — heavy fire, the
  `scalded` sting (the tide the minnows frenzy on; the warmth the matrons'
  clutches hatch on — THE WARM HATCH), and a shove clear. The shore inside
  the ring stays DRY. DRAWN == TESTED: the telegraph is not the disc — it is
  the roil (the geyser fabric's ONE `drawRoil`: the vent's telegraph, the
  lake's permanent deep, now the cistern) over exactly the disc's cells that
  wear the water (`render/vis/boilLayer.ts groundedCellsIn`, the pure seat
  resolver the renderer draws from and the probe holds against the engine's
  gate), the ramp piling up as the countdown runs out, a whisper of the
  disc's outline for the honest reach; drawn on the caster's own story only.
- **Scald Undertow** (`scald_undertow`) — the naiad's undertow lash in the
  basin's register: a fire line that seizes a DRAG grip and reels the catch
  back into the pool she stands in.
- **Steam Veil** (`steam_veil`) — a conjured standing steam cloud
  (`type: 'conjure'`, the cloud-craft grammar) granting `fogveiled` (the fog
  fabric's own word) to her side: she and her court harder to mark.
- `firebolt` for the shore-stander, `claw` for the rest.

## THE COURT (the lair)

`registerLair('cistern_crone')` — seat `biomes ['scald']` × `tilesets
['sulphur_pools']` × `underLane: 'cistern'` (the mere's rung: resolved ONLY by
this lane's carve, refused at every standing chokepoint and by every other
lane — the symmetric filter) × `level { from: 8, fadeIn: 3 }` × `chance 0.6`
(RAISED, the mere court's precedent — a cistern that stands usually keeps its
crone; the shoal + the dial already make the cistern rare). The landmark
`crone_court` (THE UNIQUE-ID LAW: `cistern_court` is already the ruin
compositions' id) is `den_mouth` with an INERT centerpiece (`cistern_font` —
the pool is the destination, no door), blooms and bones, `siteTier: 1` (every
piece and the spawn row stamped to the story), and **THE LIQUID SEAT ON A
REGION** (`params.liquidSeat: 'cistern_water'`, `engine/landmarkBuilders.ts`
den_mouth): every cell of the builder's rect the grid paints that kind
becomes the liquid seat, so `spawns.where: 'liquid'` seats the crone IN her
pool — she boots rooted, never wilted on the shore. Exactly one crone
(`count [1,1]`). Her court = the lane's resident fauna.

## THE DESCENT LEDGER

`UnderTierSpec.ledgerOnDescend` (`engine/tiers.ts`, `laneLedgerOnDescend`):
the moment a SEAT's body first takes the lane's crossing DOWN (the ladder
toggle in `World.moveActor` — surface → story ≥ 1), the lane's key is bumped
on the run ledger (`bumpLedger`; merged to the account on death like every
run key) — the sidezone fabric's `ledgerOnEnter` for a story with no door.
The cistern books `cistern_entered` (for future gates). Absent = identical.

## Verification

`balance/probe_cistern.ts` (+ its roster row): RIG A registry/seal/shape (23
pins: the lane, the seal, the well, the dial, the lair row + symmetric
refusal, the crone's nets incl. every skill real/hinted/affordable and the
NO-TAG budget, THE BOIL's spec, the court rows, the ledger key, the shape
pin), RIG B the carve (the shoal honest and common at the harness size, the
chamber ⊂ shoal, the well on the shoal, the lake keeps its water, one
stair/one well, declared, no orphans, the lid, the story road, tier-stamped
residents, absent == identical, the offer without the roll, determinism,
cells ⇔ one stair), RIG C the court (font/dress on the story, clear of the
stair, reachable, exactly one crone IN the water), RIG D live (a real
World's heart-face mint: the crone rooted in her pool — THE GRID ROOT; THE
VICE seal; the fight below real; THE BOIL drawn == tested — the roil seats
are the water cells in the disc, a walker in the pool scalded, a walker on
the shore inside the ring spared, the ramp pure; THE DESCENT LEDGER on the
real crossing). `balance/probe_lake.ts` B3 amended (dated): tier rows
accepted over isle/spit class only. The lane joins `npm run genqa` through
the face's dials; the crone joins probe_anatomy's nets.

## Dials (all unblessed)

`LAKE_CFG.shoal` (r [230, 270], gap 28, tries 16, entryClear 560); the lane's
grotto radius [150, 190] / waterFrac 0.5 / fauna counts / kit counts; the
face's `underTierChance` 0.3; the lair's level envelope + chance 0.6; the
court landmark size [110, 150]; THE BOIL's radius 170 / telegraph 2.2 /
damage [26, 40] / cooldown 9 / shove 140; the undertow + veil numbers; the
crone's statline; `BOIL_CFG` (roil mouth, jitter, the ramp floor and shape).
Her-calls owed: the chamber's size on the shoal (tight by design), whether
the shoal should stay a perch POI when no cistern rolls, the boil's window,
the residents' counts, the crone's name.
