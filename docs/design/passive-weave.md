# Interwoven passive disciplines

This additive expansion lets players cross between established routes while
buying native mechanics through supporting small passives. It builds on
`passive-investment.md`; that document's 1,546-node counts describe the previous
checkpoint. No existing node, edge, allocation or option is removed here.

## Scope and travel

The main Star now contains **1,888 nodes**: 1,315 small passives, 343 notables,
32 choice nodes, and 198 starts, attributes and keystones. Vocations and the
separate realms are excluded from these counts.

The addition is 72 notables and 270 small passives:

- Each notable has a small entry and two alternative small feeders. The
  feeders connect to each other and to the notable. Entry + either feeder +
  notable costs three points; each small grants an immediate benefit.
- Each of the 72 entries connects to **two existing travel junctions**. Players
  can cross the entry to reach another route without buying its specialty.
- Another 54 small passives bridge existing junctions. These and the entries
  form **126 new connections between routes**, using 215 distinct old junctions.
- All new external connections attach to travel nodes, never to old capstones
  or their feeders. Old investment costs therefore remain intact.
- Removing the new nodes reconstructs the old walking graph. Compared with
  that graph, every new connection shortens an existing walk; 22 of the 36
  unordered starting-position pairs become shorter, saving 42 points in total
  across those pairwise shortest paths. This is a travel metric, not free
  character points or a count of viable builds.
- Physical forks remain within two allocations, with optional menus either
  present or excluded. The first two allocations retain the previous opening
  routes. Taking already-explored branches can naturally exhaust alternatives.

All new node discs are separated from existing nodes and connection strokes;
new strokes avoid unrelated node discs. Stroke crossings alone are not
junctions. Search now dims unrelated strokes along with unrelated nodes,
keeping the entry routes of a matching cluster readable. Clearing the query
restores normal line appearance.

## Eighteen disciplines

Each discipline offers four major powers and three thematic small-passive
templates. The two placement homes are authoring hints, never class locks.

| Discipline | Build directions |
|---|---|
| The Long Step | Low-mana movement replenishes poise; walked-distance payoffs; mobile insight; skill-charge recovery |
| The Unmoving Eye | Stationary healing window; partial insight inversion; three-second siege stance; channel retaliation |
| The Unfair Angle | Airborne-target ward; unaware-target ailments; punishing casters; mana from fleeing enemies |
| Bodies as Weapons | Fury from terrain collisions; uprooting; grip versus attack speed; throwing airborne bodies |
| Unlikely Trajectories | Wet-target mana; terrain ricochets; slow homing shots; crowd-gated piercing |
| The Last Cartridge | Reload-to-hit preparation; final-round damage; larger magazines; reload speed under pressure |
| The Traveling Apothecary | Life-orb ward; reflex flasks; primed pours; surge/settle tradeoffs |
| The Patient Wound | Bleed-to-shield recovery; ailment criticals; hit damage traded into ailments; partial ignite detonation |
| Borrowed Suffering | Fire-hit memory; benefits from multiple self ailments; recuperation; missing-shield damage |
| Glass and Breath | Recharge cleansing; shield-to-poise trade; full/recharging shield stances; ward distilled into shield |
| The Shelter Line | Block-to-endurance; guard healing; healing after kills; overheal absorption |
| Voice and Dominion | Warcry-to-song preparation; reserved-mana damage; Verse thresholds; mana-to-ward pumping |
| The Useful Dead | Corpse-cast summon recovery; corpse batches; Wakeflame thresholds; summons raised under pressure |
| A Few Trusted Hands | Carried summon hits replenish their keeper; defensive formations; summon-scaled endurance; life-derived thorns |
| Fight beside the Machine | Trap-to-melee preparation; tether specialization; planted construct economy; siege and monster-part damage |
| Blade and Formula | Spell-to-attack preparation; mana-derived lightning attacks; varied sequences; mimic and possession utility |
| Calculated Fortune | Noncritical-hit preparation; wider lucky dice; additional proc depth; Fury thresholds |
| The World Is a Weapon | Brittle-terrain healing; light/soul conservation; trample and ply damage; wet-target lightning |

The 18 event powers use the existing 95% chance cap, internal cooldowns, owner
and victim gates, and shared depth falloff. Their numbers and restrictions are
in descriptions. Graft grants are absent. Existing event, modifier, gauge,
stat-link, trade, conduit and skill-tag systems execute every payload; no
combat code branches on a passive's id.

Investment costs and explicit tradeoffs constrain the larger rewards. Threshold
powers switch off below their threshold, and temporary preparations only spend
on matching hits. Duplicate proc grants share the same proc clock. Reusable
modifier stacking still follows the ordinary engine rules.

## Shared fixes and authoring

`src/data/passiveWeave.ts` owns the reusable definitions. Explicit node rows in
`src/data/passives.ts` own the shipped geometry and links. The one-shot
`scripts/author-passive-weave.ts` records deterministic placement and refuses to
overwrite an already-authored expansion. Subsequent edits use the visual editor.

The visual editor now emits `gaugeGateMod` when a modifier carries `gaugeAt`.
Previously it flattened threshold modifiers into per-count scaling, silently
changing their behavior on save. The new registry import survives serialization
alongside the earlier passive registries. Actual editor output is bundled and
compared with source: all 1,072 route/crossroads/investment/weave rows preserve
their full payloads and adjacency.

Continuous ward exposed an existing loss in `Actor.updateTimers`: each frame
discarded any ward below 0.5, even when recurring gains exceeded decay. The
cutoff now discards only a machine-epsilon remainder. The existing percentage
decay and minimum two ward per second still apply. Quiet Dominion spends 1.5
mana per second at 2:1, keeps 70% of unreserved mana, and therefore builds ward
against that minimum decay instead of donating its entire output to rounding.
Tests at 30/60/120 Hz verify the same net accumulation.

Run/account compatibility remains **3/1**. This expansion does not require
another character reset.

## Verification

- `npm run check` and `npm run build`.
- `npm run probe -- passiveweave`: 495 checks. Includes all 72 capstones from
  both entry directions through both feeders using real allocations, topology
  and geometry, every new event's effect/gates/cooldown/removal, preparation
  consumption, actual summon hits and orb pickups, conduit flow/floors/removal,
  threshold switching, frame-rate checks, save and co-op reconstruction.
- Existing `passiveinvestment`, `passiveroutes` and `passivecrossroads` probes
  continue to verify earlier content. The old investment count assertion is
  explicitly scoped to its original nodes.
- All 255 default green probes pass; seven slow probes and three excluded
  probes are outside that default gate.
- Hidden `balance/passive-routes-ui.cjs` checks real clicks, cross-route travel,
  search lines, threshold descriptions, mastery menus and the editor round trip
  at 1400x1000 and 1000x720, using isolated test saves.
- The 25 smoke episodes have no deaths or target-band flags. Opening warrior
  and magician outcomes match the preceding pass. Level-20 sprinkler/duelist
  mean outputs are 70.40/298.23 DPS; changed automatic routes can change these
  references. Reference builds and bands were not adjusted.

These checks establish functioning mechanics and routes. Late-game stacking,
specialized human rotations and the relative strength of all 72 investments
still need comparative balance work and playtesting.
