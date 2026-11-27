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
- A reachable node shows a broken ring while combat blocks a stationary
  player. A visible armed foe within 190 units can interrupt, as can a
  visible foe targeting that player within 640 units. Personal hostile
  contact and incoming damage take 1.25 seconds to settle. Once the player
  is idle and safe, the ring fills over 0.9 seconds, even if they stood
  there throughout the fight. Leaving reach, acting or renewed danger
  clears partial progress. Press mode checks the same conditions on pickup.
- **THE PAUSE LAW**: arming engages the `harvest` TimeHold surface outside
  menu mode under the pause menu's own solo-only policy. In unpaused co-op,
  returning danger releases the controls and settles the steps already earned.
- **THE INPUT LAW**: a seat mid-rite speaks to the rite alone — movement
  swallowed, slot presses become symbols. And what the rite took stays
  taken — **THE SPENT PRESS** (`docs/engine/input.md`, `SPENT_PRESS_CFG`):
  the closing symbol's still-held key, a held miss, a hold that predates the
  rite — none reach the cast lane when the rite lifts; the button must come
  up, or go down afresh (the press that finished the rite no longer drinks
  the flask bound to it).
- **THE ANTI-MEMORIZE LAW**: the pause toggle refuses while the hold stands,
  every node's sequence is a pure function of (world seed × zone × spot), and
  the window burns on raw frame seconds.

## Dials

`HARVEST_CFG`: placement `chance`/`count`, `armRadius`/`armSec`, `calmSec`, `foeRadius`/`engagedRadius`,
the `alphabet`, `len`/`window` curves, the `payout` curve and its tier gates.
The payout numbers stay the pass's placeholders (2026-08-15) until blessed;
the consent and the foe reach are hers.
