import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { AURORAS, AURORA_CFG, auroraCapacityStat, auroraErrors } from '../src/engine/auroraSpec';
import { satelliteCountStat } from '../src/engine/satelliteSpec';
import { SKILLS } from '../src/data/skills';
import { MAGIC_PACKS } from '../src/data/magicPacks';
import { ITEM_BASES } from '../src/data/itembases';
import { forgeItem } from '../src/engine/itemgen';
import { mod, type Modifier } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { START_ZONE } from '../src/data/zones';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

const check = (label: string, run: () => void) => { run(); console.log(`PASS ${label}`); };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const aura = auroraCapacityStat('pall'), storm = satelliteCountStat('storm_wake');
const internals = (w: World) => w as unknown as { updateProjectiles(dt: number): void };
function dress(a: Actor) {
  a.sheet.setSource('rig', [mod('life', 'override', 100000), mod('accuracy', 'override', 100000),
    ...['critChance', 'armor', 'evasion', 'blockChance', 'poise', 'insight', 'energyShield', 'endurance',
      'lightningRes', 'chaosRes'].map(s => mod(s, 'override', 0))]);
  a.fillResources(); a.skills = []; a.casting = null;
}
function fixture() {
  const w = makeSimWorld('warrior', 78434); w.actors = [w.player];
  w.player.pos = { x: 800, y: 600 }; dress(w.player); return w;
}
function body(w: World, owner?: Actor) {
  const a = w.createMonster('skeleton_warrior', 12, owner ? owner.team : 'enemy', owner);
  dress(a); a.pos = { x: 1000, y: 600 }; w.actors.push(a); return a;
}
function advance(w: World, seconds: number, hz = 60, fly = true) {
  for (let left = seconds; left > 1e-8; left -= 1 / hz) {
    const dt = Math.min(left, 1 / hz); w.time += dt;
    w.refreshSatellites(dt); w.refreshAuroras(dt);
    if (fly) internals(w).updateProjectiles(dt);
  }
}
function charged(mods: Modifier[] = []) {
  const w = fixture(); w.player.sheet.setSource('aurora', [mod(aura, 'flat', 8), ...mods]);
  advance(w, 6); assert.equal(w.auroras.visuals.length, 8);
  assert.ok(w.auroras.visuals.every(v => v.charge === 1)); return w;
}
function firstTarget(w: World, owner?: Actor) {
  const a = owner ?? w.player;
  const v = w.auroras.visuals.find(v => v.owner === a.id)!;
  const angle = Math.atan2(v.y - a.pos.y, v.x - a.pos.x);
  const e = body(w); e.pos = { x: a.pos.x + Math.cos(angle) * 150, y: a.pos.y + Math.sin(angle) * 150 };
  return e;
}
check('open aurora registry validates; neither new accessory effect enters magic packs', () => {
  const w = fixture(); assert.deepEqual(auroraErrors(id => SKILLS[id]?.delivery.type), []);
  assert.equal(MAGIC_PACKS.pall, undefined); assert.equal(MAGIC_PACKS.storm_wake, undefined);
  assert.ok(Object.values(MAGIC_PACKS).every(p => !JSON.stringify(p).includes('auroraCapacity_')));
  w.player.sheet.setSource('generic', [mod('auroraCapacity', 'flat', 8)]); advance(w, 10);
  assert.equal(w.auroras.visuals.length, 0); assert.equal(w.projectiles.length, 0);
});
check('real Stormbound/Pallbound gear stacks independently and restores empty from saves', () => {
  const w = fixture(), base = Object.values(ITEM_BASES).find(b => b.category === 'ring' && b.dropWeight > 0)!;
  const mint = (id: string) => forgeItem({ baseId: base.id, rarity: 'magic', ilvl: 18, quality: 1, affixes: [{ id }] })!;
  w.meta.equipped.ring1 = mint('aurora_pall'); w.meta.equipped.ring2 = mint('aurora_pall'); w.recalcSeat(w.localSeat);
  near(w.player.sheet.get(aura), 16); advance(w, 11); assert.equal(w.auroras.visuals.length, 16);
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w))), resumed = fixture(); applySavedCharacter(resumed, saved);
  resumed.refreshAuroras(); assert.equal(resumed.auroras.visuals.length, 0); near(resumed.player.sheet.get(aura), 16);
  w.meta.equipped.ring2 = mint('satellite_storm_wake'); w.recalcSeat(w.localSeat);
  w.refreshAuroras(); w.refreshSatellites(); assert.equal(w.auroras.visuals.length, 0);
  near(w.player.sheet.get(aura), 8); assert.equal(w.satellites.visuals[0].family, 'storm_wake');
  delete w.meta.equipped.ring1; w.recalcSeat(w.localSeat); advance(w, 6); assert.equal(w.auroras.visuals.length, 0);
});
check('lightning is a traveling projectile with one attributed hit, not instant contact or a mortar', () => {
  for (const hz of [30, 60, 120]) {
    const w = fixture(), e = body(w); w.player.sheet.setSource('storm', [mod(storm, 'flat', 1)]);
    const before = e.life; advance(w, 1, hz, false);
    assert.equal(w.projectiles.length, 1); assert.equal(w.satellites.flights.visuals.length, 0); near(e.life, before);
    assert.equal(w.projectiles[0].inst.def.id, 'satellite_storm_wake'); assert.ok(w.projectiles[0].orbPaint?.spark);
    let hits = 0; SIM_TAP.current = { onHit: (caster, victim, _r, packet) => {
      assert.equal(caster, w.player); assert.equal(victim, e); assert.equal(packet.sourceName, 'Storm Wake'); hits++;
    } };
    try { advance(w, 1, hz); } finally { SIM_TAP.current = null; }
    assert.equal(hits, 1); assert.ok(e.life < before);
  }
});
check('lightning respects walls, range, tier and hostility, and recipient movement can dodge it', () => {
  for (const mode of ['wall', 'range', 'tier', 'ally', 'untargetable']) {
    const w = fixture(), e = body(w); w.player.sheet.setSource('storm', [mod(storm, 'flat', 1)]);
    if (mode === 'wall') w.lineOfSight = () => false;
    if (mode === 'range') e.pos.x += 800;
    if (mode === 'tier') e.tier = 1;
    if (mode === 'ally') { e.team = 'player'; e.owner = w.player; }
    if (mode === 'untargetable') e.untargetable = true;
    advance(w, 2, 60, false); assert.equal(w.projectiles.length, 0, mode);
  }
  const w = fixture(), e = body(w); w.player.sheet.setSource('storm', [mod(storm, 'flat', 1)]);
  advance(w, 1, 60, false); w.player.sheet.removeSource('storm'); e.pos.y += 120;
  const life = e.life; advance(w, 2); near(e.life, life); assert.equal(w.projectiles.length, 0);
});
check('lightning/projectile/satellite scaling and ordinary projectile size/speed modifiers apply', () => {
  const sample = (mods: Modifier[]) => {
    const w = fixture(); body(w); w.player.sheet.setSource('storm', [mod(storm, 'flat', 1), ...mods]);
    const amounts: number[] = []; SIM_TAP.current = { onHit: (_a, _b, _r, p) => amounts.push(p.amounts.lightning ?? 0) };
    try { seedGlobalRandom(8812); advance(w, 2); } finally { SIM_TAP.current = null; }
    assert.equal(amounts.length, 1); return amounts[0];
  };
  const base = sample([]); assert.ok(base > 0);
  for (const tag of ['lightning', 'projectile', 'satellite', 'satellite:storm_wake'] as const)
    near(sample([mod('damage', 'more', 1, [tag])]), base * 2);
  near(sample([mod('damage', 'more', 1, ['fire']), mod('minionDamage', 'more', 1)]), base);
  const w = fixture(); body(w); w.player.sheet.setSource('storm', [mod(storm, 'flat', 1), mod('projectileSpeed', 'more', 1), mod('projectileSize', 'more', 1)]);
  advance(w, 1, 60, false); near(w.projectiles[0].speed, 580); near(w.projectiles[0].radius, 14);
});
check('aurora visibly accumulates, holds without targets, then cascades a bounded full-circle volley', () => {
  for (const hz of [30, 60, 120]) {
    const w = fixture(); w.player.sheet.setSource('aurora', [mod(aura, 'flat', 8)]);
    advance(w, 2, hz); assert.equal(w.auroras.visuals.filter(v => v.charge === 1).length, 3);
    assert.equal(w.auroras.visuals.length, 4); assert.equal(w.projectiles.length, 0);
    advance(w, 10, hz); assert.equal(w.auroras.visuals.length, 8); assert.equal(w.projectiles.length, 0);
    firstTarget(w); advance(w, 0.08, hz, false); assert.equal(w.projectiles.length, 0);
    advance(w, 0.2, hz, false); assert.ok(w.projectiles.length > 0 && w.projectiles.length < 8);
    advance(w, 0.8, hz, false); assert.equal(w.projectiles.length, 8);
    assert.ok(w.auroras.visuals.length < 8, 'the reservoir starts rebuilding');
    const directions = w.projectiles.map(p => ((p.dir % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
    for (let i = 1; i < directions.length; i++) near(directions[i] - directions[i - 1], 2 * Math.PI / 8);
    for (const p of w.projectiles) assert.ok(p.orbPaint!.fill < 0.15 && p.orbPaint!.rim < 0.6);
  }
});
check('aurora capacity, recharge and zero-time reads are independent from satellite investment', () => {
  const w = fixture(); w.player.sheet.setSource('aurora', [mod(aura, 'flat', 8), mod('auroraRecharge', 'more', 1),
    mod('satelliteCount', 'flat', 8), mod('satelliteSpeed', 'more', 3)]);
  advance(w, 2.6); assert.equal(w.auroras.visuals.length, 8); near(w.auroras.visuals[7].charge, 1);
  const before = JSON.stringify(w.auroras.visuals);
  for (let i = 0; i < 100; i++) w.refreshAuroras(); assert.equal(JSON.stringify(w.auroras.visuals), before);
  assert.equal(w.satellites.visuals.length, 0);
  w.player.sheet.setSource('aurora', [mod(aura, 'flat', 100), mod('auroraRecharge', 'more', 3)]); advance(w, 10);
  assert.equal(w.auroras.visuals.length, AURORA_CFG.maxCapacity);
  w.player.sheet.setSource('aurora', [mod(aura, 'flat', 8), mod('auroraRecharge', 'more', -1)]); advance(w, 10);
  assert.equal(w.auroras.visuals.length, 0);
});
check('aurora bubbles hit through ordinary typed damage, with no satellite or minion scaling', () => {
  const sample = (mods: Modifier[]) => {
    const w = charged(mods), e = firstTarget(w), amounts: number[] = [];
    SIM_TAP.current = { onHit: (a, b, _r, p) => {
      assert.equal(a, w.player); assert.equal(b, e); assert.equal(p.sourceName, 'Pall Aurora'); amounts.push(p.amounts.chaos ?? 0);
    } };
    try { seedGlobalRandom(9300); advance(w, 1.8); } finally { SIM_TAP.current = null; }
    assert.equal(amounts.length, 1); return amounts[0];
  };
  const base = sample([]); assert.ok(base > 0);
  for (const tag of ['chaos', 'projectile', 'aurora', 'aurora:pall'] as const)
    near(sample([mod('damage', 'more', 1, [tag])]), base * 2);
  near(sample([mod('damage', 'more', 1, ['satellite']), mod('minionDamage', 'more', 1)]), base);
});
check('aurora never releases at hidden, friendly, distant or cross-story targets', () => {
  for (const mode of ['wall', 'tier', 'ally', 'range', 'untargetable']) {
    const w = charged(), e = body(w);
    if (mode === 'wall') w.lineOfSight = () => false;
    if (mode === 'tier') e.tier = 1;
    if (mode === 'ally') { e.team = 'player'; e.owner = w.player; }
    if (mode === 'range') e.pos.x += 1000;
    if (mode === 'untargetable') e.untargetable = true;
    advance(w, 2, 60, false); assert.equal(w.projectiles.length, 0, mode);
  }
});
check('loss, downing, removal, teleport, faction or story change cancels held charge and future releases', () => {
  for (const mode of ['grant', 'death', 'downed', 'removed', 'teleport', 'tier', 'allegiance', 'dormant']) {
    const w = charged(), a = w.player; firstTarget(w); advance(w, 0.05, 60, false);
    if (mode === 'grant') a.sheet.removeSource('aurora');
    if (mode === 'death') a.dead = true;
    if (mode === 'downed') a.downed = true;
    if (mode === 'removed') w.actors = w.actors.filter(e => e !== a);
    if (mode === 'teleport') a.pos.x += 500;
    if (mode === 'tier') a.tier = 1;
    if (mode === 'allegiance') a.team = 'enemy';
    if (mode === 'dormant') a.untargetable = true;
    w.refreshAuroras(); assert.equal(w.auroras.visuals.length, 0, mode);
    advance(w, 0.5, 60, false); assert.equal(w.projectiles.length, 0, mode);
  }
  const w = charged(); w.loadZone(START_ZONE); assert.equal(w.auroras.visuals.length, 0);
  w.refreshAuroras(); assert.equal(w.auroras.visuals.length, 0);
});
check('monsters and allied bearers can use the shared aurora without a magic-pack recipe', () => {
  const w = fixture(), ally = body(w, w.player); ally.pos = { x: 400, y: 400 };
  ally.sheet.setSource('aurora', [mod(aura, 'flat', 8)]); advance(w, 6);
  const victim = firstTarget(w, ally); victim.life = 1; let killer: Actor | undefined;
  SIM_TAP.current = { onDeath: (v, k) => { if (v === victim) killer = k; } };
  try { advance(w, 1.8); } finally { SIM_TAP.current = null; }
  assert.ok(victim.dead); assert.equal(killer, ally);
  const m = fixture(), enemy = body(m); enemy.pos = { x: 200, y: 200 };
  enemy.sheet.setSource('aurora', [mod(aura, 'flat', 8)]); advance(m, 6);
  const v = m.auroras.visuals.find(v => v.owner === enemy.id)!;
  const angle = Math.atan2(v.y - enemy.pos.y, v.x - enemy.pos.x);
  m.player.pos = { x: enemy.pos.x + Math.cos(angle) * 150, y: enemy.pos.y + Math.sin(angle) * 150 };
  const life = m.player.life; advance(m, 1.8); assert.ok(m.player.life < life);
});
check('timeflow pauses charge and cascade, and stored bubble radius follows projectile size', () => {
  const w = fixture(); w.player.sheet.setSource('aurora', [mod(aura, 'flat', 8), mod('projectileSize', 'more', 1)]);
  advance(w, 1); near(w.auroras.visuals[0].radius, 12);
  const original = w.timeflow.actorScale, held = JSON.stringify(w.auroras.visuals);
  w.timeflow.actorScale = () => 0; advance(w, 10); assert.equal(JSON.stringify(w.auroras.visuals), held);
  w.timeflow.actorScale = original; advance(w, 5); firstTarget(w); advance(w, 0.05, 60, false);
  w.timeflow.actorScale = () => 0; advance(w, 2, 60, false); assert.equal(w.projectiles.length, 0);
  w.timeflow.actorScale = original; advance(w, 0.3, 60, false); assert.ok(w.projectiles.length > 0);
});
check('co-op snapshots copy bubble charge and projectile paint; absent fields clear old state', () => {
  const w = charged(); firstTarget(w); advance(w, 0.5, 60, false);
  const client = fixture(), snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  assert.deepEqual(client.auroras.visuals, w.auroras.visuals); assert.notEqual(client.auroras.visuals[0], w.auroras.visuals[0]);
  assert.deepEqual(client.projectiles[0].orbPaint, w.projectiles[0].orbPaint);
  assert.notEqual(client.projectiles[0].orbPaint, snap.projectiles[0].orbPaint);
  delete snap.auroras; delete snap.projectiles[0].orbPaint; applySnapshot(client, snap);
  assert.equal(client.auroras.visuals.length, 0); assert.equal(client.projectiles[0].orbPaint, undefined);
});
check('ordinary world update replenishes an aurora without allocating minion actors', () => {
  const w = fixture(); w.player.sheet.setSource('aurora', [mod(aura, 'flat', 8)]);
  const count = w.actors.length; w.update(1 / 60);
  assert.ok(w.auroras.visuals.length); assert.equal(w.actors.length, count);
  assert.equal(AURORAS.pall.skill, 'aurora_pall');
});
console.log('PASS aurora and lightning integration');
