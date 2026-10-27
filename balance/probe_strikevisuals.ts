import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { SKILL_STRIKES, skillStrikeVoice } from '../src/data/skillStrikeVisuals';
import { LIGHTNING_VISUALS, LIGHTNING_STYLE } from '../src/data/lightningVisuals';
import { drawSkillStrike } from '../src/render/vis/skillStrikeVoice';
import { drawLightningTrace } from '../src/render/vis/lightningVoice';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import { extendLightningTrace, type LightningTrace } from '../src/engine/lightningVisual';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance, AOE_SHAPE } from '../src/engine/skills';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { mod } from '../src/engine/stats';

let checks = 0;
const check = (name: string, value: unknown) => { assert.ok(value, name); checks++; console.log('PASS ' + name); };
const census = Object.values(SKILLS).filter(s => s.delivery.type === 'melee' || s.delivery.type === 'cone' && !s.delivery.beamFx);
assert.deepEqual(Object.keys(SKILL_STRIKES).sort(), census.map(s => s.id).sort());
check('102 melee and 32 non-beam cones have authored profiles', census.length === 134);
check('all compositions differ and unknown IDs keep fallback', new Set(Object.values(SKILL_STRIKES).map(p => JSON.stringify(p))).size === 134 && !skillStrikeVoice('constructor'));
function trace(draw: (ctx: CanvasRenderingContext2D) => void) {
  const calls: unknown[] = []; let depth = 0;
  const ctx = new Proxy({ globalAlpha: 1, lineWidth: 1 } as Record<string, unknown>, {
    get: (o, key) => key in o ? o[String(key)] : (...args: unknown[]) => {
      assert(args.every(v => typeof v !== 'number' || Number.isFinite(v)), String(key));
      if (key === 'save') depth++; if (key === 'restore') depth--;
      calls.push([key, ...args]);
    }, set: (o, key, v) => { o[String(key)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  draw(ctx); assert.equal(depth, 0); assert(calls.length < 2000, 'bounded work'); return JSON.stringify(calls);
}
for (const [id, p] of Object.entries(SKILL_STRIKES)) {
  assert(effectVoiceOf(skillStrikeVoice(id)!));
  for (const r of [1, 90, 4000]) for (const t of [.95, .45, .05]) {
    const draw = (color: string) => trace(ctx => drawSkillStrike(ctx, { pos: { x: 20, y: 30 }, radius: r, color, life: t, maxLife: 1,
      shape: AOE_SHAPE.sector, facing: .7, arcRad: .65, edgeFrac: .72 }, t, p));
    assert.equal(draw('#ffffff'), draw('#776633'), id);
  }
}
check('all 131 painters remain finite, bounded and palette independent throughout life', true);
function rig() {
  const w = makeSimWorld('warrior', 82166), p = w.player;
  w.walk = null; w.actors = [p]; w.doodads = []; w.markDoodadsChanged(); w.flashes = []; w.projectiles = []; w.zones = [];
  p.pos = { x: 700, y: 700 }; p.facing = 0; p.skills = []; p.buffs.clear(); p.statuses = []; p.casting = null; p.useLock = 0;
  p.sheet.setSource('qa', [mod('mana', 'override', 10000), mod('life', 'override', 10000), mod('critChance', 'override', 0)]); p.fillResources();
  const spawn = (x: number, y = 700) => {
    const a = w.createMonster('zombie', 1, 'enemy'); a.pos = { x, y }; a.brain = undefined; a.anchored = true; a.spawnedAt = -1;
    a.sheet.setSource('qa', [mod('life', 'override', 100000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]); a.fillResources(); w.actors.push(a); return a;
  };
  return { w, p, spawn };
}
for (const def of census) {
  const { w, p } = rig(), inst = makeSkillInstance(def);
  w.executeSkill(p, inst, { x: 800, y: 700 });
  const fx = def.delivery.type === 'melee' ? def.delivery.fx ?? skillStrikeVoice(def.id) : skillStrikeVoice(def.id);
  check(def.id + ': native strike emits its intended voice', w.flashes.some(f => f.fx === fx));
}
function hitRun(id: string, plain: boolean, shape = 0) {
  const { w, p, spawn } = rig();
  p.sheet.setSource('shape', [mod('aoeShape', 'override', shape)]);
  const targets = [spawn(730), spawn(810), spawn(890), spawn(720, 790)];
  const def = SKILLS[id], inst = makeSkillInstance(plain ? { ...def, id: '__visual_control' } : def);
  const restore = seedGlobalRandom(91); w.executeSkill(p, inst, { x: 900, y: 700 }); const nextRandom = Math.random(); restore();
  return { victims: targets.map(a => ({ life: a.life, statuses: a.statuses.map(s => [s.id, s.stacks, s.dps, s.power, s.remaining]) })), nextRandom, mana: p.mana };
}
for (const id of ['cleave', 'heavy_strike', 'rend', 'flame_wave', 'surgical_strike']) for (const shape of [0, 1, 2]) assert.deepEqual(hitRun(id, false, shape), hitRun(id, true, shape), id);
check('same-seed hit amounts, selected victims and RNG agree with unpainted controls', true);
{
  const { w, p } = rig(), inst = makeSkillInstance(SKILLS.surgical_strike);
  inst.sockets[0] = { def: SUPPORTS.buried_charge, level: 1 };
  w.executeSkill(p, inst, { x: 900, y: 700 });
  const z = w.zones.find(z => z.pulse)!; assert(z);
  assert.equal(z.fx, skillStrikeVoice('surgical_strike')); assert.equal(z.edgeFrac, .72);
  w.flashes = [];
  for (let i = 0; i < 65; i++) w.update(.02);
  const f = w.flashes.find(f => f.fx === z.fx); assert(f);
  check('delayed cone pulse keeps its narrow sector and safe center', f.arcRad === z.arcRad && f.edgeFrac === .72);
  const peer = rig().w; applySnapshot(peer, serializeSnapshot(w, 1));
  assert.equal(peer.flashes.find(f => f.fx === z.fx)?.arcRad, z.arcRad);
}
const lightningFrames: Record<string, ({ trace: LightningTrace; life: number } | null)[]> = {};
function boltRun(id: string, plain = false) {
  const { w, p, spawn } = rig(); const enemies = [spawn(785), spawn(850, 775), spawn(940, 740)];
  const def = SKILLS[id], inst = makeSkillInstance(plain ? { ...def, id: '__visual_control' } : def);
  const restore = seedGlobalRandom(194); w.executeSkill(p, inst, enemies[0].pos);
  const paths: LightningTrace[] = []; let ended = false;
  const frames: ({ trace: LightningTrace; life: number } | null)[] = [];
  for (let i = 0; i < 110; i++) {
    w.update(1 / 60);
    for (const f of w.flashes) if (f.lightning) paths.push(JSON.parse(JSON.stringify(f.lightning)));
    const f = w.flashes.find(f => f.lightning);
    frames.push(f ? { trace: JSON.parse(JSON.stringify(f.lightning)), life: f.life / f.maxLife } : null);
    if (!w.projectiles.length) ended = true;
  }
  const nextRandom = Math.random(); restore();
  if (!plain) lightningFrames[id] = frames;
  return { w, paths, ended, victims: enemies.map(a => a.life), nextRandom };
}
for (const id of Object.keys(LIGHTNING_VISUALS)) {
  const actual = boltRun(id), control = boltRun(id, true);
  assert.deepEqual(actual.victims, control.victims); assert.equal(actual.nextRandom, control.nextRandom);
  check(id + ': measured path preserves real hits and combat randomness', actual.paths.length > 0 && actual.paths.every(t => t.points.length <= LIGHTNING_STYLE.maxPoints));
  check(id + ': ended bolts leave no permanent links', actual.ended && !actual.w.flashes.some(f => f.lightning));
  if (id.includes('chain')) check(id + ': path bends through an actual chain turn', actual.paths.some(t => t.points.some(a => Math.abs(a.y - 700) > 10)));
}
{
  const { w, p } = rig(), inst = makeSkillInstance(SKILLS.chain_lightning);
  w.executeSkill(p, inst, { x: 1100, y: 700 }); for (let i = 0; i < 12; i++) w.update(1 / 60);
  const f = w.flashes.find(f => f.lightning)!; assert(f);
  check('no trail leads the projectile', f.lightning!.points.every(v => v.x <= w.projectiles[0].pos.x));
  const snap = serializeSnapshot(w, 1), peer = rig().w; applySnapshot(peer, snap);
  assert.deepEqual(peer.flashes.find(f => f.lightning)?.lightning, f.lightning);
  snap.flashes.find(f => f.lightning)!.lightning!.points[0].x = -900;
  check('co-op deeply copies trail points', f.lightning!.points[0].x !== -900 && peer.flashes.find(f => f.lightning)!.lightning!.points[0].x !== -900);
  for (const f of snap.flashes) delete f.lightning; applySnapshot(peer, snap);
  check('old host packets clear old trail data', !peer.flashes.some(f => f.lightning));
  w.loadZone(w.zone.id); check('zone transition clears lightning', !w.flashes.some(f => f.lightning));
}
{
  const t: LightningTrace = { skillId: 'chain_lightning', width: 7, clock: 0, points: [] };
  for (let i = 0; i < 1000; i++) extendLightningTrace(t, { x: i, y: 0 }, { x: i + 1, y: 0 }, i / 1000);
  assert(t.points.length <= LIGHTNING_STYLE.maxPoints);
  const draw = (color: string) => trace(ctx => drawLightningTrace(ctx, t, color, .6));
  assert.equal(draw('#ffffff'), draw('#556633')); check('lightning geometry and storage stay bounded across frame rates and recolors', true);
}
mkdirSync('balance/reports/skill-visuals', { recursive: true });
writeFileSync('balance/reports/skill-visuals/strikes.json', JSON.stringify({ checks,
  strikes: census.map(s => ({ id: s.id, name: s.name, color: s.color, family: s.delivery.type, delivery: s.delivery,
    fx: s.delivery.type === 'melee' ? s.delivery.fx ?? skillStrikeVoice(s.id) : skillStrikeVoice(s.id) })),
  lightning: Object.keys(LIGHTNING_VISUALS).map(id => ({ id, name: SKILLS[id].name, color: SKILLS[id].color, family: 'lightning', frames: lightningFrames[id] })),
}, null, 2));
console.log(`PASS ${checks} strike and lightning visual checks`);
