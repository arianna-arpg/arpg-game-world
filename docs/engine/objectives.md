# Zone objectives — the vocabulary, the seal policy, and the survey spire

The objective is WHAT A ZONE ASKS OF YOU: one `ObjectiveSpec` per zone
(`src/data/zones.ts`), driven by `World.updateObjective`, completed through the
single `completeObjective` chokepoint (bounty XP + `completedObjectives`
remembrance + the quest hook). Generated zones roll their objective from the
tileset's `objectives` weight table (`data/tilesets.ts` → worldgen
`rollObjective`) — a tileset opts into a kind with one weight row.

## Kinds

| kind         | asks                                                          |
|--------------|---------------------------------------------------------------|
| `safe`       | nothing — a sanctuary                                         |
| `clear`      | THE CULL — fell a SHARE of the counted population (kill N,    |
|              | never find-the-last-body); `all: true` = the classic empty floor |
| `waves`      | survive N waves (0 = endless arena); boss cadence as data     |
| `escape`     | reach an exit under an endless trickle                        |
| `spawners`   | destroy the spawner objects                                   |
| `boss`       | slay the named boss (uber/promote riders)                     |
| `beacon`     | charge the SURVEY SPIRE(S) by holding ground beside them —    |
|              | `count` 2+ is the ATTUNEMENT CIRCUIT (smaller waystones)      |
| `procession` | escort the caravan to the far crossing — WINNABLE and LOSEABLE |
| `bounty`     | claim every WRIT — named rare quarry roaming with the population |
| `offering`   | FEED the altar — kills inside its field power it; stalls, never fails |
| `leyline`    | THE BESIEGED WAYPOINT — fell the SIPHON drinking the node dry; |
|              | the stone refuses attunement while the thief lives              |
| `rifts`      | SEAL the seeping tears — each pours the zone's own underside    |
|              | until held shut under the contest law                           |
| `pyres`      | KINDLE the cold fire-bowls — each lit bowl is a REGISTERED      |
|              | lightwell (real light; the Gloaming's meter drinks from it)     |
| `unearth`    | DIG the burial mounds open — spoils spill (spoils-law honest),  |
|              | and the turned earth may answer                                 |
| `puzzle`     | ANSWER THE RIDDLE — the zone stands one of its own puzzles up   |
|              | as THE ask (engine/puzzles.ts); rollable by weight row AND      |
|              | adoptable over standing riddle ground (registerPuzzleAsk)       |
| `lair`       | THE ADOPTED ASK (adoptive-only — never a weight row): the ask   |
|              | IS a claim the mint stood up — brave the den behind its door,   |
|              | or fell the apex natives holding the ground                     |
| `package`    | THE ADOPTED GUEST (adoptive-only — registerPackageAsk): the ask |
|              | IS a roving content-package presence this ground hosts — trip   |
|              | the standing fracture and survive its run, however it ends      |
| `venture`    | THE ADOPTED VENTURE (adoptive-only — registerVentureAsk): the   |
|              | ask IS a standing winnable-or-LOSABLE feature — open the sealed |
|              | holdfast; murder its wardens and THE FAIL ARM hands the ask     |
|              | back to the plain cull, no completion, no punishment            |

## Exit-seal POLICY (not physics)

Whether an UNMET objective seals the zone's other exits is data at two levels:

- `OBJECTIVE_SEALS` (data/zones.ts) — the per-kind default. Today only `boss`
  seals (the classic arena commitment). Waves/spawners roads stay OPEN, and
  the whole contest-law family + the leyline siege ship open too (the ground
  itself is the commitment; a severed waypoint punishes nothing but fast
  travel).
- `ObjectiveTuning.seal` — a per-zone override on any spec (`seal: true` makes
  one special gauntlet seal; `seal: false` makes a fleeable boss).

`World.isExitLocked` consults `objectiveSeals(o)`; nothing else in the engine
hardcodes kind lists for travel. Endless arenas (`waves: 0`) never seal.

The CHEST policy is deliberately separate: `objectiveEarnsChest(o)` /
`OBJECTIVE_CHEST_KINDS` decide who banks the sealed objective chest — an
unsealed waves zone still stakes its treasure.

## Progress rides Zone Memory (not a locked door)

"Crossing a zone boundary never punishes you" now extends to objectives:

- WAVES: `ZoneMemory.wave`/`waveActive` + the mid-wave survivors (spawnWave
  flags its bodies `fromZoneGen`) are captured on leave and restored on
  re-entry — walk out mid-wave 2, walk back, it is still wave 2 with the same
  wounded bodies. Past the TTL (or the Campfire) the gauntlet re-arms fresh;
  a COMPLETED arena stays completed via `completedObjectives`.
- BEACON: `ZoneMemory.spireCharge` — a half-charged spire resumes exactly.
- RIFTS / PYRES / UNEARTH: `riftCharges`/`pyreCharges`/`digCharges` — the
  spire's charge-array shape, one per fixture in placement order. Full =
  the finished face: a sealed tear re-places sealed, a lit bowl burning,
  an opened mound dug.
- LEYLINE: nothing of its own — the wounded siphon is ordinary enemy memory
  (`ZoneEnemyMemo` carries its name, rarity, tag and HP for free), and a
  fallen one stays fallen via `completedObjectives`.
- CLEAR: `ZoneMemory.cullKills`/`cullNeed` — the tally AND the stamped ask
  both ride (the ask derives once, on fresh ground; a thinned field
  re-deriving from its survivors would shrink its own ask).
- The riders all serialize with the world (`meta/worldstate.ts SavedZoneMemory`).

## THE CONTEST LAW (the hold-family discipline)

`data/objectives.ts` `ContestSpec`/`CONTEST_CFG`, spread into each kind's own
config (`BEACON_CFG.contest`, `RIFT_CFG.contest`, `PYRE_CFG.contest`,
`DIG_CFG.contest`) and driven by ONE engine helper (`World.driveHoldFixtures`)
for every hold-the-ground fixture family:

- BUILD only on held, CLEARED ground: any live counted enemy inside the
  contest ring (`radius`) STALLS the fixture's progress. The presser
  predicate is `objectiveCountable` — the SAME one the cull's scoreboard
  runs, so "contested" and "who counts" can never disagree (dormant sleepers
  count on purpose: ground with a sleeper on it is not cleared ground).
- A CROWD (`drainAt`+) DRAINS banked progress (`drainPerSec`), attended or
  not — walk away from pressed ground and the wilds smother the work back
  down (the spire's own lure feeds this loop by design). Charges floor at 0;
  nothing ever resets.
- The drive STAMPS its frame read (`holdRead` — the watch fabric's idiom):
  `spireView`/`riftsView`/`pyresView`/`digsView` re-speak the exact scalars
  the drive tested, so the HUD line, the chevron label and the charge logic
  are one truth (drawn == tested).
- Per-zone override: `ObjectiveTuning.contest` re-dials any knob, or `false`
  waives the law for an authored uncontested stand. Kinds that hold no
  ground ignore it.

## THE BESIEGED WAYPOINT (`kind: 'leyline'`)

All numbers in `src/data/leyline.ts` `LEYLINE_CFG`; spec overrides `id`
(pin a def), `rarity`/`stacks` (the promote), `levelBonus`.

- The zone's waypoint stands SEVERED: a SIPHON — by default a promoted,
  NEMESIS-NAMED champion rolled from the zone's OWN table (every biome's
  thief is native), `id` pins a def instead — seats at its own POI (it taps
  the vein wherever it runs) and is POSTED there (the duty-post fabric:
  storm-drift and shoves can never wander the objective away).
- `World.waypointBesieged()` is the ONE predicate: the attune brush REFUSES
  (throttled float names why), the HUD line names the thief, and the
  renderer draws the starved face — a broken guttering ring — plus THE
  TETHER: a crackling beam from the stone to the siphon, dashes marching
  TOWARD the thief (power flows out; the beam IS the map to the fight).
- State is PURE POPULATION (the bounty's honesty): any death counts, the
  wounded thief rides Zone Memory free, a save/guest derives "besieged"
  from the same replicated actors the fight stands on. The kill frees the
  stone on the spot; the same brush then attunes. A rosterless zone spawns
  nothing and completes vacuously (the puzzle's no-wedge law).
- WORLDGEN: a 'leyline' roll FORCES the mint's waypoint (OR-ed after the
  chance draw — the seeded stream stays byte-identical for every other
  mint); ground the vetoes refuse (exclusion discs, waypointless
  dimensions) degrades the roll to 'clear'. validate() warns on authored
  leyline ground without a waypoint and on pinned siphons that don't
  resolve.

## SEAL THE RIFTS (`kind: 'rifts'`)

All numbers in `src/data/rifts.ts` `RIFT_CFG`; spec overrides `count`,
`sealSec`. Seeping tears (`rift_tear`/`rift_tear_sealed` — the chasm-pit
painter glowing the zone's own accent) stand at POIs:

- Each OPEN tear POURS: small groups of the zone's own kin on a jittered
  clock (`pour` — every/batch/cap/radius), tagged `rift_born`, zone-capped.
  The pour is counted population: it stalls the seal, pays xp, rides Zone
  Memory — the tear literally contests its own closing. Sealed tears pour
  nothing; packless zones seal quietly.
- PRESENCE beside a tear builds its SEAL (the 'rift' transit row) under the
  contest law. Sealed stays sealed across re-entry (`riftCharges`).

## KINDLE THE PYRES (`kind: 'pyres'`)

All numbers in `src/data/pyres.ts` `PYRE_CFG`; spec overrides `count`,
`kindleSec`. Cold iron fire-bowls (`night_pyre`/`night_pyre_lit` — the
campfire painter's bowl face, the regent-brazier precedent) stand at POIs;
presence kindles each under the contest law. THE PAYOFF IS REAL LIGHT: the
lit kind wears a REGISTERED lightwell row (`registerLightwell` — the engine
reads wells by doodad kind, zero engine edits), so on gloaming ground a lit
pyre feeds the LIGHT meter like a campfire, and its light row rides the
dynamic light layer everywhere.

## UNEARTH THE CACHES (`kind: 'unearth'`)

All numbers in `src/data/digsites.ts` `DIG_CFG`; spec overrides `count`,
`digSec`. Burial mounds (`burial_mound`/`burial_mound_dug` — cairn standing,
scree opened) dig open under the contest law (the dead dislike shovels). An
opened mound SPILLS through the ordinary drop chokepoint (`spoilGemChance` —
the SPOILS LAW still governs sealed ground) and may SPRING an ambush of the
zone's own kin from the turned earth (`ambush` — chance/count/radius).

## THE CULL (`kind: 'clear'`)

The workhorse objective, re-asked: **kill N here**, never "find the last
body" — that hunt is the bounty writ's whole identity (named marks, chevrons
by name), and the old kill-everything clear was a directionless worse writ.
Dials in `src/data/objectives.ts` `CLEAR_CFG`; per-zone overrides on the spec
(`need`, `frac`, `all`).

- THE ASK derives ONCE, on fresh ground, after the base population stands:
  an authored `need` wins (flat, or a `[min,max]` band rolled off the layout
  rng — the offering's idiom); otherwise `frac` (default `CLEAR_CFG.frac`) of
  the standing counted population, clamped to `CLEAR_CFG.min..max`. A derived
  ask never exceeds what actually stands; an authored ask is the author's
  sovereignty (event-fed ground may intend kills the mint never spawned).
- THE TALLY is pure kill-chokepoint state (`worldKillRules
  'clear_cull_tally'`): ANY counted death feeds it — credited or not, ambient
  events included — the same honesty as the writ and the offering. The
  predicate is `objectiveCountable`, the SAME one `countedEnemies` runs, so
  the scoreboard and the population read can never disagree about who counts.
- THE CONFINE CLAUSE (the soft-lock guard's instance half,
  `World.confineUnreachable`): a body hard-confined to a disc whose HEART the
  walker cannot reach — its confine centre off the zone's own pathing
  components (`pathField` → `reachable`, anchored at the entry) — neither
  feeds the derived ask nor holds the floor, however its def was authored.
  Def-level `noObjective` covers kinds; this covers the stamped body, so a
  forgotten def row can no longer wedge a small floor (the hoard pocket's
  hard-authored 'clear' leans on it — probe RIG I). Where no verdict exists
  (boundless ground, an unwalkable entry) the body counts, exactly as before:
  the clause may only excuse a wedge, never invent a completion.
- THE MERCY FLOOR: an EMPTIED floor completes regardless of the tally — a
  sparse mint can never ask more than it holds, and old-save asks can never
  wedge. Completing the tally reads "culled!", the floor reads "cleared!".
- `all: true` is the classic ask as authorable vocabulary: no scoreboard, the
  empty floor IS the objective (special gauntlets, authored set-pieces).
- Progress rides Zone Memory (`cullKills`/`cullNeed`) — leave mid-cull, walk
  back, same ask, same tally. Past the TTL the ground re-stocks and re-asks
  fresh, like every forgotten field.
- Population left standing after the cull is just the world: XP still flows,
  events still churn, the bounty stays one-time (`completedObjectives`).

## The SURVEY SPIRE (`kind: 'beacon'`)

All numbers in `src/data/beacons.ts` `BEACON_CFG`; per-zone overrides on the
spec (`chargeSec`, `lureRadius`, `revealRadius`).

- A spire fixture stands at a POI (doodad kinds `survey_spire` /
  `survey_spire_lit`; looks in `data/doodadVisuals.ts`, painter `surveySpire`,
  solidity via `registerDoodadRule`). Placement rides the layout rng, so a
  remembered seed re-places it on the same stone.
- PRESENCE (not idleness — you will be fighting) inside the hold ring builds
  the charge: the ring radius + ring style live on the `'beacon'` TRANSIT row
  (data/transit.ts), the seconds default from the row's dwell. Stepping out
  PAUSES the charge; it never resets — but the ground must be TRULY CLEARED:
  the charge runs under THE CONTEST LAW (above, `BEACON_CFG.contest`) — any
  counted enemy inside the ring stalls it, a crowd drains it, and the HUD +
  chevron say which is happening in as many words.
- While charge is banked, the spire holds a LURE (below): the zone's own
  population drifts toward the glow — the pressure is whoever already lives
  here. The lure's standoff ring sits INSIDE the contest ring on purpose:
  drawn moths stall the stone until cut down, and an abandoned half-charged
  stone gets smothered back toward zero by its own crowd.
- …and the operation BLEEDS (`BEACON_CFG.reinforce`, spec `reinforce`
  overrides any dial, `false` silences it): while any stone holds banked,
  unfinished charge, small reinforcement groups arrive at the rim on a
  jittered clock — the zone's OWN table seasoned with the mix factions'
  rosters (`mixFactions`, debut `['marrowdrawn']` — the essence-drawn
  opportunists follow charged ley like bleeding marrow; an unregistered
  roster degrades silently to native). Arrivals are ordinary tagged bodies
  (`spire_drawn`), capped live, spawned into the lure's pull — no orders,
  no scripted charge: the pull does the rest.
- At full charge the spire flares (kind swap to `_lit`, big light) and
  SURVEYS the overworld — THE RECON CAP (`BEACON_CFG.revealCount`, spec
  `revealCount`): the flare names a seeded RANDOM ASSORTMENT of up to
  `revealCount` NEW nodes (never visited, never surveyed) inside
  `revealRadius`, not the whole disc (the old whole-disc unfurl dumped 80+
  nodes of intel in one flash and flattened the map's mystery). Picked
  nodes chart their `?` frontiers (real graph citizens — roads drawn),
  unveil, unconceal, and land in `World.surveyed` (persisted); everything
  else keeps its veil, and any structural mints the picked charting causes
  stay forechart-veiled (unfound country stays unfound). The pick is
  deterministic per zone (`seed × revealSalt`). The HARBOR's purchased
  charts keep the whole-disc pulse — a paid chart is a different promise
  (`surveyAround`'s uncapped lane, byte-identical to the old behavior).
  The map (ui/panels.ts) draws surveyed-but-unwalked nodes as RECON INTEL:
  real name/biome/level, washed fill, dashed rim in the spire's tint.
- The off-screen chevron rides the attention fabric (registered in
  data/beacons.ts) and speaks the contest (`contested` / `draining` off the
  stamped view); the charge ring rides the shared dwell-ring feed
  (`World.dwellRingsView`, styled by the transit row).

## The ATTUNEMENT CIRCUIT (`kind: 'beacon', count: 2+`)

The flexibility demonstration: ONE spec field transforms the objective. Each
of `count` waystones (smaller kin of the spire — `waystone`/`waystone_lit`
kinds, same painter) charges independently under the same presence rule; each
banked, unfinished stone holds its own lure, so the fight MIGRATES with your
work; each completed stone lights on the spot; the survey fires once, when the
last stone fills. Worldgen rolls it as the `'circuit'` tileset weight
(→ `{ kind: 'beacon', count: 3-4, chargeSec: 8 }`).

## The PROCESSION (`kind: 'procession'`)

All numbers in `src/data/processions.ts` `PROCESSION_CFG`; per-zone overrides
on the spec (`robbers`, `puffEvery`, `speedMul`). Replaces the old ambient
faction-caravan zone event (retired from engine/events.ts).

- The cart (`caravan_cart`, `driven` — the runtime owns every turn of the
  wheel) waits DORMANT beside the gate you entered through: immobile,
  untargetable, invulnerable. Its life pool stamps from zone level.
- The TRAVELED WAY: `exitRoadAnnotations` stamps a gravel-road ExitRoadSpec
  from your entry to the chosen crossing (the farthest unlocked, non-entry
  portal; pinned by the memory rider across re-entries), and the layout
  pipeline carves it — the land itself says where the caravan is headed.
  Dead-end pockets degrade to a roadless far-POI run.
- RALLY: linger at the wheel (the 'procession' transit row: dwell/radius/
  ring; an `entryGraceSec` keeps arrival from rallying it accidentally).
  Then it rolls: path-field steering (the ai.ts `pathStep` idiom), pausing
  DEAD while any robber stands at the wheels (`robRadius`).
- PRESSURE, emergent: the rolling cart holds a LURE (idle locals drift after
  the goods and attack what they perceive), plus BANDIT AMBUSHES puff from
  smoke on the march clock (`puffEvery`/`puffCount`/`puffCap`), each wearing
  the extraction-style FIXATION graft (`aiTuning` highestThreat + seeded
  threat on the cart) — robbers rob; you out-shout them by fighting.
- WIN: the cart reaches the crossing → `completeObjective` (bounty + the
  sealed chest). LOSE: the cart dies → `World.objectiveLost` — the bounty is
  forfeit, the HUD says so, NOTHING locks, and the loss rides the Zone Memory
  rider until the TTL/campfire refresh deals a fresh caravan.

## The BOUNTY WRIT (`kind: 'bounty'`)

All numbers in `src/data/bounties.ts` `BOUNTY_CFG`; per-zone overrides on the
spec (`count`, `rarity`, `stacks`). The PoE2-style rare hunt as data:

- The zone posts writs on `count` of its OWN bodies (rolled from the
  effective spawn table — eligible defs only: no passives, spawners,
  noObjective habitat-bound or NPCs; a roster-less zone posts writs on
  existing counted bodies instead). Each mark is promoted (`promoteRarity`,
  stackable), minted a NAME from the nemesis vocabulary
  (`mintNemesisName` — faction pools apply, deduped per zone), tagged
  `bounty_mark`, and spawned at reachable spawn points to roam.
- The hunt is PURE POPULATION STATE: remaining = living marks, completion
  when none stand, ANY death counts (a faction brawl that fells a mark did
  your work — the same honesty as 'clear'). Zone Memory therefore resumes a
  half-claimed writ with the SAME named quarry at the same wounds — names,
  rarity, tags and HP all already ride `ZoneEnemyMemo`. Zero new
  persistence.
- Per-writ claim beat rides the kill-handler fabric (`bounty_writ_claim`:
  a taste of xp, the `bounty_writs_claimed` ledger, the claim text).
- The chevron holds its tongue until `chevronWhenRemaining` (2) marks are
  left — a hunt stays a hunt; only the last stragglers get pointed at, BY
  NAME.

## THE OFFERING (`kind: 'offering'`) + the altar fabric

The altar system (data/shrines.ts) as an objective. `AltarDef` now carries
BEHAVIOR VERBS beyond its modifier aura, each optional, each data:

- `bolts` — a LOCALIZED STORM: telegraphed strikes (the weather-strike shape,
  fired through the shared `fireStrikeAt` pipeline) rain on random points
  inside the field, frying friend and foe — risk versus reward as ground.
- `killGems` — kills inside the field spill bonus gems (any death, credited
  or not — the field rewards blood, not authorship).
- `mend` — a heal pulse to EVERYONE inside, enemies included.
- `weight` — the POI roll's rarity dial.

Rows: wrath/haste/bulwark/blood (the originals) + the Gathering Storm,
Gilded, Mending, and Still Hours. Ambient POI altars weight-roll from the
same registry the objective borrows.

The OFFERING objective (numbers in data/objectives.ts OFFERING_CFG; spec
overrides `need`, `altarId`): an altar stands at the first POI — pinned by
`altarId` or weight-rolled, so a storm/gilded/mending roll reshapes the whole
ask. Kills WITHIN ITS FIELD power it, `need` deep, through a worldKillRules
row at the kill chokepoint — ANY death counts, credited or not, ambient or
not. A migration herd stampeding through the light, a warband brawl, the
storm altar's own bolts: all offerings. Fed progress rides Zone Memory
(`altarOffered`).

THE STALL (not a loss): if nothing lives in the zone before the altar is
sated, the HUD reads hungry — and the state is DERIVED from the living
population each frame, never latched, so any world event that spawns new
bodies revives the hunt by existing. Losing is impossible; only waiting.

## STRAGGLER CHEVRONS (cross-kind parity)

data/objectives.ts STRAGGLER_CFG: the last few counted enemies of a 'clear'
(≤3) and the last spawner of a 'spawners' (≤1) get edge chevrons, labeled by
name — the same mercy the bounty's marks get. One attention source reads
`World.objectiveStragglersView()`; thresholds are data. Under THE CULL this
fires exactly when it should: only when the standing population runs dry
before the tally fills (the mercy-floor path — the one moment finding bodies
is the task again).

## THE ADOPTIVE LANE (`kind: 'lair'` — adoption, never dependency)

The design law (Arianna, 2026-08-03): the world mints what it mints — lairs by
their own predicate rows (`engine/lairs.ts`), den mouths by their own chance
draws in generateLayout — and the zone's ask then MAY adopt a standing feature
as its own. Never the reverse: **no spawn is ever forced to satisfy an
objective, and featureless ground never rolls the adoptive kind** —
structurally weight 0, not a failed promise. All numbers + the derivations in
`data/objectives.ts` `ADOPT_CFG` / `maybeAdoptObjective`.

- THE SEAM: worldgen's roll is byte-untouched. At zone LOAD — after
  generateLayout has answered every chance draw — `World.loadZone` calls
  `maybeAdoptObjective(def, layout)` and stamps the result over the def's
  objective. Only a BARE rolled `'clear'` may be adopted over (no authored
  `need`/`frac`/`all`/`seal`; `ObjectiveTuning.adopt: false` waives per zone,
  `adopt: true` skips the coin — adopt whatever stands, always). PURE +
  rng-free: one FNV hash off `(def.id, def.seed)` is both the coin
  (`ADOPT_CFG.chance`) and the pick — no rng stream moves, every load, save
  restore and co-op seat re-derives the identical verdict, and the stamp is
  idempotent (an adopted kind is not in `overrides`, so it never re-rolls).
- TWO CLASSES, derived from the registries (no hand lists — a new lair is
  adoptable the moment it registers):
  - **DEN** (`mouthKind` on the spec): lair rows whose landmark is a
    `den_mouth` — the standing door's doodad kind is the sidezone kind.
    Completion = the den country's own objective done, read off the derived
    pocket id (`sidezoneIdFor` × `completedObjectives` — zero new
    persistence; you settle the den, walk out, the parent banks). The HUD's
    `entered` phase reads the door's own gateway ledger (`ledgerOnEnter`).
    CONDITIONED doors (`SidezoneDef.when` — the King's Barrow's dusk gate)
    are never adopted: a schedule is destination content, not a zone ask.
  - **HUNT** (`kin` on the spec): lair rows whose landmark seeds resident
    bodies in the zone itself (the Giant's Cairn, the Gnoll Moot, the
    Wellspring). Pure population state over the claim's def ids — any death
    counts, wounded keepers ride Zone Memory free, dormant sleepers count
    (ground with a sleeping giant on it is not settled ground). A claim
    whose kin also ride the zone's own pack table is NOT offered — the ask
    must never leak zone-wide.
- `lairAskView()` is the stamped view (completion watch + HUD + chevron all
  speak one read); the pointer rides the attention fabric from
  data/objectives.ts. Seals: OPEN (the claim stands where it stands). Chest:
  NONE on the parent — the claim's own hoard IS the reward (the barrow's
  cache floor, the lair_hoard the alphas pay, the den's own chests); a
  parent chest would double-pay the same feature. A bound feature that no
  longer stands completes vacuously (the puzzle's no-wedge law — mercy for
  drifted saves, never a free clear).
- THE UNTITLED CLAIM (her ruling, 2026-08-07): LAIR titles left ALL
  player-facing objective prose — the pane read stays the bare row
  (`objectiveRead` composes no title), the HUD line speaks the structure
  title-free in HER coining ("the lair" — ruled 2026-08-07 over the first
  draft's mechanical "claim": "Brave the lair — its door stands on this
  ground" / "Fell the lair's keepers — N remain"), the completion floater
  speaks the deed ("The lair is cleared!" / "The lair is broken!"), and
  the chevron label follows ('brave the lair') — a
  claim's identity lives in its mouth's own distinct visual, not in text.
  `ADOPT_CFG.titles` and the spec's `title` remain DATA (dev surfaces, and
  the package/venture classes still speak their names by design); only the
  lair READS stopped consuming them. Probe: RIG T (T1/T11/T16 pin both the
  bare prose and the title's absence).
- `validate` refuses `'lair'` in tileset weight tables and pocket-form pools
  (`ADOPTIVE_ONLY_KINDS`): a weight row would be a promise `rollObjective`
  cannot keep.
- THE CHART'S PROVISO (documented, deliberate): pre-walk map intel shows the
  MINTED ask; ground a claim stands on re-negotiates at first entry — the
  same way every time. The `exits seal` tail never shifts (both kinds ship
  open).

### THE PACKAGE CLASS (`kind: 'package'` — the adopted guest)

Her law (2026-08-03): "an actual applicable content package BE a zone
objective … the content packages appear as normal, and upon spawning can
have a chance to become the zone objective." A content package REGISTERS its
adoptable presence — `registerPackageAsk` (data/objectives.ts, called at
module scope from the package's own overlay file, the `registerMarkerSource`
zero-edit contract) — as a row carrying a presence read (`standing`: the
guest in this zone as a STABLE key, off the package's own seat state), a
prose `title`, a live `view` for the driver + HUD, and an optional per-row
`chance`. No hand lists anywhere; a package is adoptable the moment its
module registers.

- THE SEAM is the lane's own: at zone LOAD, `maybeAdoptObjective(def,
  layout, world)` consults package rows only where the LAIR classes stood
  aside (a resident claim beats a passing guest — and the lair half stays
  byte-identical with or without the `world` argument). The verdict is one
  FNV hash over `(salt, pkg, def.id, def.seed, guestKey)` — the guest's key
  in the hash means EVERY fresh visitation rolls its own coin
  (`ADOPT_CFG.packageChance`), rng-free like the whole lane. Load-time is
  ignite-time deferred to the first moment the player can meet the ground:
  the hash answers identically whenever it's asked while the same guest
  stands, so no information is lost — and a guest that arrives MID-visit
  simply plays as a normal package spawn (her "appears as normal" clause),
  adoptable at the next load if it still stands.
- THE SURVIVE CONTRACT (the fracture debut's completion law, in
  `World.updateObjective`'s `'package'` case): the ask completes when the
  player ENGAGED the guest (`packageAskEngaged`, a zone-local latch — the
  fracture's run-over trigger) and the guest's run then ENDED while the
  player still lives. Success or fail BOTH bank — a "too slow" collapse
  still completes the zone; the run's own verdict is the package's business.
  Dying out from under it banks nothing.
- THE HAND-BACK (the transience doctrine — events borrow the world, never
  own it): a guest gone unanswered (idled out while away, ended over a dead
  player, its package uninstalled) REVERTS the ask to the bare `'clear'` it
  adopted over — mid-visit in the driver, at load in `maybeAdoptObjective`'s
  reversion arm — so the zone is always completable and a later guest may
  adopt afresh on its own coin. (The lair classes keep their vacuous-complete
  mercy; the guest class reverts instead — durable ground can be settled,
  a transient guest can only be handed back.)
- THE FRACTURE DEBUT (`overlays/fractures.ts`): ORIGIN SEATS ONLY
  (`!longerTimer`) — her "when a player triggers it" is the dormant
  run-over, and a DIVERTED surface is the bounce, sovereign by her word and
  structurally never offered. Walking out mid-run tears only the zone-local
  run; the overlay seat survives and re-entry re-arms the dormant origin —
  the package's OWN re-trigger law, no second lifecycle. After the ask
  banks, the bounce onward (divert, glide, hops) is byte-untouched.
- Seals: OPEN structurally (a guest that may leave can never hold a door).
  Chest: NONE on the parent — the package pays its own way (chasm seals,
  the run-through bounty), and the chest gate's extra load draw would shift
  layout streams besides. No second chevron: the package's own attention
  pointers remain the in-zone guides. `packageAskView()` is the stamped
  view. `validate` refuses `'package'` everywhere `'lair'` is refused.
- Co-op posture: host-authoritative like the whole objective fabric (no
  objective wire fields exist); the client-HUD fidelity gap is the standing
  one, not widened here.
- Probe: RIG U (balance/probe_objectives.ts) pins the census, per-guest
  coins, origin-only candidacy, both survive arms, the dead-player refusal,
  the re-arm, both hand-back roads, authored sovereignty, and lair-first
  precedence.

### THE VENTURE CLASS (`kind: 'venture'` — THE FAIL ARM's home)

Her ruling (2026-08-04, redirecting the hunt-ask card): "I really like Option A
as a mechanic [the engagement-scoped adopted ask] but it feels minorly
redundant for the Hunt. However, that concept CAN be leveraged in other ways:
something like OPENING A HOLDFAST would work as a zone objective, because a
Holdfast can be explicitly failed if the player murders the wardens. But if
that occurs, and the objective actually falls back to its plain cull — no
completion — then we actually cohere the entire objective a bit better and
leave it up to player agency once more."

A fabric REGISTERS its adoptable venture — `registerVentureAsk`
(data/objectives.ts, called at module scope from the fabric's own file, the
registerPackageAsk contract; `packages/overlays/holdfast.ts` is the debut) —
as a row carrying a presence read (`standing`: the venture in this zone as a
STABLE key, off the fabric's own durable state), a per-stand `title`, a live
tri-state `view` (`'standing' | 'won' | 'lost'`) and an optional `chance`.
Rows consult sorted by id; no hand lists anywhere.

- THE FAIL ARM (the class's defining grammar, `World.updateObjective`'s
  `'venture'` case): the ask completes ONLY through the venture's own
  standing verbs (verdict `'won'`, read off the fabric's own state — never a
  parallel ledger, drawn == tested). The player's own actions may explicitly
  FAIL it (verdict `'lost'`), and a lost venture HANDS THE ASK BACK to the
  bare cull IN-VISIT: no completion, no punishment — this visit completes on
  the empty-floor law, the next load re-derives the cull stamp. This is the
  package class's guest-gone hand-back grown an explicit-failure read: a
  guest's absence is circumstance, a venture's loss is authored by the
  player's own hand. The load half re-validates the same view (`'standing'`
  and `'won'` hold the stamp; `'lost'` — or the fabric uninstalled — reverts
  and falls through, so another standing class may take the ground on its
  own coin).
- THE STANDING CONTRACT (`VentureAskRow.standing`): candidacy is only ever
  the STANDING state — a venture whose view would read `'won'` or `'lost'`
  must read null there, so a resolved or failed venture can never
  (re-)offer itself and the hand-back converges to the cull instead of
  flip-flopping.
- THE RESOLUTION LATCH (her ruling, 2026-08-07): when the venture resolves —
  EITHER arm — the resolution's own prose (`wonText`/`lostText`, the
  standing fallbacks) takes the objective HUD line and HOLDS it
  (`World.objectiveLatch`, read at the one `objectiveText` seam), released
  only once BOTH gates pass: `ADOPT_CFG.resolveLinger.sec` seconds since
  the resolution instant AND `resolveLinger.kills` credited kills SINCE it
  (the clock and the kill counter snapshot at resolution — the warden
  murders that CAUSED a loss never count; `World.kills` = non-silent
  enemy deaths credited to the player's side). Then the line converts to
  whatever the objective now is — the done state for a win, the live cull
  for a loss. DISPLAY STATE ONLY: the hand-back and the completion bank
  stay instant and byte-unchanged (chest/seals/XP timing untouched), the
  latch is zone-local and never persisted (cleared at every loadZone), and
  the old transient red LOST floater is dead — the latch is its
  replacement (her reduce-on-screen-text word: one seat, no double text).
  A vanished fabric (view null) latches nothing: nothing resolved, there
  is no prose to hold. Honest consequence, named: a WON venture on ground
  the player never kills again holds its won line indefinitely — the
  guardian does stand open. Co-op: the latch is host-side display state
  like the whole objective line (no objective wire fields exist; a network
  guest's HUD line derives from its own local graph — see the co-op
  posture bullet below); couch seats share the one World and see it
  naturally.
- THE HOLDFAST DEBUT (`packages/overlays/holdfast.ts` — "open the
  holdfast"): candidacy = a SEALED gate standing in the overlay's ledger
  (`resolved: 'sealed'`, exit appended, guardian registered — an opened
  (looted) or failed (wardenless) holdfast never adopts, structurally); any
  HoldfastDef is adoptable the moment it registers, def-blind. WON =
  `resolved: 'open'` — the toll paid (`payHoldfastToll` → `unlock`) or the
  slaughter gamble BURSTING the gate (`updateHoldfastSite` → the same
  unlock): the fabric's own verdict is the ask's verdict, so the bloody road
  can still WIN when the gamble pays — a burst gate IS an opened holdfast
  (adjudicated; flagged for her word). LOST = `resolved: 'failed'` — the
  wardens murdered and the gate held (`markFailed`, terminal by the
  fabric's own law: no re-muster, no re-pay). The key binds the exact gate
  (`lockId:defId`) — a re-raised or re-guarded stand reads stale and hands
  back rather than silently rebinding. The HUD line asks the toll in the
  guardian's own coin (`holdfastTollLabel` — the one formatter).
- PRECEDENCE: lair → package → **venture** → puzzle. The more patient, the
  later: the resident native is the ground's own claim; the guest's window
  is now-or-never (480s idle); the venture's gate stands the whole run but
  its candidacy can END (a toll paid un-asked, a slaughter); the grave
  re-mints from seed forever. Ground a lost venture hands back falls
  through to the remaining classes in the SAME read (my reasoned order,
  flagged).
- Seals: OPEN by law (an ask the player may explicitly fail must never hold
  a door — and walking on past a toll-gate is itself a road). Chest: NONE
  on the parent — the venture's own resolution is the pay (the holdfast's
  purchased pocket), and a chest on a fail-armed ask would either be
  forfeited by the fail (a punishment her ruling forbids) or double-paid by
  the cull it hands back to. The coin: `ADOPT_CFG.ventureChance` (0.5,
  unblessed) per (zone, row, key); `adopt: true` skips it, per-row `chance`
  overrides. `ventureAskView()` is the stamped view; the chevron
  (`venture_adopt`) anchors on the gate while the ask stands.
- `validate` refuses `'venture'` everywhere `'lair'`/`'package'` are refused
  (ADOPTIVE_ONLY_KINDS). Co-op posture: host-authoritative like the whole
  objective fabric (no objective wire fields exist).
- Probe: RIG W (balance/probe_objectives.ts) — census + citizenship, the
  coin, all four precedence seams (each proven non-vacuous), the load-half
  hand-back (standing/won hold, lost/unregistered revert, the fall-through),
  and the LIVE debut: adopt → pay → complete; adopt → murder (gamble pinned
  shut) → fabric rules failed → hand-back in-visit → cull still finishes →
  a failed gate never re-adopts; adopt → murder (gamble pinned open) → the
  burst COMPLETES the ask down the bloody road. RIG W-L pins the latch:
  both arms latch their prose, each gate holds alone (kill-first and
  clock-first orders), both met converts, the lost floater is gone, a zone
  load clears it, ordinary kinds never linger.

### THE PUZZLE CLASS (the STANDING `kind: 'puzzle'` — the adopted riddle)

The ruling (Arianna, 2026-08-04, closing the lone-crypt coda): the graveland
exhumation IS askable — Dial A stands (a sealed grave + its chance-1 ring in
every graveland/mournstead zone), the ask lands on ~1-in-7 zones, and the
lane is THE ADOPTIVE one ("the method that allows more extensibility"). The
weight-row alternative is permanently DEAD for those tables: a `'puzzle'`
weight shifts a table's weighted TOTAL, which re-rolls every mint of the
country and cascades through the chart halo into other countries' pinned
worlds (the weighted-total cascade — probe_tiers N3.9 was the witness). A
registry row draws NOTHING: the A/B census (both arms headtree-snapshotted)
read byte-identical mint fingerprints with the class registered.

- THE ROW (`registerPuzzleAsk`, data/objectives.ts — called at module scope
  from the kit's own file, the registerPackageAsk contract;
  data/lonecrypt.ts is the debut): `doodad` — the standing DOOR whose
  presence in the generated layout marks candidate ground (the den class's
  detection idiom) — plus `puzzle` — the PUZZLES preset the stamp pins —
  and an optional `chance`. Rows consult sorted by id.
- THE NO-CONJURE LAW: candidacy needs BOTH reads — the door in the layout
  AND the preset in the zone's own `ZoneDef.puzzles` rows (folded from
  `TilesetDef.puzzles` at mint). The ground authored the riddle as its own
  content; the ask adopts it, never conjures one the country never wrote.
- THE STAMP IS THE STANDING KIND: `{ kind: 'puzzle', puzzle: <preset> }`.
  The puzzle placer (`World.bootPuzzles`) stands THE ring up as the
  objective run (`isObjective`), the standing `'puzzle'` driver banks it,
  and the standing kind's own rows apply verbatim — chest BANKS (unlike the
  lair/package classes: the rolled `'puzzle'` kind is chest-gated by
  standing law, and the adopted ask pays exactly like the rolled one),
  seals OPEN, pane reads `❖ answer the riddle`. Zero new driver, spec,
  seal, read or validate code anywhere.
- THE COIN: `ADOPT_CFG.puzzleChanceByTileset[def.tileset]` OUTRANKS the
  row's `chance` OUTRANKS `ADOPT_CFG.puzzleChance` — per-tileset dials
  KEYED BY TILESET ID inside the config (a dial, never a TilesetDef field:
  tilesets stay mint-pure). The ratified arithmetic: effective ask = the
  table's own bare-`'clear'` share × the dial — crypt 0.575 × (3/11.5) =
  15% of graveland zones, mournstead 0.44 × (3/11) = 12%; measured 14.8% /
  13.2% over 250 real mint+load sweeps each. probe_lonecrypt pins the
  arithmetic against the LIVE tables so a table retune re-surfaces the
  landed rate for a ruling.
- PRECEDENCE runs LAST (lair → package → venture → puzzle): a resident
  claim beats a passing guest beats a standing venture beats the patient
  dead — a guest's window is now-or-never, a venture's gate can end, the
  grave keeps. Ground a stale package stamp HANDS BACK falls through
  to the riddle's own coin in the same read. Once stamped the ask is
  permanent (idempotent — `'puzzle'` is not in `overrides`; the ground
  never leaves, so no hand-back arm exists for this class).
- The hash: `adopt:puz:<rowId>:<def.id>:<def.seed>` — rng-free like the
  whole lane; deterministic per zone across loads, saves and co-op seats.
- Probes: RIG V (balance/probe_objectives.ts — census, no-conjure, coin
  rates + the exact mournstead-⊂-crypt subset law, both precedence roads,
  the hand-back fall-through, the live stamp) and probe_lonecrypt A/G
  (the ratified-rate arithmetic on the live tables; the real dig banking
  the STANDING driver AND lifting the crypt's seal — ask and door, one
  loop).

## `objectiveLost` (the loseable-objective seam)

A first-class outcome any future objective can set: HUD branch in
`objectiveText`, per-load reset, Zone-Memory persistence, and — by
construction — zero effect on travel (seals are policy, and lost zones read
`objectiveSeals` exactly like unfinished ones). Losing costs the reward,
never the road.

## The LURE fabric (monster attention)

`World.setLure(id, pos, radius, pace, standoff, linger?)` — a world point
idle enemies DRIFT toward; `World.lureFor(actor)` is consulted by the AI's
targetless branch only (engine/ai.ts), so combat, orders, morale and fear all
outrank the pull; drives and squad demeanor defer to it. The standoff ring
keeps the drawn crowd milling around the point instead of stacking onto it.
Holders re-stamp their row each frame; rows self-expire after `linger`.
The survey spire is the first rider — bait consumables and noise-maker skills
can join with one `setLure` call, no AI edits.
