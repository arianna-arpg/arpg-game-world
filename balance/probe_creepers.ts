import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { CREEPERS, CREEPER_CFG, creeperCountStat, creeperErrors } from '../src/engine/creeperSpec';
import { SKILLS } from '../src/data/skills';
import { MAGIC_PACKS } from '../src/data/magicPacks';
import { ITEM_BASES } from '../src/data/itembases';
import { forgeItem } from '../src/engine/itemgen';
import { mod, type Modifier } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { START_ZONE } from '../src/data/zones';
import { GridWalkField } from '../src/world/gridWalk';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
const check = (name: string, f: () => void) => { f(); console.log(`PASS ${name}`); };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const stat = creeperCountStat('barrow'), def = CREEPERS.barrow;
const gap = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
function dress(a: Actor) {
  a.sheet.setSource('rig', [mod('life', 'override', 100000), mod('accuracy', 'override', 100000),
    ...['critChance', 'armor', 'evasion', 'blockChance', 'poise', 'insight', 'energyShield', 'endurance'].map(s => mod(s, 'override', 0))]);
  a.fillResources(); a.skills = []; a.casting = null; a.anchored = true;
}
function fixture() {
  const w = makeSimWorld('warrior', 72461); w.actors = [w.player]; w.player.pos = { x: 800, y: 600 }; dress(w.player); return w;
}
function body(w: World, x = 960, y = 600, owner?: Actor) {
  const a = w.createMonster('skeleton_warrior', 12, owner ? owner.team : 'enemy', owner); dress(a);
  a.pos = { x, y }; w.actors.push(a); return a;
}
function grant(a: Actor, count = 1, mods: Modifier[] = []) { a.sheet.setSource('creeper', [mod(stat, 'flat', count), ...mods]); }
function advance(w: World, seconds: number, hz = 60) {
  for (let left = seconds; left > 1e-8; left -= 1 / hz) { const dt = Math.min(left, 1 / hz); w.time += dt; w.refreshCreepers(dt); }
}
function windup(w: World, hz = 60) {
  for (let i = 0; i < hz * 8; i++) {
    advance(w, 1 / hz, hz);
    if (w.creepers.visuals.some(v => v.phase === 'windup')) return w.creepers.visuals.find(v => v.phase === 'windup')!;
  }
  throw Error('never began a warned eruption');
}
check('registry validates; ordinary world tick creates a carried follower without a minion actor', () => {
  const w = fixture(); assert.deepEqual(creeperErrors(id => SKILLS[id]?.delivery.type), []);
  assert.ok(Object.values(MAGIC_PACKS).every(p => !JSON.stringify(p).includes('creeperCount_')));
  grant(w.player); const n = w.actors.length; w.update(1 / 60);
  assert.equal(w.actors.length, n); assert.equal(w.creepers.visuals.length, 1);
});
check('wandering is deterministic, irregular, bounded and separate from combat randomness', () => {
  const sample = () => {
    const w = fixture(); grant(w.player, 3); const points: number[][] = [];
    for (let i = 0; i < 12; i++) {
      advance(w, 0.5); const v = w.creepers.visuals;
      assert.equal(v.length, 3); assert.ok(v.every(c => gap(c, w.player.pos) <= def.wander + 1));
      assert.ok(v.every(c => c.trail.length <= CREEPER_CFG.maxTrail)); points.push(v.map(c => c.x));
    }
    assert.ok(new Set(points.flat().map(x => Math.round(x))).size > 15); return points;
  };
  assert.deepEqual(sample(), sample());
  const w = fixture(); grant(w.player); seedGlobalRandom(321); const expected = Math.random();
  seedGlobalRandom(321); advance(w, 3); near(Math.random(), expected);
});
check('pursuit and full eruption warning work at 30/60/120 Hz; dodging the mark works', () => {
  for (const hz of [30, 60, 120]) {
    const w = fixture(), e = body(w); grant(w.player); const life = e.life;
    const mark = windup(w, hz); near(mark.progress, 0); near(e.life, life);
    advance(w, def.windup - 0.04, hz); near(e.life, life);
    e.pos.y += 100; advance(w, 0.08, hz); near(e.life, life);
    assert.ok(w.creepers.visuals.some(v => v.phase === 'strike' && gap(v, mark) < 1e-7));
  }
});
check('committed eruptions hit current occupants once and scale through physical/area/family damage', () => {
  const sample = (mods: Modifier[] = []) => {
    const w = fixture(), e = body(w); grant(w.player, 1, mods); const v = windup(w);
    const entrant = body(w, v.x, v.y); const hits: number[] = [];
    SIM_TAP.current = { onHit: (a, _b, _r, p) => { assert.equal(a, w.player); hits.push(p.amounts.physical ?? 0); } };
    try { seedGlobalRandom(231); advance(w, def.windup + 0.1); } finally { SIM_TAP.current = null; }
    assert.equal(hits.length, 2); assert.ok(e.life < e.maxLife()); assert.ok(entrant.life < entrant.maxLife()); return hits;
  };
  const base = sample();
  for (const tag of ['physical', 'aoe', 'creeper', 'creeper:barrow'] as const)
    sample([mod('damage', 'more', 1, [tag])]).forEach((n, i) => near(n, base[i] * 2));
  sample([mod('damage', 'more', 1, ['satellite']), mod('minionDamage', 'more', 1)]).forEach((n, i) => near(n, base[i]));
  const w = fixture(); body(w); grant(w.player, 1, [mod('aoeRadius', 'more', 1)]);
  near(windup(w).strikeRadius, 54);
});
check('locks one prey, follows moving prey, then returns before acquiring again', () => {
  const w = fixture(), first = body(w, 980); grant(w.player); advance(w, 0.85);
  const rival = body(w, 720); const v = w.creepers.visuals[0]; advance(w, 0.1);
  assert.ok(w.creepers.visuals[0].x > v.x, 'does not flicker to a newly nearer target');
  first.pos = { x: 1050, y: 660 }; advance(w, 0.65);
  assert.ok(w.creepers.visuals[0].x > 900);
  first.pos.x = 1200; w.refreshCreepers(); assert.equal(w.creepers.visuals[0].phase, 'return');
  const before = rival.life;
  for (let i = 0; i < 240; i++) {
    const prior = w.creepers.visuals[0]; advance(w, 1 / 60);
    if (w.creepers.visuals[0].phase !== 'return') { assert.ok(gap(prior, w.player.pos) <= def.home + 4); break; }
    near(rival.life, before); if (i === 239) assert.fail('never returned');
  }
});
check('friendly, untargetable, occluded, distant and cross-story prey cannot start an eruption', () => {
  for (const mode of ['friendly', 'untargetable', 'tier', 'wall', 'range']) {
    const w = fixture(), e = body(w); grant(w.player);
    if (mode === 'friendly') { e.owner = w.player; e.team = w.player.team; }
    if (mode === 'untargetable') e.untargetable = true;
    if (mode === 'tier') e.tier = 1;
    if (mode === 'wall') w.lineOfSight = () => false;
    if (mode === 'range') e.pos.x += 600;
    const life = e.life; advance(w, 5); near(e.life, life);
    assert.ok(w.creepers.visuals.every(v => v.phase !== 'windup' && v.phase !== 'strike'), mode);
  }
});
check('a blocked burrower re-emerges beside its bearer with a fresh arm and no old damage', () => {
  const w = fixture(), e = body(w); grant(w.player); advance(w, 0.9);
  w.clampPos = (_p, _r, from) => ({ ...from! });
  let rearmed = false;
  for (let i = 0; i < 240; i++) {
    advance(w, 1 / 60); const v = w.creepers.visuals[0];
    if (v.phase === 'arm') { near(gap(v, w.player.pos), 0); near(v.progress, 0); assert.equal(v.trail.length, 0); rearmed = true; break; }
  }
  assert.ok(rearmed); near(e.life, e.maxLife());
});
check('a returning follower routes around real grid masonry without crossing its blocked cells', () => {
  const w = fixture(), e = body(w, 990); grant(w.player); windup(w);
  const grid = new GridWalkField(1600, 1200, 20); grid.fillRect(0, 0, 1600, 1200);
  grid.fillRect(880, 550, 900, 650, false); w.walk = grid;
  e.pos.x = 1300; w.refreshCreepers(); assert.equal(w.creepers.visuals[0].phase, 'return');
  let home = false, detour = false;
  for (let i = 0; i < 180; i++) {
    advance(w, 1 / 60); const v = w.creepers.visuals[0];
    assert.ok(grid.isWalkable(v.x, v.y)); assert.notEqual(v.phase, 'arm', 'a valid path should not require recall');
    detour ||= v.y < 550 || v.y >= 660;
    if (gap(v, w.player.pos) <= def.home) { home = true; break; }
  }
  assert.ok(home && detour);
});
check('zero-time reads and frozen timeflow preserve motion and pending damage', () => {
  const w = fixture(); body(w); grant(w.player); windup(w);
  const before = JSON.stringify(w.creepers.visuals); w.refreshCreepers(); assert.equal(JSON.stringify(w.creepers.visuals), before);
  const original = w.timeflow.actorScale; w.timeflow.actorScale = () => 0; advance(w, 3);
  assert.equal(JSON.stringify(w.creepers.visuals), before); w.timeflow.actorScale = original;
});
check('equipment stacks/caps count, saves grants and restores followers with fresh emergence', () => {
  const w = fixture(), base = Object.values(ITEM_BASES).find(b => b.category === 'ring' && b.dropWeight > 0)!;
  const mint = () => forgeItem({ baseId: base.id, ilvl: 14, rarity: 'magic', quality: 1, affixes: [{ id: 'creeper_barrow' }] })!;
  w.meta.equipped.ring1 = mint(); w.meta.equipped.ring2 = mint(); w.recalcSeat(w.localSeat); advance(w, 1);
  assert.equal(w.creepers.visuals.length, 2);
  const r = fixture(); applySavedCharacter(r, JSON.parse(JSON.stringify(serializeCharacter(w)))); r.refreshCreepers();
  assert.equal(r.creepers.visuals.length, 2); assert.ok(r.creepers.visuals.every(v => v.phase === 'arm' && v.progress === 0));
  grant(w.player, 100); w.refreshCreepers(); assert.equal(w.creepers.visuals.length, 3);
  w.player.sheet.removeSource('creeper'); w.meta.equipped.ring2 = undefined; w.recalcSeat(w.localSeat); w.refreshCreepers();
  assert.equal(w.creepers.visuals.length, 1); near(w.creepers.visuals[0].progress, 0);
});
check('lifecycle changes cancel committed eruptions and retire old trails', () => {
  for (const mode of ['death', 'downed', 'removed', 'grant', 'tier', 'allegiance', 'teleport', 'concealed']) {
    const w = fixture(), e = body(w); grant(w.player); windup(w); const life = e.life;
    if (mode === 'death') w.player.dead = true;
    if (mode === 'downed') w.player.downed = true;
    if (mode === 'removed') w.actors = [e];
    if (mode === 'grant') w.player.sheet.removeSource('creeper');
    if (mode === 'tier') w.player.tier = 1;
    if (mode === 'allegiance') w.player.team = 'enemy';
    if (mode === 'teleport') w.player.pos.x -= 300;
    if (mode === 'concealed') w.player.untargetable = true;
    w.refreshCreepers(); assert.ok(w.creepers.visuals.every(v => v.phase === 'arm' && !v.trail.length), mode);
    advance(w, 0.4); near(e.life, life);
  }
  const w = fixture(); grant(w.player); advance(w, 1); w.loadZone(START_ZONE); assert.equal(w.creepers.visuals.length, 0);
});
check('monster/allied bearers share damage and kill attribution; reflection retires all followers', () => {
  const w = fixture(), ally = body(w, 900, 600, w.player), e = body(w, 1030); grant(ally); e.life = 1;
  let killer: Actor | undefined;
  SIM_TAP.current = { onDeath: (victim, credited) => { if (victim === e) killer = credited; } };
  try { advance(w, 4); } finally { SIM_TAP.current = null; }
  assert.ok(e.dead); assert.equal(killer, ally);
  const r = fixture(), enemy = body(r); enemy.life = 1; grant(enemy, 3);
  r.player.sheet.setSource('reflect', [mod('thorns', 'flat', 100000)]); advance(r, 5);
  assert.ok(enemy.dead); assert.equal(r.creepers.visuals.length, 0);
});
check('co-op deep-copies ground trails and eruption geometry; missing fields clear replicas', () => {
  const w = fixture(); body(w); grant(w.player); windup(w);
  const c = fixture(), snap = serializeSnapshot(w, 1); applySnapshot(c, snap);
  assert.deepEqual(c.creepers.visuals, w.creepers.visuals);
  assert.notEqual(c.creepers.visuals[0].trail, snap.creepers![0].trail);
  assert.notEqual(c.creepers.visuals[0].trail[0], w.creepers.visuals[0].trail[0]);
  delete snap.creepers; applySnapshot(c, snap); assert.equal(c.creepers.visuals.length, 0);
});
console.log('PASS carried creeper integration');
