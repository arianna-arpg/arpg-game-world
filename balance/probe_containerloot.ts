import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { resolveLootTable } from '../src/engine/loot';
import { LOOT_TABLES } from '../src/data/loottables';
import { containerLootChoices, selectContainerLoot, CONTAINER_LOOT } from '../src/data/containerloot';
import { ABILITY_ESSENCE_CFG } from '../src/data/essences';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { START_ZONE } from '../src/data/zones';
import type { Chest } from '../src/engine/world';
seedGlobalRandom(82211);
const w = makeSimWorld('warrior', 82211);
const open = (chest: Chest) => (w as unknown as { openChest(c: Chest): void }).openChest(chest);
const chest = (): Chest => ({ pos: { x: 300, y: 300 }, kind: 'timed', mimic: false, opened: false, lockTime: 0, maxLock: 1 });
const base = { ...w.zone, biome: undefined, bounty: 1, containerLootTags: undefined, containerLoot: undefined };
const lists = containerLootChoices('chest', base);
assert(lists.length >= 3);
assert(containerLootChoices('chest', { ...base, biome: 'grove' }).some(x => x.table === 'chest_forager'));
assert(containerLootChoices('gemCache', { ...base, bounty: 2 }).some(x => x.table === 'cache_faceted'));
assert(containerLootChoices('gemCache', { ...base, containerLootTags: ['remembering'] }).some(x => x.table === 'cache_faceted'));
assert.equal(selectContainerLoot('chest', { ...base, containerLoot: { chest: 'world_gear' } }), 'world_gear');
for (const rows of Object.values(CONTAINER_LOOT.pools)) for (const row of rows) assert(LOOT_TABLES[row.table]);
for (const rule of CONTAINER_LOOT.rules) for (const rows of Object.values(rule.add)) for (const row of rows!) assert(LOOT_TABLES[row.table]);
console.log('PASS multiple lists, biome/richness/modifier rules, explicit overrides, registry references');
const rng = new Rng(7324);
let currency = 0, memories = 0, direct = 0;
for (let i = 0; i < 2000; i++) {
  const rewards = resolveLootTable('cache_memory', { ilvl: 1, rng: () => rng.next(), sourceId: 'gem_cache' });
  assert.equal(rewards.length, 2);
  const packet = rewards.find(r => r.kind === 'memoryEssence');
  assert(packet?.kind === 'memoryEssence' && packet.tier === 1 && packet.count >= 4 && packet.count <= 6);
  currency += packet.count;
  memories += rewards.filter(r => r.kind === 'item' && !!r.item.mem).length;
  direct += rewards.filter(r => r.kind === 'gem').length;
}
assert(currency/2000 > 4.8 && currency/2000 < 5.2);
assert(memories/2000 > .6 && memories/2000 < .7);
assert(direct/2000 > .1 && direct/2000 < .2);
for (const level of [1,5,6,10,11,15,16,30]) {
  for (let i=0;i<100;i++) for (const reward of resolveLootTable('cache_memory', { ilvl: level, rng: () => rng.next() })) {
    if (reward.kind === 'memoryEssence') assert(level >= ABILITY_ESSENCE_CFG.floors[reward.tier-1]);
  }
}
console.log(`PASS cache yield: ${(currency/2000).toFixed(2)} Memory Essence/cache; ${(memories/20).toFixed(1)}% Memory, ${(direct/20).toFixed(1)}% direct gem; all level floors`);
// An authored table exercises every result through the real container mint.
LOOT_TABLES.qa_container = { id: 'qa_container', rolls: [{ count: 1, entries: [{ weight: 1, kind: 'table', table: 'qa_container_inner' }] }] };
LOOT_TABLES.qa_container_inner = { id: 'qa_container_inner', rolls: [
  { count: 1, entries: [{ weight: 1, kind: 'item' }] },
  { count: 1, entries: [{ weight: 1, kind: 'gem' }] },
  { count: 1, entries: [{ weight: 1, kind: 'memory', memoryKind: 'preformed' }] },
  { count: 1, entries: [{ weight: 1, kind: 'memoryEssence', count: 5 }] },
  { count: 1, entries: [{ weight: 1, kind: 'essence' }] },
  { count: 1, entries: [{ weight: 1, kind: 'vestige' }] },
] };
w.zone.containerLoot = { chest: 'qa_container', gemCache: 'qa_container' };
w.drops=[];const c=chest();w.chests=[c];open(c);
assert(w.drops.some(d=>d.item.kind==='gear' && d.item.item.mem));
for(const kind of ['gear','skill','abilityEssence','essence','vestige']) assert(w.drops.some(d=>d.item.kind===kind),kind);
assert(w.drops.some(d=>d.item.kind==='gear' && d.item.item.mem?.[0]?.d==='chest'));
const n=w.drops.length;open(c);assert.equal(w.drops.length,n);
const cache=w.createMonster('gem_cache',1,'enemy');cache.fromZoneGen=true;cache.pos={x:400,y:300};w.actors.push(cache);w.kill(cache,false,w.player);
assert.equal(w.drops.length,n*2);w.kill(cache,false,w.player);assert.equal(w.drops.length,n*2);
console.log('PASS nested mixed table pays through chests and real cache death exactly once');
const replica=makeSimWorld('warrior',82212);applySnapshot(replica,JSON.parse(JSON.stringify(serializeSnapshot(w,1))));
assert.equal(replica.drops.length,w.drops.length);
assert(replica.drops.some(d=>d.item.kind==='gear' && d.item.item.baseId==='preformed_memory'));
assert(replica.drops.some(d=>d.item.kind==='abilityEssence' && d.item.count===5));
const source=w.zone.id;w.loadZone(START_ZONE);w.loadZone(source);
assert(w.chests[0]?.opened);assert(!w.actors.some(a=>a.defId==='gem_cache' && !a.dead));assert.equal(w.drops.length,n*2);
w.zone.spoils='none';const sealed=chest();open(sealed);assert.equal(w.drops.length,n*2);
console.log('PASS co-op packets, persistent spent containers and sealed-ground refusal');
delete LOOT_TABLES.qa_container;delete LOOT_TABLES.qa_container_inner;
