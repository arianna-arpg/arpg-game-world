# Container loot and appearance

Chests and gem caches use the existing nestable `LOOT_TABLES` resolver. Its
entries now also support `memory` (rough/preformed, count and optional source),
`memoryEssence` (packet count), and `essence` (the normal tint/quantity curve).
The world uses one `mintLootResult` dispatcher for containers, monsters and
existing table-paying events. Account-gated gem selection, item rarity, tier
floors, ground-spoils restrictions and ordinary pickup rules remain in force.

## Selecting a list

`data/containerloot.ts` owns weighted default pools and additive context rules.
A chest rolls one traveller, armory or reliquary list; woodland biomes add a
forager list, burial biomes favor reliquaries, and bounty >= 1.5 adds jewelry
and faceted-cache choices. These are changes in composition, not extra rolls.
A modifier can add `ZoneDef.containerLootTags = ['remembering']`; an authored
zone can pin either family with `containerLoot: { chest: 'table_id',
gemCache: 'table_id' }`. Rules can match biomes, tilesets, tags and minimum
bounty; multiple specified conditions must hold. Matching rules add weights.
`MonsterDef.containerLoot` routes any future container actor through this
policy; its own `loot` override takes precedence.

Chest lists yield equipment, gems, Memories, crafting essences and vestiges.
Existing themed chests retain their promised extra piece at the specified
rarity. Mimics still emerge instead of paying the chest list.

## Memory Essence economy

A normal cache guarantees **4–6 Memory Essences**, plus one secondary roll:
55% Rough Memory, 10% Preformed Memory, 15% skill/support, 15% crafting essence,
5% vestige. The faceted list retains the same essence budget and favors
Preformed Memories. Memory quantities are one unit per secondary reward.
A packet draws its tier from the shared level floors (1/6/11/16) and deeper
bias (2.2); shallow caches cannot yield higher bands. Ordinary enemy drops
remain at 2% for a 1–2 packet, down from 3%; existing bounty scaling remains.
At baseline this is 0.03 essence per credited kill, versus 5 per cache on
average. At the existing ambient 0.65 caches/zone, caches add about 3.25
per zone before pocket/lair caches or refining Memories. These are initial
playtest values, not a claim about every zone's total yield. Quantities,
weights and enemy chance remain data dials.

Memory seeds and provenance are sealed at mint. Chest finds name their source
as Chest; cache finds name the cache; ordinary table finds use Found in the
world unless a source is supplied. Recalls retain account gating. Co-op uses
the existing item render shells; the host owns actual Memory units and pickup.
Opened chests and dead caches persist until a deliberate zone reset. A chest's
open method also refuses a second payout directly.

## Appearance

`render/vis/containers.ts` paints material-shaded timber coffers with brass
bindings, bevelled lids and dark interiors. Chains convey a sealed objective;
a lit seam conveys availability; the lid opens and stays raised. Lock-picking
uses the existing dwell ring, without generic captions. Gem caches use a
separate stone socket and fractured crystal silhouette via the `memoryCache`
part and `memory_cache` look, keeping the normal sprite baker and co-op look
identity. The older wooden `gem_cache` look remains available to harbor crates.

Verification: `probe_containerloot` measures 2,000 seeded cache rolls, checks
level floors/context rules, exercises every result through real chests and
cache deaths, and checks one-shot, re-entry, sealed-ground and co-op behavior.
The existing town-portal probe also covers save/load and explicit resets.
