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
| `clear`      | kill the counted population                                   |
| `waves`      | survive N waves (0 = endless arena); boss cadence as data     |
| `escape`     | reach an exit under an endless trickle                        |
| `spawners`   | destroy the spawner objects                                   |
| `boss`       | slay the named boss (uber/promote riders)                     |
| `beacon`     | charge the SURVEY SPIRE(S) by holding ground beside them —    |
|              | `count` 2+ is the ATTUNEMENT CIRCUIT (smaller waystones)      |
| `procession` | escort the caravan to the far crossing — WINNABLE and LOSEABLE |
| `bounty`     | claim every WRIT — named rare quarry roaming with the population |
| `offering`   | FEED the altar — kills inside its field power it; stalls, never fails |

## Exit-seal POLICY (not physics)

Whether an UNMET objective seals the zone's other exits is data at two levels:

- `OBJECTIVE_SEALS` (data/zones.ts) — the per-kind default. Today only `boss`
  seals (the classic arena commitment). Waves/spawners roads stay OPEN.
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
- Both riders serialize with the world (`meta/worldstate.ts SavedZoneMemory`).

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
  PAUSES the charge; it never resets.
- While charge is banked, the spire holds a LURE (below): the zone's own
  population drifts toward the glow — the pressure is whoever already lives
  here. NO waves, NO bonus spawns.
- At full charge the spire flares (kind swap to `_lit`, big light) and
  SURVEYS the overworld: every node within `revealRadius` map units resolves
  its `?` frontiers through the eager-web mint path (`chartNeighborsOf` —
  fresh mints inside the pulse chart theirs in turn, so the growth is bounded
  by the radius), concealment lifts, and everything touched lands in
  `World.surveyed` (persisted). The map (ui/panels.ts) draws surveyed-but-
  unwalked nodes as RECON INTEL: real name/biome/level, washed fill, dashed
  rim in the spire's tint.
- The off-screen chevron rides the attention fabric (registered in
  data/beacons.ts); the charge ring rides the shared dwell-ring feed
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
`World.objectiveStragglersView()`; thresholds are data.

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
