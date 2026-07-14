# Zone objectives — the vocabulary, the seal policy, and the survey spire

The objective is WHAT A ZONE ASKS OF YOU: one `ObjectiveSpec` per zone
(`src/data/zones.ts`), driven by `World.updateObjective`, completed through the
single `completeObjective` chokepoint (bounty XP + `completedObjectives`
remembrance + the quest hook). Generated zones roll their objective from the
tileset's `objectives` weight table (`data/tilesets.ts` → worldgen
`rollObjective`) — a tileset opts into a kind with one weight row.

## Kinds

| kind       | asks                                                        |
|------------|-------------------------------------------------------------|
| `safe`     | nothing — a sanctuary                                       |
| `clear`    | kill the counted population                                 |
| `waves`    | survive N waves (0 = endless arena); boss cadence as data   |
| `escape`   | reach an exit under an endless trickle                      |
| `spawners` | destroy the spawner objects                                 |
| `boss`     | slay the named boss (uber/promote riders)                   |
| `beacon`   | charge the SURVEY SPIRE by holding ground beside it         |

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

## The LURE fabric (monster attention)

`World.setLure(id, pos, radius, pace, standoff, linger?)` — a world point
idle enemies DRIFT toward; `World.lureFor(actor)` is consulted by the AI's
targetless branch only (engine/ai.ts), so combat, orders, morale and fear all
outrank the pull; drives and squad demeanor defer to it. The standoff ring
keeps the drawn crowd milling around the point instead of stacking onto it.
Holders re-stamp their row each frame; rows self-expire after `linger`.
The survey spire is the first rider — bait consumables and noise-maker skills
can join with one `setLure` call, no AI edits.
