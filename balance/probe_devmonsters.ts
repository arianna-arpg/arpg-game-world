import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { DEV_MONSTER_SPAWN, spawnDevMonsters } from '../src/dev/monsterSpawn';
import { MONSTERS } from '../src/data/monsters';
import { RARITY_DEFS, type MonsterRarity } from '../src/engine/rarity';

const restore = seedGlobalRandom(72044);
try {
  const w = makeSimWorld('warrior', 72044);
  const request = { id: 'zombie', level: 7, rarity: 'normal' as MonsterRarity, count: 1 };
  for (const rarity of Object.keys(RARITY_DEFS) as MonsterRarity[]) {
    w.actors = [w.player];
    const native = w.createMonster(request.id, request.level, 'enemy');
    const result = spawnDevMonsters(w, { ...request, rarity });
    assert.equal(result.actors.length, 1, result.message);
    const a = result.actors[0];
    assert(w.actors.includes(a));
    assert.equal(a.defId, request.id); assert.equal(a.level, request.level);
    assert.equal(a.team, 'enemy'); assert.equal(a.rarity ?? 'normal', rarity);
    assert.equal(a.radius, native.radius * RARITY_DEFS[rarity].sizeMul);
    assert.deepEqual(a.skills.map(s => s?.def.id), native.skills.map(s => s?.def.id));
    if (rarity !== 'normal') assert(a.sheet.getSourceMods('rarity')?.length);
    assert(!w.pointInSolid(a.pos.x, a.pos.y, a.radius, a.tier));
  }
  w.actors = [w.player];
  const batch = spawnDevMonsters(w, { ...request, rarity: 'crowned', count: 5 });
  assert.equal(batch.actors.length, 5, batch.message);
  for (const a of batch.actors) for (const b of w.actors) if (a !== b) {
    assert(Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) >= a.radius + b.radius + DEV_MONSTER_SPAWN.gap);
  }
  console.log('PASS all authored rarity tiers, selected level, native skills/modifiers and non-overlapping batches');

  const before = [...w.actors];
  for (const invalid of [{ id: 'missing' }, { rarity: 'missing' }, { level: NaN }, { level: 0 }, { level: 2.5 },
    { level: DEV_MONSTER_SPAWN.maxLevel + 1 }, { count: 0 }, { count: DEV_MONSTER_SPAWN.maxCount + 1 }]) {
    assert.equal(spawnDevMonsters(w, { ...request, ...invalid } as typeof request).actors.length, 0);
    assert.deepEqual(w.actors, before);
  }
  w.clientActionHook = () => {};
  assert.equal(spawnDevMonsters(w, request).actors.length, 0); w.clientActionHook = undefined;
  w.player.dead = true;
  assert.equal(spawnDevMonsters(w, request).actors.length, 0); w.player.dead = false;
  w.player.downed = true;
  assert.equal(spawnDevMonsters(w, request).actors.length, 0); w.player.downed = false;
  assert.deepEqual(w.actors, before);
  console.log('PASS invalid input and unavailable/remote run guards leave the actor roster unchanged');

  // A solid covering all nearby ground must refuse, not accept findFreeSpot's fallback.
  const blocked = makeSimWorld('warrior', 72045);
  blocked.doodads.push({ kind: 'rock', pos: { ...blocked.player.pos }, radius: 100000 });
  blocked.markDoodadsChanged();
  assert.equal(spawnDevMonsters(blocked, request).actors.length, 0);
  assert.equal(blocked.actors.length, 1);
  // The same ground-floor rock is irrelevant to a body on another story.
  blocked.player.tier = 1;
  const field = blocked.pathField;
  blocked.pathField = () => null; // isolate story-specific solid/overlap rules from arena navigation
  assert.equal(spawnDevMonsters(blocked, request).actors[0]?.tier, 1);
  blocked.pathField = field;
  console.log('PASS blocked-ground refusal and placement on the player’s own story');

  const id = 'custom_dev_probe';
  MONSTERS[id] = { ...MONSTERS.zombie, id, name: 'Workshop test monster' };
  try {
    w.actors = [w.player];
    assert.equal(spawnDevMonsters(w, { ...request, id }).actors[0]?.defId, id);
  } finally { delete MONSTERS[id]; }
  console.log('PASS live registry additions spawn through the same pipeline');
} finally { restore(); }
