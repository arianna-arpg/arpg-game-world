# THE RESOURCE HARVEST — biome nodes broken by a keyed rite

`engine/harvest.ts` is the pure half (`HARVEST_CFG`, the seeded sequence,
the accuracy fold, the payout denomination); `data/harvest.ts` the themed node
rows keyed by biome/tileset (the lair fabric's predicate idiom — a country
joins by one row); `World.bootHarvest` / `updateHarvest` / `harvestFeed` /
`harvestSettle` the stateful driver; `balance/probe_harvest.ts` the rig.

## The shape

A zone stands a few gatherable nodes. Standing beside one ARMS a rite: a
short bar-slot sequence against a closing window, the prompt speaking the
live binds. The last correct press — or expiry — shatters the node (flash +
husk face, never text) and pays essence through the standing drop path,
scaled by difficulty (zone level) and accuracy. One rite per node: armed is
spent, stamped into zone memory.

## The laws (each pinned by the probe)

- **THE CONSENT DIAL** (`HARVEST_CFG.consent`; her word 2026-09-11 = `dwell`):
  standing `armSec` at a calm node begins the rite outright, the node's own
  ring filling as the linger builds — the way every other dwell in the game
  begins. `press` (the pass's original lean) keeps the interact-verb offer.
- **THE CAMP HABIT**: a rite begins only with the blood cold
  (`SWAP_DISCIPLINE_CFG.calmSec`) and no foe pressing — but THE RITE'S OWN
  FOE REACH (`HARVEST_CFG.foeRadius`, 190; her ruling 2026-09-11) is a few
  body lengths, never the field discipline's wide calm (480): the harvester
  already stands at the node, so only a foe genuinely near holds it shut.
  The scan is the discipline's (`pressingFoeNear`: armed, targetable, same
  story); only the radius is the rite's.
- **THE PAUSE LAW**: arming engages the `harvest` TimeHold surface outside
  menu mode under the pause menu's own solo-only policy; co-op runs unpaused.
- **THE INPUT LAW**: a seat mid-rite speaks to the rite alone — movement
  swallowed, slot presses become symbols.
- **THE ANTI-MEMORIZE LAW**: the pause toggle refuses while the hold stands,
  every node's sequence is a pure function of (world seed × zone × spot), and
  the window burns on raw frame seconds.

## Dials

`HARVEST_CFG`: placement `chance`/`count`, `armRadius`/`armSec`, `foeRadius`,
the `alphabet`, `len`/`window` curves, the `payout` curve and its tier gates.
The payout numbers stay the pass's placeholders (2026-08-15) until blessed;
the consent and the foe reach are hers.
