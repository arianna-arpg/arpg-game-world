# Purchased Pockets & the Form Vocabulary

The ground behind a Holdfast toll is a **purchased pocket**: a fresh zone
minted through the ordinary placement primitive (`placeZoneAt` +
`ZoneSpec.pocket`) whose ONLY road leads back through the gate that sold it —
no frontiers, no weave, never an anchor or link target, and **world events
never land on it** (`zonePolicy.eventTargetable`). What that ground IS — its
size, its ask, its loot — is the **pocket form**, and forms are pure data.

## Why forms exist

Before forms, a pocket was always a full-size mint. A carve-layout roll
(dungeon / mycelia faces walk ~10–25 % of their bounding rect) minted what
*read* as a tiny cavern while still **budgeting spawns for the whole rect**,
and the placement samplers' fallbacks dumped everything they couldn't seat
onto the entry — the one portal the buyer arrives by. Paying a toll could buy
you a death-ball. A form makes the small pocket **deliberate** (small budget,
big loot) and the large pocket **honest** (a full zone, one road home): the
toll always buys something legible, and never a death sentence.

## The registry — `src/data/pocketForms.ts`

`PocketFormDef` knobs (every one is data):

| knob | what it drives | where it lands |
| --- | --- | --- |
| `pitch` | the parley/zone-info sell — the explicit WHY | `World.holdfastPocketPitch` (ONE resolver: keeper prompt + zone-info panel) |
| `nameWord` | map-name suffix ("Sunken Grove **Hoard**") | minted `ZoneDef.name` |
| `size` | footprint band (px) | `ZoneSpec.sizeBand` → the same footprint roller, same draw count |
| `objective` | authored ask (wins outright) | `ZoneSpec.objective` |
| `objectivePool` | tileset-roll filter when no authored ask | `ZoneSpec.objectivePool` — an emptied pool degrades to `clear` |
| `packDensity` | ambient pack budget scale | `ZoneDef.packDensity` |
| `bounty` | kill-drop gate floor | `ZoneDef.bounty` (maxes with the guardian's) |
| `features` | layout row floors (a cave mouth, a geyser) | merged with the guardian's rows |
| `caches` | gem-cache litter band at load | load-time bodies on POIs |
| `chest` | a guaranteed chest: `'objective'` (staked on the zone's ask) or `'timed'` | load-time, beside the ordinary chest rolls |
| `ambientEvents` | may patrols/caravans/sieges stage here | the ambient-event roll gate |
| `factionWar` | may the mint roll a war brawl | `ZoneSpec.noFactionWar` |

Stock forms: **`delve`** (default — full footprint, full population, the
objective pool bans `waves`/`escape`: arena modes that spawn at the player's
back or ask for a way onward) and **`hoard`** (a cave-scale hollow, `clear`
with a light guard, tripled bounty, 2–3 caches, an objective-staked chest,
no patrols, no wars). A third shape is one more `registerPocketForm` row.

## Who rolls which form

`HoldfastDef.pocket.forms` weights registry ids per guardian, and a row may
layer per-shape enrichment (`bounty`, `features`) over the form:

```ts
pocket: {
  forms: [
    { form: 'delve', weight: 2, features: [{ kind: 'cave', min: 1 }] },
    { form: 'hoard', weight: 1, bounty: 3.5 },
  ],
  bounty: 2.75,           // the flat floor, every shape
}
```

The roll is seeded on the run + the lock id
(`World.rollPocketForm`) — the same gate always sells the same ground — and
the outcome bakes onto the def as `ZoneDef.pocketForm` (serializes with the
graph; an older save or unknown id degrades to the default delve).
Validation: `validateHoldfast` resolves rows through
`RegistryLookups.pocketForm`; `validateContent` sweeps the registry itself
(pool kinds, band sanity, the default's existence).

## The "never a death trap" contract (engine-side, all pockets)

- **Commensurate budget** — `spawnPacks` measures a pocket's WALKABLE carve
  (never the bounding rect) and swaps the 0.8 area floor for
  `POCKET_CFG.packAreaFloor`: a small hollow holds a small guard.
- **Arrival grace** — fresh gens sweep absolute-seated hostiles (camps,
  garrisons, POI bodies) off the entry ring (`POCKET_CFG.arrivalGrace`;
  `World.enforceArrivalGrace`). Remembered re-entries are exempt: bodies the
  player led to the door are history, not generation.
- **Honest samplers** — `spawnPoint`/`farPoint` degrade to the farthest
  walkable (and entry-reachable, under plan structures) stand
  (`World.farthestStand`) when cramped ground defeats their distance
  contracts — never to the entry stack or a center snap. This one is global:
  every cramped zone benefits.
- **No event squatting** — `eventTargetable` refuses pockets structurally,
  and the pre-policy chains (roving events, hunt targets, necropolis gates)
  carry the same veto.

## The probe

`npx tsx balance/probe_holdfast_pocket.ts [seeds]` — the standing contract
probe on the real engine: form baked + honored (footprint band, objective
policy, litter, bounty, pitch), the cul-de-sac single road, commensurate
population vs walkable ground, arrival grace, sampler grace floors,
form-roll determinism — with dead-rig detection (a sweep that never saw a
hoard, a delve, and a walled carve proves nothing). Run it after touching
pockets, holdfast defs, the population budget, or the placement samplers.
