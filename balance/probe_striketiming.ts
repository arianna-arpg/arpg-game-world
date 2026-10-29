import { strict as assert } from 'node:assert';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { instanceStrikeTimings, makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { resolveStrikeTiming, rollStrikeMarker, STRIKE_TIMING_CFG, strikeTimingsOf } from '../src/engine/strikeTiming';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawStrikeTimingBar } from '../src/render/vis/strikeTimingBar';
import type { CastingState } from '../src/engine/actor';

bootSimEngine(); seedGlobalRandom(0x71a1);
const w = makeSimWorld('warrior', 0x71a1), p = w.player;
w.actors = [p]; p.skills = [];
const internal = w as unknown as { updateCasting(a: typeof p, dt: number): void };
const executions: number[] = [];
const execute = w.executeSkill.bind(w);
w.executeSkill = (...args) => { executions.push(args[3]?.dmgMult ?? 1); return execute(...args); };
let flawlessEvents = 0;
const triggers = w.rollTriggers.bind(w);
w.rollTriggers = (...args) => { if (args[1] === 'flawless') flawlessEvents++; return triggers(...args); };
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, actual + ' != ' + expected);
function start(supports: string[], patch: Partial<SkillDef> = {}) {
  p.casting = null; p.useLock = 0; p.cooldowns.clear(); p.fillResources(); w.projectiles = []; w.flashes = [];
  const inst = makeSkillInstance({ ...SKILLS.fireball, requirements: undefined, manaCost: 0,
    cooldown: 0, useTime: 1, effects: [], ...patch }, 1, Math.max(4, supports.length));
  supports.forEach((id, index) => { inst.sockets[index] = { def: SUPPORTS[id], level: 1 }; });
  assert.ok(w.useSkill(p, inst, { x: p.pos.x + 100, y: p.pos.y }, true));
  assert.ok(p.casting);
  return p.casting as CastingState;
}
const both = ['perfect_draw', 'wandering_mark'];
const cases = [
  { name: 'overlap', fraction: 0.8, marker: 0.8, mult: 1.7 * 2.2, cues: ['flawless', 'perfect'] },
  { name: 'gold only', fraction: 0.8, marker: 0.4, mult: 1.7, cues: ['perfect'] },
  { name: 'marker only', fraction: 0.4, marker: 0.4, mult: 2.2, cues: ['flawless'] },
  { name: 'neither', fraction: 0.2, marker: 0.5, mult: 1, cues: [] },
];
for (const order of [both, [...both].reverse()]) for (const held of [false, true]) for (const test of cases) {
  const cs = start(held ? [...order, 'overcharge'] : order);
  assert.equal(cs.strikeTimings?.length, 2);
  assert.ok(cs.indicatorAt! >= 0.3 && cs.indicatorAt! <= 0.85, 'marker exists in either socket order');
  cs.elapsed = cs.total * test.fraction; cs.indicatorAt = test.marker;
  const before = flawlessEvents;
  if (held) {
    cs.stage = 1; cs.held = false;
    w.castPress(p); assert.equal(cs.pressUsed, undefined, 'overcharge remains release-only');
    internal.updateCasting(p, 0);
    close(executions.at(-1)!, test.mult * 1.4 * cs.baseMult);
    assert.equal(flawlessEvents, before, 'release keeps its existing trigger behavior');
  } else {
    w.castPress(p); close(cs.empowered ?? 1, test.mult);
    assert.equal(flawlessEvents - before, test.cues.length ? 1 : 0, 'one flawless event per successful press');
    cs.elapsed = cs.total * 0.8; cs.indicatorAt = 0.8; w.castPress(p);
    close(cs.empowered ?? 1, test.mult); assert.equal(flawlessEvents - before, test.cues.length ? 1 : 0);
    internal.updateCasting(p, cs.total);
    close(executions.at(-1)!, test.mult * cs.baseMult);
  }
  assert.equal(p.casting, null);
  assert.deepEqual(w.flashes.flatMap(f => f.combatCue ? [f.combatCue.style] : []).sort(), test.cues);
  console.log('PASS ' + order.join(' + ') + ' ' + (held ? 'release ' : 'press ') + test.name);
}

for (const [support, fraction, expected] of [['perfect_draw', 0.8, 1.7], ['wandering_mark', 0.5, 2.2]] as const) {
  const cs = start([support]); cs.indicatorAt = support === 'wandering_mark' ? 0.5 : undefined;
  cs.elapsed = cs.total * fraction; w.castPress(p); close(cs.empowered!, expected);
}
{
  const cs = start(both); internal.updateCasting(p, cs.total);
  close(executions.at(-1)!, cs.baseMult); // no second press is still an ordinary cast
  const plain = start([]); assert.equal(plain.mode, 'cast'); assert.equal(plain.indicatorAt, undefined);
  const innate = start(['wandering_mark'], { castMode: 'perfect', timing: { kind: 'perfect', bonus: 0.9 } });
  assert.deepEqual(innate.strikeTimings?.map(t => t.source), [
    { kind: 'support', id: 'wandering_mark' }, { kind: 'skill', id: 'fireball' },
  ]);
  innate.elapsed = innate.total * 0.8; innate.indicatorAt = 0.8; w.castPress(p); close(innate.empowered!, 2.2 * 1.9);
  const duplicate = start(['perfect_draw', 'perfect_draw', 'wandering_mark'],
    { castMode: 'perfect', timing: { kind: 'perfect', bonus: 0.9 } });
  duplicate.inst.sockets[1] = { def: { ...SUPPORTS.perfect_draw, strikeTiming: { kind: 'perfect', bonus: 5 } }, level: 1 };
  const folded = instanceStrikeTimings(duplicate.inst);
  assert.equal(folded.length, 2); close(folded.find(t => t.kind === 'perfect')!.bonus!, 0.7);
  const stored = JSON.stringify(duplicate.strikeTimings);
  duplicate.inst.sockets = []; assert.equal(JSON.stringify(strikeTimingsOf(duplicate)), stored, 'active cast owns its resolved sources');
}
console.log('PASS standalone, no-input, innate composition, source attribution and duplicate fallback');

{
  const cs = start([...both, 'overcharge', 'spark_discipline']);
  const first = cs.indicatorAt!;
  internal.updateCasting(p, cs.total);
  assert.equal(cs.stage, 1); assert.equal(cs.elapsed, 0); assert.notEqual(cs.indicatorAt, first);
  assert.ok(cs.indicatorAt! >= 0.3 && cs.indicatorAt! <= 0.85);
  cs.elapsed = cs.total * 0.8; cs.indicatorAt = 0.8; cs.sinceStage = 0.1; cs.held = false;
  internal.updateCasting(p, 0); close(executions.at(-1)!, 1.4 * 1.7 * 2.2 * 1.35 * cs.baseMult);
  const max = start([...both, 'overcharge', 'spark_discipline']);
  for (let i = 0; i < 3; i++) internal.updateCasting(p, max.total);
  assert.equal(max.stage, 3); assert.equal(max.elapsed, 0);
  internal.updateCasting(p, max.total); assert.equal(max.stage, 3); assert.equal(max.elapsed, 0);
  max.sinceStage = 0.1; max.held = false; internal.updateCasting(p, 0);
  close(executions.at(-1)!, 2.2 * 1.35 * max.baseMult);
  // Surcharge refusal leaves the same marker at the brim and still allows the golden release.
  const dry = start([...both, 'overcharge'], { manaCost: 1 }); p.mana = 0;
  const marker = dry.indicatorAt; internal.updateCasting(p, dry.total);
  assert.equal(dry.stage, 0); assert.equal(dry.elapsed, dry.total); assert.equal(dry.indicatorAt, marker);
  dry.held = false; internal.updateCasting(p, 0); close(executions.at(-1)!, 1.7 * dry.baseMult);
}
console.log('PASS overcharge rerolls, independent spark, maximum stages and unaffordable stages');

function paint(cs: CastingState) {
  const calls: { style: string; rect: number[] }[] = [];
  const ctx = { fillStyle: '', fillRect(...rect: number[]) { calls.push({ style: this.fillStyle, rect }); } };
  drawStrikeTimingBar(ctx as unknown as CanvasRenderingContext2D, cs, 0, 0, 44, 5);
  return calls;
}
for (const held of [false, true]) {
  const cs = start(held ? [...both, 'overcharge', 'spark_discipline'] : both);
  cs.indicatorAt = 0.8; cs.elapsed = cs.total * 0.78;
  if (held) { cs.stage = 1; cs.sinceStage = 0.1; }
  const snap = serializeSnapshot(w, 1), client = makeSimWorld('warrior', 9); applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(a => a.id === p.id)].casting!;
  assert.deepEqual(mirror.strikeTimings, cs.strikeTimings);
  assert.notEqual(mirror.strikeTimings![0].source, cs.strikeTimings![0].source);
  assert.equal(mirror.stage, cs.stage); assert.equal(mirror.sparkWindow, cs.sparkWindow);
  assert.deepEqual(paint(mirror), paint(cs));
  assert.equal(paint(cs).length, 2); assert.equal(paint(cs)[1].style, '#ffffff', 'marker paints above gold');
  p.casting = null; applySnapshot(client, serializeSnapshot(w, 2));
  assert.equal(client.actors[snap.actors.findIndex(a => a.id === p.id)].casting, null);
}
console.log('PASS simultaneous cast-bar layers, co-op copies and cancellation cleanup');
{
  const cs = start(both), timings = cs.strikeTimings!;
  close(resolveStrikeTiming(timings, 0.72, 0.72).multiplier, 1.7 * 2.2);
  close(resolveStrikeTiming(timings, 0.719, 0.719).multiplier, 2.2);
  close(resolveStrikeTiming(timings, 0.58, 0.5).multiplier, 2.2);
  close(resolveStrikeTiming(timings, 0.581, 0.5).multiplier, 1);
  assert.equal(rollStrikeMarker(timings, () => 0), STRIKE_TIMING_CFG.timed.markerMin);
  close(rollStrikeMarker(timings, () => 1)!, STRIKE_TIMING_CFG.timed.markerMax);
  assert.equal(rollStrikeMarker([timings[0]], () => { throw new Error('perfect must not consume RNG'); }), undefined);
}
console.log('PASS strike timing composition and original window boundaries');
