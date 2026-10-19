import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { SKILL_BURSTS, SKILL_BURST_STYLE, skillBurstVoice } from '../src/data/skillVisuals';
import { effectVoiceOf, drawEffectVoice } from '../src/render/vis/effectVoice';
import '../src/render/vis/skillBurstVoice';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { AOE_SHAPE, makeSkillInstance } from '../src/engine/skills';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

const census = Object.values(SKILLS).filter(s => s.delivery.type === 'nova');
assert.deepEqual(Object.keys(SKILL_BURSTS).sort(), census.map(s => s.id).sort(),
  'New novas need an authored identity; retired skills must leave the visual catalogue');
const signatures = new Map<string, string>();
for (const s of census) {
  const p = SKILL_BURSTS[s.id];
  assert(effectVoiceOf(skillBurstVoice(s.id)!));
  assert(p.count > 0 && p.count <= SKILL_BURST_STYLE.maxMarks);
  const key = JSON.stringify(p);
  assert(!signatures.has(key), `${s.id} duplicates ${signatures.get(key)}`);
  signatures.set(key, s.id);
}
assert.equal(skillBurstVoice('not-authored'), undefined);
assert.equal(skillBurstVoice('constructor'), undefined);
console.log(`PASS ${census.length} nova identities resolve with distinct authored compositions`);

// The same geometry at the same age is stable, including across recolors.
// Bound work independently of radius; fail on canvas-invalid numeric arguments.
function trace(id: string, color: string, radius: number, t: number): unknown[] {
  const calls: unknown[] = [];
  const ctx = new Proxy({}, {
    get: (_o, key) => (...args: unknown[]) => {
      assert(args.every(v => typeof v !== 'number' || Number.isFinite(v)), `${id}: ${String(key)}`);
      calls.push([key, ...args]);
    }, set: () => true,
  }) as CanvasRenderingContext2D;
  assert(drawEffectVoice(ctx, skillBurstVoice(id)!, {
    pos: { x: 130, y: 170 }, radius, color, life: t * 0.3, maxLife: 0.3,
    shape: AOE_SHAPE.square, facing: 0.7, edgeFrac: 0.6,
  }, t));
  assert(calls.length < 750, `${id}: unbounded detail (${calls.length})`);
  return calls;
}
for (const s of census) for (const t of [1, 0.7, 0.3, 0.01]) {
  assert.deepEqual(trace(s.id, '#abcdef', 115, t), trace(s.id, '#888888', 115, t));
  trace(s.id, '#abcdef', 1, t); trace(s.id, '#abcdef', 2600, t);
}
console.log('PASS deterministic whole-life geometry survives recolors, small casts and huge bursts');

const w = makeSimWorld('warrior', 68124);
w.actors = [w.player];
for (const id of ['ground_slam', 'frost_nova', 'pyre_nova', 'shock_nova', 'whirlwind',
  'hex_pulse', 'spore_burst', 'benediction', 'challenging_shout']) {
  w.flashes = []; w.player.casting = null;
  const inst = makeSkillInstance(SKILLS[id]);
  w.executeSkill(w.player, inst, { x: w.player.pos.x + 100, y: w.player.pos.y });
  const flash = w.flashes.find(f => f.fx === skillBurstVoice(id));
  assert(flash, `${id}: live execution must emit its authored voice`);
  assert.equal(flash.maxLife, 0.3);
  if (id === 'shock_nova') assert.equal(flash.edgeFrac, 0.6);
}
console.log('PASS real melee, elemental, healing and shout casts emit their own voices');

// Same-seed hit control: choosing another voice cannot change who is hit,
// damage, statuses, bank balances or resources.
function hitRun(fx?: string) {
  const host = makeSimWorld('warrior', 77291), p = host.player;
  host.actors = [p];
  const targets = [20, 110, 210].map(dx => {
    const a = host.createMonster('zombie', 1, 'enemy');
    a.pos = { x: p.pos.x + dx, y: p.pos.y }; a.brain = undefined;
    a.sheet.setSource('skillvisuals', [{ stat: 'life', kind: 'override', value: 100000 },
      { stat: 'evasion', kind: 'override', value: 0 }]);
    a.fillResources(); host.actors.push(a); return a;
  });
  const def = SKILLS.shock_nova; assert(def.delivery.type === 'nova');
  const inst = makeSkillInstance({ ...def, delivery: { ...def.delivery, fx } });
  seedGlobalRandom(18234);
  host.executeSkill(p, inst, { x: p.pos.x + 100, y: p.pos.y });
  const result = targets.map(a => ({ life: a.life, statuses: a.statuses.map(s => s.id) }));
  assert.equal(result[0].life, targets[0].maxLife(), 'safe center is mechanically empty');
  assert(result[1].life < targets[1].maxLife(), 'outer band strikes');
  assert.equal(result[2].life, targets[2].maxLife(), 'outside radius is spared');
  return { result, mana: p.mana, life: p.life };
}
assert.deepEqual(hitRun(), hitRun('unregistered-control'));
console.log('PASS same-seed damage and safe-center behavior are unchanged by presentation');

// A socketed pulse is an actual delayed hit, so it retains the source signature.
w.zones = []; w.flashes = [];
const pulsed = makeSkillInstance(SKILLS.shock_nova);
pulsed.sockets = [{ def: SUPPORTS.buried_charge, level: 1 }];
w.executeSkill(w.player, pulsed, w.player.pos);
assert(w.zones.some(z => z.fx === skillBurstVoice('shock_nova')));
w.flashes = [];
let sawPulse = false;
for (let elapsed = 0; elapsed < SUPPORTS.buried_charge.pulse!.delay + 0.1; elapsed += 0.02) {
  w.update(0.02);
  sawPulse ||= w.flashes.some(f => f.fx === skillBurstVoice('shock_nova') && f.edgeFrac === 0.6);
}
assert(sawPulse);
console.log('PASS delayed pulse keeps identity and the real safe-center geometry');

w.flashes = [{ pos: { x: 400, y: 300 }, radius: 130, color: '#26abec', life: 0.2, maxLife: 0.3,
  fx: skillBurstVoice('shock_nova'), shape: AOE_SHAPE.triangle, facing: 0.8, edgeFrac: 0.6 },
{ pos: { x: 300, y: 200 }, radius: 70, color: '#ffffff', life: 0.1, maxLife: 0.2,
  arc: { facing: 1.2, arcRad: 0.7 }, beam: true }];
const snapshot = serializeSnapshot(w, 1);
const client = makeSimWorld('warrior', 7123);
applySnapshot(client, JSON.parse(JSON.stringify(snapshot)));
for (let i = 0; i < w.flashes.length; i++) {
  for (const field of ['fx', 'shape', 'facing', 'edgeFrac', 'arc', 'beam', 'color'] as const)
    assert.deepEqual(client.flashes[i][field], w.flashes[i][field], `wire ${field}`);
}
assert.notEqual(client.flashes[1].arc, w.flashes[1].arc);
delete snapshot.flashes[0].shape; delete snapshot.flashes[0].edgeFrac;
applySnapshot(client, snapshot);
assert.equal(client.flashes[0].edgeFrac, undefined, 'old hosts clear previously received geometry');
console.log('PASS co-op round trip preserves footprints, arcs, beams and color; old hosts still work');

mkdirSync('balance/reports/skill-visuals', { recursive: true });
writeFileSync('balance/reports/skill-visuals/catalogue.json', JSON.stringify(census.map(s => {
  assert(s.delivery.type === 'nova');
  return { id: s.id, name: s.name, color: s.color, radius: s.delivery.radius,
    edgeFrac: s.delivery.edgeOnly, fx: skillBurstVoice(s.id) };
}), null, 2));
