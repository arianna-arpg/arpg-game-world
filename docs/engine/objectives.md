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
