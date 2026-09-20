import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MAGIC_PACKS, MAGIC_PACK_CFG } from '../src/data/magicPacks';
import { magicPackErrors, magicPackPool, magicPackSize, rollMagicPack, readMagicPack, updateMagicPacks, magicPackLinks } from '../src/engine/magicPacks';
import { RARITY_DEFS, rarityMods, rollRarity, type MonsterRarity } from '../src/engine/rarity';
import { MONSTERS } from '../src/data/monsters';
import { START_ZONE, type ZoneDef } from '../src/data/zones';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import type { World } from '../src/engine/world';

bootSimEngine();
seedGlobalRandom(67129);
let seq = 0;
const world = (): World => makeSimWorld('warrior', 67129 + seq++);
const cohort = (w: World, n = 3, level = 12) => Array.from({ length: n }, (_, i) => {
  const a = w.createMonster('skeleton_warrior', level, 'enemy');
  a.pos = { x: 300 + i * 35, y: 300 }; a.fromZoneGen = true;
  w.actors.push(a); return a;
});
const check = (label: string, test: () => void): void => { test(); console.log(`PASS ${label}`); };
const near = (a: number, b: number): void => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

check('registry, progression boundaries, content filters and bounded difficulty', () => {
  assert.deepEqual(magicPackErrors(), []);
  assert.deepEqual(magicPackPool(1).map(d => d.id).sort(), ['footfall', 'scattershock', 'wardbound']);
  assert.equal(magicPackPool(2).length, 5);
  assert.equal(magicPackPool(3).length, 6);
  for (const d of Object.values(MAGIC_PACKS)) {
    assert.ok(!magicPackPool(d.minLevel - 1).includes(d));
    assert.ok(magicPackPool(d.minLevel).includes(d));
    assert.ok(magicPackPool(99).includes(d));
  }
  assert.ok(!magicPackPool(5).some(d => d.id === 'chorus'));
  assert.ok(magicPackPool(6).some(d => d.id === 'chorus'));
  assert.ok(!magicPackPool(11).some(d => d.id === 'vendetta'));
  assert.ok(magicPackPool(12).some(d => d.id === 'vendetta'));
  assert.equal(magicPackPool(99, false).length, 0);
  assert.equal(rollMagicPack(5, { mechanics: ['vendetta'] }), undefined);
  assert.equal(rollMagicPack(12, { mechanics: ['vendetta'] })?.id, 'vendetta');
  assert.equal(rollMagicPack(12, { mechanics: ['chorus'] }, Math.random, 2), undefined);
  for (const row of MAGIC_PACK_CFG.sizeByLevel) {
    assert.equal(magicPackSize(row.level, undefined, () => 0), row.size[0]);
    assert.equal(magicPackSize(row.level, undefined, () => 0.99999), row.size[1]);
  }
  assert.equal(magicPackSize(99, { sizeMul: 100 }), MAGIC_PACK_CFG.maxMembers);
  assert.equal(magicPackSize(1, { sizeMul: 0 }), 2);
  assert.equal(readMagicPack({ id: 1, mechanic: '__proto__', size: 3, fallen: 0 }), undefined);
  assert.equal(readMagicPack({ id: 1, mechanic: 'wardbound', size: 3, fallen: 3 }), undefined);
});

check('rarity budget moves magic opportunities to normal and the seeded roll follows it', () => {
  const total = ['normal', 'magic', 'rare', 'champion'].reduce((n, id) => n + RARITY_DEFS[id as MonsterRarity].weight, 0);
  assert.equal(total, 131); assert.equal(RARITY_DEFS.magic.weight, 12);
  assert.equal(RARITY_DEFS.rare.weight, 7); assert.equal(RARITY_DEFS.champion.weight, 2);
  seedGlobalRandom(210921);
  const counts = { normal: 0, magic: 0, rare: 0, champion: 0, crowned: 0 };
  for (let i = 0; i < 20000; i++) counts[rollRarity(false)]++;
  for (const id of ['normal', 'magic', 'rare', 'champion'] as const)
    assert.ok(Math.abs(counts[id] / 20000 - RARITY_DEFS[id].weight / total) < 0.01, id);
  for (let i = 0; i < 1000; i++) assert.notEqual(rollRarity(false, false), 'magic');
});

check('rally buffs only followers near their original bearer and ends permanently on leader loss', () => {
  const w = world(), [a, b, c] = cohort(w, 3, 2);
  const damage = b.sheet.get('damage');
  assert.ok(w.promoteMagicPack([a, b, c], 'rallyheart'));
  near(a.sheet.get('damageTaken'), 1.3);
  assert.equal(b.magicPackFrom, a); assert.ok(b.sheet.get('damage') > damage * 1.2);
  const boosted = b.sheet.get('damage');
  c.pos = { x: 1000, y: 300 }; w.refreshMagicPacks(); assert.ok(c.sheet.get('damage') < boosted);
  b.tier++; w.refreshMagicPacks(); assert.equal(b.magicPackPower, 0);
  b.tier--; b.faction = 'foreign'; w.refreshMagicPacks(); assert.equal(b.magicPackPower, 0);
  b.faction = a.faction; b.owner = w.player; w.refreshMagicPacks(); assert.equal(b.magicPackPower, 0);
  b.owner = undefined; w.refreshMagicPacks(); near(b.sheet.get('damage'), boosted);
  const remote = cohort(w, 2, 2); w.promoteMagicPack(remote, 'rallyheart');
  w.kill(a, false, w.player);
  assert.ok(b.magicPack!.runtime!.retired); assert.equal(b.magicPackFrom, undefined);
  assert.equal(b.magicPackPower, 0); assert.equal(c.magicPackPower, 0);
  w.refreshMagicPacks(20); assert.equal(b.magicPackRole, undefined);
  assert.ok(remote[1].magicPackPower > 0); // nearby foreign cohort cannot replace its leader
});

check('isolation speed uses a maximum-neighbor gate and clears on crowding, claim or promotion', () => {
  const w = world(), [a, b] = cohort(w, 2, 3), base = a.sheet.get('moveSpeed');
  w.promoteMagicPack([a, b], 'skirmishers'); near(a.sheet.get('moveSpeed'), base);
  b.pos.x = a.pos.x + 171; w.refreshMagicPacks();
  assert.ok(a.sheet.get('moveSpeed') > base); assert.equal(a.magicPackPower, 1);
  assert.ok(a.sheet.getSourceMods('magicPack:skirmishers:0'));
  b.pos.x = a.pos.x + 170; w.refreshMagicPacks(); near(a.sheet.get('moveSpeed'), base);
  b.tier++; w.refreshMagicPacks(); assert.equal(a.magicPackPower, 1);
  b.tier--; b.owner = w.player; w.refreshMagicPacks(); assert.equal(a.magicPackPower, 1);
  assert.equal(b.magicPackPower, 0); near(b.sheet.get('moveSpeed'), base);
  const foreign = cohort(w, 2, 3); w.promoteMagicPack(foreign, 'skirmishers');
  assert.equal(a.magicPackPower, 1);
  w.promoteMonster(a, 'rare'); assert.ok(!a.sheet.getSourceMods('magicPack:skirmishers:0'));
});

check('real ambient spawner promotes the whole cohort; rares retain one elite leader', () => {
  const weights = Object.fromEntries(Object.entries(RARITY_DEFS).map(([id, d]) => [id, d.weight]));
  try {
    for (const tier of ['magic', 'rare'] as const) {
      for (const [id, d] of Object.entries(RARITY_DEFS)) d.weight = id === tier ? 1 : 0;
      const w = world();
      const z: ZoneDef = { ...w.zone, level: 12, packs: { count: [1, 1], size: [3, 3], table: [{ id: 'skeleton_warrior', weight: 1 }] } };
      (w as unknown as { spawnPacks(z: ZoneDef): void }).spawnPacks(z);
      const bodies = w.actors.filter(a => a.team === 'enemy');
      if (tier === 'magic') {
        assert.ok(bodies.length >= 4 && bodies.length <= 5);
        assert.ok(bodies.every(a => a.rarity === 'magic' && a.magicPack));
        assert.equal(new Set(bodies.map(a => a.magicPack!.id)).size, 1);
        assert.ok(bodies.every(a => a.sheet.getSourceMods('rarity')!.length === 2));
      } else {
        assert.equal(bodies.filter(a => a.rarity === 'rare').length, 1);
        assert.ok(bodies.every(a => !a.magicPack));
        assert.ok(rarityMods('rare').length > 2);
      }
    }
  } finally { for (const [id, n] of Object.entries(weights)) RARITY_DEFS[id as MonsterRarity].weight = n; }
});

check('proximity is pack-, faction-, team- and story-scoped; ownership removes buffs', () => {
  const w = world(); const [a, b] = cohort(w, 2, 1);
  assert.ok(w.promoteMagicPack([a, b], 'wardbound'));
  assert.equal(w.promoteMagicPack([a, b], 'wardbound'), false);
  near(a.sheet.get('damageTaken'), 0.82);
  assert.equal(magicPackLinks(w.actors, a.pos).length, 2);
  b.pos.x = 1000; updateMagicPacks(w.actors);
  near(a.sheet.get('damageTaken'), 1);
  assert.equal(magicPackLinks(w.actors, a.pos).length, 0);
  const c = cohort(w, 2, 1); w.promoteMagicPack(c, 'wardbound');
  updateMagicPacks(w.actors); near(a.sheet.get('damageTaken'), 1);
  b.pos = { ...a.pos }; b.tier = 1; updateMagicPacks(w.actors); near(a.sheet.get('damageTaken'), 1);
  b.tier = a.tier; b.faction = 'other'; updateMagicPacks(w.actors); near(a.sheet.get('damageTaken'), 1);
  b.faction = a.faction; b.team = 'player'; updateMagicPacks(w.actors); near(a.sheet.get('damageTaken'), 1);
  b.team = 'enemy'; b.owner = w.player; updateMagicPacks(w.actors); near(b.sheet.get('damageTaken'), 1);
  b.owner = undefined; updateMagicPacks(w.actors); near(a.sheet.get('damageTaken'), 0.82);
  const life = b.life; w.update(1 / 60); assert.ok(b.life <= life);
  assert.equal(w.promoteMagicPack([cohort(w, 1)[0]], 'wardbound'), false);
  assert.equal(w.promoteMagicPack(cohort(w, 2, 5), 'chorus'), false);
  assert.equal(w.promoteMagicPack(cohort(w, 2, 12), 'chorus'), false);
  w.promoteMonster(b, 'rare');
  assert.equal(b.magicPack, undefined);
  near(a.sheet.get('damageTaken'), 1); near(b.sheet.get('damageTaken'), 1);
  assert.ok(b.sheet.getSourceMods('rarity')!.length > 2);
});

check('natural pack ceilings and solitary, disabled and unavailable content policies', () => {
  const weights = Object.fromEntries(Object.entries(RARITY_DEFS).map(([id, d]) => [id, d.weight]));
  const pairId = 'probe_magic_pair', soloId = 'probe_magic_solo';
  MONSTERS[pairId] = { ...MONSTERS.skeleton_warrior, id: pairId, packSize: [1, 2] };
  MONSTERS[soloId] = { ...MONSTERS.skeleton_warrior, id: soloId, packSize: [1, 1] };
  try {
    for (const [id, d] of Object.entries(RARITY_DEFS)) d.weight = id === 'magic' ? 1 : 0;
    for (const [id, policy, level, expected] of [
      [pairId, undefined, 20, 2], [soloId, undefined, 20, 0],
      [pairId, false, 20, 0], [pairId, { mechanics: ['vendetta'] }, 5, 0],
      [pairId, { mechanics: ['chorus'] }, 20, 0],
    ] as [string, ZoneDef['magicPacks'], number, number][]) {
      const w = world();
      const z: ZoneDef = { ...w.zone, level, magicPacks: policy,
        packs: { count: [1, 1], size: [3, 3], table: [{ id, weight: 1 }] } };
      (w as unknown as { spawnPacks(z: ZoneDef): void }).spawnPacks(z);
      assert.equal(w.actors.filter(a => a.magicPack).length, expected);
    }
  } finally {
    for (const [id, n] of Object.entries(weights)) RARITY_DEFS[id as MonsterRarity].weight = n;
    delete MONSTERS[pairId]; delete MONSTERS[soloId];
  }
});

check('chorus needs a trio and death immediately breaks its buff and links', () => {
  const w = world(); const members = cohort(w, 3, 6);
  const speed = members[0].sheet.get('attackSpeed');
  assert.ok(w.promoteMagicPack(members, 'chorus'));
  assert.ok(members[0].sheet.get('attackSpeed') > speed);
  w.kill(members[2], false, w.player);
  assert.equal(members[0].magicPackPower, 0);
  near(members[0].sheet.get('attackSpeed'), speed);
  assert.equal(magicPackLinks(w.actors, members[0].pos).length, 0);
});

check('vendetta counts actual original deaths once, caps power, excludes silent retirement', () => {
  const w = world(); const members = cohort(w, 6, 12);
  w.promoteMagicPack(members, 'vendetta');
  const survivor = members[5], before = survivor.sheet.get('damage');
  w.kill(members[0], false, w.player); w.kill(members[0], false, w.player);
  assert.equal(survivor.magicPack!.fallen, 1);
  assert.ok(survivor.sheet.get('damage') > before);
  w.kill(members[1], true); assert.equal(survivor.magicPack!.fallen, 1);
  for (const a of members.slice(2, 5)) w.kill(a, false, w.player);
  assert.equal(survivor.magicPack!.fallen, 4);
  assert.equal(survivor.magicPackPower, 3);
  near(survivor.sheet.getSourceMods('magicPack:vendetta:0')![0].value, 0.36);
});

check('co-op preserves recipe, live supporter and power; omitted state clears pooled shells', () => {
  const host = world(), members = cohort(host, 2, 1);
  host.promoteMagicPack(members, 'wardbound');
  const client = world(); applySnapshot(client, serializeSnapshot(host, 1));
  const remote = client.actors.filter(a => a.magicPack);
  assert.equal(remote.length, 2);
  assert.ok(remote.every(a => a.magicPackFrom && remote.includes(a.magicPackFrom)));
  assert.equal(magicPackLinks(client.actors, members[0].pos).length, 2);
  for (const a of members) a.magicPack = undefined;
  updateMagicPacks(host.actors); applySnapshot(client, serializeSnapshot(host, 2));
  assert.ok(client.actors.every(a => !a.magicPack && !a.magicPackFrom && !a.magicPackPower));
});

check('zone travel and a JSON save preserve casualties, membership, names, health and modifiers', () => {
  const w = world(); w.zone.objective = { kind: 'clear', all: true }; w.visited.add(w.zone.id);
  const origin = w.zone.id, members = cohort(w, 3, 12);
  w.promoteMagicPack(members, 'vendetta'); w.kill(members[0], false, w.player);
  const survivor = members[1]; survivor.life = survivor.maxLife() * 0.5;
  const life = survivor.life, damage = survivor.sheet.get('damage'), name = survivor.name;
  w.loadZone(START_ZONE);
  const saved = JSON.parse(JSON.stringify(w.serializeWorldState()));
  w.loadZone(origin);
  let restored = w.actors.filter(a => a.magicPack);
  assert.equal(restored.length, 2); assert.ok(restored.every(a => a.magicPack!.fallen === 1));
  near(restored[0].life, life); near(restored[0].sheet.get('damage'), damage); assert.equal(restored[0].name, name);
  const resumed = world(); assert.ok(resumed.adoptWorldState(saved)); resumed.loadZone(origin);
  restored = resumed.actors.filter(a => a.magicPack);
  assert.equal(restored.length, 2); assert.equal(new Set(restored.map(a => a.magicPack!.id)).size, 1);
  assert.ok(restored.every(a => a.magicPack!.size === 3 && a.magicPack!.fallen === 1));
  assert.ok(restored.every(a => !a.squadLeader)); // the dead leader is never replaced by travel
  near(restored[0].life, life); near(restored[0].sheet.get('damage'), damage);
  const fresh = cohort(resumed, 2, 12); resumed.promoteMagicPack(fresh, 'vendetta');
  assert.notEqual(fresh[0].magicPack!.id, restored[0].magicPack!.id);
  resumed.kill(restored[0], false, resumed.player);
  assert.equal(restored[1].magicPack!.fallen, 2); assert.equal(fresh[0].magicPack!.fallen, 0);
  resumed.loadZone(START_ZONE); resumed.loadZone(origin);
  assert.equal(resumed.actors.filter(a => a.magicPack && a.squadLeader).length, 1);
});

assert.ok(MONSTERS.skeleton_warrior && MAGIC_PACKS.wardbound);
console.log('PASS magic pack integration');
